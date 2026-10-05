# Lesson: hosting Factory Attendance on private EC2 behind an HTTPS load balancer

**Session:** October 5, 2026  
**Project:** Mekong Apparel Factory Attendance  
**Application URL:** https://factory-attendance.chhinlong.asia  
**Status:** first AWS hosting milestone achieved; Phase B is still in progress.

This lesson records what we built, why it works, and what we must finish. The team chose the optional real AWS deployment to learn through hands-on engineering. The required architecture, tests, documentation, and laptop demonstration still matter.

## 1. What we achieved

We took our existing Next.js application, packaged it into a Docker image, and ran it on one private AWS EC2 server. A public Application Load Balancer receives HTTPS requests and forwards them to the application on port 8000.

Evidence from this session:

- The learner applied the EC2 plan: one resource added.
- EC2 startup output showed the image pulled, the container started, and cloud-init finished.
- The learner requested the ACM certificate through Terraform and verified domain ownership through Cloudflare DNS.
- AWS reported the certificate as `ISSUED`.
- The load-balancer plan proposed four additions and its application produced the expected outputs.
- The learner showed the application page at the custom domain in a browser.

**What this proves:** infrastructure creation, container startup, and browser access to the application page.

**What it does not prove yet:** sustained container health, a recorded target-health check, working AWS attendance persistence, load-test results, or continuity when a server fails. The screenshot showed the initial loading interface; the AWS database is not built yet.

## 2. The simple mental model

Imagine a factory:

| AWS concept | Student-friendly explanation |
|---|---|
| VPC | The factory grounds: our private network. |
| Subnet | A section of those grounds in one Availability Zone. |
| EC2 | A rented computer in a private workroom. |
| AMI | The operating-system template used to create that computer. |
| Docker image | A packed box containing the application and its dependencies. |
| Docker Compose | Instructions for opening that box and running it. |
| Security group | A firewall deciding who may connect and on which port. |
| Load balancer | Public reception: accepts visitors and forwards requests to the workroom. |
| Target group | Reception's list of application computers and their health checks. |
| ACM certificate | The certificate that enables trusted HTTPS at reception. |
| DNS | An address book translating the application name into its destination. |
| NAT Gateway | An outbound exit for private computers to download things. |
| Terraform | Our written infrastructure recipe and the tool that carries it out. |

## 3. Trace the two network paths

### Path A: a visitor opens the page

```text
Browser looks up factory-attendance.chhinlong.asia
                    |
           Cloudflare DNS CNAME
                    |
          Public AWS load balancer
            HTTPS / TCP 443
          Certificate checked here
                    |
             HTTP / TCP 8000
                    |
      Private EC2 in factory-app-a
                    |
     Docker port mapping 8000:8000
                    |
               Next.js app
```

Cloudflare is configured as **DNS only** for this setup. It answers DNS queries; it is not proxying the application traffic. This path does not use a Cloudflare Tunnel.

HTTPS terminates at the load balancer. The current load-balancer-to-app connection is HTTP inside the VPC. Do not describe this as end-to-end TLS.

The load balancer spans two public subnets, but there is currently only **one** application server in zone A. Two load-balancer zones do not make one app server highly available.

### Path B: the private server downloads Docker and the app

```text
Private EC2 starts an outbound connection
                    |
      App route table: 0.0.0.0/0 -> NAT
                    |
       NAT Gateway in public subnet A
                    |
      Public route table -> Internet Gateway
                    |
     Package repositories / GitHub / GHCR
```

The NAT translates outbound connections so the private server can fetch software without having a public IP. Responses return through that connection.

**The NAT is not the visitor entrance.** It does not let someone on the internet open a new unsolicited connection to our private EC2 server.

Phase A uses one NAT Gateway for both application subnet route tables. It has ongoing charges and is a single-AZ outbound dependency. An outage there can prevent downloads and new-instance bootstrap in either app zone. Already-running app requests through the load balancer do not normally traverse the NAT.

## 4. Phase A foundations we reused

Region: **Ohio, `us-east-2`**. VPC: **`factory-vpc`, `10.0.0.0/16`**.

| Subnet | Zone | CIDR | Role |
|---|---|---|---|
| `factory-public-a` | `us-east-2a` | `10.0.1.0/24` | Load balancer and NAT location. |
| `factory-public-b` | `us-east-2b` | `10.0.2.0/24` | Second load-balancer zone. |
| `factory-app-a` | `us-east-2a` | `10.0.11.0/24` | Current test EC2. |
| `factory-app-b` | `us-east-2b` | `10.0.12.0/24` | Future second-zone app capacity. |
| `factory-db-a` | `us-east-2a` | `10.0.21.0/24` | Future private RDS placement. |
| `factory-db-b` | `us-east-2b` | `10.0.22.0/24` | Future second-zone RDS placement. |

