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

The learner currently uses **Windows CMD**. Give CMD-compatible commands; do not use PowerShell backticks for command continuation. Explain the goal, let the learner run infrastructure commands, and review saved plans before applying.

Source assignment: `../FECS329_Capstone_Factory_Attendance.pdf`. Session lesson and deployment handoff: [markdown/ec2-lb.md](markdown/ec2-lb.md).

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

### October 5, 2026 — certificate and server permissions

- The developer group received the inline policy `factory-certificate-deployment` through a separate privileged console session. Routine Terraform remained on the developer profile.
- It permits ACM listing in `us-east-2`, requesting a DNS-validated certificate for `factory-attendance.chhinlong.asia`, and selected certificate read/tag/delete operations in that account/region. Certificate management was initially scoped to the account's regional certificate ARNs; narrow it to the project certificate where practical. Retain a sanitized JSON policy for the submission.
- Developer ACM listing succeeded, Terraform requested the certificate, and its status was confirmed as `ISSUED` after Cloudflare DNS verification.
- The learner previously reported creating `factory-ec2-ssm-role`, trusted by EC2, with `AmazonSSMManagedInstanceCore`. It is **not attached to the current test instance**.
- Reading that instance profile was previously denied. Profile-read/pass-role permissions remain a follow-up if we use the role, along with separate user-side Session Manager permissions. Do not attach the instance's SSM policy to the developer user or grant AdministratorAccess to bypass this.
- The test instance instead bootstraps through user data without an attached IAM instance profile. Do not put developer credentials on EC2 or inside its container.
- Check task-specific developer permissions before adding Auto Scaling, RDS, S3, KMS, or other services. Existing EC2 access does not imply access to all AWS services.

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
├── Dockerfile                 AWS app image packaging
├── .github/workflows/build-image.yml  GHCR build/publish workflow
├── markdown/
│   └── ec2-lb.md               EC2, networking, HTTPS lesson and handoff
└── infra/
    ├── main.tf
    ├── subnet.tf
    ├── routing.tf
    ├── security-groups.tf
    ├── ec2.tf
    ├── app-startup.sh
    ├── certificate.tf
    ├── load-balancer.tf
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
- Two explicit application route tables and their subnet associations.
- One public NAT Gateway in public subnet A with an Elastic IP.
- One default route from each app route table through that NAT.

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

**Routes provide directions, not permission.** Security groups decide which connections are allowed.

Application routing is now applied: `10.0.0.0/16 -> local`, `0.0.0.0/0 -> NAT Gateway`. Both app subnets share the NAT in `us-east-2a`. This enables outbound downloads but adds cost and a single-AZ outbound/bootstrap dependency. Browser requests reach EC2 through the load balancer, not the NAT.

### Application files added in Phase B

- `security-groups.tf`: internet to ALB on 443; ALB to app on 8000; app to DB on 5432; app outbound HTTPS for downloads. No inbound SSH rule.
- `ec2.tf`: official Amazon Linux 2023 x86_64 AMI lookup and one `t3.small` in private app subnet A, no public IP, encrypted 20 GiB gp3 root disk, required IMDSv2, standard CPU credits, and user data. Changes to the startup script propose replacing this test instance.
- `app-startup.sh`: installs Docker and Compose v2.39.4, enables Docker on boot, writes `/opt/factory-app/compose.yaml` on EC2, and pulls/runs `ghcr.io/grandclutch/factory-attendance:latest` with port `8000:8000` and `restart: unless-stopped`. Use LF line endings. User data normally runs on first boot, not every reboot.
- `certificate.tf`: ACM DNS-validated certificate for the app domain, plus DNS-validation output.
- `load-balancer.tf`: public ALB across both public subnets, HTTP target group on 8000, test-instance attachment, and HTTPS 443 listener using the issued certificate. There is no HTTP 80 listener/redirect.
- GitHub Actions built/published the public GHCR image; `start:aws` listens on `0.0.0.0:8000`. Local `start` remains on `127.0.0.1`, and the existing local database Compose file is preserved.

All `.tf` files form one configuration. IAM permission setup and Cloudflare DNS were manual console changes, not resources managed by these Terraform files.

---

## 7. What is actually built so far?

### Progress checkpoint — October 5, 2026

The following reflects configuration reviewed and the learner's apply outputs, startup logs, and browser evidence. It is not a fresh independent AWS inventory. Read [the detailed lesson](markdown/ec2-lb.md) before continuing Phase B.

| Resource | Count |
|---|---:|
| VPC | 1 |
| Subnets | 6 |
| Internet Gateway | 1 |
| Custom route tables | 4 |
| Explicit default routes | 3: public IGW route and two app NAT routes |
| Route-table associations | 6 |
| NAT Gateway / Elastic IP | 1 / 1 |
| Application security groups | 3: load balancer, app, database |
| Explicit security-group rules | 6 |
| Private test EC2 / encrypted root disk | 1 / 1 |
| Public Application Load Balancer | 1, spanning two public zones |
| Target group / test target attachment | 1 / 1 |
| HTTPS listener | 1, port 443 |
| ACM certificate | 1, confirmed issued |

AWS also creates some default networking resources with the VPC.

