<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Factory Attendance Capstone — Project Overview

## 1. What this project is about

We are designing an AWS attendance system for **Mekong Apparel**, a fictional factory with approximately 1,800 workers.

Workers clock in and out. Their attendance affects their pay, so records must be stored carefully.

The system must:

- Record attendance quickly.
- Protect attendance with backups and a recovery plan.
- Keep the database unreachable directly from the internet.
- Store encrypted payslip PDFs.
- Explain how each worker would access only their own payslip.
- Email HR when the application becomes slow.
- Keep serving requests when one application server fails.
- Add capacity automatically around the shift changes at **07:00 and 19:00**.

**All worker and payslip data must be invented. Login and payroll calculations are outside the assignment’s scope.**

## 2. Two separate parts of the assignment

### Required laptop demo

```text
Phone/browser
      ↓
Cloudflare Quick Tunnel
      ↓
Next.js running on our laptop
      ↓
PostgreSQL running in Docker on our laptop
```

This app is already built. It supports:

- Desktop and mobile layouts.
- Selecting an invented worker.
- Clock-in and clock-out.
- Viewing saved attendance.
- Preventing duplicate open clock-ins.

The team must demonstrate internet access using mobile data, record a clock-in, stop the tunnel, and explain the connection direction.

### AWS design and optional real deployment

The required AWS submission includes:

1. Architecture diagram.
2. Configuration details and JSON permission policies.
3. Requirement mapping and design explanations.
4. Infrastructure as code with tests.
5. Monthly price estimates.

Actually running the architecture on AWS is **optional bonus work**, which we intend to attempt. Teardown evidence is required for that bonus.

---

## 3. How we work together

The project owner is learning AWS and Terraform through hands-on work.

**Instructions for teammates and AI helpers:**

- Use simple wording and short explanations.
- Explain the goal before introducing commands.
- Work on one small part at a time.
- Let the learner edit infrastructure files and run commands.
- Review the Terraform plan before applying changes.
- Do not install tools, modify AWS resources, apply Terraform, or delete resources on the learner’s behalf unless explicitly requested.
- Do not assume a resource exists just because its code has been written.
- Keep the diagram, configuration document, and Terraform code consistent.

The learner already knows Next.js, PocketBase, VPS deployment, Docker, and Cloudflare Tunnel.

---

## 4. Tools we installed

| Tool | Simple explanation |
|---|---|
| **AWS CLI** | A way to communicate with AWS by typing commands. |
| **Terraform** | Reads infrastructure descriptions and asks AWS to build them. |
| **Git** | Records changes to the project. Git history is required by the teacher. |

Installed versions reported during setup:

- AWS CLI: `2.37.9`
- Terraform: `1.16.4`
- AWS provider selected in Terraform’s lock file: `6.67.0`

**Terraform and AWS CLI are separate tools.** Terraform uses the AWS provider to make AWS API requests. In our setup, the CLI supplies temporary credentials.

## 5. AWS account and access setup

### Account considerations

- The account showed approximately **$134.98 in credits** during setup.
- That balance can change; check credit eligibility and expiry before deployment.
- AWS Organizations setup displayed a warning that creating an organization would immediately expire this account’s free-tier credits.
- We stopped that setup and did **not** proceed with IAM Identity Center through Organizations.

A payment-card limit was reported as configured. Budget setup was guided, but future helpers should verify that the budget exists and its notification email is verified before creating additional resources.

**Budget alerts notify us; they do not automatically stop spending.**

### IAM user and group

We created:

| Item | Name |
|---|---|
| IAM user | `factory-developers` |
| IAM group | `factory-builders` |

The group was instructed to receive:

- `AmazonEC2FullAccess`
- `SignInLocalDevelopmentAccess`

The user also received `IAMUserChangePassword` for changing the initial password.

These development permissions are broader than the permissions we will give our application servers. More service permissions will be needed later.

**The developer user’s MFA setup has not been confirmed.**

### Temporary login

We use:

```powershell
aws login --profile factory-login --remote
```

The learner signs in through the browser as `factory-developers`.

An initial attempt selected root. We corrected the login to use the IAM user.

### Connecting Terraform to the login

We configured:

```powershell
aws configure set credential_process "aws configure export-credentials --profile factory-login --format process" --profile factory-terraform
```

The connection works like this:

```text
Terraform uses factory-terraform
              ↓
That profile asks AWS CLI for credentials
              ↓
AWS CLI uses the factory-login session
              ↓
AWS checks the IAM user's permissions
```

No permanent access keys were needed for this setup.

To check the identity without displaying the account ID:

```powershell
aws sts get-caller-identity --profile factory-terraform --query "ends_with(Arn, 'user/factory-developers')" --output text
```

Expected result:

```text
True
```

If the temporary session expires, log in again. Do not create access keys just to fix an expired session.

---

## 6. Terraform project structure

The infrastructure lives inside the existing project:

```text
factory-attendence/
├── app/                       Next.js application
├── components/                Interface components
├── database/                  Local database initialization
├── compose.yaml               Local PostgreSQL container
├── README.md                  Local demo instructions
└── infra/
    ├── main.tf
    ├── subnet.tf
    ├── routing.tf
    ├── .gitignore
    └── .terraform.lock.hcl
```

**Terraform reads all `.tf` files in `infra` together.** The filenames organize the code; they do not decide what AWS resources get created.

Run infrastructure commands from:

```text
factory-attendence\infra
```

### `main.tf` — the big network

Contains:

- Terraform version requirements.
- AWS provider configuration.
- Region: **Ohio — `us-east-2`**.
- Credential profile: `factory-terraform`.
- VPC named `factory-vpc`.
- VPC address range: `10.0.0.0/16`.
- DNS support and hostname support.

**Analogy:** the VPC is the factory’s entire grounds.

### `subnet.tf` — sections of that network

Creates six subnets:

| Subnet name | Availability Zone | Address range |
|---|---|---|
| `factory-public-a` | `us-east-2a` | `10.0.1.0/24` |
| `factory-public-b` | `us-east-2b` | `10.0.2.0/24` |
| `factory-app-a` | `us-east-2a` | `10.0.11.0/24` |
| `factory-app-b` | `us-east-2b` | `10.0.12.0/24` |
| `factory-db-a` | `us-east-2a` | `10.0.21.0/24` |
| `factory-db-b` | `us-east-2b` | `10.0.22.0/24` |

All have automatic public IPv4 assignment turned off.

**Analogy:**

- Public subnets: reception.
- Application subnets: workrooms.
- Database subnets: records rooms.

Each subnet belongs to one Availability Zone. We use two zones to spread the system across separate failure locations.

### `routing.tf` — gates and directions

Creates:

- One Internet Gateway attached to the VPC.
- One public route table.
- One internet route.
- Two associations connecting the public subnets to that table.
- One database route table.
- Two associations connecting the database subnets to that table.

**Analogy:**

- Internet Gateway = outside gate.
- Route table = directions.
- Association = choosing which section follows those directions.

Public routing:

```text
10.0.0.0/16 → local
0.0.0.0/0   → Internet Gateway
```

Database routing:

```text
10.0.0.0/16 → local
```

`local` means traffic to addresses inside our VPC uses the internal network.

The database route table has **no direct internet route**.

**Routes provide directions, not permission.** Security groups will decide which connections are allowed.

---

## 7. What is actually built so far?

The local Terraform state currently records:

| Resource | Count |
|---|---:|
| VPC | 1 |
| Subnets | 6 |
| Internet Gateway | 1 |
| Custom route tables | 2 |
| Explicit internet route | 1 |
| Route-table associations | 4 |

AWS also creates some default networking resources with the VPC.

**No project EC2 servers, load balancer, RDS database, NAT gateways, S3 payslip bucket, or application security groups have been built yet.**

The application subnets do not yet have their final explicit route tables or outbound-access setup.

Basic VPC, subnet, Internet Gateway, and route-table resources have no additional hourly charge themselves. Paid components come later.

---

## 8. Terraform commands we learned

| Command | Meaning |
|---|---|
| `terraform init` | Prepare the folder and download required providers. |
| `terraform fmt` | Format the configuration. |
| `terraform validate` | Check whether the configuration is structurally valid. |
| `terraform plan` | Preview proposed changes. |
| `terraform plan -out=example.tfplan` | Save that proposed plan to a file. |
| `terraform apply example.tfplan` | Carry out the saved plan. |

Example:

```powershell
terraform fmt
terraform validate
terraform plan -out=network.tfplan
```

Review the plan before running:

```powershell
terraform apply network.tfplan
```

**Applying a saved plan does not ask for another `yes` confirmation.**

### Three important file types

```text
.tf          → What we want
.tfplan      → Instructions for a particular proposed change
.tfstate     → Terraform's record of what it manages
```

Keep state and plan files private and out of Git. Keep `.terraform.lock.hcl` in Git.

---

## 9. Target architecture — still to build