Firewall rules already described in `infra/security-groups.tf`:

| Connection | Rule and reason |
|---|---|
| Internet -> load balancer | TCP 443: accept HTTPS visitors. |
| Load balancer -> app | TCP 8000, using security-group references on both sides. |
| App -> database | TCP 5432, using security-group references; prepared for Phase C. |
| App -> internet | Outbound TCP 443: software and image downloads through the NAT. |
| Internet -> app SSH | No inbound SSH rule. |

The database route table has only the VPC-local route, with no internet default route. RDS still needs to be created with public accessibility disabled and the database security group attached.

**Routes provide directions; security groups provide connection permissions. Both are necessary.**

## 5. Which files built this?

Terraform reads all `.tf` files in `infra` together. `ec2.tf` did not build the entire system by itself.

| File | Responsibility |
|---|---|
| [`../infra/main.tf`](../infra/main.tf) | Provider, `factory-terraform` profile, region, and VPC. |
| [`../infra/subnet.tf`](../infra/subnet.tf) | Six subnets across two zones. |
| [`../infra/routing.tf`](../infra/routing.tf) | Internet Gateway, NAT, Elastic IP, route tables, routes, associations. |
| [`../infra/security-groups.tf`](../infra/security-groups.tf) | Load-balancer, app, and database firewall rules. |
| [`../infra/ec2.tf`](../infra/ec2.tf) | Official Linux image lookup and private test EC2. |
| [`../infra/app-startup.sh`](../infra/app-startup.sh) | First-boot Docker/Compose installation and app startup. |
| [`../infra/certificate.tf`](../infra/certificate.tf) | ACM certificate request and DNS-verification output. |
| [`../infra/load-balancer.tf`](../infra/load-balancer.tf) | ALB, target group, instance attachment, HTTPS listener, outputs. |
| [`../Dockerfile`](../Dockerfile) | Build and run the Next.js image. |
| [`../.github/workflows/build-image.yml`](../.github/workflows/build-image.yml) | Build and publish the image through GitHub Actions. |

**Manual setup:** IAM user/group permissions and Cloudflare DNS records were configured separately in the consoles. They are not currently reproduced by these Terraform files. The existing EC2 SSM role was reported created separately and is not attached to the test instance.

## 6. How we set up EC2

`data "aws_ami" "amazon_linux"` looks up the newest available matching official Amazon Linux 2023 **x86_64** image. A data source reads information; it does not create a computer.

`resource "aws_instance" "app_test"` creates the computer:

| Setting | Current value | Reason |
|---|---|---|
| Name | `factory-app-test` | Identify the first test server. |
| Instance type | `t3.small` | 2 GiB memory as a starting point; not a capacity proof. |
| Subnet | `factory-app-a` | Keep the application in a private subnet. |
| Public IP | Disabled | Visitors should use the load balancer. |
| Security group | `factory-app` | Only the load balancer may initiate app connections on 8000. |
| Root disk | 20 GiB `gp3`, encrypted | Store Linux, Docker, and the image. |
| Delete root disk on termination | Enabled | Avoid leaving the test root disk behind. |
| Metadata tokens | Required | Use IMDSv2. |
| CPU credits | `standard` | Avoid surplus CPU-credit charges; sustained bursts may be throttled. |
| User data | `app-startup.sh` | Run first-boot setup automatically. |
| Replace on user-data change | Enabled | Rebuild this test computer when bootstrap instructions change. |

Dependencies ensure the outbound route, relevant route-table associations, and HTTPS egress rule exist before bootstrap begins.

There is currently **no attached IAM instance profile**, public IP, or SSH key configured for the test instance. Terraform uses the developer's permissions to create it; the instance does not inherit those permissions.

## 7. How Docker starts the app

The public image is:

```text
ghcr.io/grandclutch/factory-attendance:latest
```

The startup script installs Docker, enables its service, installs Compose **v2.39.4**, and writes `/opt/factory-app/compose.yaml` on EC2:

```yaml
services:
  app:
    image: ghcr.io/grandclutch/factory-attendance:latest
    restart: unless-stopped
    ports:
      - "8000:8000"
```

Then it runs `docker compose pull` and `docker compose up -d`. The public GHCR package needs no GitHub password for pulling.

