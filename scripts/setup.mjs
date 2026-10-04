import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) {
  console.log(".env.local already exists; leaving your settings intact.");
} else {
  const password = randomBytes(24).toString("hex");
  writeFileSync(".env.local", `POSTGRES_PASSWORD=${password}\nDATABASE_URL=postgresql://factory_demo:${password}@127.0.0.1:5433/factory_attendance\n`, { mode: 0o600 });
  console.log("Created .env.local with a random local database password. It is ignored by Git.");
}
console.log("Next: start Docker Desktop, then run npm run db:up and npm run dev.");
