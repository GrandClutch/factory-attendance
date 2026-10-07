# Phase C: Database Infrastructure (RDS PostgreSQL) - Architecture & Deployment Record

**Session:** October 7, 2026  
**Project:** Mekong Apparel Factory Attendance  
**Status:** Complete (Verified `Available`)  
**Requirement Mapping:** S4 (Database isolated from public internet), R1 & R2 (Durable attendance persistence)

---

## 1. Executive Summary & Status
The database layer for Mekong Apparel's attendance system was provisioned using Amazon Relational Database Service (RDS) running PostgreSQL. The database is provisioned strictly within private subnets and protected by dedicated security groups to prevent any direct public internet access, fulfilling requirement **S4**.

---

## 2. Provisioned RDS Instance Details

| Property | Value | Architectural Justification |
| :--- | :--- | :--- |
| **DB Identifier** | `factory-db` | Project-scoped unique resource identifier |
| **Engine** | PostgreSQL 17 | Matches development and local Docker environment |
| **Instance Class** | `db.t4g.micro` | AWS Graviton2 cost-optimized free-tier eligible instance |
| **Region & Zone** | `us-east-2a` (Ohio) | Colocated with primary application subnet |
| **Multi-AZ Deployment** | Single-AZ (`db.t4g.micro`) | Cost optimization for development/capstone milestone |
| **Storage** | 20 GiB gp3 (Autoscaling up to 100 GiB) | Fast general-purpose SSD storage |
| **Status** | `Available` | Fully provisioned and accepting VPC connections |
| **Backup Retention** | 1 day | Point-in-time recovery enabled |

---

## 3. Network & Security Architecture (Requirement S4)

```text
[ Internet / Public Visitors ]
            │ (Strictly Blocked by Routing & Security Groups)
            ▼
┌─────────────────────────────────────────────────────────────┐
│ factory-vpc (10.0.0.0/16)                                   │
│                                                             │
│   [ factory-app Security Group (sg-0b227ec574ebbe42a) ]    │
│            │                                                │
│            │ Port 5432 (Internal VPC Traffic Only)          │
│            ▼                                                │
│   [ factory-database Security Group (sg-05e00c338d6054d64) ]│
│            │                                                │
│   ┌────────┴────────────────────────────────────────────┐   │
│   │ factory-db-subnets (Private DB Subnet Group)        │   │
│   │  - factory-db-a (10.0.21.0/24 in us-east-2a)       │   │
│   │  - factory-db-b (10.0.22.0/24 in us-east-2b)       │   │
│   │                                                     │   │
│   │         ┌─────────────────────────┐                 │   │
│   │         │ RDS: factory-db         │                 │   │
│   │         │ (PostgreSQL Port 5432)  │                 │   │
│   │         └─────────────────────────┘                 │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- **VPC Placement:** `factory-vpc` (`vpc-01ef8f2476b8930a8`).
- **Subnet Group:** `factory-db-subnets` spanning `factory-db-a` and `factory-db-b`.
- **Public Accessibility:** Disabled (`publicly_accessible = false`). The database has no public IPv4 address and has no route to the Internet Gateway.
- **Firewall Rules:** Security group `factory-database` allows inbound PostgreSQL TCP 5432 exclusively referenced from `factory-app` (`sg-0b227ec574ebbe42a`).

---

## 4. Connection & Authentication Credentials

- **Host / Endpoint:** `factory-db.c1e86eoma97u.us-east-2.rds.amazonaws.com`
- **Port:** `5432`
- **Database Name:** `factory_attendance`
- **Master Username:** `postgres`
- **Connection URI Format:**
  ```text
  postgresql://postgres:FactoryPass2026%23Secure@factory-db.c1e86eoma97u.us-east-2.rds.amazonaws.com:5432/factory_attendance
  ```
  *(Note: Special character `#` in password is URL-encoded as `%23` to prevent URL parser truncation).*

---

## 5. Phase C (Part 2) Integration
Application deployment, database migration, and live attendance verification are complete and documented in [markdown/database-integration.md](database-integration.md).
- Status: Verified live on `https://factory-attendance.chhinlong.asia/api/attendance`.
- Database schema and 6 demo workers successfully initialized.
- Live clock-ins persisted into `factory-db`.