- `8000:8000` maps the host's port to the container's port.
- `restart: unless-stopped` restarts the container after a crash or boot unless it was deliberately stopped.
- Docker is enabled at boot with `systemctl enable --now docker`.
- User data normally runs once on the first boot. A reboot of the same instance does not reinstall everything.
- A replacement instance runs its own first-boot setup again.
- Rebooting does not automatically pull a newer `latest` image.
- `latest` is movable. Before making a repeatable server fleet, pin a published commit-SHA tag or image digest.
- The AMI lookup also moves over time. Review future plans for AMI-driven replacements and select a deliberate release version for the fleet.
- The shell script must use **LF** line endings on Windows.

The application uses `start:aws` to listen on `0.0.0.0:8000`. Local `start` remains on `127.0.0.1`. The laptop's existing `compose.yaml` still runs the local PostgreSQL demo and was not replaced.

The AWS Compose file currently has no `DATABASE_URL`. RDS, secure credentials, and schema initialization are Phase C work. Do not add one database container per application instance: all servers need a shared durable database.

## 8. How the load balancer and HTTPS work

`infra/load-balancer.tf` adds four resources:

1. **`aws_lb.app`:** internet-facing Application Load Balancer, `factory-app-alb`, in both public subnets.
2. **`aws_lb_target_group.app`:** `factory-app-targets`, HTTP port 8000, instance targets.
3. **`aws_lb_target_group_attachment.app_test`:** registers the existing test server.
4. **`aws_lb_listener.https`:** receives HTTPS on 443 using the issued certificate and forwards to the target group.

TLS policy: `ELBSecurityPolicy-TLS13-1-2-2021-06`. There is no port-80 listener or HTTP-to-HTTPS redirect in this configuration; use `https://` explicitly.

Health-check settings:

| Setting | Value |
|---|---|
| Path | `/` |
| Protocol/port | HTTP, target traffic port 8000 |
| Successful response | HTTP 200 |
| Interval | 30 seconds |
| Timeout | 5 seconds |
| Healthy threshold | 2 consecutive successes |
| Unhealthy threshold | 3 consecutive failures |

This checks that the home page responds, not that database writes succeed. An ALB does not create replacement EC2 instances; that requires an Auto Scaling Group. If all targets are unhealthy, ALB can fail open and route to unhealthy targets. A health check alone is not a guarantee of availability.

## 9. Why we created two DNS records

### Record 1: prove domain ownership

Terraform requested a certificate for `factory-attendance.chhinlong.asia` with DNS validation. AWS returned an underscore-prefixed CNAME name and an `acm-validations.aws` target. We added that record in Cloudflare with **DNS only** and TTL **Auto**.

That record says, "We control this domain." It does not send visitors to the app. Keep it for automatic certificate renewal while the certificate is in use.

### Record 2: send visitors to AWS

| Cloudflare field | Value |
|---|---|
| Type | CNAME |
| Name | `factory-attendance` |
| Target | The `load_balancer_dns` Terraform output |
| Proxy | DNS only |
| TTL | Auto |

Cloudflare adds the zone suffix `chhinlong.asia`. The target is the ALB DNS hostname, not an EC2 private IP or a fixed load-balancer IP. If we recreate the ALB, its DNS address may change and this manual record must be updated.

## 10. IAM: our badge and the server's badge

- Developer user: `factory-developers`; group: `factory-builders`.
- Terraform provider profile: `factory-terraform`, using the temporary developer login.
- The developer had EC2 access but ACM listing initially failed with `AccessDenied`.
- A separate privileged console session added the inline group policy `factory-certificate-deployment`. Routine Terraform work continued as the developer.
- The policy allows listing in Ohio, requesting a DNS-validated certificate for the exact app domain, and selected certificate read/tag/delete actions in that account and region.
- Certificate management was initially scoped to all certificate ARNs in that account/region. Narrow it to the exact project certificate where practical, and retain a sanitized JSON policy for the submission.

The separately created `factory-ec2-ssm-role` reportedly has `AmazonSSMManagedInstanceCore`. It is **not attached** to this test server. That policy enables instance-side Systems Manager management, not web hosting. User-side session permissions are separate. The earlier profile-read/pass-role blocker remains if we choose to attach it.

Never put developer credentials into the instance or container. Add only the instance permissions needed for management or later application AWS access.

## 11. The Terraform workflow we learned

Use **CMD** from `factory-attendence\infra`. These are examples of the workflow already followed, not instructions to reapply old plans.

