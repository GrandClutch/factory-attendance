# Mekong Apparel — local attendance demo

Next.js + shadcn UI + PostgreSQL in Docker. Desktop and mobile layouts. All six workers are invented. No login, payroll, or real personal data.

## Start here (PowerShell)

Open Docker Desktop and wait for its engine to run. In this project folder:

```powershell
npm install
npm run setup
npm run db:up
npm run dev
```

Open **http://localhost:8000**. Choose a worker, clock in, inspect the ledger, then clock out. Click Refresh to fetch changes made from another device.

`setup` generates a random database password in `.env.local`, which Git ignores. Never display that file during the defense or commit it. PostgreSQL listens only on `127.0.0.1:5433`. The app listens only on `127.0.0.1:8000`.

## What happens when you click

1. The browser sends a worker ID, action, and unique request ID to `/api/attendance`.
2. Next.js validates them and opens a database transaction.
3. It locks this worker's row so simultaneous actions cannot race.
4. PostgreSQL inserts a clock-in or updates the open record with a clock-out. Database time is authoritative.
5. Next.js commits the transaction before replying with success.
6. The page shows confirmation and refreshes the ledger.

Repeated request IDs return the original saved result. A partial unique index also prevents duplicate open attendance. If a response is interrupted, refresh to inspect the record; an immediate retry of the same action reuses the request ID. Pending retry IDs are held in browser memory, not retained across page reloads. This is a capstone demo, not an offline gate recorder.

Tables: `workers(worker_id, full_name, line)` and `attendance(record_id, worker_id, clock_in, clock_out)` plus request IDs for retry handling. See `database/init.sql`. Timestamps use `timestamptz`; the page and daily counts use `Asia/Phnom_Penh`.

## Persistence and inspection

`attendance_data` is a Docker volume. `npm run db:down` removes the container but keeps the volume. Starting it again retains records. A volume is persistent storage, **not a backup**.

Inspect invented records without displaying credentials:

```powershell
docker compose --env-file .env.local exec db psql -U factory_demo -d factory_attendance -c "SELECT record_id, worker_id, clock_in, clock_out FROM attendance ORDER BY clock_in DESC LIMIT 10;"
```

Initialization SQL runs only when the volume is first created. Future schema changes require migrations or an intentional reset. Do not delete the volume if you want to keep the demo records.

## Cloudflare quick-tunnel demonstration

Install cloudflared if needed:

```powershell
winget install --id Cloudflare.cloudflared --exact
```

Reopen the terminal after installation. For the class demo, use a production build instead of the development server. Stop `npm run dev` with Ctrl+C, then:

```powershell
npm run build
npm run start
```

In another terminal:

```powershell
cloudflared tunnel --url http://localhost:8000
```

Open the printed `https://....trycloudflare.com` URL on a phone with Wi-Fi off and mobile data on. Clock in an invented worker and refresh the laptop ledger. Stop cloudflared with Ctrl+C and show that the URL can no longer reach the app (Cloudflare may show an error page rather than a browser network error).

The laptop opens an **outbound** connection to Cloudflare. Cloudflare forwards browser requests through that connection to the loopback-only app. No router port forwarding is needed. Anyone with the demo URL can use this intentionally unauthenticated demo; it contains only invented data.

For network evidence:

```powershell
netstat -an
ipconfig
```

Show the app listening on `127.0.0.1:8000` and PostgreSQL on `127.0.0.1:5433`; explain other listeners rather than claiming the laptop has none. Private adapter addresses support the explanation, but `netstat` alone does not prove absence of a public IP or inbound reachability. Explain your router/NAT and absence of port forwarding. Some IPv6 setups have public addresses; check your actual network rather than making a blanket claim.

Create the free team Cloudflare account required by the brief (quick tunnels themselves do not require login). Rehearse the day before, name a backup laptop, and keep Docker + the app running during the tunnel test.

## Checks

```powershell
npm run lint
npm run build
npm test
```

Tests require the local database running and a built app. Playwright uses installed Microsoft Edge. They exercise real database writes, concurrent clock-ins, replayed requests, invalid transitions, page reload persistence, mobile overflow, and a simulated database outage. They add invented attendance rows. Desktop and mobile screenshots go to ignored `artifacts/`.

## Stop

Stop the tunnel and app using Ctrl+C in their terminals, then:

```powershell
npm run db:down
```

This local demo is separate from the AWS architecture. No AWS resources are created by these commands.
