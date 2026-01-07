---
title: Multi-Account AWS Environment Design
lastUpdated: 2026-01-06
---

# Multi-Account AWS Environment Design

Enterprise AWS environments require multiple accounts for security isolation, billing separation, and operational boundaries. A multi-account strategy is the foundational best practice for scaling AWS environments, enabling isolation by default while allowing explicit cross-account access where needed. This topic covers AWS Organizations, Control Tower, account vending, and multi-account governance strategies critical for the SAP-C02 exam.

Multi-account architectures address the Well-Architected Framework across all five pillars by providing operational excellence through simplified automation, enhanced security through isolation boundaries, improved reliability through fault containment, performance efficiency through independent scaling, and cost optimization through direct billing attribution to business units.

## Why Multi-Account?

### Core Benefits

Accounts serve as the fundamental **isolation boundary** for identity and access management in AWS. By default, no cross-account access is permitted unless explicitly configured, making accounts the strongest security perimeter available.

1. **Security Isolation** - Blast radius containment through account boundaries. A security incident in one account cannot directly impact resources in other accounts without cross-account permissions.

2. **Billing Separation** - Direct cost allocation to business units, teams, or projects. Consolidated billing aggregates charges while maintaining per-account visibility for chargeback models.

3. **Regulatory Compliance** - Data residency and workload isolation requirements (PCI-DSS, HIPAA, FedRAMP). Separate accounts for regulated workloads simplify audit scope and compliance demonstration.

4. **Service Quota Independence** - Each account receives independent service quotas (limits). Avoid quota exhaustion by distributing workloads across accounts, and request increases independently.

5. **Operational Boundaries** - Environment separation (production/staging/development) prevents accidental changes to production resources. Separate accounts enforce change management processes.

6. **Team Autonomy with Guardrails** - Development teams operate independently within their accounts while Service Control Policies (SCPs) enforce organizational standards from above.

7. **Fault Isolation** - Failures in one account (configuration errors, resource exhaustion, API throttling) don't cascade to other accounts, improving overall reliability.

### When to Create New Accounts

Organize accounts around **workloads** - sets of resources and components that collectively deliver business value. Common account creation triggers include:

**Organizational Boundaries:**
- Different business units, divisions, or subsidiaries
- Distinct product teams with independent operational ownership
- Different cost centers requiring separate billing attribution
- External vendor or partner access requirements (third-party isolation)

**Environment Separation:**
- Production environments (isolated from all non-production)
- Staging/pre-production environments
- Development and testing environments
- Sandbox accounts for experimentation (often ephemeral)

**Security and Compliance:**
- Data classification boundaries (PCI, HIPAA, SOC 2, ISO 27001 workloads)
- Different data residency requirements (geographic or regulatory)
- Separate accounts for security tooling (isolated from workload accounts)
- Logging and audit trail isolation (tamper-proof log storage)

**Technical Requirements:**
- Disaster recovery or backup isolation (separate from primary)
- Shared services and centralized networking
- Software development lifecycle stages (build, test, deploy)

**AWS Documentation:**
- [Multi-Account Strategy Best Practices](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html)
- [Benefits of Using Multiple AWS Accounts](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html)

## AWS Organizations

AWS Organizations is the centralized management service that enables you to consolidate multiple AWS accounts into an organization that you create and manage from a single management account. Organizations provides policy-based governance across accounts, consolidated billing, and hierarchical grouping of accounts into Organizational Units (OUs).

### Core Capabilities

**Account Management:**
- Programmatic account creation via API, CLI, and SDKs
- Automated resource deployment using CloudFormation StackSets
- Member account invitation and acceptance workflow
- Account consolidation under a single payment method

**Governance and Policy Management:**
- Service Control Policies (SCPs) to restrict service and action usage
- Tag policies to enforce tagging standards across resources
- Backup policies for centralized backup rules
- AI services opt-out policies for data privacy controls

**Integrated Security Services:**
- AWS IAM Identity Center (formerly AWS SSO) for centralized access
- Amazon GuardDuty delegated administration for threat detection
- AWS Security Hub for aggregated security findings
- AWS Config aggregator for compliance monitoring
- IAM Access Analyzer for unintended access detection
- Amazon Macie for sensitive data discovery

**Resource Sharing:**
- AWS Resource Access Manager (RAM) for cross-account resource sharing
- Centralized AWS License Manager for software licensing
- Service Catalog portfolios for standardized IT services

### Organizational Structure Design

A well-designed OU hierarchy enables policy application at scale, supports automation, and provides clear organizational boundaries.

```
Root (Organization)
 │
 ├── Management Account (Billing, Organization Administration ONLY)
 │
 ├── OU: Security
 │   ├── Security Tooling Account (GuardDuty, Security Hub, Access Analyzer)
 │   ├── Log Archive Account (Centralized CloudTrail, Config, VPC Flow Logs)
 │   └── Security Breakglass Account (Emergency access)
 │
 ├── OU: Infrastructure
 │   ├── Network Account (Transit Gateway, Direct Connect, Route 53 Resolver)
 │   ├── Shared Services Account (Active Directory, SSO, ECR, Artifact Repos)
 │   └── DNS Account (Route 53 hosted zones, optional separation)
 │
 ├── OU: Workloads
 │   ├── OU: Production
 │   │   ├── Workload-A-Prod
 │   │   ├── Workload-B-Prod
 │   │   └── Data-Platform-Prod
 │   ├── OU: Staging
 │   │   ├── Workload-A-Staging
 │   │   └── Workload-B-Staging
 │   ├── OU: Development
 │   │   ├── Workload-A-Dev
 │   │   ├── Workload-B-Dev
 │   │   └── Integration-Test
 │   └── OU: Sandbox
 │       ├── Developer-Sandbox-1
 │       ├── Developer-Sandbox-2
 │       └── Experimentation
 │
 ├── OU: Policy Staging (Test SCPs before production)
 │   └── Test-Account
 │
 ├── OU: Suspended
 │   └── Decommissioned-Accounts
 │
 └── OU: Exceptions (Accounts requiring unique policies)
     └── Legacy-Migration-Account
```

**OU Design Principles:**
- Group accounts by **policy requirements** (production vs. development have different SCPs)
- Create **dedicated Security OU** for AWS Control Tower compliance
- Use **nested OUs** for hierarchical policy application (policies cascade down)
- Maintain **Policy Staging OU** to test SCPs before organization-wide deployment
- Keep **Suspended OU** for decommissioned accounts (retain for audit history)

**AWS Documentation:**
- [AWS Organizations Overview](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html)
- [Best Practices for Organizational Units](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_mgmt-acct.html)
- [Creating and Managing an Organization](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_org.html)

### Core Accounts Architecture

Certain accounts serve foundational roles in a multi-account environment. These specialized accounts should be carefully managed with restricted access.

#### Management Account (Payer Account)

**Purpose:** Billing consolidation and organization-level administration ONLY.

**Key Responsibilities:**
- Consolidated billing for all member accounts
- Organization creation and policy management
- Invitation and removal of member accounts
- Enable AWS service access for organization integration
- Root user MFA and access key management