```cmd
terraform fmt
terraform validate
terraform plan -out=ec2.tfplan
```

Read the proposed changes together. Only after review did the learner run:

```cmd
terraform apply ec2.tfplan
```

The certificate and load balancer used the same pattern:

| Saved plan | Reviewed result |
|---|---|
| `ec2.tfplan` | 1 addition: test server. |
| `certificate.tfplan` | 1 addition: certificate request. |
| `load-balancer.tfplan` | 4 additions: ALB, target group, attachment, listener. |

The general pattern is:

```text
Edit configuration -> fmt -> validate -> plan -out=NAME.tfplan
                   -> review -> learner applies NAME.tfplan
                   -> verify live behavior
```

Key lessons:

- `fmt` tidies formatting. `validate` checks structural correctness.
- `plan` previews changes. It does not create the proposed resources.
- Saved-plan filenames are labels; they do not restrict Terraform to one `.tf` file.
- `apply` of a saved plan proceeds without another yes/no confirmation.
- Generate a fresh plan after configuration changes. Do not reuse an old saved plan.
- `known after apply` means AWS will supply that value after creation.
- `Apply complete` means provisioning succeeded, not that every app function works.
- Validation alone is not a firewall test, recovery test, or security scan.
- Keep `.tfstate`, `.tfplan`, credentials, and tokens out of Git. Keep the provider lock file in Git.

### Read-only checks and evidence

Use local resource values privately. Do not copy account-containing ARNs into submissions or recordings.

```cmd
aws ec2 get-console-output --instance-id INSTANCE_ID --latest --profile factory-terraform --region us-east-2 --query Output --output text --no-cli-pager
```

The log showed `app Pulled`, `Container factory-app-app-1 Started`, and cloud-init completion. Logs are snapshots; container startup alone does not prove ongoing app health.

```cmd
aws acm describe-certificate --certificate-arn CERTIFICATE_ARN --profile factory-terraform --region us-east-2 --query "Certificate.Status" --output text --no-cli-pager
```

Expected after DNS verification: `ISSUED`.

```cmd
aws elbv2 describe-target-health --target-group-arn TARGET_GROUP_ARN --profile factory-terraform --region us-east-2 --query "TargetHealthDescriptions[].{State:TargetHealth.State,Reason:TargetHealth.Reason,Description:TargetHealth.Description}" --output table --no-cli-pager
```

Capture `healthy` evidence next; this command's result was not supplied in the session. `--no-cli-pager` avoids the `-- More --` paging prompt.

## 12. Finish Phase B before calling it highly available

The next work is a controlled transition from one test computer to a replaceable fleet:

1. **Record a healthy target and browser response.** Establish a working baseline.
2. **Prepare a launch template.** Reuse the working Linux/Docker recipe, private networking, firewall, encrypted disk, and metadata settings. Do not use deprecated launch configurations.
3. **Pin the application release.** Choose a published SHA tag/digest; choose and review the fleet AMI deliberately. Document how to update and roll back.
4. **Review permissions.** Check developer permissions for Auto Scaling and any needed role passing/service-linked role. Scope permissions to the chosen task. If SSM is used, resolve profile read, pass-role, and user-side session permissions.
5. **Create an Auto Scaling Group.** Use both app subnets with minimum/desired capacity of at least two; explicitly review distribution across zones and the cost.
6. **Attach the group to the existing target group.** Use `health_check_type = "ELB"`, an appropriate startup grace period, and warm-up settings. App startup took roughly five minutes in the observed logs; allow enough time rather than replacing instances while they are still downloading.
7. **Verify both instances are healthy across two zones.** Check the URL and target health before any test-server removal.
8. **Demonstrate controlled failure/replacement.** With the learner's explicit approval, show healthy capacity serving while an unhealthy server is detected and replaced. Record detection/recovery time and request/retry behavior; do not promise zero interrupted in-flight requests.
9. **Retire the standalone test server and its manual target attachment.** Review the Terraform removal plan only after the fleet is healthy. Avoid leaving three app servers running unnecessarily.
10. **Update the diagram, settings, policies, evidence, and cost estimate.** They must agree with the code and deployed state.

Full attendance continuity under failure must also be tested after Phase C supplies a shared database. Scheduled shift capacity and response-time emails are Phase E work.

## 13. Capstone alignment and the road ahead

Source: `FECS329_Capstone_Factory_Attendance.pdf`, Scenario 5. Client: about 1,800 workers; peak: about 900 clock-ins in 20 minutes at 07:00 and 19:00 Cambodia time. Average peak arrivals alone are not a sufficient sizing benchmark: bursts, latency, retries, and database behavior need testing.

