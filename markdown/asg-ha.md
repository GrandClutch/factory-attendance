# Architecture & Deployment Documentation: High Availability Setup (Requirement R6)

This document provides a technical log and operational record of all steps performed to deploy the high-availability, auto-scaled application tier behind an Application Load Balancer in AWS. It details the steps taken, the architectural reasoning behind each decision, and the risks mitigated.

---

## 1. Executive Summary & Objective

### The Problem
The factory attendance system was initially hosted on a single EC2 instance (`factory-app-test`) residing in a single Availability Zone (`us-east-2a`). This created multiple architectural risks:
* **Single Point of Failure (SPOF):** If the instance crashed, ran out of memory, or the underlying AWS physical host degraded, the application would experience complete downtime.
* **Datacenter/Zone Vulnerability:** If the `us-east-2a` Availability Zone suffered an outage, the service would be unreachable with no automated recovery.
* **Static Capacity:** Traffic spikes during factory shift clock-ins could overwhelm a single instance, leading to timeouts and degraded performance.

### The Solution (Requirement R6)
To satisfy production resiliency standards, the architecture was transitioned to a **Multi-AZ Auto-Scaled Deployment**:
1. **Application Load Balancer (ALB):** Acts as the single entry point, offloading SSL/TLS and distributing requests evenly across instances.
2. **Auto Scaling Group (ASG):** Spans two Availability Zones (`us-east-2a` and `us-east-2b`) with a baseline of 2 running instances, ensuring automatic failover and replacement of unhealthy nodes.
3. **Immutable Golden AMI:** Ensures rapid, repeatable instance spin-up without manual package installations or setup scripts at boot.

---

## 2. Golden AMI Creation

A custom Amazon Machine Image (AMI) was captured directly from the validated, running application instance (`factory-app-test`).

* **Source Instance:** `factory-app-test` (`i-04c0a02217e0a9f19`)
* **AMI Name:** `factory-app-ami`
* **AMI ID:** `ami-035e5d2d3ef740568`
* **Base Platform:** Amazon Linux 2023 (`al2023-ami-2023.12.20260930.0-kernel-6.1-x86_64`)
* **Status:** Verified `available` before creating the Launch Template.

### Why We Did This:
* **Elimination of Bootstrapping Latency:** If new instances install dependencies, pull Git repos, and build assets via User Data at boot, cold starts can take 5–10 minutes. A Golden AMI packages all application binaries, Python dependencies, and `systemd` unit files pre-baked into the disk image, allowing instances to become healthy within seconds.
* **Consistency & Immutability:** Pre-baking guarantees that every instance launched by the ASG is bit-for-bit identical, preventing configuration drift across the cluster.

---

## 3. Launch Template Configuration

A Launch Template was provisioned to define the baseline hardware, security, and image configurations for any instance spawned by the Auto Scaling Group.

* **Template Name:** `factory-app-lt`
* **Template ID:** `lt-0d9dec03401e4c033`
* **Version:** `1` (Default)
* **Auto Scaling Guidance:** Enabled (`Provide guidance to help me set up a template that I can use with EC2 Auto Scaling`)
* **AMI Selected:** `factory-app-ami` (`ami-035e5d2d3ef740568`)
* **Instance Type:** `t3.small` (2 vCPU, 2 GiB Memory)
* **Subnet Selection:** *Don't include in launch template*
* **Firewall / Security Group:** `factory-app` (`sg-0b227ec574ebbe42a`) allowing port `8000` from the ALB security group.

### Why We Did This:
* **Launch Template vs. Launch Configuration:** AWS has deprecated legacy Launch Configurations. Launch Templates support versioning, T3 Unlimited controls, modern IMDSv2, and dynamic parameter overrides.
* **Omitting the Subnet:** Hardcoding a subnet in a Launch Template restricts instances to a single Availability Zone. Setting subnet to *Don't include* allows the Auto Scaling Group to dynamically balance instances across multiple subnets and zones.
* **Targeted Security Group:** Enforcing the `factory-app` security group guarantees that only the ALB can reach port `8000`, blocking direct public access to internal backend ports.

---

## 4. Auto Scaling Group Deployment

An Auto Scaling Group (`factory-app-asg`) was deployed across two private application subnets within `factory-vpc`.

* **ASG Name:** `factory-app-asg`
* **Launch Template:** `factory-app-lt`
* **VPC:** `vpc-01ef8f2476b8930a8` (`factory-vpc`)
* **Subnet & Zone Mapping:**
  * Subnet `factory-app-a` (`subnet-00533fa16d70a7de9`) in `us-east-2a`
  * Subnet `factory-app-b` (`subnet-078d3a736a989d222`) in `us-east-2b`