**Critical Restrictions:**
- **NEVER run production workloads** - minimizes attack surface
- **Highly restricted access** - limit to organization administrators only
- **No service deployments** - avoid creating resources that could impact billing visibility
- **Root email as distribution list** - ensure multiple stakeholders receive critical notifications
- **SCPs do NOT apply** - management account is exempt from SCP restrictions

**Best Practices:**
- Enable CloudTrail logging for all management account activities
- Apply AWS Control Tower guardrails for drift detection
- Use IAM Identity Center for human access (disable IAM users)
- Implement MFA for root user and store credentials in secure vault
- Regular access reviews and audit of management account permissions

#### Security Tooling Account

**Purpose:** Centralized security monitoring and threat detection across all accounts.

**Delegated Administrator for:**
- Amazon GuardDuty (threat detection master)
- AWS Security Hub (aggregated security findings)
- IAM Access Analyzer (unintended access detection)
- Amazon Macie (sensitive data discovery)
- AWS Audit Manager (compliance automation)
- Amazon Detective (security investigation)

**Key Features:**
- Aggregates security findings from all member accounts
- Centralized security dashboard and reporting
- Automated response through EventBridge and Lambda
- Integration with SIEM systems for enterprise monitoring
- Cross-account read permissions for security investigations

**Access Control:**
- Security team has read access to all accounts via cross-account roles
- Write permissions restricted to security administrators
- Audit logging for all security tool modifications

#### Log Archive Account

**Purpose:** Tamper-proof, centralized storage for all organizational audit logs.

**Centralized Logging Sources:**
- AWS CloudTrail organization trail (all API calls)
- AWS Config configuration history and snapshots
- VPC Flow Logs from all accounts
- Amazon GuardDuty findings
- AWS Security Hub findings
- Application logs via CloudWatch Logs cross-account subscription
- Load balancer access logs (ALB, NLB, CLB)
- S3 access logs from all accounts

**Security Posture:**
- **Immutable logs** - S3 Object Lock enabled with retention periods
- **Restricted access** - read-only for auditors, deny delete for all
- **Encryption** - SSE-KMS with customer-managed keys
- **Replication** - cross-region replication for disaster recovery
- **Lifecycle policies** - automatic archival to S3 Glacier for long-term retention
- **MFA delete** - enabled on log buckets

**Compliance Benefits:**
- Centralized audit trail for SOC 2, ISO 27001, PCI-DSS compliance
- Supports forensic investigations with complete activity history
- Demonstrates tamper-proof logging to auditors

#### Network Account

**Purpose:** Centralized networking hub for hybrid and multi-account connectivity.

**Core Network Resources:**
- AWS Transit Gateway (hub for VPC interconnection)
- AWS Direct Connect connections and Virtual Interfaces
- AWS Site-to-Site VPN connections
- Route 53 Resolver endpoints and rules (DNS forwarding)
- AWS Network Firewall (centralized inspection)
- AWS PrivateLink endpoints for shared services
- Route 53 Private Hosted Zones (shared DNS)

**Connectivity Patterns:**
- Hub-and-spoke topology via Transit Gateway
- Shared subnet distribution via RAM (VPC sharing)
- Centralized egress/ingress through inspection VPC
- Hybrid connectivity to on-premises networks

**Advantages:**
- Single pane of glass for network monitoring
- Simplified routing and IP address management
- Centralized network security controls (firewall rules, NACLs)
- Cost optimization through shared NAT Gateways and Direct Connect

#### Shared Services Account

**Purpose:** Common infrastructure services consumed by workload accounts.

**Hosted Services:**
- AWS Managed Microsoft AD (directory services for all accounts)
- Amazon ECR (centralized container image registry)
- AWS Artifact repositories (Maven, npm, PyPI proxies)
- AWS License Manager (license tracking and distribution)
- AWS Service Catalog portfolios (self-service IT resources)
- Shared build pipelines (AWS CodeBuild projects)
- Centralized CI/CD tools (optional)

**Sharing Mechanism:**
- AWS Resource Access Manager for supported resource types
- Cross-account IAM roles for service access
- VPC endpoints via PrivateLink for private connectivity
- Resource-based policies for granular access control

**AWS Documentation:**
- [Best Practices for AWS Organizations Management Account](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_mgmt-acct.html)
- [Delegated Administrator for AWS Services](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_integrate_services_list.html)
- [Centralized Logging with AWS Organizations](https://aws.amazon.com/solutions/implementations/centralized-logging/)

### Service Control Policies (SCPs)

Service Control Policies are the primary governance mechanism in AWS Organizations. Unlike IAM policies that grant permissions, SCPs define the **maximum available permissions** - they set boundaries but do not grant access. SCPs act as guardrails that restrict what actions IAM users and roles can perform, even if their identity-based policies allow those actions.

#### SCP Evaluation Logic and Inheritance

**Critical Rules:**

1. **SCPs Do NOT Grant Permissions** - They only limit permissions. An SCP must allow an action, AND an identity-based or resource-based policy must grant it for the action to succeed.

2. **Effective Permissions Formula:**
   ```
   Effective Permissions = (SCP Allowances) ∩ (Identity-Based Policy Grants)
   ```
   Both must allow the action for it to be permitted.

3. **Explicit Deny Always Wins** - A deny in an SCP overrides any allows in identity-based policies, even AdministratorAccess.

4. **Hierarchical Inheritance** - SCPs attached to parent OUs cascade to all child OUs and accounts. An account inherits the intersection of all SCPs above it in the hierarchy.

5. **Management Account Exemption** - SCPs do NOT affect the management account. This is why you should never run workloads there.

6. **Root User Inclusion** - Unlike some IAM policies, SCPs affect the root user of member accounts. Service-linked roles are exempt.

7. **Default Allow** - AWS provides a FullAWSAccess policy attached by default. If you remove it, you must explicitly allow services.

**Real-World Example: Nested OU Inheritance**
```
Root (FullAWSAccess SCP)
 │
 ├─ Production OU (DenyRegionsOutsideUSEast SCP)
 │   └─ ProdAccount1
 │       Effective SCPs: FullAWSAccess AND DenyRegionsOutsideUSEast
 │       Result: Can use any service, but only in us-east-1
 │
 └─ Development OU (DenyProductionServices SCP)
     └─ DevAccount1
         Effective SCPs: FullAWSAccess AND DenyProductionServices
         Result: Cannot use production-scale services (RDS, Redshift, etc.)
```

**Testing Best Practice:**
AWS strongly recommends creating a Policy Staging OU before applying SCPs organization-wide:
1. Create test OU with single account
2. Attach SCP to test OU
3. Validate impact using IAM policy simulator and CloudTrail
4. Review IAM Access Advisor (service last accessed data)
5. Incrementally roll out to production OUs

#### Common SCP Patterns

**Pattern 1: Geographic Data Residency (Restrict to Approved Regions)**

Use case: Regulatory compliance requiring data to remain in specific geographic regions (GDPR, data sovereignty laws).

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyAllOutsideApprovedRegions",
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "aws:RequestedRegion": ["us-east-1", "us-west-2", "eu-central-1"]
      },
      "ArnNotLike": {
        "aws:PrincipalArn": "arn:aws:iam::*:role/BreakGlassRole"
      }
    }
  }]
}
```

**Key considerations:**
- Excludes global services (IAM, CloudFront, Route 53) by default
- Include exception for emergency break-glass roles
- Be aware of service availability in restricted regions

**Pattern 2: Enforce Encryption at Rest (S3 Example)**

Use case: Compliance requirements mandate all data must be encrypted.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyUnencryptedS3Uploads",
    "Effect": "Deny",
    "Action": ["s3:PutObject"],
    "Resource": "*",
    "Condition": {
      "StringNotEqualsIfExists": {
        "s3:x-amz-server-side-encryption": ["AES256", "aws:kms"]
      },
      "Null": {
        "s3:x-amz-server-side-encryption": "true"
      }
    }
  }]
}
```