| Requirement | Current position | Remaining work |
|---|---|---|
| R1: fast clock-in/out | App page hosted; no AWS database yet. | Phase C persistence, Phase E capacity, measured peak behavior. |
| R2 / S1: protect attendance records | No AWS attendance storage/recovery evidence yet. | Private RDS, backup retention, recovery objectives, restore tests, transaction/retry behavior. Explain credible loss boundaries rather than claiming an absolute guarantee. |
| R3 / S3: worker-specific payslip access | Not implemented in this hosting milestone. | Phase D trusted-identity authorization design and isolation tests; do not build login. |
| R4 / S2: encrypted payslips with factory-controlled key | Encrypted EC2 disk is not proof of payslip encryption. | Phase D private S3 and customer-managed KMS key with real JSON policies. |
| R5: email HR on slowdown | Not configured. | Phase E metric, threshold, evaluation periods, CloudWatch alarm, SNS email and confirmed subscription. |
| R6: one server failing must not stop the gate | Single app server does not meet this requirement. | Finish multi-zone fleet/replacement; test app failure and shared-data continuity. |
| S4: database not reachable from internet | Private DB subnets/routes and firewall are prepared. | Phase C RDS public access disabled; configuration and live access evidence. |

### Phases C through H

- **C — database/recovery:** shared private RDS PostgreSQL with the chosen Multi-AZ design, database subnet group, secure `DATABASE_URL` delivery, invented schema/data, backups, retention, restore and retry evidence.
- **D — payslips:** private S3 storage, factory-controlled KMS encryption, worker-specific authorization explanation/tests, and the limits if server credentials are stolen. Payslips must survive EC2 replacement.
- **E — scaling/alerts:** schedule extra capacity before the two known Cambodia-time peaks, use a justified load-based policy, and email HR when the selected response-time threshold is breached. Document timezone handling.
- **F — IaC evidence:** Level 1 requires validation plus at least one meaningful firewall test; Level 2 requires full architecture and passing tests for S1-S4; Level 3 requires one command for validation, tests, and a security scan with every finding fixed or justified. A passing `validate` is not completion of these levels.
- **G — submission:** labelled architecture (1A), every setting/policy and reason (1B), resource justification and R1-R6/S1-S4 mapping plus six design answers (1C), tested IaC with Git history (1D), and normal/peak-month per-resource price estimates with export/link (1E).
- **H — defense/demo/teardown:** trace every allowed hop, rehearse misconfiguration and live IaC changes, assign team ownership, show the bonus AWS deployment, and submit teardown evidence.

### The required laptop demo is still separate

The PDF requires a free team Cloudflare account and a laptop Quick Tunnel with no custom domain or public IP:

```text
Phone on mobile data -> trycloudflare.com -> tunnel -> laptop app:8000
                                                   -> local PostgreSQL
```

Rehearse the PDF command `cloudflared tunnel --url http://localhost:8000`, verify the local app actually listens there, record an invented worker, show the laptop's listening/binding evidence, stop the tunnel, and show the URL no longer works. Explain the outbound tunnel connection and name a backup laptop. The new AWS custom-domain site does not replace this required demonstration.

The application itself is not marked. Keep login, biometrics, payroll, leave management, real worker data, and a mobile app outside scope.

## 14. Costs, cleanup, and the engineering lesson

Chargeable components now include the EC2 instance, EBS storage, ALB, NAT Gateway, applicable public IPv4 usage, and traffic/processing. Stopping EC2 does not remove NAT or ALB charges. Credits and a card limit do not replace cost tracking. The learner reported a spending limit; confirm the AWS Budgets alert and its notification before further paid expansion.

After the demo, review and remove all project resources, including instances/fleet, load balancer, database, NAT, Elastic IPs, buckets, snapshots, AMIs, and other retained storage as applicable. Some items were configured manually, so Terraform state alone is not a complete cleanup inventory. Verify the account's final resource list and submit sanitized teardown evidence.

Keep account IDs, account-containing ARNs, keys, tokens, and passwords out of code, documents, slides, and recordings. Use placeholders for private identifiers. Commit intended code/documentation only when the learner requests it.

**Today's takeaway:** we have learned to turn an app image into a reachable private-server deployment using reviewed infrastructure code. The next engineering step is to make that deployment reproducible, replaceable, and demonstrably resilient, then add durable shared data.
