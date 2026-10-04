"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Check, CircleAlert, Factory, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AttendanceSnapshot, ClockAction } from "@/lib/attendance-types";

const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Phnom_Penh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const date = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Phnom_Penh", day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Phnom_Penh", weekday: "long", day: "numeric", month: "long", year: "numeric" });

function Timestamp({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return <time dateTime={value} className="timestamp"><strong>{time.format(new Date(value))}</strong><span>{date.format(new Date(value))}</span></time>;
}

export function AttendanceTerminal() {
  const [now, setNow] = useState<Date | null>(null);
  const [snapshot, setSnapshot] = useState<AttendanceSnapshot | null>(null);
  const [workerId, setWorkerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<ClockAction | null>(null);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; title: string; message: string } | null>(null);
  const uncertain = useRef<{ worker_id: string; action: ClockAction; request_id: string } | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/attendance", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSnapshot(data);
      setLoadError("");
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(error instanceof Error ? error.message : "Could not load attendance. Refresh to try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const tick = () => setNow(new Date());
    const initial = setTimeout(() => { tick(); void refresh(controller.signal); }, 0);
    const timer = setInterval(tick, 1000);
    return () => { controller.abort(); clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);

  const worker = snapshot?.workers.find((item) => item.worker_id === workerId);
  const available = !!snapshot && !loadError && !loading;

  async function clock(action: ClockAction) {
    if (!worker || busy.current) return;
    busy.current = true;
    setPending(action);
    setFeedback(null);
    const request = uncertain.current?.worker_id === workerId && uncertain.current?.action === action
      ? uncertain.current : { worker_id: workerId, action, request_id: crypto.randomUUID() };
    uncertain.current = request;
    try {
      const response = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500) uncertain.current = null;
        throw new Error(data.error || "Attendance could not be confirmed.");
      }
      uncertain.current = null;
      const savedAt = action === "clock-in" ? data.record.clock_in : data.record.clock_out;
      setFeedback({ error: false, title: action === "clock-in" ? "Clock-in recorded" : "Clock-out recorded", message: `${worker.full_name} · ${worker.worker_id} · ${time.format(new Date(savedAt))}. Saved to PostgreSQL.` });
      await refresh();
    } catch (error) {
      setFeedback({ error: true, title: "Attendance not confirmed", message: `${error instanceof Error ? error.message : "Connection interrupted."} Refresh to check the record; retrying the same action reuses its request ID.` });
    } finally {
      setPending(null);
      busy.current = false;
    }
  }

  return (
    <div className="terminal-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Mekong Apparel attendance home"><Factory aria-hidden="true" /><span>Mekong<span className="brand-secondary">Apparel</span></span></Link>
        <div className="header-meta"><span>Attendance terminal</span><Badge variant="outline">Local demo</Badge></div>
      </header>

      <main className="workspace">
        <section className="gate-panel" aria-labelledby="gate-heading">
          <div className="gate-intro"><h1 id="gate-heading">Every shift starts here.</h1><p>Select your worker ID. Record your arrival or departure.</p></div>
          <div className="clock-face">
            <div className="clock-top"><span>Phnom Penh</span><span>UTC +07:00</span></div>
            <time className="live-clock" dateTime={now?.toISOString()}>{now ? time.format(now) : "--:--:--"}</time>
            <p>{now ? fullDate.format(now) : "Loading local time…"}</p>
            <div className="clock-bottom"><span className="clock-dot" aria-hidden="true" />Laptop clock · database timestamps each record</div>
          </div>

          <div className="clock-controls">
            <FieldGroup>
              <Field data-disabled={!available || !!pending}>
                <FieldLabel htmlFor="worker">Worker ID</FieldLabel>
                <NativeSelect id="worker" className="w-full" value={workerId} disabled={!available || !!pending} onChange={(event) => { setWorkerId(event.target.value); setFeedback(null); }} aria-describedby="worker-help">
                  <NativeSelectOption value="">Choose a demo worker</NativeSelectOption>
                  {snapshot?.workers.map((item) => <NativeSelectOption key={item.worker_id} value={item.worker_id}>{item.worker_id} — {item.full_name}</NativeSelectOption>)}
                </NativeSelect>
                <FieldDescription id="worker-help">Six invented workers. No personal data.</FieldDescription>
              </Field>
            </FieldGroup>

            <div className="worker-preview" aria-live="polite">
              <div><strong>{worker?.full_name || "Ready when you are"}</strong><span>{worker ? `${worker.worker_id} · ${worker.line}` : "Choose a worker to enable the terminal."}</span></div>
              {worker ? <Badge variant={worker.clock_in ? "default" : "secondary"}>{worker.clock_in ? "On site" : "Off site"}</Badge> : null}
            </div>
            <div className="clock-actions">
              <Button size="lg" disabled={!worker || !available || !!pending || !!worker?.clock_in} onClick={() => void clock("clock-in")}>
                {pending === "clock-in" ? <Spinner data-icon="inline-start" /> : <ArrowDownLeft data-icon="inline-start" />} {pending === "clock-in" ? "Saving…" : "Clock in"}
              </Button>
              <Button size="lg" variant="outline" disabled={!worker || !available || !!pending || !worker?.clock_in} onClick={() => void clock("clock-out")}>
                {pending === "clock-out" ? <Spinner data-icon="inline-start" /> : <ArrowUpRight data-icon="inline-start" />} {pending === "clock-out" ? "Saving…" : "Clock out"}
              </Button>
            </div>
            {worker?.clock_in ? <p className="open-record">Clocked in at {time.format(new Date(worker.clock_in))} on {date.format(new Date(worker.clock_in))}.</p> : null}
            <div aria-live="polite" aria-atomic="true">
              {feedback ? <Alert variant={feedback.error ? "destructive" : "default"} className="mt-5">{feedback.error ? <CircleAlert /> : <Check />}<AlertTitle>{feedback.title}</AlertTitle><AlertDescription>{feedback.message}</AlertDescription></Alert> : null}
            </div>
          </div>
          <p className="gate-note"><ShieldCheck aria-hidden="true" />Confirmation means your record was saved—not just clicked.</p>
        </section>

        <section className="ledger-panel" aria-labelledby="ledger-heading" aria-busy={loading}>
          <div className="ledger-heading"><div><h2 id="ledger-heading">Attendance ledger</h2><p>Latest 50 records · Cambodia time</p></div><Button variant="outline" size="sm" disabled={loading || !!pending} onClick={() => void refresh()}>{loading ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}Refresh</Button></div>
          <dl className="summary-strip">
            <div><dt>Currently on site</dt><dd>{snapshot && !loadError ? snapshot.summary.on_site : "—"}</dd></div>
            <div><dt>Clock-ins today</dt><dd>{snapshot && !loadError ? snapshot.summary.today : "—"}</dd></div>
            <div><dt>Clock-outs today</dt><dd>{snapshot && !loadError ? snapshot.summary.completed : "—"}</dd></div>
          </dl>
          {loadError ? <div className="ledger-message"><Alert variant="destructive"><CircleAlert /><AlertTitle>Database connection needed</AlertTitle><AlertDescription>{loadError}{snapshot ? " Previously loaded records below may be out of date." : ""}</AlertDescription></Alert></div> : null}
          {loading && !snapshot ? <Empty><EmptyHeader><Spinner className="mx-auto" /><EmptyTitle>Opening the ledger</EmptyTitle><EmptyDescription>Connecting to your local PostgreSQL database.</EmptyDescription></EmptyHeader></Empty> : snapshot?.records.length ? (
            <div className="ledger-table">
              <Table>
                <TableHeader><TableRow><TableHead>Worker / line</TableHead><TableHead>Clock in</TableHead><TableHead>Clock out</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                <TableBody>{snapshot.records.map((record) => <TableRow key={record.record_id}>
                  <TableCell><div className="record-worker"><strong>{record.full_name}</strong><span>{record.worker_id} · {record.line}</span></div></TableCell>
                  <TableCell data-label="Clock in"><Timestamp value={record.clock_in} /></TableCell><TableCell data-label="Clock out"><Timestamp value={record.clock_out} /></TableCell>
                  <TableCell className="text-right"><Badge variant={record.clock_out ? "secondary" : "default"}>{record.clock_out ? "Complete" : "On site"}</Badge></TableCell>
                </TableRow>)}</TableBody>
              </Table>
            </div>
          ) : !loadError ? <Empty className="ledger-empty"><EmptyHeader><EmptyTitle>The first arrival is yours.</EmptyTitle><EmptyDescription>Choose a demo worker and clock in. Their saved record will appear here.</EmptyDescription></EmptyHeader></Empty> : null}
          <div className="ledger-foot"><span className="connection-indicator" data-connected={!!snapshot && !loadError}><span aria-hidden="true" />{loading ? "Checking database…" : loadError ? "Database disconnected" : "PostgreSQL connected"}</span><span>Refresh for the latest records</span></div>
        </section>
      </main>
      <footer className="site-footer"><span>Mekong Apparel · Cloud computing capstone</span><span>Invented data only. Shared terminal demo · no login.</span></footer>
    </div>
  );
}