**Pattern 3: Prevent Tampering with Security Services**

Use case: Ensure centralized security tools cannot be disabled by individual account administrators.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ProtectSecurityServices",
    "Effect": "Deny",
    "Action": [
      "securityhub:DisableSecurityHub",
      "securityhub:DeleteInvitations",
      "securityhub:DisassociateFromMasterAccount",
      "guardduty:DisassociateFromMasterAccount",
      "guardduty:DeleteDetector",
      "guardduty:DeleteMembers",
      "config:DeleteConfigurationRecorder",
      "config:DeleteDeliveryChannel",
      "config:StopConfigurationRecorder"
    ],
    "Resource": "*"
  }]
}
```

**Pattern 4: Deny Root User Access (Force IAM Identity Center)**

Use case: Enforce least privilege by preventing root user usage except for emergency account recovery.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyRootUserAccess",
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "StringLike": {
        "aws:PrincipalArn": "arn:aws:iam::*:root"
      }
    }
  }]
}
```

**Pattern 5: Require MFA for Sensitive Operations**

Use case: Add defense-in-depth for destructive actions.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "RequireMFAForDeletion",
    "Effect": "Deny",
    "Action": [
      "ec2:TerminateInstances",
      "rds:DeleteDBInstance",
      "s3:DeleteBucket"
    ],
    "Resource": "*",
    "Condition": {
      "BoolIfExists": {
        "aws:MultiFactorAuthPresent": "false"
      }
    }
  }]
}
```

**Pattern 6: Prevent Resource Sharing Outside Organization**

Use case: Data exfiltration prevention, ensure resources only shared within organization.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PreventExternalSharing",
    "Effect": "Deny",
    "Action": [
      "ram:CreateResourceShare",
      "ram:UpdateResourceShare"
    ],
    "Resource": "*",
    "Condition": {
      "Bool": {
        "ram:RequestedAllowsExternalPrincipals": "true"
      }
    }
  }]
}
```

**Pattern 7: Deny Expensive Services (Development/Sandbox Accounts)**

Use case: Cost control in non-production environments.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyExpensiveServices",
    "Effect": "Deny",
    "Action": [
      "redshift:*",
      "elasticache:CreateCacheCluster",
      "rds:CreateDBInstance"
    ],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "ec2:InstanceType": ["t3.micro", "t3.small", "t3.medium"]
      }
    }
  }]
}
```

**SCP Size Optimization:**
- Maximum SCP size: 5,120 bytes
- Use AWS managed SCPs where possible
- Remove whitespace (use visual editor)
- Combine related deny statements where logical

**AWS Documentation:**
- [Service Control Policies Overview](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- [Example SCPs](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html)
- [SCP Evaluation Logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)

### Tag Policies

Tag policies help standardize tags across resources in your organization's accounts, ensuring consistent tag implementation including proper case treatment of tag keys and values. Tag policies are particularly valuable for cost allocation, security classification, and compliance tracking.

**Key Features:**
- **Case-sensitive enforcement** - Ensures "CostCenter" is always capitalized correctly
- **Value validation** - Restricts tag values to approved lists (e.g., valid cost center codes)
- **Compliance reporting** - Identifies noncompliant tags via AWS Resource Groups
- **Preventive enforcement** - Can block tagging operations that don't match policy rules
- **Resource-type specific** - Apply different tag requirements to different resource types

**Important Limitation:** Tag policies only evaluate resources when they are tagged. Untagged resources are NOT evaluated for compliance. You must combine tag policies with SCPs to enforce tagging at resource creation.

**Tag Policy Example:**
```json
{
  "tags": {
    "CostCenter": {
      "tag_key": {
        "@@assign": "CostCenter",
        "@@operators_allowed_for_child_policies": ["@@none"]
      },
      "tag_value": {
        "@@assign": ["CC1001", "CC1002", "CC1003", "CC2001"],
        "@@operators_allowed_for_child_policies": ["@@append"]
      },
      "enforced_for": {
        "@@assign": [
          "ec2:instance",
          "ec2:volume",
          "rds:db",
          "s3:bucket"
        ]
      }
    },
    "Environment": {
      "tag_key": {
        "@@assign": "Environment"
      },
      "tag_value": {
        "@@assign": ["Production", "Staging", "Development", "Sandbox"]
      },
      "enforced_for": {
        "@@assign": ["ec2:*", "rds:*"]
      }
    },
    "DataClassification": {
      "tag_key": {
        "@@assign": "DataClassification"
      },
      "tag_value": {
        "@@assign": ["Public", "Internal", "Confidential", "Restricted"]
      },
      "enforced_for": {
        "@@assign": ["s3:bucket", "rds:db", "dynamodb:table"]
      }
    }
  }
}
```

**Use Cases:**
- **Cost allocation** - Ensure all billable resources tagged with valid cost center codes
- **Environment classification** - Enforce environment tags for production vs. non-production
- **Compliance tracking** - Tag resources with data classification for audit requirements
- **Automation enablement** - Consistent tagging enables automated lifecycle policies

**Combining Tag Policies with SCPs for Enforcement:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "RequireTagsOnResourceCreation",
    "Effect": "Deny",
    "Action": [
      "ec2:RunInstances",
      "rds:CreateDBInstance",
      "s3:CreateBucket"
    ],
    "Resource": "*",
    "Condition": {
      "Null": {
        "aws:RequestTag/CostCenter": "true",
        "aws:RequestTag/Environment": "true"
      }
    }
  }]
}
```

**AWS Documentation:**
- [Tag Policies in AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html)
- [Tag Policy Syntax and Examples](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies-syntax.html)

### Backup Policies

Backup policies enable centralized backup management across your organization. Define backup requirements once and apply them to OUs or accounts, ensuring consistent data protection without manual configuration in each account.

**Key Benefits:**
- **Centralized backup management** - Define backup rules once, apply to multiple accounts
- **Compliance enforcement** - Ensure regulatory backup requirements are met
- **Cost optimization** - Standardize retention policies to avoid over-retention
- **Disaster recovery readiness** - Automated cross-region backup copies