```text
Worker's browser / gate terminal
                ↓ HTTPS
      Public Application Load Balancer
                ↓
       ┌────────┴────────┐
       │                 │
    Zone A            Zone B
   Next.js            Next.js
   EC2 server         EC2 server
       └────────┬────────┘
                ↓
      Private RDS PostgreSQL
        Primary + standby
          Backup/recovery

Application also accesses:
    Private S3 payslip storage
                ↓
    Customer-managed KMS encryption key

Supporting services:
    Auto Scaling → capacity and server replacement
    CloudWatch   → metrics and alarms
    SNS          → HR email notifications
    IAM roles    → application AWS permissions
```

S3 and KMS are regional services, not resources inside our application subnets.

**A standby helps availability. Backups help recovery. They are not the same thing.** We must explain failure behavior honestly rather than promise that failures can never interrupt service.

---

## 10. Remaining phases

### Phase A — finish networking and firewall rules

- Create explicit application route tables.
- Choose and configure private application outbound access.
- Evaluate NAT gateway costs before creating them.
- Create security groups for the load balancer, application, and database.
- Allow only the necessary connections:

```text
Internet → Load balancer: HTTPS
Load balancer → Application: chosen application port
Application → Database: PostgreSQL port 5432
```

- Add a meaningful firewall test.

**Goal:** complete IaC Level 1, including validation and test evidence.

### Phase B — application hosting

- Prepare an AWS deployment build of the existing Next.js app.
- Decide how the app listens on the server’s network interface.
- Create the launch configuration/template and Auto Scaling Group.
- Keep at least two application instances across two zones.
- Add the load balancer, target group, health checks, and HTTPS setup.
- Give application instances narrowly scoped IAM roles.

**Goal:** a failed application server can be replaced while healthy servers handle requests.

### Phase C — database and recovery

- Create private RDS PostgreSQL with Multi-AZ availability.
- Create the database subnet group.
- Disable public accessibility.
- Restrict database connections to application servers.
- Manage credentials securely.
- Initialize the invented workers and attendance schema.
- Define backup retention and recovery objectives.
- Test recovery and document retry behavior.

**Goal:** securely store attendance and demonstrate a credible recovery approach.

### Phase D — payslip storage and access

- Create a private S3 bucket.
- Enable appropriate versioning and retention settings.
- Encrypt payslips using a customer-managed KMS key.
- Write IAM, bucket, and key policies as real JSON.
- Use invented PDFs.
- Explain worker-specific access based on a trusted identity.
- Test that one worker cannot access another worker’s payslip.
- Explain the limits if application credentials are stolen.

**Goal:** satisfy payslip encryption and access-isolation requirements without building login.

### Phase E — scaling and alerts

- Schedule extra capacity before the two shift changes.
- Add a suitable load-based scaling policy.
- Choose response-time metrics and thresholds.
- Create CloudWatch alarms.
- Configure SNS email notifications and verify the subscription.

**Goal:** automatically handle shifts and notify HR when the gate slows.

### Phase F — tests and security scanning

- Validate the complete Terraform configuration.
- Add tests covering security rules S1–S4.
- Distinguish configuration tests from live behavior tests.
- Create one command that runs validation, tests, and a security scan.
- Fix findings or document a one-line justification for each.

**Goal:** complete IaC Levels 2 and 3.

### Phase G — documentation and cost estimate

- Final labelled architecture diagram.
- Configuration details with a reason for each choice.
- Requirement mapping for R1–R6 and S1–S4.
- Answers to all six design questions.
- Normal-month and peak-month estimates.
- Pricing Calculator export or shareable link.
- Git history showing development.

### Phase H — demo, defense, and teardown

- Rehearse the Cloudflare laptop demonstration.
- Name a backup laptop.
- Demonstrate the optional AWS build.
- Practice tracing a request and explaining each permitted connection.
- Practice finding a broken configuration.
- Delete project resources after the AWS demo.
- Inspect for leftover storage, snapshots, IP addresses, and other chargeable resources.
- Submit teardown evidence.

**Deleting EC2 instances alone is not complete cleanup.**

---

## 11. Rules for future work

- Preserve the local laptop demo while building AWS infrastructure.
- Keep AWS resource names and tags consistent. The current Project tag is `factory-attendence`.
- Do not enable AWS Organizations without reviewing its effect on this account’s credits.
- Do not use root credentials for routine Terraform work.
- Never put account IDs, credentials, passwords, authorization codes, or tokens in submissions, recordings, or Git.
- Do not assume temporary login profiles will work on another teammate’s laptop; each developer needs their own authorized setup.
- Preserve the existing Next.js instructions in `AGENTS.md` and read the installed Next.js documentation before changing application code.
- **Next practical task: finish private application routing and start security-group rules.**
