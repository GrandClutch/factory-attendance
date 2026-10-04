import "server-only";
import { Pool } from "pg";

const globalDb = globalThis as unknown as { attendancePool?: Pool };

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!globalDb.attendancePool) {
    globalDb.attendancePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30000,
      statement_timeout: 5000,
    });
    globalDb.attendancePool.on("error", () => console.error("Idle database connection failed."));
  }
  return globalDb.attendancePool;
}
