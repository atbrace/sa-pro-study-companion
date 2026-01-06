---
title: Security Controls and Compliance
lastUpdated: 2026-01-05
---

# Security Controls and Compliance

Enterprise AWS environments require comprehensive security controls that span identity management, encryption, logging, compliance, and threat detection. This topic covers the critical security services and patterns required for the SAP-C02 exam.

## IAM and Identity Management

### Service Control Policies (SCPs)

SCPs provide central control over the maximum available permissions in an AWS Organization. They act as guardrails that apply to all accounts within an OU.

**Key Concepts:**
- SCPs affect all users and roles, including the root user
- They don't grant permissions—they define the maximum available permissions
- Explicit deny always wins
- Policies must allow IAM actions for users to perform tasks

> 📚 [AWS Organizations SCPs](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)

**Common SCP Patterns:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": ["ec2:RunInstances"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "ec2:InstanceType": ["t3.micro", "t3.small"]
      }
    }
  }]
}
```

### IAM Permission Boundaries

Permission boundaries set the maximum permissions an IAM entity can have. They're useful for:
- Delegating permission management to developers
- Preventing privilege escalation
- Enforcing organizational guardrails

### Cross-Account Access

**Three main patterns:**
1. **IAM Roles** - Preferred for AWS service-to-service
2. **Resource-based policies** - For S3, SNS, SQS, etc.
3. **Cross-account IAM users** - Discouraged

## Encryption and Key Management

### AWS KMS

KMS provides centralized key management with automatic key rotation and integration with AWS services.

**Key Types:**
- **Customer Managed Keys (CMK)** - Full control, rotation optional
- **AWS Managed Keys** - Automatic rotation every year
- **AWS Owned Keys** - Used by AWS services, no visibility

**Key Policies:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "Enable IAM policies",
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::ACCOUNT:root"},
    "Action": "kms:*",
    "Resource": "*"
  }]
}
```

**Grants:**
- Programmatic delegation of KMS permissions
- Temporary and revocable
- Used for AWS service integrations

> 📚 [KMS Key Policies](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html)

### Secrets Manager vs. Parameter Store

| Feature | Secrets Manager | Parameter Store |
|---------|----------------|-----------------|
| **Automatic rotation** | Yes (Lambda) | No |
| **Cross-account access** | Yes (resource policy) | No (must use IAM) |
| **Pricing** | Per secret + API calls | Free (Standard), low cost (Advanced) |
| **Integration** | RDS, Redshift, etc. | Any application |
| **Use case** | Database credentials | Config values, simple secrets |

## Logging and Monitoring

### CloudTrail

**Organization Trail:**
- Single trail for all accounts
- Central S3 bucket in logging account
- Aggregated log analysis
- Immutable audit record

**Best Practices:**
- Enable log file integrity validation
- Use S3 bucket policies to restrict access
- Configure SNS notifications for critical events
- Enable CloudTrail Insights for anomaly detection

> 📚 [CloudTrail Best Practices](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html)

### AWS Config

Config tracks resource configurations and evaluates compliance.

**Key Features:**
- Configuration history for all resources
- Compliance checking with Config Rules
- Automatic remediation with Systems Manager
- Aggregator for multi-account views

**Common Config Rules:**
- `required-tags` - Enforce tagging standards
- `encrypted-volumes` - Ensure EBS encryption
- `s3-bucket-public-read-prohibited` - Prevent public buckets
- `rds-encryption-enabled` - Enforce RDS encryption

## Security Services Integration

### Security Hub

Central security findings aggregator from:
- GuardDuty (threat detection)
- Inspector (vulnerability assessment)
- Macie (data discovery and protection)
- IAM Access Analyzer
- Firewall Manager
- Third-party tools

**Benefits:**
- Automated compliance checks (CIS, PCI-DSS)
- Prioritized findings with severity scores
- Custom insights and dashboards
- Automated remediation with EventBridge

### GuardDuty

Intelligent threat detection using:
- VPC Flow Logs
- CloudTrail logs
- DNS logs

**Detection categories:**
- Reconnaissance
- Instance compromise
- Account compromise
- Bucket compromise
- Cryptocurrency mining

## Compliance Frameworks

### Artifact and Compliance Reports

AWS Artifact provides on-demand access to:
- SOC reports (1, 2, 3)
- PCI DSS attestation
- ISO certifications
- HIPAA BAA

### AWS Audit Manager

Automates evidence collection for:
- SOC 2
- PCI DSS
- GDPR
- HIPAA
- Custom frameworks

## Exam Tips

1. **SCPs always win** - Even if an IAM policy allows an action, an SCP deny will block it
2. **KMS vs. SSE-S3** - Use KMS when you need audit trails, key rotation, or cross-account access
3. **CloudTrail is immutable** - Once logged, events cannot be deleted (with integrity validation)
4. **Config != CloudWatch** - Config tracks configuration changes, CloudWatch monitors metrics
5. **Security Hub is an aggregator** - It doesn't detect threats itself, it consolidates findings
6. **Permission boundaries don't grant permissions** - They only limit what can be granted
7. **Root user access** - Even root is restricted by SCPs
8. **Secrets rotation** - Only Secrets Manager has native automatic rotation
9. **Cross-account encryption** - Requires both key policy and IAM policy
10. **GuardDuty findings** - Based on machine learning, not rules

## Common Architectural Patterns

### Multi-Account Security Architecture

```
┌─────────────────────┐
│  Management Account │
│  (Organizations)    │
└──────────┬──────────┘
           │
    ┌──────┴──────┬────────────┐
    │             │            │
┌───▼────┐  ┌────▼───┐  ┌────▼────┐
│Security│  │ Logging │  │Workload │
│ Tools  │  │ Account │  │Accounts │
│Account │  │         │  │         │
└────────┘  └─────────┘  └─────────┘
```

**Security Account:**
- GuardDuty master
- Security Hub master
- Config aggregator
- IAM Access Analyzer

**Logging Account:**
- CloudTrail logs
- Config snapshots
- VPC Flow Logs
- GuardDuty findings

### Data Encryption Pattern

**At-rest encryption:**
- EBS: KMS or default encryption
- S3: SSE-S3, SSE-KMS, or SSE-C
- RDS: KMS encryption (cannot be removed)
- DynamoDB: KMS encryption

**In-transit encryption:**
- TLS/SSL for all API calls
- VPN or Direct Connect for hybrid
- Certificate Manager for SSL/TLS certs

**Key rotation:**
- KMS: Automatic annual rotation (AWS managed)
- KMS: Manual rotation (Customer managed)
- Secrets Manager: Automatic with Lambda

> 📚 [AWS Encryption SDK](https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/)