**Hosting milestone achieved:** the page was shown at **https://factory-attendance.chhinlong.asia**. Startup output showed the app image pulled, the container started, and cloud-init completed. No recorded `describe-target-health` result was provided yet; capture it next. Browser page access does not prove database operations or peak/failure behavior.

Cloudflare has two manually configured DNS-only CNAMEs: certificate ownership verification and the app domain pointing to the ALB DNS output. Keep the certificate record for renewal. Cloudflare is DNS only here, not a proxy or tunnel.

**Still not built:** launch template, Auto Scaling Group, second app instance, private RDS, payslip S3/KMS, scheduled scaling, and CloudWatch/SNS alerts. The AWS app has no `DATABASE_URL`; attendance API calls cannot work against AWS RDS until Phase C. The screenshot showed the initial loading interface, not saved AWS attendance data.

One application server is not enough for R6. The two-zone ALB does not make the single app instance resilient. The database network is prepared but does not alone establish S4 for a deployed database.

EC2, EBS, ALB, NAT, applicable public IPv4 usage, and traffic/processing have ongoing costs. Stopping EC2 alone does not stop ALB/NAT costs. The learner reported a spending limit; AWS Budgets alert/subscription evidence still needs confirmation before further paid expansion.

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

This is the **final target**, not the current resource count. Today there is one private test EC2 behind the HTTPS ALB; the fleet, database, payslip services, and alerts remain to build.

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

**Status:** network, NAT routing, and security groups applied. Meaningful firewall-test evidence has not been confirmed; do not declare IaC Level 1 complete based only on `terraform validate`.

- [x] Create explicit application route tables.
- [x] Choose and configure private application outbound access through the NAT.
- [ ] Keep the NAT cost estimate and single-AZ dependency documented; ongoing estimate work remains.
- [x] Create security groups for the load balancer, application, and database.
- [x] Allow the necessary application connections:

```text
Internet → Load balancer: HTTPS
Load balancer → Application: chosen application port
Application → Database: PostgreSQL port 5432
```

- [ ] Add a meaningful firewall test and capture passing evidence.

**Goal:** complete IaC Level 1, including validation and test evidence.

### Phase B — application hosting

**Status:** first-server HTTPS hosting achieved; full Phase B remains in progress.

- [x] Package the Next.js app and publish the public GHCR image.
- [x] Listen on `0.0.0.0:8000` using `start:aws`.
- [x] Apply one private test EC2 with Docker/Compose first-boot setup, no public IP, and no inbound SSH.
- [x] Apply the ALB, target group, test attachment, health checks, and HTTPS listener; verify issued certificate and browser access through Cloudflare DNS.
- [ ] Capture healthy target evidence. Current `/` checks expect HTTP 200 every 30 seconds, with 5-second timeout, 2 healthy successes, and 3 unhealthy failures. This does not test database readiness.
- [ ] Create a **launch template**, not a deprecated launch configuration, reusing the working app recipe.
- [ ] Pin a published image SHA tag/digest and deliberately select the fleet AMI; review update/rollback behavior. Both `latest` and the newest-AMI lookup can change over time.
- [ ] Check scoped developer permissions for Auto Scaling and required service-linked roles/role passing. Attach narrowly scoped instance permissions as needed; management through SSM is still deferred.
- [ ] Create an Auto Scaling Group with minimum/desired capacity at least two across both app subnets and attach it to the target group.
- [ ] Enable ELB health checks for replacement, with a realistic startup grace period/warm-up. Observed initial bootstrap took roughly five minutes.
- [ ] Verify healthy capacity in both zones; demonstrate approved server-failure/replacement behavior and document recovery/retry limits.
- [ ] Only after the fleet is healthy, review removal of the standalone test server and its manual target attachment.
- [ ] Keep diagram, configuration, sanitized JSON policies, test evidence, and costs consistent with the fleet.

**Goal:** a failed application server can be replaced while healthy servers handle requests.

The single NAT remains a documented outbound/bootstrap dependency. Full attendance continuity also needs the shared Phase C database; scheduled shift scaling and HR emails are Phase E work.

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
- Interpret the 07:00 and 19:00 shift peaks in Cambodia time and document timezone handling and warm-up lead time.

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
- Account-containing resource ARNs must also be sanitized in submissions and documentation; use placeholders for private identifiers.
- Do not assume temporary login profiles will work on another teammate’s laptop; each developer needs their own authorized setup.
- Preserve the existing Next.js instructions in `AGENTS.md` and read the installed Next.js documentation before changing application code.
- **Next practical task: capture target health, then prepare a launch template and two-zone Auto Scaling Group from the working test-server recipe. Review plans before the learner applies.**
- The required laptop demo must still use a free team Cloudflare Quick Tunnel and a `trycloudflare.com` URL on mobile data, with invented-worker recording, local listening/binding evidence, tunnel shutdown, direction explanation, and a backup laptop. The AWS custom-domain deployment does not replace it. The PDF uses local port 8000; verify the local app's actual port before the demo.
- Capstone deliverables remain 1A labelled architecture, 1B settings/reasons and real JSON policies, 1C R1-R6/S1-S4 mapping and all six design answers, 1D tested IaC with Git history, and 1E normal/peak-month per-resource pricing with export/link. Bonus AWS deployment requires running evidence matching the design and complete teardown evidence.
