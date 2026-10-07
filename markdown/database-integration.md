# Phase D: Application-to-Database Integration & Live Attendance Verification

**Session:** October 7, 2026  
**Project:** Mekong Apparel Factory Attendance  
**Status:** Complete & Live Verified  
**Requirement Mapping:** R1 & R2 (Fast, durable attendance persistence), S4 (Database isolated from public internet), R6 (Multi-AZ resilient application tier)

---

## 1. Executive Summary & Objective

In Phase C, Amazon RDS PostgreSQL (`factory-db`) was provisioned inside private database subnets.  
In **Phase D**, we connected the Auto-Scaled Next.js application tier to `factory-db`, executed the PostgreSQL database schema migrations, resolved private-network access and TLS encryption constraints, and verified live attendance persistence through the public Application Load Balancer at **`https://factory-attendance.chhinlong.asia`**.

---

## 2. Infrastructure & Connectivity Engineering

### A. The Challenge: Connecting to Private EC2 Instances
The application instances reside in private subnets (`factory-app-a`, `factory-app-b`) with no public IP addresses and no inbound SSH rules. 

1. **EC2 Instance Connect Endpoint (EICE):**
   * Provisioned endpoint: `factory-eic` (`eice-094a87739cdcf7e06`) in `factory-app-a`.
   * **Gotcha Discovered:** Browser-based EC2 Instance Connect key injection failed because the custom Golden AMI (`factory-app-ami`) lacked the `ec2-instance-connect` daemon package.
2. **The Solution — AWS Systems Manager (SSM) Session Manager:**
   * Amazon Linux 2023 includes the SSM Agent pre-installed.
   * Attached the pre-configured IAM role **`factory-ec2-ssm-role`** (containing `AmazonSSMManagedInstanceCore`) to the EC2 instances.
   * This provided instant, secure browser-based root terminal access without needing SSH keys, bastion hosts, or inbound port 22 open.

---

## 3. Database Schema Migration & Seeding

Inside instance `i-0e0efb59f5df9ff58`, the database migration was executed directly against `factory-db` using a temporary PostgreSQL client container:

```bash
docker run --rm -v /opt/factory-app/init.sql:/init.sql postgres:17-alpine \
  psql "postgresql://postgres:FactoryPass2026%23Secure@factory-db.c1e86eoma97u.us-east-2.rds.amazonaws.com:5432/factory_attendance" -f /init.sql
```

### Schema Applied (`/opt/factory-app/init.sql`):
* **`workers` Table:** `worker_id` (PK), `full_name`, `line`.
* **`attendance` Table:** `record_id` (UUID PK), `worker_id` (FK), `clock_in`, `clock_out`, `clock_in_request_id` (UNIQUE), `clock_out_request_id` (UNIQUE).
* **Constraints & Business Rules:**
  * `CHECK (clock_out IS NULL OR clock_out >= clock_in)`: Prevents clock-out timestamps earlier than clock-in.
  * `CREATE UNIQUE INDEX one_open_attendance ON attendance(worker_id) WHERE clock_out IS NULL`: Database-enforced rule preventing a worker from opening multiple concurrent clock-ins.
* **Seed Data:** Populated 6 demo workers (`MA-01842` through `MA-01847`).

---

## 4. Key Engineering Gotchas & Resolutions

### Gotcha 1: URL-Encoding Special Characters in Passwords
* **Issue:** The master password contained `#` (`FactoryPass2026#Secure`). In standard URI parsers, `#` denotes a URL fragment identifier, causing parsers to truncate everything after `#`.
* **Resolution:** URL-encoded `#` as `%23`:
  ```text
  FactoryPass2026%23Secure
  ```

### Gotcha 2: Amazon RDS TLS/SSL Enforcement (`?sslmode=no-verify`)
* **Issue:** After passing `DATABASE_URL` to Docker Compose, the Next.js database client (`pg` Pool in `lib/db.ts`) threw connection errors, resulting in `503 Service Unavailable`.
* **Root Cause:** Amazon RDS PostgreSQL instances reject unencrypted plaintext database connections by default. The Node.js `pg` driver requires SSL negotiation.
* **Resolution:** Appended `?sslmode=no-verify` to the connection URI in `/opt/factory-app/.env`:
  ```env
  DATABASE_URL="postgresql://postgres:FactoryPass2026%23Secure@factory-db.c1e86eoma97u.us-east-2.rds.amazonaws.com:5432/factory_attendance?sslmode=no-verify"
  ```
