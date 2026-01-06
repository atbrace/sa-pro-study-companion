---
title: Multi-Account AWS Environment Design
lastUpdated: 2026-01-05
---

# Multi-Account AWS Environment Design

Enterprise AWS environments require multiple accounts for security isolation, billing separation, and operational boundaries. This topic covers AWS Organizations, Control Tower, account vending, and multi-account governance strategies.

## Why Multi-Account?

### Benefits

1. **Security isolation** - Blast radius containment
2. **Billing separation** - Cost allocation by business unit
3. **Regulatory compliance** - Data residency and isolation
4. **Resource limits** - Avoid service quotas
5. **Operational boundaries** - Separate prod/dev/test
6. **Autonomy** - Team independence with guardrails

### When to Create New Accounts

- Different business units or product teams
- Production vs. non-production environments
- Data classification boundaries (PCI, HIPAA, etc.)
- Different cost centers or billing entities
- Third-party or vendor access requirements
- Disaster recovery or backup isolation

## AWS Organizations

Organizations provides centralized management of multiple AWS accounts.

### Organizational Structure

```
Root
 ├── Management Account (billing, organization admin)
 ├── OU: Security
 │   ├── Security Tooling Account
 │   └── Logging Account
 ├── OU: Infrastructure
 │   ├── Network Account
 │   └── Shared Services Account
 ├── OU: Workloads
 │   ├── OU: Production
 │   │   ├── Prod Account 1
 │   │   └── Prod Account 2
 │   ├── OU: Development
 │   │   ├── Dev Account 1
 │   │   └── Dev Account 2
 │   └── OU: Sandbox
 │       └── Sandbox Accounts
 └── OU: Suspended
     └── Decommissioned accounts
```

> 📚 [Best Practices for Organizational Units](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_mgmt-acct.html)

### Core Accounts

**Management Account:**
- Billing and cost management
- Organization administration
- NEVER run workloads here
- Highly restricted access
- Root email should be distribution list

**Security Account:**
- GuardDuty master
- Security Hub master
- Access Analyzer delegated admin
- Config aggregator
- IAM Access Analyzer

**Logging Account:**
- CloudTrail organization trail
- Config aggregation
- VPC Flow Logs
- GuardDuty findings
- Security Hub findings
- Restricted access (read-only for auditors)

**Network Account:**
- Transit Gateway
- Direct Connect
- VPN connections
- DNS (Route 53 Resolver)
- Central networking resources

**Shared Services Account:**
- Active Directory
- Centralized services (SSO, Service Catalog)
- Container registries (ECR)
- Artifact repositories

### Service Control Policies (SCPs)

SCPs are the key governance tool in Organizations.

**SCP Evaluation Logic:**
1. Explicit Deny always wins
2. Explicit Allow is required (unless FullAWSAccess)
3. Applied to OUs and cascades to accounts
4. Affects all principals except management account

**Common SCP Patterns:**

**Prevent region usage:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "aws:RequestedRegion": ["us-east-1", "us-west-2"]
      }
    }
  }]
}
```

**Require encryption:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": ["s3:PutObject"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "s3:x-amz-server-side-encryption": ["AES256", "aws:kms"]
      }
    }
  }]
}
```

**Prevent Security Hub disable:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": [
      "securityhub:DisableSecurityHub",
      "securityhub:DeleteInvitations"
    ],
    "Resource": "*"
  }]
}
```

> 📚 [SCP Examples](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html)

### Tag Policies

Enforce tagging standards across accounts:
```json
{
  "tags": {
    "CostCenter": {
      "tag_key": {
        "@@assign": "CostCenter"
      },
      "tag_value": {
        "@@assign": ["CC1001", "CC1002", "CC1003"]
      },
      "enforced_for": {
        "@@assign": ["ec2:instance", "ec2:volume"]
      }
    }
  }
}
```

### Backup Policies

Centrally manage backup requirements:
```json
{
  "plans": {
    "DailyBackup": {
      "regions": ["us-east-1", "us-west-2"],
      "rules": {
        "DailyRule": {
          "schedule_expression": "cron(0 5 ? * * *)",
          "lifecycle": {
            "delete_after_days": "35"
          }
        }
      }
    }
  }
}
```

## AWS Control Tower

Control Tower provides an opinionated landing zone with governance guardrails.

### Landing Zone Components

**Account Factory:**
- Automated account provisioning
- Baseline resources automatically deployed
- Self-service via Service Catalog
- Standard configuration and compliance

**Guardrails:**
- **Mandatory** - Always enforced (e.g., disallow public S3 buckets)
- **Strongly Recommended** - Best practices (e.g., enable MFA)
- **Elective** - Optional controls

**Guardrail Types:**
- **Preventive** - SCPs that prevent actions
- **Detective** - Config rules that detect non-compliance

**Dashboard:**
- Account status and compliance
- Guardrail violations
- Drift detection

### Account Factory Workflow

```
1. User requests account via Service Catalog
   ↓