**Backup Policy Example:**
```json
{
  "plans": {
    "ProductionDailyBackup": {
      "regions": {
        "@@assign": ["us-east-1", "us-west-2"]
      },
      "rules": {
        "DailyBackupRule": {
          "schedule_expression": {
            "@@assign": "cron(0 5 ? * * *)"
          },
          "start_backup_window_minutes": {
            "@@assign": "60"
          },
          "complete_backup_window_minutes": {
            "@@assign": "120"
          },
          "lifecycle": {
            "move_to_cold_storage_after_days": {
              "@@assign": "30"
            },
            "delete_after_days": {
              "@@assign": "365"
            }
          },
          "copy_actions": {
            "arn:aws:backup:us-west-2:123456789012:backup-vault:DRVault": {
              "lifecycle": {
                "delete_after_days": {
                  "@@assign": "90"
                }
              }
            }
          }
        }
      },
      "selections": {
        "tags": {
          "BackupDaily": {
            "iam_role_arn": {
              "@@assign": "arn:aws:iam::$account:role/AWSBackupRole"
            },
            "tag_key": {
              "@@assign": "BackupDaily"
            },
            "tag_value": {
              "@@assign": ["true", "yes"]
            }
          }
        }
      }
    }
  }
}
```

**Common Backup Patterns:**
- **Production workloads** - Daily backups, 365-day retention, cross-region DR copy
- **Development/Test** - Weekly backups, 30-day retention, single region
- **Compliance archives** - 7-year retention, immutable backups with AWS Backup Vault Lock

**Backup Plan Considerations:**
- Target resources using **tags** for flexible, automated backup selection
- Use **cross-region copy** for disaster recovery
- Implement **lifecycle policies** to move to cold storage (cost optimization)
- Enable **AWS Backup Vault Lock** for immutable backups (compliance)

