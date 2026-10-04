import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";

test("real database: retries, invalid transitions, and concurrent clock-ins", async ({ request }) => {
  const worker_id = "MA-01847";
  const snapshot = await request.get("/api/attendance");
  expect(snapshot.ok(), "Start the local PostgreSQL container before testing").toBeTruthy();
  const worker = (await snapshot.json()).workers.find((w: { worker_id: string }) => w.worker_id === worker_id);
  if (worker.clock_in) await request.post("/api/attendance", { data: { worker_id, action: "clock-out", request_id: randomUUID() } });

  const post = (action: string, request_id = randomUUID()) => request.post("/api/attendance", { data: { worker_id, action, request_id } });
  expect((await post("clock-out")).status()).toBe(409);
  expect((await post("invalid")).status()).toBe(400);
  const results = await Promise.all([post("clock-in"), post("clock-in")]);
  expect(results.map(r => r.status()).sort()).toEqual([201, 409]);
  const created = await results.find(r => r.status() === 201)!.json();
  const repeatIn = await post("clock-in", created.record.clock_in_request_id);
  expect((await repeatIn.json()).record.record_id).toBe(created.record.record_id);
  const outId = randomUUID();
  const departure = await post("clock-out", outId);
  expect(departure.status()).toBe(200);
  const outRecord = (await departure.json()).record;
  expect(outRecord.record_id).toBe(created.record.record_id);
  expect(outRecord.clock_out).toBeTruthy();
  expect((await (await post("clock-out", outId)).json()).record.clock_out).toBe(outRecord.clock_out);
  expect((await post("clock-out")).status()).toBe(409);
});

test("desktop and mobile: save, reload, and inspect responsive layouts", async ({ page, request }) => {
  const worker_id = "MA-01842";
  const snapshot = await request.get("/api/attendance");
  expect(snapshot.ok()).toBeTruthy();
  const worker = (await snapshot.json()).workers.find((w: { worker_id: string }) => w.worker_id === worker_id);
  if (worker.clock_in) await request.post("/api/attendance", { data: { worker_id, action: "clock-out", request_id: randomUUID() } });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByText("PostgreSQL connected", { exact: true })).toBeVisible();
  await page.getByLabel("Worker ID", { exact: true }).selectOption(worker_id);
  await page.getByRole("button", { name: "Clock in", exact: true }).click();
  await expect(page.getByText("Clock-in recorded", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clock out", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByText("PostgreSQL connected", { exact: true })).toBeVisible();
  await page.getByLabel("Worker ID", { exact: true }).selectOption(worker_id);
  await expect(page.getByRole("button", { name: "Clock in", exact: true })).toBeDisabled();
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Clock out", exact: true }).click();
  await expect(page.getByText("Clock-out recorded", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("database outage has a recovery message and disables writes", async ({ page }) => {
  await page.route("**/api/attendance", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Database unavailable. Start Docker Desktop and run npm run db:up, then refresh." }) }));
  await page.goto("/");
  await expect(page.getByText("Database connection needed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clock in", exact: true })).toBeDisabled();
});