* **Capacity Settings:**
  * **Desired Capacity:** `2`
  * **Minimum Capacity:** `2`
  * **Maximum Capacity:** `4`
* **Scaling Policies:** Static multi-AZ baseline of 2 instances with capacity headroom up to 4.

### Why We Did This:
* **High Availability (Multi-AZ):** Assigning subnets in both `us-east-2a` and `us-east-2b` allows the ASG's balancing algorithm to place one instance in each zone. If one AWS datacenter experiences network loss or hardware failure, the other zone continues serving traffic without manual intervention.
* **Zero-Downtime Self-Healing:** If an instance fails, the ASG automatically terminates the faulty instance and spins up a replacement to maintain the desired count of 2.
* **Capacity Headroom (Max: 4):** Setting Max to 4 allows scaling out during sudden factory shift traffic surges while preventing runaway infrastructure costs.

---

## 5. Load Balancer & Health Check Integration

The Auto Scaling Group was attached directly to the existing Application Load Balancer Target Group (`factory-app-targets`).

* **Load Balancer:** `factory-app-alb` (Internet-facing Application Load Balancer)
* **Target Group:** `factory-app-targets` (HTTP:8000)
* **Health Check Type:** Elastic Load Balancing (`ELB`) checks enabled
* **Health Check Grace Period:** `300` seconds
* **Listener Configuration:**
  * **Protocol/Port:** `HTTPS:443`
  * **Certificate:** AWS Certificate Manager (ACM) for `factory-attendance.chhinlong.asia`
  * **Security Policy:** `ELBSecurityPolicy-TLS13-1-2-2021-06`
  * **Default Action:** Forward to `factory-app-targets`

### Why We Did This:
* **ELB Health Checks vs. EC2 Health Checks:** Default EC2 health checks only detect hypervisor-level crashes (hardware failure). By enabling **ELB health checks**, the ASG monitors application-layer HTTP responses on port 8000. If the app process hangs or returns 5xx errors, the ALB marks it unhealthy, stops sending traffic to it, and instructs the ASG to replace it.
* **Grace Period (300 seconds):** Gives new instances 5 minutes to boot, start the service, and warm up before the ALB begins evaluating health status, preventing premature termination loops.

---

## 6. Instance Provisioning & Status Verification

Upon creation of `factory-app-asg`, AWS automatically provisioned two instances across both designated subnets. Both instances successfully passed system diagnostics and ALB target health checks:

| Instance ID | Subnet / Zone | Instance State | Status Checks | Target Group Status | Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `i-0926c6276bfd32f0c` | `factory-app-a` (`us-east-2a`) | Running | 3/3 checks passed | Healthy (Port 8000) | Managed Production Node |
| `i-0998f4b08e90304b2` | `factory-app-b` (`us-east-2b`) | Running | 3/3 checks passed | Healthy (Port 8000) | Managed Production Node |

---

## 7. Decommissioning & Cleanup

Once the ASG instances were verified as healthy in the Target Group, the original temporary setup was decommissioned:

1. **Target Deregistration:** `factory-app-test` was deregistered from `factory-app-targets`.
2. **Instance Termination:**
   * **Instance ID:** `i-04c0a02217e0a9f19` (`factory-app-test`)
   * **Action:** Terminated (deleted)
   * **Final State:** Terminated

### Why We Did This:
* **Cost Optimization:** Prevents paying for an idle, redundant instance.
* **Prevent Configuration Drift:** Leaving an unmanaged, manually launched instance in the target group risks traffic hitting a node that won't receive future automated updates or ASG lifecycle management.
* **Clean State:** Ensures 100% of production traffic is routed strictly through the managed Auto Scaling Group.

---

## 8. Final Architecture State

```text
                          [ HTTPS Request ]
                                  │
                                  ▼
               [ DNS: factory-attendance.chhinlong.asia ]
                                  │
                                  ▼
             [ Application Load Balancer: factory-app-alb ]
                    (TLS 1.3 / ACM SSL Certificate)
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
                   ▼                             ▼
        [ us-east-2a (Subnet A) ]     [ us-east-2b (Subnet B) ]
        ┌───────────────────────┐     ┌───────────────────────┐
        │  factory-app-asg Node │     │  factory-app-asg Node │
        │ (i-0926c6276bfd32f0c) │     │ (i-0998f4b08e90304b2) │
        │   Port 8000 (Healthy) │     │   Port 8000 (Healthy) │
        └───────────────────────┘     └───────────────────────┘
```
