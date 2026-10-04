import { randomUUID } from "node:crypto";
import { database } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function unavailable() {
  return json({ error: "Database unavailable. Start Docker Desktop and run npm run db:up, then refresh." }, 503);
}

export async function GET() {
  try {
    const pool = database();
    const [workers, records, summary] = await Promise.all([
      pool.query(`SELECT w.*, a.clock_in FROM workers w
        LEFT JOIN attendance a ON a.worker_id = w.worker_id AND a.clock_out IS NULL
        ORDER BY w.worker_id`),
      pool.query(`SELECT a.record_id, a.worker_id, w.full_name, w.line, a.clock_in, a.clock_out
        FROM attendance a JOIN workers w USING(worker_id)
        ORDER BY a.clock_in DESC LIMIT 50`),
      pool.query(`SELECT
        count(*) FILTER (WHERE clock_out IS NULL)::int AS on_site,
        count(*) FILTER (WHERE (clock_in AT TIME ZONE 'Asia/Phnom_Penh')::date = (now() AT TIME ZONE 'Asia/Phnom_Penh')::date)::int AS today,
        count(*) FILTER (WHERE (clock_out AT TIME ZONE 'Asia/Phnom_Penh')::date = (now() AT TIME ZONE 'Asia/Phnom_Penh')::date)::int AS completed
        FROM attendance`),
    ]);
    return json({ workers: workers.rows, records: records.rows, summary: summary.rows[0] });
  } catch {
    console.error("Attendance read failed. Check the database connection and schema.");
    return unavailable();
  }
}

export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Send a valid JSON request." }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Invalid request." }, 400);
  const { worker_id, action, request_id } = body;
  if (typeof worker_id !== "string" || !/^MA-\d{5}$/.test(worker_id)
    || !["clock-in", "clock-out"].includes(action)
    || typeof request_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request_id)) {
    return json({ error: "Choose a valid worker and clock action." }, 400);
  }
  let client;
  try {
    client = await database().connect();
    await client.query("BEGIN");
    // Serialize actions for this worker so simultaneous terminals cannot race.
    const worker = await client.query("SELECT worker_id FROM workers WHERE worker_id = $1 FOR UPDATE", [worker_id]);
    if (!worker.rowCount) {
      await client.query("ROLLBACK");
      return json({ error: "Worker not found. Refresh and choose an existing demo worker." }, 404);
    }
    const previous = await client.query(`SELECT * FROM attendance
      WHERE clock_in_request_id = $1 OR clock_out_request_id = $1`, [request_id]);
    if (previous.rowCount) {
      const saved = previous.rows[0];
      if (saved.worker_id !== worker_id || saved[action === "clock-in" ? "clock_in_request_id" : "clock_out_request_id"] !== request_id) {
        await client.query("ROLLBACK");
        return json({ error: "Request ID already used for a different action." }, 409);
      }
      await client.query("COMMIT");
      return json({ record: saved, action, replayed: true });
    }
    const open = await client.query("SELECT * FROM attendance WHERE worker_id = $1 AND clock_out IS NULL", [worker_id]);
    if (action === "clock-in" && open.rowCount) {
      await client.query("ROLLBACK");
      return json({ error: "This worker is already clocked in. Clock out before starting another attendance record." }, 409);
    }
    if (action === "clock-out" && !open.rowCount) {
      await client.query("ROLLBACK");
      return json({ error: "This worker is not clocked in. Record a clock-in first." }, 409);
    }
    const saved = action === "clock-in"
      ? await client.query(`INSERT INTO attendance(record_id, worker_id, clock_in_request_id)
          VALUES($1, $2, $3) RETURNING *`, [randomUUID(), worker_id, request_id])
      : await client.query(`UPDATE attendance SET clock_out = clock_timestamp(), clock_out_request_id = $1
          WHERE record_id = $2 RETURNING *`, [request_id, open.rows[0].record_id]);
    await client.query("COMMIT");
    return json({ record: saved.rows[0], action, replayed: false }, action === "clock-in" ? 201 : 200);
  } catch {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Attendance write failed. No success response was sent.");
    return unavailable();
  } finally {
    client?.release();
  }
}