* Recreated the application container:
  ```bash
  docker compose -f /opt/factory-app/compose.yaml down
  docker compose -f /opt/factory-app/compose.yaml up -d
  ```

---

## 5. Live Verification & Evidence

### A. Health & Demo Worker Retrieval
Requesting `GET https://factory-attendance.chhinlong.asia/api/attendance` returned **`HTTP/1.1 200 OK`**:

```json
{
  "workers": [
    { "worker_id": "MA-01842", "full_name": "Demo Worker 01", "line": "Sewing A", "clock_in": "2026-10-07T14:16:42.703Z" },
    { "worker_id": "MA-01843", "full_name": "Demo Worker 02", "line": "Sewing A", "clock_in": "2026-10-07T14:18:55.613Z" },
    { "worker_id": "MA-01844", "full_name": "Demo Worker 03", "line": "Sewing B", "clock_in": null },
    { "worker_id": "MA-01845", "full_name": "Demo Worker 04", "line": "Cutting", "clock_in": null },
    { "worker_id": "MA-01846", "full_name": "Demo Worker 05", "line": "Finishing", "clock_in": null },
    { "worker_id": "MA-01847", "full_name": "Demo Worker 06", "line": "Quality", "clock_in": null }
  ],
  "records": [
    {
      "record_id": "4347a79b-e080-4349-95f8-6298786db5e0",
      "worker_id": "MA-01843",
      "full_name": "Demo Worker 02",
      "line": "Sewing A",
      "clock_in": "2026-10-07T14:18:55.613Z",
      "clock_out": null
    },
    {
      "record_id": "4b5f0ad2-9d54-487e-a657-3f94a1f5b83a",
      "worker_id": "MA-01842",
      "full_name": "Demo Worker 01",
      "line": "Sewing A",
      "clock_in": "2026-10-07T14:16:42.703Z",
      "clock_out": null
    }
  ],
  "summary": {
    "on_site": 2,
    "today": 2,
    "completed": 0
  }
}
```

### B. Live Clock-In Persistence Test (Requirements R1 & R2)
* Executed clock-in for **`MA-01843`** with UUID `d3333333-3333-4333-8333-333333333333`.
* Successfully written to Amazon RDS PostgreSQL:
  ```json
  {
    "record": {
      "record_id": "4347a79b-e080-4349-95f8-6298786db5e0",
      "worker_id": "MA-01843",
      "clock_in": "2026-10-07T14:18:55.613Z",
      "clock_out": null,
      "clock_in_request_id": "d3333333-3333-4333-8333-333333333333",
      "clock_out_request_id": null
    },
    "action": "clock-in",
    "replayed": false
  }
  ```
* Summary counts updated dynamically to **`on_site: 2`**.

---

## 6. Current Architecture State

```text
[ Browser / Worker Terminal ]
               │ HTTPS (Port 443)
               ▼
[ Public ALB: factory-app-alb (TLS 1.3 ACM) ]
               │
## 6. Multi-Zone Fleet Homogenization & Verification

Both Auto Scaling Group nodes across separate Availability Zones are fully configured and verified:
* **Node 1:** `i-0e0efb59f5df9ff58` (us-east-2a) — Configured with `.env` (`?sslmode=no-verify`)
* **Node 2:** `i-0f18b14f16e241e09` (us-east-2b) — Configured with `.env` (`?sslmode=no-verify`)

### Verification Result (10/10 Multi-Zone Traffic Distribution):
* Executed sequential requests to `https://factory-attendance.chhinlong.asia/api/attendance`.
* **Result:** **10 / 10 requests returned `HTTP 200 OK`**.
* Both nodes in `us-east-2a` and `us-east-2b` are actively serving live database queries and recording clock-ins with zero downtime.

---

## 7. Next Milestone: Phase D — Encrypted Payslip Storage (S3 & KMS)

With the database and application tiers fully resilient and operational, we proceed to **Payslip Storage & Access Isolation**:
1. Provision a private **Amazon S3** bucket for worker payslip PDFs.
2. Provision a **Customer-Managed KMS Key** (CMK) for payslip envelope encryption (**Requirements R4 & S2**).
3. Authorize trusted-identity worker access policies (**Requirements R3 & S3**).
4. Upload invented demo worker payslips and test access isolation boundaries.