2. Control Tower validates request
   ↓
3. New account created in Organization
   ↓
4. Baseline StackSets deployed:
   - Logging configuration
   - Security controls
   - Network configuration
   - IAM roles
   ↓
5. Account added to designated OU
   ↓
6. Guardrails applied
   ↓
7. Account ready for use
```

### Customizations for Control Tower (CfCT)

Extend Control Tower with custom resources:
- Deploy additional StackSets
- Apply custom SCPs
- Configure additional services
- Maintain consistency across accounts

> 📚 [Control Tower Customizations](https://docs.aws.amazon.com/controltower/latest/userguide/cfct-overview.html)

## AWS IAM Identity Center (SSO)

Centralized identity and access management for multiple accounts.

### Features

**Single Sign-On:**
- One login for all accounts
- SAML 2.0 federation with external IdPs
- Multi-factor authentication (MFA)
- Session duration control

**Permission Sets:**
- Reusable permissions templates
- Assign to users/groups + accounts
- Maps to IAM roles in member accounts
- Support for customer managed policies

**Identity Sources:**
- Built-in Identity Center directory
- Active Directory (AWS Managed Microsoft AD)
- External Identity Provider (Okta, Azure AD, etc.)

### Permission Set Example

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
      "Action": ["iam:*", "organizations:*"],
      "Resource": "*"
    }]
  }
}
```

## Resource Sharing

### AWS Resource Access Manager (RAM)

Share resources across accounts without duplication:

**Shareable Resources:**
- Transit Gateway
- Subnets (VPC sharing)
- Route 53 Resolver rules
- License Manager configurations
- Resource Groups
- Aurora DB clusters
- CodeBuild projects

**Sharing Patterns:**

**VPC Sharing:**
```
Network Account (Owner)
├── VPC with subnets
├── Share subnets via RAM
└── Participant accounts
    ├── Launch resources in shared subnets
    ├── Private IP addresses from shared subnet
    └── Cannot modify shared resources
```

**Transit Gateway Sharing:**
```
Network Account
├── Transit Gateway
├── Share TGW via RAM
└── Workload accounts
    ├── Create TGW attachment
    └── Route to other accounts via TGW
```

> 📚 [RAM Shareable Resources](https://docs.aws.amazon.com/ram/latest/userguide/shareable.html)

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

## Exam Tips

1. **Management account** - Never run workloads, only billing and organization management
2. **SCPs cascade** - Applied to OUs affect all child accounts
3. **Explicit deny wins** - SCPs use deny-by-default unless FullAWSAccess attached
4. **Control Tower** - Automated landing zone, use for new environments
5. **Guardrails** - Preventive (SCPs) vs. Detective (Config rules)
6. **RAM** - Share resources, don't duplicate (Transit Gateway, subnets)
7. **VPC sharing** - Participants can launch resources, not modify shared resources
8. **Service Catalog** - Self-service with governance
9. **IAM Identity Center** - Single sign-on, replaces AWS SSO
10. **Delegated admin** - Use for security services, not management account
11. **Organizational trail** - One trail for all accounts
12. **Tag policies** - Enforce tagging standards
13. **Account Factory** - Automated provisioning with Control Tower
14. **Permission Sets** - Reusable SSO permissions across accounts
15. **StackSets** - Deploy CloudFormation to multiple accounts

## Common Scenarios

### Landing Zone Account Structure

```
Root
├── Management (billing only)
├── Security OU
│   ├── Security Tooling
│   └── Logging
├── Infrastructure OU
│   ├── Network
│   └── Shared Services
├── Workloads OU
│   ├── Production OU
│   │   ├── App1-Prod
│   │   └── App2-Prod
│   ├── Staging OU
│   └── Development OU
└── Sandbox OU
    └── Developer sandboxes
```

### SCP Inheritance

```
Root (FullAWSAccess)
│
├── Production OU (RestrictToRegions)
│   └── Prod Account
│       Final permissions: FullAWSAccess AND RestrictToRegions
│
└── Development OU (NoProductionServices)
    └── Dev Account
        Final permissions: FullAWSAccess AND NoProductionServices
```

> 📚 [Multi-Account Strategy Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/)