**AWS Documentation:**
- [Backup Policies in AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup.html)
- [AWS Backup with Organizations](https://docs.aws.amazon.com/aws-backup/latest/devguide/manage-cross-account.html)

## AWS Control Tower

AWS Control Tower is an AWS service that automates the setup of a well-architected, multi-account AWS environment based on best practices established through AWS's experience working with thousands of enterprises. Control Tower orchestrates AWS Organizations, AWS IAM Identity Center, AWS CloudFormation, AWS Config, and AWS Service Catalog to provide an opinionated landing zone that can be deployed in under an hour.

**When to Use Control Tower:**
- **New AWS environments** - Starting fresh without existing Organizations structure
- **Greenfield deployments** - No legacy accounts or complex existing configurations
- **Standardization requirements** - Need prescriptive best practices and governance
- **Limited cloud operations staff** - Automated setup reduces manual configuration
- **Compliance mandates** - Built-in guardrails for common regulatory requirements

**When NOT to Use Control Tower:**
- **Existing complex Organizations** - Migration complexity may outweigh benefits
- **Highly customized requirements** - Control Tower's opinionated approach may conflict
- **Multi-region management accounts** - Control Tower requires home region selection

### Landing Zone Architecture

The landing zone is the well-architected, multi-account baseline that Control Tower deploys. It establishes your initial AWS environment with security and operational best practices.

**Automatically Deployed Components:**

1. **Foundational OUs:**
   - **Security OU** - Contains Log Archive and Audit (Security) accounts
   - **Sandbox OU** - For experimental workloads (optional)
   - **Custom OUs** - Created as needed for workload organization

2. **Shared Accounts:**
   - **Management Account** - Organization management and billing (existing account)
   - **Log Archive Account** - Centralized logging storage with read-only access
   - **Audit (Security) Account** - Security monitoring delegated administrator

3. **Centralized Logging:**
   - AWS CloudTrail organization trail (encrypted, log file validation enabled)
   - AWS Config configuration history in all accounts and regions
   - Logs stored in Log Archive account S3 bucket with S3 Object Lock
   - Amazon SNS topics for notifications

4. **AWS IAM Identity Center:**
   - Pre-configured with permission sets for common roles
   - Integration with existing identity providers (AD, Okta, Azure AD)
   - Single sign-on access to all accounts in organization

5. **Guardrails (Controls):**
   - Preventive controls (SCPs) automatically applied
   - Detective controls (AWS Config rules) monitoring compliance
   - Mandatory guardrails cannot be disabled

### Guardrails (Controls)

Guardrails are high-level rules providing ongoing governance. They ensure accounts remain compliant with organizational policies and prevent drift from baseline configuration.

**Guardrail Behavior Types:**

1. **Preventive Guardrails** - Implemented using Service Control Policies (SCPs)
   - **Block actions before they occur**
   - Example: Prevent disabling of encryption on S3 buckets
   - Cannot be circumvented by account administrators
   - Enforcement is immediate and automatic

2. **Detective Guardrails** - Implemented using AWS Config Rules
   - **Detect policy violations after they occur**
   - Example: Detect if MFA is not enabled on root user
   - Generate findings in AWS Security Hub
   - Can trigger automated remediation via Lambda

3. **Proactive Guardrails** - Implemented using CloudFormation Hooks (newer feature)
   - **Assess resource compliance before provisioning**
   - Example: Block deployment of non-compliant CloudFormation templates
   - Evaluated during stack creation/update operations
   - Prevents deployment of non-compliant infrastructure-as-code

**Guardrail Guidance Levels:**

1. **Mandatory** - Always enforced, cannot be disabled
   - Example: "Disallow policy changes to log archive" (Preventive)
   - Example: "Detect public write access to S3 buckets" (Detective)
   - Implement fundamental security and governance baselines

2. **Strongly Recommended** - Best practices, optional but encouraged
   - Example: "Enable MFA for root user" (Detective)
   - Example: "Disallow internet connection to RDS instances" (Preventive)
   - Align with AWS Well-Architected Framework

3. **Elective** - Organization-specific requirements
   - Example: "Disallow Amazon EC2 instances without IMDSv2" (Preventive)
   - Example: "Detect whether encryption is enabled for EBS volumes" (Detective)
   - Customize based on compliance needs

**Control Tower Dashboard:**
- **OU compliance status** - Visual indicators for policy adherence
- **Account compliance** - Per-account guardrail violation tracking
- **Non-compliant resources** - Detailed findings with remediation guidance
- **Drift detection** - Identifies manual changes to landing zone baseline
- **Guardrail catalog** - Browse and enable optional controls

**Common Guardrail Examples:**

| Guardrail | Type | Guidance | Purpose |
|-----------|------|----------|---------|
| Disallow changes to CloudTrail | Preventive | Mandatory | Prevent tampering with audit logs |
| Detect public read on S3 | Detective | Mandatory | Identify data exposure risks |
| Disallow root user access | Preventive | Strongly Recommended | Enforce least privilege |
| Enable MFA for IAM users | Detective | Strongly Recommended | Multi-factor authentication |
| Disallow VPC peering to external accounts | Preventive | Elective | Network boundary control |
| Detect unencrypted RDS instances | Detective | Elective | Data encryption compliance |

### Account Factory

Account Factory is Control Tower's automated, self-service account provisioning capability. It standardizes account creation with pre-approved baseline configurations, ensuring every new account starts with consistent security, logging, and governance controls.

**Account Factory Workflow:**

```
1. User requests account via AWS Service Catalog
   - Specify account name, email, OU, and VPC configuration
   - Select from pre-approved account templates
   ↓
2. Control Tower validates request
   - Checks email uniqueness (AWS requirement)
   - Validates OU exists and is registered with Control Tower
   - Confirms user has provisioning permissions
   ↓
3. Account creation initiated
   - New AWS account created via Organizations API
   - Root user email and account details configured
   - Account added to organization
   ↓
4. Baseline CloudFormation StackSets deployed to new account:
   - AWS Config configuration recorder and delivery channel
   - CloudTrail logging integration with Log Archive account
   - IAM roles for cross-account access (AWSControlTowerExecution)
   - SNS topics for compliance notifications
   - VPC and networking (optional)
   ↓
5. Account added to designated OU
   - Inherits all SCPs attached to OU hierarchy
   - Guardrails automatically applied based on OU
   ↓
6. Compliance baseline established
   - Detective guardrails begin monitoring
   - Preventive guardrails enforce policies
   - Account appears in Control Tower dashboard
   ↓
7. Account ready for workload deployment
   - IAM Identity Center access provisioned
   - Users can log in via AWS access portal
   - Workload teams can deploy resources
```

**Account Factory Features:**

- **Standardized baseline** - Every account starts with identical security posture
- **Self-service provisioning** - Reduces central IT bottleneck
- **VPC automation** - Optional automated VPC with public/private subnets
- **Guardrail inheritance** - OU-level policies automatically applied
- **Customizable blueprints** - Define account templates for different purposes
- **Audit trail** - All provisioning actions logged in CloudTrail

**Account Factory Customization:**

You can customize Account Factory to include organization-specific requirements:
- Additional CloudFormation StackSets (deploy custom resources)
- Custom IAM roles and policies
- Tagging strategies
- Network configurations
- Service enablement (GuardDuty, Security Hub already automatic in Audit account)

### Customizations for Control Tower (CfCT)

Customizations for AWS Control Tower (CfCT) is a framework that extends Control Tower's baseline capabilities with custom resources and configurations. It integrates with Account Factory to automatically deploy organization-specific requirements during account provisioning.

**Use Cases:**
- Deploy additional security tooling (SIEM agents, endpoint protection)
- Configure custom networking (Direct Connect, Transit Gateway attachments)
- Apply organization-specific SCPs beyond Control Tower defaults
- Integrate with third-party tools (monitoring, configuration management)
- Establish custom compliance baselines (PCI-DSS, HIPAA requirements)

**CfCT Architecture:**

```
CfCT Pipeline (CodePipeline)
│
├── Source Stage: Configuration Git repository
│   └── manifest.yaml (defines customizations)
│   └── CloudFormation templates
│   └── Custom SCPs
│
├── Build Stage: Package and validate
│   └── Validate templates and policies
│   └── Build deployment packages
│
└── Deploy Stage: Apply customizations
    ├── Deploy StackSets to target accounts/OUs
    ├── Apply custom SCPs
    └── Configure AWS Config rules
```

**Manifest File Example:**
```yaml
region: us-east-1
version: 2021-03-15

resources:
  - name: SecurityAgentStackSet
    resource_file: templates/security-agent.yaml
    deployment_targets:
      organizational_units:
        - Production
        - Development
    regions:
      - us-east-1
      - us-west-2

  - name: CustomSCP
    resource_file: policies/custom-scp.json
    deployment_targets:
      organizational_units:
        - Sandbox
```

**Benefits:**
- **Automated deployment** - Customizations applied during account creation
- **Version control** - Infrastructure-as-code for organizational policies
- **Drift prevention** - Continuous deployment ensures consistency
- **Rollback capability** - Git-based versioning enables rollback

**AWS Documentation:**
- [AWS Control Tower Overview](https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html)
- [Account Factory](https://docs.aws.amazon.com/controltower/latest/userguide/account-factory.html)
- [Customizations for AWS Control Tower](https://docs.aws.amazon.com/controltower/latest/userguide/cfct-overview.html)
- [Control Tower Guardrails Reference](https://docs.aws.amazon.com/controltower/latest/userguide/guardrails.html)

## AWS IAM Identity Center (Formerly AWS SSO)

AWS IAM Identity Center is the AWS-recommended solution for managing workforce user access to AWS accounts and cloud applications. It provides single sign-on access, centralized permission management, and integration with external identity providers. IAM Identity Center was renamed from AWS Single Sign-On on July 26, 2022.

**Key Value Proposition:**
- **One place to manage access** across all AWS accounts in your organization
- **Single federation setup** - Configure SAML once instead of per-account
- **Reduced operational overhead** - No need to create IAM users in each account
- **Centralized audit** - All access via Identity Center logged with user identity
- **Trusted identity propagation** - User identity flows across AWS managed applications

### Core Components

#### 1. Identity Sources

IAM Identity Center supports three identity source types:

**Identity Center Directory (Default):**
- Built-in directory managed by AWS
- Simple user and group management
- Suitable for organizations without existing directory
- Supports MFA enrollment directly
- User/password reset capabilities

**AWS Managed Microsoft AD:**
- Integration with AWS Directory Service for Microsoft Active Directory
- Bidirectional trust with on-premises AD possible
- Supports existing AD users and groups
- Native AD group membership controls access
- Enables existing corporate credentials

**External Identity Provider (SAML 2.0):**
- Integrate with third-party IdPs (Okta, Azure AD, Ping Identity, OneLogin)
- Leverage existing enterprise identity management
- Supports IdP-initiated and SP-initiated SSO flows
- Automatic user provisioning via SCIM (System for Cross-domain Identity Management)
- Certificate rotation and management required

**Best Practice:** Use External IdP or AWS Managed Microsoft AD for enterprise environments to leverage existing identity lifecycle management and conditional access policies.

#### 2. Permission Sets

Permission sets are templates that define what users can do in AWS accounts. When assigned, IAM Identity Center creates corresponding IAM roles in target accounts.

**Permission Set Composition:**
- **AWS managed policies** - Pre-defined policies like AdministratorAccess, ReadOnlyAccess
- **Customer managed policies** - Policies you create and manage in IAM
- **Inline policies** - Policies embedded directly in the permission set
- **Permissions boundary** - Maximum permissions limit (optional)
- **Session duration** - How long temporary credentials remain valid (1-12 hours)

**Permission Set Assignment Model:**
```
User/Group + Permission Set + Account(s) = Access
```

Example: Developers group + DeveloperAccess permission set + Development OU accounts = Developers can access all dev accounts with developer permissions.

**Real-World Permission Set Examples:**

**Production Administrator:**
```json
{
  "Name": "ProductionAdministrator",
  "Description": "Full admin access to production accounts with MFA required",
  "SessionDuration": "PT4H",
  "ManagedPolicies": [
    "arn:aws:iam::aws:policy/AdministratorAccess"
  ],
  "InlinePolicy": {
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "RequireMFAForAdmin",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }]
  }
}
```

**Developer Access (PowerUser without IAM):**
```json
{
  "Name": "DeveloperAccess",
  "Description": "Developer access to development accounts",
  "SessionDuration": "PT8H",
  "ManagedPolicies": [
    "arn:aws:iam::aws:policy/PowerUserAccess"
  ],
  "InlinePolicy": {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Deny",
      "Action": [
        "iam:*",
        "organizations:*",
        "account:*"
      ],
      "Resource": "*"
    }]
  }
}
```

**Read-Only Auditor:**
```json
{
  "Name": "SecurityAuditor",
  "Description": "Read-only access for security audits",
  "SessionDuration": "PT12H",
  "ManagedPolicies": [
    "arn:aws:iam::aws:policy/SecurityAudit",
    "arn:aws:iam::aws:policy/ViewOnlyAccess"
  ],
  "InlinePolicy": {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "access-analyzer:*",
        "guardduty:Get*",
        "guardduty:List*"
      ],
      "Resource": "*"
    }]
  }
}
```

#### 3. Multi-Account Access Workflow

```
1. User logs into AWS access portal (https://<subdomain>.awsapps.com/start)
   ↓
2. User authenticates via identity source (AD, Okta, Identity Center directory)
   ↓
3. Portal displays all accounts user has access to
   ↓
4. User selects account and permission set
   ↓
5. IAM Identity Center assumes corresponding IAM role in target account
   ↓
6. Temporary credentials issued (session duration from permission set)
   ↓
7. User accesses AWS Management Console or programmatic access via CLI/SDK
```

**Programmatic Access:**
Users can retrieve temporary credentials for CLI/SDK access via `aws sso login` command or by generating access keys from the AWS access portal.

#### 4. Instance and Application Integration

IAM Identity Center provides single sign-on to:
- **AWS Management Console** - All accounts in organization
- **AWS CLI and SDKs** - Temporary credential provider
- **AWS managed applications:**
  - Amazon Q Developer
  - Amazon Managed Grafana
  - Amazon SageMaker Studio
  - AWS IoT SiteWise
- **Custom SAML 2.0 applications** - Integrate third-party apps
- **Cloud applications** - Pre-configured templates for popular SaaS apps

### Deployment Modes

**Organization Instance (Recommended):**
- Deployed in AWS Organizations management account
- Enables multi-account access management
- Single IAM Identity Center instance per organization
- Best practice for production environments

**Account Instance:**
- Deployed in standalone AWS account
- Limited to single account access
- Useful for application SSO without multi-account needs
- Cannot be converted to organization instance later

### Advanced Features

**Attribute-Based Access Control (ABAC):**
- Pass user attributes from IdP as session tags
- Use attributes in IAM policies for fine-grained access
- Example: Grant access based on department, cost center, or project attributes

**Session duration and MFA:**
- Configure session duration per permission set (1-12 hours)
- Require MFA at IdP level for sensitive permission sets
- Re-authentication required when session expires

**CloudTrail Integration:**
- All SSO sign-ins logged to CloudTrail
- User identity preserved in API calls (not just role name)
- Enhanced audit capability compared to cross-account IAM roles

**AWS Documentation:**
- [AWS IAM Identity Center Overview](https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html)
- [Permission Sets](https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetsconcept.html)
- [Identity Sources](https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source.html)
- [Multi-Account Access](https://docs.aws.amazon.com/singlesignon/latest/userguide/useraccess.html)

## Resource Sharing with AWS Resource Access Manager (RAM)

AWS Resource Access Manager (RAM) enables you to securely share AWS resources across AWS accounts within your organization or with any AWS account. RAM eliminates the need to create duplicate resources in multiple accounts, reducing operational overhead and improving consistency.

**Core Benefits:**

1. **Reduce Operational Overhead** - Create resources once, use across accounts
2. **Centralized Management** - Single resource to manage instead of distributed duplicates
3. **Cost Optimization** - Avoid duplicate provisioning costs
4. **Consistent Configuration** - One source of truth for shared resources
5. **Granular Permissions** - Control what principals can do with shared resources
6. **Visibility and Auditability** - CloudTrail and CloudWatch integration

### How RAM Works

**Resource Sharing Flow:**

```
1. Resource Owner (Source Account)
   └── Creates resource (e.g., Transit Gateway, subnet)
   └── Creates resource share via RAM
        ├── Specifies resources to share
        ├── Specifies principals (accounts, OUs, IAM roles/users)
        └── Attaches managed permissions

2. Within AWS Organizations (trusted sharing)
   └── Resource appears immediately in participant accounts
   └── No acceptance required for org accounts

3. External to Organizations (untrusted sharing)
   └── Participant receives invitation
   └── Must accept resource share
   └── Resource becomes available after acceptance

4. Participant Account (Consumer)
   └── Resource visible in service console
   └── Can use resource per assigned permissions
   └── Cannot modify or delete (owner retains control)
```

**Key Constraint:** Regional resources must be in the same AWS Region as the resource share. Global resources require resource share in us-east-1.

### Shareable Resource Types

**Networking:**
- VPC subnets (VPC sharing pattern)
- Transit Gateway and attachments
- Route 53 Resolver rules and endpoints
- AWS App Mesh meshes
- AWS Cloud WAN core networks

**Security and Governance:**
- AWS License Manager configurations
- AWS Certificate Manager Private Certificate Authority
- AWS Verified Access instances

**Compute:**
- EC2 Capacity Reservations
- EC2 Dedicated Hosts
- EC2 Image Builder components and images
- AWS Outposts local gateway route tables

**Storage and Databases:**
- Amazon Aurora DB clusters (cross-account cloning)
- AWS Glue catalogs, databases, and tables
- AWS S3 on Outposts access points

**Application Integration:**
- AWS CodeBuild projects and report groups
- Amazon SageMaker Private Workforce
- AWS Systems Manager Incident Manager contacts and response plans
- AWS Resource Groups

**Not all resources support sharing with IAM roles/users** - check documentation for specific resource type capabilities.

### VPC Sharing Architecture Pattern

VPC sharing is the most common RAM use case, enabling centralized network management while allowing workload teams autonomy.

**Architecture:**

```
Network Account (Owner)
│
├── VPC (10.0.0.0/16)
│   ├── Public Subnet A (10.0.1.0/24) ───┐
│   ├── Public Subnet B (10.0.2.0/24)    │
│   ├── Private Subnet A (10.0.11.0/24) ─┤ Shared via RAM
│   ├── Private Subnet B (10.0.12.0/24)  │
│   ├── Data Subnet A (10.0.21.0/24) ────┘
│   └── Data Subnet B (10.0.22.0/24)
│
└── Participants (Workload Accounts)
    ├── App-Team-1 Account
    │   ├── Launch EC2 in shared private subnet
    │   ├── Create security groups (account-specific)
    │   ├── Deploy load balancers
    │   └── Cannot modify subnet, route table, or NACLs
    │
    └── App-Team-2 Account
        ├── Launch resources in shared subnets
        ├── Isolated via security groups
        └── Share underlying network infrastructure
```

**VPC Sharing Capabilities:**

**Owner Account Can:**
- Create, modify, delete subnets
- Create, modify route tables
- Create, modify NACLs
- Create VPC endpoints
- Manage Transit Gateway attachments
- View all resources in shared subnets

**Participant Accounts Can:**
- Launch resources (EC2, RDS, Lambda) in shared subnets
- Create security groups (within their account)
- Create load balancers
- Create PrivateLink endpoints
- Reference shared subnets in CloudFormation

**Participant Accounts CANNOT:**
- Modify or delete shared subnets
- Modify route tables or NACLs
- View or modify resources from other participant accounts
- Change subnet CIDR blocks
- Delete the VPC

**VPC Sharing Benefits:**
- **Reduced IP address fragmentation** - Efficient CIDR utilization
- **Simplified network management** - Central team manages connectivity
- **Lower VPC count** - Fewer VPCs to manage (quota and operational)
- **Cost savings** - Shared NAT Gateways, Transit Gateway attachments
- **Simplified security** - Centralized security group rules, NACLs

**VPC Sharing Considerations:**
- **Service quotas** - Some limits (security groups per VPC) apply at VPC level, shared across participants
- **Security group references** - Cannot reference security groups from other participant accounts
- **CloudFormation** - Participant accounts can use `!Ref` for shared subnet IDs
- **Compliance** - Consider whether compliance boundaries align with VPC sharing model

### Transit Gateway Sharing Pattern

```
Network Account (Owner)
│
├── Transit Gateway (tgw-12345)
│   └── Shared via RAM to entire Organization
│
└── Participant Accounts
    ├── Production Account
    │   ├── Create TGW attachment to VPC
    │   ├── Accept attachment in Network account
    │   └── Add routes to TGW
    │
    ├── Development Account
    │   └── Create TGW attachment to VPC
    │
    └── On-Premises Connectivity
        └── Network account manages VPN/DX attachments
```

**Transit Gateway Sharing Workflow:**

1. Network account creates Transit Gateway and shares via RAM
2. Participant account creates TGW attachment to their VPC
3. Owner (Network account) accepts or auto-accepts attachment
4. Participant adds routes in VPC route tables pointing to TGW
5. Network account controls TGW route tables for inter-VPC routing

**Advantages:**
- **Centralized routing control** - Network team controls connectivity policies
- **Cost efficiency** - Single Transit Gateway instead of per-account
- **Simplified hybrid connectivity** - Direct Connect/VPN managed centrally
- **Scalability** - Supports thousands of VPC attachments

### Resource Share Management

**Creating a Resource Share:**

```bash
aws ram create-resource-share \
  --name "SharedTransitGateway" \
  --resource-arns "arn:aws:ec2:us-east-1:123456789012:transit-gateway/tgw-12345" \
  --principals "arn:aws:organizations::123456789012:organization/o-abc123" \
  --permission-arns "arn:aws:ram::aws:permission/AWSRAMDefaultPermissionTransitGateway"
```

**Sharing with Organizational Units:**

```bash
aws ram create-resource-share \
  --name "ProductionSubnets" \
  --resource-arns "arn:aws:ec2:us-east-1:123456789012:subnet/subnet-abc123" \
  --principals "arn:aws:organizations::123456789012:ou/o-abc123/ou-prod-12345"
```

**Managed Permissions:**
- AWS provides default managed permissions for each resource type
- Permissions define what actions participants can perform
- Cannot be modified (use custom policies in target account for additional restrictions)

### RAM vs. Resource-Based Policies

| Feature | AWS RAM | Resource-Based Policy |
|---------|---------|----------------------|
| Share with Org/OU | Yes (no account enumeration) | No (must list each account) |
| Visibility in Console | Yes (native integration) | No (must use ARN reference) |
| Owner Visibility | See all principals with access | Manual tracking |
| Invitation Process | Built-in for external accounts | N/A |
| Permission Management | Managed permissions | Custom JSON policies |
| Multi-Resource Sharing | Single resource share for multiple resources | One policy per resource |

**Migration:** Use `PromoteResourceShareCreatedFromPolicy` API to convert resource-based policy shares to RAM for better management.

**AWS Documentation:**
- [AWS RAM Overview](https://docs.aws.amazon.com/ram/latest/userguide/what-is.html)
- [Shareable AWS Resources](https://docs.aws.amazon.com/ram/latest/userguide/shareable.html)
- [VPC Sharing](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-sharing.html)
- [Working with Shared AWS Resources](https://docs.aws.amazon.com/ram/latest/userguide/working-with-shared.html)

## Service Catalog

Provide self-service IT resources with governance.

### Portfolio Structure

```
IT Portfolio
├── Product: Web Application Stack
│   ├── Version 1.0 (CloudFormation template)
│   ├── Version 2.0
│   └── Constraints
│       ├── Tag enforcement
│       └── Region restriction
├── Product: Database Instance
└── Product: S3 Bucket with Encryption
```

**Key Features:**
- Self-service provisioning
- Cost visibility
- Compliance controls
- Version management
- Tag enforcement
- Launch constraints (IAM roles)

### Multi-Account Distribution

Use StackSets to distribute portfolios across accounts:
1. Create portfolio in hub account
2. Share portfolio to spoke accounts
3. Users provision products with consistent configuration

## Account Provisioning Patterns

### 1. Manual (Small Scale)

- Create accounts via Organizations console
- Manually configure baseline resources
- Suitable for <10 accounts

### 2. Account Factory (Control Tower)

- Self-service via Service Catalog
- Automated baseline deployment
- Suitable for 10-100 accounts

### 3. Custom Automation (Large Scale)

- API-driven account creation
- Custom vending machine
- Infrastructure as Code
- Suitable for 100+ accounts

**Custom Vending Flow:**
```python
def create_account(name, email, ou):
    # 1. Create account
    response = org.create_account(
        AccountName=name,
        Email=email
    )
    account_id = response['CreateAccountStatus']['AccountId']

    # 2. Move to OU
    org.move_account(
        AccountId=account_id,
        SourceParentId=root_id,
        DestinationParentId=ou_id
    )

    # 3. Deploy baseline via StackSets
    cfn.create_stack_instances(
        StackSetName='AccountBaseline',
        Accounts=[account_id]
    )

    # 4. Configure logging
    configure_cloudtrail(account_id)
    configure_config(account_id)

    # 5. Enable security services
    enable_guardduty(account_id)
    enable_security_hub(account_id)

    return account_id
```

## Centralized Logging

### Architecture Pattern

```
Member Accounts (Workloads)
│
├── CloudTrail logs ───────┐
├── Config snapshots ──────┤
├── VPC Flow Logs ─────────┤
└── Application logs ──────┤
                           │
                           ▼
                   Logging Account
                   ├── S3 Bucket (centralized logs)
                   ├── Athena (log analysis)
                   ├── Glue (log cataloging)
                   └── QuickSight (dashboards)
```

**Implementation:**
1. Create organization trail in management account
2. Logs delivered to S3 in logging account
3. Bucket policy allows log delivery
4. Encryption with KMS key
5. Log file integrity validation enabled

## Delegated Administration

Allow non-management accounts to administer services:

**Supported Services:**
- GuardDuty
- Security Hub
- Config
- CloudFormation StackSets
- Firewall Manager
- Access Analyzer
- Macie
- Detective

**Benefits:**
- Reduce management account usage
- Separate concerns
- Follow least privilege

**Example:**
```bash
# Delegate Security Hub to security account
aws securityhub enable-organization-admin-account \
  --admin-account-id 123456789012
```

## Multi-Account Governance

### Config Aggregator

Centralize Config data across accounts and regions:
```
Security Account (Aggregator)
    ▲
    │ Config data
    │
┌───┼────┬─────┬─────┐
│   │    │     │     │
Acct1 Acct2 Acct3 Acct4
```

### Security Hub Master

Aggregate security findings:
- GuardDuty findings
- Config rule violations
- IAM Access Analyzer findings
- Inspector findings
- Macie discoveries

### Centralized Cost Management

**Cost Explorer:**
- Linked accounts consolidated
- Cost allocation tags
- RI/Savings Plans sharing

**Budgets:**
- Organization-level budgets
- Account-level budgets
- Alerts and notifications

## SAP-C02 Exam Focus Areas

### Critical Exam Concepts

**1. Multi-Account Foundation Principles:**
- Accounts are isolation boundaries for security, billing, and operations
- Multi-account strategy is the recommended approach for ALL organizations at scale
- By default, accounts have no cross-account access unless explicitly configured

**2. AWS Organizations Policy Hierarchy:**
- SCPs do NOT grant permissions, only set maximum boundaries
- Effective permissions = SCP allowances ∩ Identity-based policy grants
- Explicit deny in SCP overrides any allow, even AdministratorAccess
- Management account is EXEMPT from SCPs (reason to never run workloads there)
- SCPs affect root user of member accounts (unlike some IAM policies)

**3. Control Tower vs. Manual Organizations:**
- Control Tower = opinionated, automated landing zone (use for greenfield)
- Manual Organizations = custom OU structure, manual baseline (use for brownfield/complex)
- Control Tower guardrails: Preventive (SCP), Detective (Config), Proactive (CFN Hooks)
- Account Factory integrates with Service Catalog for self-service provisioning

**4. IAM Identity Center (SSO) Architecture:**
- Replaces individual IAM users across accounts with centralized identity
- Permission sets = templates that create IAM roles in target accounts
- Assignment model: User/Group + Permission Set + Account(s) = Access
- Organization instance (in management account) required for multi-account access

**5. AWS RAM Resource Sharing:**
- Share resources, don't duplicate (VPC subnets, Transit Gateway, Route 53 Resolver)
- VPC sharing: Owner controls subnets/routing, participants launch resources
- Participants CANNOT modify shared resources or see other participants' resources
- Within Organizations = automatic sharing, external accounts = invitation required

**6. Centralized Logging and Security:**
- Organization trail = single CloudTrail for all accounts (created in management, logs to Log Archive)
- Delegated administrator for security services (GuardDuty, Security Hub, Macie) = security account
- Config aggregator centralizes compliance data from all accounts
- Logs must be tamper-proof: S3 Object Lock, MFA delete, encryption, cross-region replication

**7. Policy Types and Use Cases:**
- SCPs: Permission boundaries, enforcement (preventive security)
- Tag policies: Tagging standards, compliance reporting (combine with SCP for enforcement)
- Backup policies: Centralized backup rules, disaster recovery
- AI services opt-out policies: Data privacy controls

### Common Exam Scenarios and Solutions

**Scenario: Enforce encryption on all S3 uploads organization-wide**
- Solution: SCP with `Deny s3:PutObject` when `s3:x-amz-server-side-encryption` is null or not AES256/aws:kms
- Attach to Root or specific OUs
- Detective alternative: Config rule to detect unencrypted objects (after the fact)

**Scenario: Prevent data residency violations (GDPR, data sovereignty)**
- Solution: SCP with `Deny *` when `aws:RequestedRegion` not in approved list
- Include exception for break-glass roles using `ArnNotLike` condition
- Be aware global services (IAM, CloudFront, Route 53) automatically excluded

**Scenario: Central network team manages connectivity, workload teams deploy apps**
- Solution: VPC sharing via RAM
  - Network account owns VPC, subnets, routing, NACLs, Transit Gateway
  - Share subnets to workload OUs via RAM
  - Workload accounts launch resources, create security groups
  - Cost savings: shared NAT Gateway, Transit Gateway attachments

**Scenario: Enforce MFA for production account access**
- Solution: IAM Identity Center with external IdP (Okta, Azure AD)
  - Configure MFA requirement at IdP level (conditional access)
  - Permission sets with inline policy denying actions when `aws:MultiFactorAuthPresent` = false
  - Alternative: SCP requiring MFA for sensitive operations

**Scenario: Automate account provisioning with compliance baseline**
- Solution: AWS Control Tower Account Factory
  - Define account templates with baseline StackSets
  - Use Customizations for Control Tower (CfCT) for organization-specific requirements
  - Guardrails automatically applied based on target OU
  - Alternative for large scale (100+ accounts): Custom vending machine with Organizations API

**Scenario: Prevent developers from disabling security services**
- Solution: SCP denying `securityhub:DisableSecurityHub`, `guardduty:DeleteDetector`, `config:StopConfigurationRecorder`
- Attach to Development/Sandbox OUs
- Use delegated administrator so Security account manages security services

**Scenario: Separate billing for business units while maintaining central governance**
- Solution: Multiple accounts within single organization
  - Each business unit has dedicated OU with their accounts
  - Consolidated billing with cost allocation tags
  - Tag policies enforce cost center tagging
  - Cost Explorer filters by tag for chargeback

**Scenario: Audit all API calls across 50+ accounts**
- Solution: Organization CloudTrail
  - Created in management account
  - Logs delivered to S3 bucket in Log Archive account
  - Organization trail automatically includes all existing and future accounts
  - S3 Object Lock for tamper-proof logs
  - Athena for querying, GuardDuty for threat detection

### Key Service Limits and Constraints

- **Organizations:** 5 SCPs per entity (OU or account), 1,000 policies per organization
- **Control Tower:** Home region cannot be changed after setup
- **IAM Identity Center:** One instance per organization, 1-12 hour session duration
- **RAM:** Resource share must be in same region as resources (except global resources in us-east-1)
- **SCP Size:** Maximum 5,120 bytes (use AWS managed policies where possible)
- **OU Nesting:** Up to 5 levels deep

### Decision Framework

**Choose Control Tower when:**
- Greenfield environment (new AWS deployment)
- Need pre-configured landing zone quickly
- Team prefers opinionated best practices
- Compliance requirements align with available guardrails

**Choose Manual Organizations when:**
- Existing complex OU structure
- Highly customized requirements
- Brownfield migration with legacy accounts
- Control Tower's opinionated approach conflicts with needs

**Choose VPC Sharing when:**
- Centralized network management required
- Multiple teams deploying in same VPC
- IP address conservation critical
- Simplified security group management (centralized NACLs)

**Choose IAM Identity Center when:**
- Need SSO across multiple accounts
- Existing IdP (Okta, Azure AD, Active Directory)
- Want to eliminate IAM users in member accounts
- Centralized access audit trail required

**AWS Documentation:**
- [Organizing Your AWS Environment (Whitepaper)](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html)
- [AWS Security Best Practices for Multi-Account](https://aws.amazon.com/blogs/security/best-practices-for-multi-account-aws-security/)
- [AWS Organizations FAQs](https://aws.amazon.com/organizations/faqs/)
- [AWS Control Tower FAQs](https://aws.amazon.com/controltower/faqs/)
