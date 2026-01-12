---
title: Security Controls and Compliance
lastUpdated: 2026-01-06
---

# Security Controls and Compliance

Enterprise AWS environments require comprehensive security controls that span identity management, encryption, logging, compliance, and threat detection. This topic covers critical security services and architectural patterns essential for the SAP-C02 exam, with emphasis on multi-account strategies, defense-in-depth approaches, and automated compliance.

## IAM and Identity Management

### Service Control Policies (SCPs)

Service Control Policies provide central control over the maximum available permissions in an AWS Organization. They act as guardrails that apply to all IAM entities within organizational units (OUs) and member accounts.

**Core Operating Principles:**

SCPs operate on an **intersection model** where effective permissions are calculated as:
```
Effective Permissions = (SCP Allows) ∩ (Identity Policies) ∩ (Resource Policies)
```

If ANY policy layer denies an action, the action is blocked - even for users with `AdministratorAccess` attached.

**Critical Characteristics:**
- **Do not grant permissions** - SCPs only define maximum allowed permissions (permission ceiling)
- **Affect all IAM entities** including the root user in member accounts
- **Do NOT affect the management account** - management account is exempt from SCPs
- **Cannot restrict service-linked roles** - AWS service-linked roles bypass SCP restrictions
- **Explicit deny always wins** - deny statements override any allow statements
- **Hierarchical inheritance** - accounts inherit ALL ancestor OU SCPs (most restrictive wins)

**SCP Inheritance Model:**

In multi-level OU hierarchies, SCPs stack restrictively:

```
Organization Root (SCP: FullAWSAccess)
    │
    ├── Production OU (SCP: DenyRegionRestriction)
    │   │
    │   └── Finance OU (SCP: DenyIAMActions)
    │       │
    │       └── Account 123456789012
    │           └── Effective = Root ∩ Production ∩ Finance
    │               (Most restrictive combination)
```

Any account's effective permissions are limited by EVERY SCP from all parent OUs up to the organization root.

**Real-World SCP Patterns:**

*Regional Compliance Enforcement:*
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyNonApprovedRegions",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "us-west-2",
            "eu-west-1"
          ]
        },
        "ArnNotLike": {
          "aws:PrincipalArn": [
            "arn:aws:iam::*:role/OrganizationAccountAccessRole"
          ]
        }
      }
    }
  ]
}
```

*Prevent Privilege Escalation:*
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyIAMPrivilegeEscalation",
      "Effect": "Deny",
      "Action": [
        "iam:CreatePolicyVersion",
        "iam:DeleteRolePermissionsBoundary",
        "iam:DeleteUserPermissionsBoundary",
        "iam:PutUserPolicy",
        "iam:PutRolePolicy",
        "iam:AttachUserPolicy",
        "iam:AttachRolePolicy"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalOrgID": "${aws:PrincipalOrgID}"
        }
      }
    }
  ]
}
```

*Enforce Instance Type Restrictions:*
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnapprovedInstanceTypes",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringNotLike": {
          "ec2:InstanceType": [
            "t3.*",
            "t4g.*",
            "m6i.*"
          ]
        }
      }
    }
  ]
}
```

**Enterprise Best Practices:**
- **Test in pilot OUs** before organization-wide deployment to avoid unintended lockouts
- **Use IAM Access Advisor** to identify unused services before applying restrictive SCPs
- **Never remove FullAWSAccess** without replacement - this will deny ALL actions
- **Document inheritance paths** in complex OU hierarchies to understand cumulative effects
- **Exempt break-glass roles** from restrictive SCPs using condition keys
- **Monitor CloudTrail** for denied actions to identify legitimate requests blocked by SCPs

**AWS Documentation:**
- [Service Control Policies (SCPs)](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- [SCP Evaluation Logic](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html)
- [SCP Examples and Strategies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html)

### IAM Permission Boundaries

Permission boundaries set the maximum permissions an IAM entity (user or role) can have, regardless of identity-based policies attached. They enable secure delegation of permission management.

**Operating Model:**

Effective permissions are the intersection of all applicable policies:
```
Effective Permissions = Identity Policies ∩ Permissions Boundary ∩ SCPs
```

**Critical**: Permission boundaries DO NOT grant permissions - they only limit what identity-based policies can grant.

**Delegation Pattern - Secure DevOps User Creation:**

*Scenario:* Maria (admin) delegates user creation to Zhang with organizational guardrails.

Step 1 - Create permission boundary policy for all new users:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowedServices",
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "ec2:*",
        "dynamodb:*",
        "cloudwatch:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowSelfManagement",
      "Effect": "Allow",
      "Action": [
        "iam:*AccessKey*",
        "iam:ChangePassword",
        "iam:GetUser"
      ],
      "Resource": "arn:aws:iam::*:user/${aws:username}"
    },
    {
      "Sid": "DenySensitiveResources",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::production-logs",
        "arn:aws:s3:::production-logs/*"
      ]
    }
  ]
}
```

Step 2 - Create Zhang's permission boundary (limits what he can delegate):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireBoundaryOnUserCreation",
      "Effect": "Allow",
      "Action": [
        "iam:CreateUser",
        "iam:AttachUserPolicy",
        "iam:PutUserPolicy"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::123456789012:policy/DevTeamBoundary"
        }
      }
    },
    {
      "Sid": "PreventBoundaryModification",
      "Effect": "Deny",
      "Action": [
        "iam:DeleteUserPermissionsBoundary",
        "iam:DeletePolicy",
        "iam:DeletePolicyVersion",
        "iam:CreatePolicyVersion"
      ],
      "Resource": [
        "arn:aws:iam::123456789012:policy/DevTeamBoundary"
      ]
    }
  ]
}
```

**Result:** Zhang can create users and assign broad IAM permissions, but all users are restricted by the DevTeamBoundary policy, preventing privilege escalation.

**Interaction with Resource-Based Policies:**

Permission boundaries interact differently based on principal type:

| Principal Type | Resource Policy Behavior |
|----------------|--------------------------|
| **IAM Users (same account)** | Resource policies granting permissions to user ARN are NOT limited by permission boundaries |
| **IAM Roles** | Resource policies ARE limited by permission boundary |
| **Role Sessions** | Permissions granted to session ARN are NOT limited by boundary |

**Critical Warning - NotPrincipal with Deny:**

DO NOT use `NotPrincipal` with `Deny` effect for principals with permission boundaries:

```json
// ❌ AVOID - Always denies principals with boundaries
{
  "Effect": "Deny",
  "NotPrincipal": {
    "AWS": "arn:aws:iam::123456789012:root"
  }
}

// ✅ USE INSTEAD - Condition-based approach
{
  "Effect": "Deny",
  "Principal": "*",
  "Condition": {
    "ArnNotEquals": {
      "aws:PrincipalArn": "arn:aws:iam::123456789012:user/admin"
    }
  }
}
```

**Use Cases:**
- Delegating user/role creation to development teams
- Preventing privilege escalation in multi-tenant environments
- Enforcing service boundaries (e.g., developers cannot access IAM)
- Sandbox environments where teams self-manage within guardrails

**AWS Documentation:**
- [IAM Permission Boundaries](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html)
- [Permission Boundaries Delegation Pattern](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries_delegation.html)
- [IAM Policy Evaluation Logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)

### IAM Access Analyzer

IAM Access Analyzer uses automated reasoning to identify resources shared with external entities and detect unused access, supporting least-privilege implementation.

**Core Capabilities:**

1. **External Access Analysis** - Identifies resources accessible outside your zone of trust
2. **Internal Access Analysis** - Maps access paths to business-critical resources within organization
3. **Unused Access Detection** - Identifies unused IAM roles, access keys, passwords, and permissions
4. **Policy Validation** - Validates policies against AWS best practices and custom security standards
5. **Policy Generation** - Creates least-privilege policies from CloudTrail activity logs

**Zone of Trust Model:**

When you create an analyzer, you designate a zone of trust (organization or account). Access Analyzer generates findings when:
- Resources are accessible to principals OUTSIDE the zone of trust
- Public access is granted to supported resources

**Supported Resources (External Access Analysis):**
- Amazon S3 buckets and directory buckets
- IAM roles
- AWS KMS keys
- AWS Lambda functions and layers
- Amazon SQS queues
- AWS Secrets Manager secrets
- Amazon SNS topics
- Amazon EBS snapshots
- Amazon RDS DB snapshots and cluster snapshots
- Amazon ECR repositories
- Amazon EFS file systems
- Amazon DynamoDB tables and streams

**Regional Considerations:**

External access analyzers only analyze policies in the **same AWS Region** where enabled. For comprehensive coverage:
- Create an analyzer in EACH region containing resources
- Unused access analyzers do NOT require regional replication (global scope)

**Unused Access Detection:**

Continuously monitors and generates findings for:
- **Unused IAM roles** - No activity in tracking period (up to 90 days)
- **Unused access keys** - No API calls using the access key
- **Unused passwords** - No console login activity
- **Unused actions** - For active roles, identifies unused services and actions

**Pricing Model:**
- External access analysis: No per-finding charge
- Unused access analysis: Charged per IAM role/user analyzed per analyzer per month
- Custom policy checks: Per API request

**Multi-Account Integration:**

When creating an organization-level analyzer:
- Monitors all supported resources across member accounts
- Findings visible in centralized dashboard
- Supports delegation to Security Tooling account
- Integrates with Security Hub for consolidated security posture

**Real-World Scenario:**

*Problem:* Finance team needs to identify all S3 buckets accessible to external AWS accounts or publicly before SOC 2 audit.

*Solution:*
1. Enable IAM Access Analyzer in all regions
2. Set zone of trust to organization
3. Filter findings by resource type = "AWS::S3::Bucket"
4. Review findings for external account access
5. Update bucket policies to remove unintended access
6. Archive resolved findings

**AWS Documentation:**
- [IAM Access Analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)
- [Unused Access Detection](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-unused-access.html)
- [Policy Validation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-validation.html)

### Cross-Account Access Patterns

**Three Primary Methods:**

| Method | Best For | Limitations |
|--------|----------|-------------|
| **IAM Roles (AssumeRole)** | AWS service-to-service, temporary access | Requires trust relationship configuration |
| **Resource-Based Policies** | S3, SNS, SQS, Lambda, Secrets Manager | Not supported by all services |
| **Cross-Account IAM Users** | Legacy migrations only | Discouraged - poor security posture, credential management burden |

**IAM Role Cross-Account Pattern:**

*Account A (Trusting):*
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::222222222222:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "unique-external-id-12345"
        }
      }
    }
  ]
}
```

*Account B (Trusted) - Identity Policy:*
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::111111111111:role/CrossAccountAccessRole"
    }
  ]
}
```

**Best Practices:**
- **Always use External ID** for third-party access (prevents confused deputy problem)
- **Prefer IAM roles** over resource-based policies when both are supported
- **Use session policies** to further restrict assumed role permissions
- **Monitor AssumeRole** events in CloudTrail for audit trails
- **Implement MFA conditions** for sensitive cross-account roles

**AWS Documentation:**
- [Cross-Account Access with IAM Roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html)
- [How to Use External ID](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html)

## Encryption and Key Management

### AWS KMS

AWS Key Management Service (KMS) provides centralized cryptographic key management with hardware security module (HSM) protection, automatic rotation, and deep integration with AWS services.

**Key Hierarchy Architecture:**

```
KMS Key (Logical)
    ├── Key ARN (arn:aws:kms:region:account:key/key-id)
    ├── Key ID (1234abcd-12ab-34cd-56ef-1234567890ab)
    └── Alias (alias/example-key)
         │
         ▼
HSM Backing Key (HBK) - 256-bit AES
    ├── Encrypted under domain keys in HSM
    ├── Multiple versions (for rotation)
    └── Never exported in plaintext
         │
         ▼
Data Encryption Keys (DEKs)
    ├── Generated per encrypt operation
    ├── Returned in plaintext + ciphertext
    └── Application encrypts data with DEK
```

**Key Types Comparison:**

| Attribute | Customer Managed | AWS Managed | AWS Owned |
|-----------|------------------|-------------|-----------|
| **Control** | Full lifecycle control | View-only | No visibility |
| **Key Policy** | Customizable | Fixed | N/A |
| **Rotation** | Optional (annual) | Automatic (annual) | Service-managed |
| **Cross-Account** | Supported | Not supported | N/A |
| **Monthly Fee** | Yes | No | No |
| **Use in Applications** | Direct use | Service-only | Transparent |
| **CloudTrail Logs** | Yes | Yes | No |
| **Quotas** | Counts toward limits | Counts toward request limits | Exempt |

**Customer Managed Keys (CMKs):**
- **When to use:** Require audit trails, key rotation control, cross-account access, or custom key policies
- **Identification:** KeyManager = CUSTOMER in DescribeKey
- **Pricing:** Monthly fee + per-use fees
- **Control:** Create, rotate, disable, delete, manage policies

**AWS Managed Keys:**
- **When to use:** Standard AWS service encryption without control requirements
- **Identification:** Alias format `aws/service-name` (e.g., `aws/s3`, `aws/rds`)
- **Rotation:** Automatic annual rotation (changed from 3-year in May 2022)
- **Limitation:** Cannot share across accounts, cannot customize key policy

**Multi-Region Keys:**

Enable low-latency encryption/decryption in multiple regions with consistent key ID:
- **Key ID prefix:** `mrk-` (e.g., `mrk-1234abcd12ab34cd56ef1234567890ab`)
- **Same key material** replicated across regions
- **Independent key policies** per region replica
- **Use case:** Global applications requiring consistent encryption, disaster recovery

**Cross-Account Encryption Pattern:**

Requires BOTH key policy AND IAM policy:

*KMS Key Policy in Account A:*
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAccountAAdministration",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111111111111:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "AllowAccountBUsage",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::222222222222:root"
      },
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

*IAM Policy in Account B:*
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:111111111111:key/1234abcd-12ab-34cd-56ef-1234567890ab"
    }
  ]
}
```

**KMS Grants:**

Programmatic delegation of KMS permissions:
- **Temporary** - Can be revoked programmatically
- **Scoped** - Limited to specific operations
- **Constraint-based** - Can include encryption context constraints
- **Use case:** AWS service integrations (EBS, RDS encrypted volumes)
- **No policy editing** - Created/revoked via API without changing key policy

**Encryption Context:**

Additional authenticated data (AAD) that provides cryptographic binding:
```python
# Encrypt with context
response = kms_client.encrypt(
    KeyId='alias/example-key',
    Plaintext=b'sensitive data',
    EncryptionContext={
        'Department': 'Finance',
        'Purpose': 'Payroll'
    }
)

# Decrypt requires matching context
plaintext = kms_client.decrypt(
    CiphertextBlob=response['CiphertextBlob'],
    EncryptionContext={
        'Department': 'Finance',
        'Purpose': 'Payroll'
    }
)
```

**Benefits:**
- Prevents ciphertext from being decrypted in wrong context
- Logged in CloudTrail for audit correlation
- No secret - appears in plaintext in logs

**Key Rotation Strategies:**

| Rotation Type | Frequency | Impact |
|---------------|-----------|--------|
| **Automatic (AWS Managed)** | Annual | Transparent - KMS manages version mapping |
| **Automatic (Customer Managed)** | Annual (when enabled) | Transparent - old HBKs retained for decrypt |
| **Manual** | On-demand | Requires updating key alias, application changes |

**Real-World Scenario:**

*Problem:* Healthcare organization needs to encrypt patient records in S3 with strict audit requirements and ability to revoke encryption access for specific departments.

*Solution:*
1. Create customer managed KMS key with key policy granting organization access
2. Enable automatic key rotation
3. Use encryption context with DepartmentID and PatientID
4. All S3 PutObject operations include encryption context
5. Audit CloudTrail logs filtered by encryption context to track access by department
6. Revoke department access by modifying key policy (existing data remains encrypted but inaccessible)

**AWS Documentation:**
- [AWS KMS Concepts](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html)
- [KMS Key Policies](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html)
- [KMS Grants](https://docs.aws.amazon.com/kms/latest/developerguide/grants.html)
- [Multi-Region Keys](https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html)
- [Encryption Context](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#encrypt_context)

### Secrets Manager vs. Systems Manager Parameter Store

Both services store configuration data and secrets, but differ significantly in capabilities:

| Feature | Secrets Manager | Parameter Store (Standard) | Parameter Store (Advanced) |
|---------|----------------|---------------------------|---------------------------|
| **Automatic Rotation** | Yes (Lambda-based) | No | No |
| **Rotation Integration** | RDS, Redshift, DocumentDB | Manual only | Manual only |
| **Cross-Account Access** | Yes (resource policy) | No (IAM-only) | No (IAM-only) |
| **Secret Size** | Up to 65,536 bytes | Up to 4 KB | Up to 8 KB |
| **Versioning** | Automatic | Manual | Manual |
| **Pricing** | Per secret/month + API calls | Free | Per parameter/month + API calls |
| **Audit Trail** | CloudTrail + rotation events | CloudTrail | CloudTrail + change history |
| **Best For** | Database credentials, API keys | Configuration data, simple secrets | Large config values, parameter policies |

**Automatic Rotation Architecture:**

Secrets Manager uses Lambda functions to rotate secrets:

```
Secrets Manager Rotation
    │
    ├── Step 1: CreateSecret (Lambda creates new credentials)
    │
    ├── Step 2: SetSecret (Lambda updates database/service)
    │
    ├── Step 3: TestSecret (Lambda validates new credentials)
    │
    └── Step 4: FinishSecret (Secrets Manager marks AWSCURRENT)
```

**When to Use Secrets Manager:**
- Database credentials requiring automatic rotation
- Integration with RDS, Redshift, DocumentDB
- Cross-account secret access required
- Compliance requires secret rotation evidence
- Secrets larger than 4 KB

**When to Use Parameter Store:**
- Application configuration (environment-specific values)
- Simple secrets without rotation requirements
- Cost-sensitive scenarios (standard tier is free)
- Integration with Systems Manager workflows
- Parameter policies for expiration/notification

**AWS Documentation:**
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
- [Secrets Manager Rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [Parameter Store vs. Secrets Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-vs-secrets-manager.html)

## Logging and Monitoring

### CloudTrail

AWS CloudTrail provides immutable audit logging of all API activity across your AWS environment.

**Organization Trail Architecture:**

Central logging for multi-account environments:
- **Single trail** in management account logs ALL member accounts
- **Central S3 bucket** in dedicated logging account
- **Aggregated analysis** using Athena, CloudWatch Logs Insights
- **Immutable record** with log file integrity validation
- **Automatic for new accounts** - no per-account configuration required

**Best Practices:**

1. **Enable Log File Integrity Validation:**
   - Creates digital signature for each log file
   - Enables verification that logs haven't been modified
   - Use `aws cloudtrail validate-logs` to verify integrity
   - Essential for compliance and forensic investigations

2. **S3 Bucket Protection:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AWSCloudTrailAclCheck",
         "Effect": "Allow",
         "Principal": {
           "Service": "cloudtrail.amazonaws.com"
         },
         "Action": "s3:GetBucketAcl",
         "Resource": "arn:aws:s3:::cloudtrail-logs-bucket"
       },
       {
         "Sid": "AWSCloudTrailWrite",
         "Effect": "Allow",
         "Principal": {
           "Service": "cloudtrail.amazonaws.com"
         },
         "Action": "s3:PutObject",
         "Resource": "arn:aws:s3:::cloudtrail-logs-bucket/*",
         "Condition": {
           "StringEquals": {
             "s3:x-amz-acl": "bucket-owner-full-control"
           }
         }
       },
       {
         "Sid": "DenyUnencryptedObjectUploads",
         "Effect": "Deny",
         "Principal": "*",
         "Action": "s3:PutObject",
         "Resource": "arn:aws:s3:::cloudtrail-logs-bucket/*",
         "Condition": {
           "StringNotEquals": {
             "s3:x-amz-server-side-encryption": "aws:kms"
           }
         }
       }
     ]
   }
   ```

3. **CloudTrail Insights:**
   - Machine learning-based anomaly detection
   - Identifies unusual API activity patterns
   - Detects burst of IAM actions, service anomalies
   - Additional cost per analyzed event

4. **Multi-Region Trail:**
   - Enable in ALL regions (even unused)
   - Captures global service events (IAM, STS, CloudFront)
   - Protects against region-specific attacks

5. **EventBridge Integration:**
   - Near real-time notification for critical events
   - Automated response to security findings
   - Filter by event name, source, error code

**Real-World Scenario:**

*Problem:* Security team needs to detect when root user credentials are used and automatically escalate to incident response team.

*Solution:*
1. Create EventBridge rule matching CloudTrail events:
   ```json
   {
     "detail": {
       "userIdentity": {
         "type": ["Root"]
       }
     }
   }
   ```
2. Target SNS topic for PagerDuty integration
3. Simultaneously invoke Lambda to disable root access keys (if present)
4. Create high-severity Security Hub finding

**AWS Documentation:**
- [CloudTrail User Guide](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html)
- [Organization Trails](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-trail-organization.html)
- [Log File Integrity Validation](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html)
- [CloudTrail Insights](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-insights-events-with-cloudtrail.html)

### AWS Config

AWS Config provides continuous resource configuration recording, compliance evaluation, and change management across your AWS environment.

**Core Capabilities:**

1. **Configuration Recording:**
   - Tracks resource creation, modification, deletion
   - Records resource relationships and dependencies
   - Stores configuration snapshots in S3
   - Point-in-time configuration retrieval

2. **Compliance Evaluation - Config Rules:**
   - Continuous or change-triggered evaluation
   - Managed rules (AWS-provided) or custom rules (Lambda)
   - Compliance status: COMPLIANT, NON_COMPLIANT, NOT_APPLICABLE
   - Compliance timeline for audit evidence

3. **Automatic Remediation:**
   - SSM Automation Documents execute remediation
   - Configurable retry logic and parameters
   - Supports custom remediation actions
   - Audit trail of remediation attempts

4. **Multi-Account Aggregator:**
   - Centralized view across organization
   - Cross-region and cross-account aggregation
   - Delegated administrator support
   - Consolidated compliance reporting

**Common Managed Config Rules:**

| Rule | Purpose | Parameters |
|------|---------|------------|
| `required-tags` | Enforce tagging standards | Required tag keys |
| `encrypted-volumes` | Ensure EBS encryption | KMS key ARN (optional) |
| `s3-bucket-public-read-prohibited` | Prevent public S3 buckets | None |
| `rds-encryption-enabled` | Enforce RDS encryption | None |
| `iam-password-policy` | Validate password complexity | Min length, require symbols, etc. |
| `vpc-flow-logs-enabled` | Ensure VPC Flow Logs active | Traffic type, destination |
| `cloudtrail-enabled` | Validate CloudTrail configuration | None |
| `multi-region-cloudtrail-enabled` | Ensure multi-region trail | None |

**Custom Config Rule Example:**

Lambda function to check for overly permissive security groups:
```python
import boto3
import json

def evaluate_compliance(config_item):
    if config_item['resourceType'] != 'AWS::EC2::SecurityGroup':
        return 'NOT_APPLICABLE'

    ip_permissions = config_item['configuration'].get('ipPermissions', [])

    for permission in ip_permissions:
        for ip_range in permission.get('ipv4Ranges', []):
            if ip_range.get('cidrIp') == '0.0.0.0/0':
                if permission.get('fromPort') in [22, 3389]:  # SSH or RDP
                    return 'NON_COMPLIANT'

    return 'COMPLIANT'

def lambda_handler(event, context):
    config_client = boto3.client('config')

    invoking_event = json.loads(event['invokingEvent'])
    config_item = invoking_event['configurationItem']

    compliance_type = evaluate_compliance(config_item)

    config_client.put_evaluations(
        Evaluations=[{
            'ComplianceResourceType': config_item['resourceType'],
            'ComplianceResourceId': config_item['resourceId'],
            'ComplianceType': compliance_type,
            'OrderingTimestamp': config_item['configurationItemCaptureTime']
        }],
        ResultToken=event['resultToken']
    )
```

**Automatic Remediation Pattern:**

For `encrypted-volumes` rule violation:
1. Config Rule detects unencrypted EBS volume
2. Triggers SSM Automation Document `AWS-EnableEBSEncryptionByDefault`
3. SSM creates encrypted snapshot of volume
4. Creates new encrypted volume from snapshot
5. Optionally replaces original volume (requires downtime)
6. Config re-evaluates and marks COMPLIANT

**Multi-Account Aggregator Setup:**

*Management Account Configuration:*
```bash
aws configservice put-configuration-aggregator \
  --configuration-aggregator-name OrganizationAggregator \
  --organization-aggregation-source \
    AllAwsRegions=true \
    RoleArn=arn:aws:iam::111111111111:role/aws-service-role/organizations.amazonaws.com/AWSServiceRoleForOrganizations
```

*Benefits:*
- Single dashboard for all accounts and regions
- Consolidated compliance reporting
- Cross-account resource inventory
- Simplifies audit artifact collection

**AWS Documentation:**
- [AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html)
- [Config Rules](https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config.html)
- [Config Aggregators](https://docs.aws.amazon.com/config/latest/developerguide/aggregate-data.html)
- [Remediation Actions](https://docs.aws.amazon.com/config/latest/developerguide/remediation.html)

## Security Services Integration

### Security Hub

AWS Security Hub provides centralized security finding aggregation, automated compliance checking, and security posture scoring across multi-account environments.

**Core Functions:**

1. **Finding Aggregation:**
   - Consolidates findings from AWS services and third-party tools
   - Normalizes into AWS Security Finding Format (ASFF)
   - Correlates related findings to reduce noise
   - Prioritizes based on severity and context

2. **Automated Security Standards:**
   - **AWS Foundational Security Best Practices (FSBP)** - AWS-developed standard covering 50+ controls
   - **CIS AWS Foundations Benchmark** - Industry standard for AWS configuration
   - **PCI DSS** - Payment card industry security requirements
   - **NIST 800-53** - Federal security controls framework

3. **Security Score Calculation:**
   - Percentage of passed checks vs. total enabled checks
   - Per-standard and aggregate scores
   - Identifies specific accounts/resources requiring attention
   - Tracks improvement over time

4. **Automated Response:**
   - **Automation Rules** - Update findings based on criteria (suppress, change severity)
   - **EventBridge Integration** - Trigger Lambda, Step Functions, SNS
   - **Custom Actions** - Manual remediation workflows

**Multi-Account Architecture:**

Security Hub supports delegated administrator model:

```
Management Account
    │
    ├── Designate Security Tooling Account as Delegated Admin
    │
Security Tooling Account (Delegated Administrator)
    │
    ├── Enable Security Hub with auto-enablement for new accounts
    ├── Configure security standards (FSBP, CIS, PCI DSS)
    ├── Create automation rules
    └── Aggregate findings from:
        │
        ├── GuardDuty (Threat Detection)
        ├── Inspector (Vulnerability Assessment)
        ├── Macie (Data Security)
        ├── IAM Access Analyzer (External Access)
        ├── Firewall Manager (Network Protection)
        ├── Systems Manager Patch Manager
        └── Third-Party Tools (CrowdStrike, Palo Alto, etc.)
```

**Finding Format (ASFF):**

Standardized JSON format enabling consistent processing:
```json
{
  "SchemaVersion": "2018-10-08",
  "Id": "arn:aws:securityhub:us-east-1:111111111111:subscription/cis-aws-foundations-benchmark/v/1.2.0/1.1/finding/a1b2c3d4",
  "ProductArn": "arn:aws:securityhub:us-east-1::product/aws/securityhub",
  "GeneratorId": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0/rule/1.1",
  "AwsAccountId": "111111111111",
  "Types": ["Software and Configuration Checks/Industry and Regulatory Standards/CIS AWS Foundations Benchmark"],
  "CreatedAt": "2024-01-15T10:00:00.000Z",
  "UpdatedAt": "2024-01-15T10:00:00.000Z",
  "Severity": {
    "Label": "MEDIUM",
    "Normalized": 40
  },
  "Title": "1.1 Avoid the use of the root user",
  "Description": "The root user has unrestricted access to all resources in the AWS account.",
  "Remediation": {
    "Recommendation": {
      "Text": "Follow CIS remediation for control 1.1",
      "Url": "https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cis-controls.html#securityhub-cis-controls-1.1"
    }
  },
  "Resources": [
    {
      "Type": "AwsAccount",
      "Id": "AWS::::Account:111111111111",
      "Partition": "aws",
      "Region": "us-east-1"
    }
  ],
  "Compliance": {
    "Status": "FAILED"
  },
  "WorkflowState": "NEW",
  "Workflow": {
    "Status": "NEW"
  },
  "RecordState": "ACTIVE"
}
```

**Automation Rules Example:**

Suppress findings for approved exceptions:
```json
{
  "RuleName": "SuppressDevAccountS3PublicAccess",
  "Description": "Dev accounts approved for public S3 buckets for static website hosting",
  "Criteria": {
    "AwsAccountId": [
      {"Value": "123456789012", "Comparison": "EQUALS"}
    ],
    "ComplianceSecurityControlId": [
      {"Value": "S3.1", "Comparison": "EQUALS"}
    ],
    "ResourceType": [
      {"Value": "AwsS3Bucket", "Comparison": "EQUALS"}
    ]
  },
  "Actions": [
    {
      "Type": "FINDING_UPDATE",
      "FindingFieldsUpdate": {
        "Workflow": {"Status": "SUPPRESSED"}
      }
    }
  ]
}
```

**EventBridge Integration Pattern:**

Automated response to critical findings:
```json
{
  "source": ["aws.securityhub"],
  "detail-type": ["Security Hub Findings - Imported"],
  "detail": {
    "findings": {
      "Severity": {
        "Label": ["CRITICAL"]
      },
      "Workflow": {
        "Status": ["NEW"]
      },
      "Compliance": {
        "Status": ["FAILED"]
      }
    }
  }
}
```

Target: Lambda function to create PagerDuty incident, post to Slack, create JIRA ticket

**Regional and Cross-Region Aggregation:**

- Security Hub findings are region-specific
- Enable in ALL regions where resources exist
- Use cross-region aggregation to centralize findings in home region
- CIS compliance requires enablement in all regions

**Pricing:**

- **Free Trial:** 30 days automatic enrollment
- **Security Checks:** Per check per month
- **Finding Ingestion:** Per 10,000 findings
- **Underlying Services:** AWS Config items charged separately (except Config rules created only by Security Hub)

**Real-World Scenario:**

*Problem:* Financial services company must demonstrate continuous PCI DSS compliance across 50 AWS accounts with automated remediation for critical findings.

*Solution:*
1. Enable Security Hub in all regions across organization
2. Activate PCI DSS standard in Security Hub
3. Configure aggregation in Security Tooling account
4. Create automation rules:
   - Auto-suppress known exceptions (approved by security team)
   - Escalate CRITICAL findings to workflow
5. EventBridge rules:
   - CRITICAL findings trigger Lambda for automated remediation
   - FAILED PCI controls create JIRA tickets assigned to account owners
6. Weekly compliance reports exported to S3 for audit evidence

**AWS Documentation:**
- [AWS Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html)
- [Security Hub Multi-Account Strategy](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html)
- [ASFF Format](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format.html)
- [Automation Rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html)
- [Security Standards](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards.html)

### GuardDuty

Amazon GuardDuty is an intelligent threat detection service using machine learning, anomaly detection, and threat intelligence to identify malicious activity.

**Threat Detection Capabilities:**

GuardDuty analyzes multiple data sources to detect:
1. **Compromised AWS credentials** - Unusual API calls from anomalous locations
2. **Instance compromise** - Malware, cryptomining, C2 communication
3. **Account compromise** - Unauthorized access patterns, privilege escalation
4. **Bucket compromise** - S3 data exfiltration or destruction
5. **Kubernetes threats** - EKS API abuse, pod compromise
6. **Database threats** - Anomalous RDS/Aurora login activity
7. **Lambda threats** - Malicious code execution, VPC-based attacks

**Data Sources:**

| Source | Analysis Type | Cost |
|--------|---------------|------|
| **CloudTrail Management Events** | API call patterns | Included (foundational) |
| **VPC Flow Logs** | Network traffic analysis | Included (foundational) |
| **DNS Logs** | Domain resolution patterns | Included (foundational) |
| **S3 Data Events** | Object-level API calls | Optional (S3 Protection) |
| **EKS Audit Logs** | Kubernetes API activity | Optional (EKS Protection) |
| **EC2/ECS Runtime** | OS-level process analysis | Optional (Runtime Monitoring) |
| **Lambda Network Activity** | VPC flow logs for Lambda | Optional (Lambda Protection) |
| **RDS Login Activity** | Database authentication | Optional (RDS Protection) |

**Protection Plans:**

*S3 Protection:*
- Detects suspicious S3 API activity
- Identifies data exfiltration attempts
- Monitors for ransomware indicators (rapid deletion patterns)
- Analyzes CloudTrail S3 data events and S3 server access logs

*EKS Protection:*
- Monitors Kubernetes audit logs
- Detects unauthorized pod execution
- Identifies privilege escalation in containers
- Analyzes API calls to EKS clusters

*Runtime Monitoring (EC2/ECS/EKS):*
- Analyzes OS-level events (file access, process execution, network connections)
- Detects malware execution
- Identifies suspicious process behavior
- Monitors for cryptomining activity

*Malware Protection:*
- **For EC2:** Scans EBS volumes on-demand for malware
- **For S3:** Scans newly uploaded objects for malware (can be used standalone)
- **For AWS Backup:** Scans snapshots and AMIs in AWS Backup vaults
- Generates findings with malware scan results

*RDS Protection:*
- Profiles database login activity
- Detects anomalous access patterns
- Identifies potentially compromised credentials
- Monitors Aurora and RDS instances

*Lambda Protection:*
- Analyzes VPC flow logs for Lambda functions
- Detects malicious outbound network activity
- Identifies cryptomining in Lambda environments

**Multi-Account Setup:**

Recommended: AWS Organizations integration

```
Management Account
    │
    └── Designate Security Account as GuardDuty Delegated Administrator
         │
Security Account (Delegated Administrator)
    │
    ├── Auto-enable GuardDuty for new accounts
    ├── Configure organization-wide protection plans
    ├── Centralized finding dashboard
    ├── Export findings to S3 for SIEM integration
    └── Member Accounts (automatic enrollment)
         │
         ├── Account 1 (findings auto-forwarded)
         ├── Account 2 (findings auto-forwarded)
         └── Account N (findings auto-forwarded)
```

**Finding Types and Severity:**

| Finding Type | Example | Severity | Description |
|-------------|---------|----------|-------------|
| **Recon** | `Recon:EC2/PortProbeUnprotectedPort` | Medium | Port scanning detected on EC2 instance |
| **InstanceCompromise** | `CryptoCurrency:EC2/BitcoinTool.B!DNS` | High | Bitcoin mining software detected |
| **UnauthorizedAccess** | `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.InsideAWS` | High | Credentials used from unusual location |
| **Trojan** | `Trojan:EC2/DNSDataExfiltration` | High | DNS tunneling for data exfiltration |
| **Backdoor** | `Backdoor:EC2/C&CActivity.B!DNS` | High | Communication with C2 server |
| **Policy** | `Policy:IAMUser/RootCredentialUsage` | Low | Root credentials used |
| **Persistence** | `Persistence:IAMUser/NetworkPermissions` | Medium | Network security modifications |
| **Impact** | `Impact:S3/MaliciousIPCaller.Custom` | High | S3 accessed from known malicious IP |

**Extended Threat Detection:**

Automatically enabled at no additional cost:
- Analyzes multi-stage attack patterns
- Correlates findings across resources and time
- Identifies attack sequences that appear benign individually
- Improves detection accuracy

**Integration with Security Hub:**

GuardDuty findings automatically forwarded to Security Hub:
- Normalized to ASFF format
- Correlation with other security findings
- Automated compliance checks
- Centralized security posture view

**Real-World Scenario:**

*Problem:* E-commerce company experiences data exfiltration - 50 GB of customer data downloaded from S3 bucket to external IP address.

*GuardDuty Detection Flow:*
1. S3 Protection analyzes S3 data events (GetObject API calls)
2. Detects unusual volume of downloads to external IP
3. Cross-references IP with threat intelligence feeds (known malicious)
4. Generates finding: `Exfiltration:S3/AnomalousBehavior`
5. Security Hub receives finding via EventBridge
6. Lambda automatically:
   - Blocks source IP in NACL
   - Rotates IAM credentials used for access
   - Creates PagerDuty incident
   - Exports S3 access logs to forensic S3 bucket
7. Security team investigates compromised credentials
8. Remediation: MFA enforcement, credential rotation, access review

**Suppression Rules:**

Filter out known safe activity to reduce noise:
```json
{
  "Name": "SuppressPentestingActivity",
  "Description": "Suppress findings from approved penetration testing",
  "Criterion": {
    "resource.instanceDetails.networkInterfaces.privateIpAddress": {
      "Eq": ["10.0.1.50"]
    },
    "type": {
      "Eq": ["Recon:EC2/PortProbeUnprotectedPort"]
    }
  }
}
```

**AWS Documentation:**
- [Amazon GuardDuty](https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html)
- [GuardDuty Finding Types](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-active.html)
- [GuardDuty Multi-Account Strategy](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html)
- [Malware Protection](https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection.html)
- [Runtime Monitoring](https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring.html)

### Amazon Macie

Amazon Macie uses machine learning to discover, classify, and protect sensitive data stored in S3.

**Key Capabilities:**
- **Automated Discovery:** Scans S3 buckets for PII, PHI, financial data, credentials
- **Managed Data Identifiers:** Pre-built patterns for credit cards, SSNs, passport numbers, etc.
- **Custom Data Identifiers:** Regular expressions for proprietary data formats
- **Sensitive Data Findings:** Alerts when sensitive data is discovered in buckets
- **Policy Findings:** Detects security/access control issues with S3 buckets

**Multi-Account Integration:**
- Organization-level enablement
- Centralized findings in delegated administrator account
- Automated bucket inventory across accounts

**Use Cases:**
- GDPR/CCPA compliance - locate personal data
- PCI DSS - identify cardholder data
- Data loss prevention - prevent sensitive data exposure
- Cloud migration - classify data before migration

**AWS Documentation:**
- [Amazon Macie](https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html)

### Amazon Inspector

Amazon Inspector is an automated vulnerability assessment service for EC2 instances, container images, and Lambda functions.

**Assessment Types:**
- **EC2 Instances:** OS vulnerabilities, network exposure
- **ECR Container Images:** Software vulnerabilities in image layers
- **Lambda Functions:** Application dependencies and code vulnerabilities

**Key Features:**
- Continuous scanning (re-scans on changes)
- CVE database integration
- Risk scoring based on CVSS
- Suppression rules for accepted risks
- Integration with Security Hub

**AWS Documentation:**
- [Amazon Inspector](https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html)

## Compliance Frameworks

### AWS Artifact

AWS Artifact provides on-demand access to AWS compliance reports and agreements:

**Available Reports:**
- SOC 1, SOC 2, SOC 3 reports
- PCI DSS Attestation of Compliance (AOC)
- ISO 27001, 27017, 27018, 27701 certifications
- FedRAMP authorization packages
- GDPR compliance documentation
- HIPAA Business Associate Addendum (BAA)
- CSA STAR certification

**Access:**
- Self-service portal in AWS Console
- No cost to access reports
- Download for audit evidence
- Share with auditors under NDA

**AWS Documentation:**
- [AWS Artifact](https://docs.aws.amazon.com/artifact/latest/ug/what-is-aws-artifact.html)

### AWS Audit Manager

AWS Audit Manager automates evidence collection for compliance audits:

**Supported Frameworks:**
- SOC 2
- PCI DSS
- GDPR
- HIPAA
- NIST 800-53
- ISO 27001
- Custom frameworks

**How It Works:**
1. Select compliance framework
2. Audit Manager creates assessment
3. Automatically collects evidence from AWS services (CloudTrail, Config, Security Hub)
4. Maps evidence to framework controls
5. Generates audit-ready reports

**Evidence Sources:**
- AWS Config compliance checks
- CloudTrail API activity
- Security Hub findings
- Manual uploads (policies, screenshots)

**Delegated Administrator:**
- Supports multi-account evidence collection
- Centralized assessment management
- Cross-account evidence aggregation

**AWS Documentation:**
- [AWS Audit Manager](https://docs.aws.amazon.com/audit-manager/latest/userguide/what-is.html)

## Multi-Account Security Architecture

Enterprise AWS environments require specialized security account architecture for centralized security tooling and log management.

### Reference Architecture

```
┌─────────────────────────────────────────────────────┐
│          Management Account (Organization)          │
│  - AWS Organizations                                │
│  - SCPs                                             │
│  - Billing consolidation                            │
│  - Minimal workloads                                │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────┴────────────┬─────────────────┬──────────────┐
    │                       │                 │              │
┌───▼────────────┐  ┌──────▼──────────┐  ┌──▼─────────┐  ┌─▼───────────┐
│Security Account│  │ Logging Account │  │ Network    │  │  Workload   │
│                │  │                 │  │ Account    │  │  Accounts   │
│- GuardDuty     │  │- CloudTrail S3  │  │            │  │             │
│  Administrator │  │- Config S3      │  │- Transit   │  │- Production │
│- Security Hub  │  │- VPC Flow Logs  │  │  Gateway   │  │- Staging    │
│  Administrator │  │- GuardDuty      │  │- Shared    │  │- Development│
│- Config        │  │  findings S3    │  │  Services  │  │- Sandbox    │
│  Aggregator    │  │- Athena queries │  │- VPN       │  │             │
│- IAM Access    │  │- S3 Access      │  │- Direct    │  │             │
│  Analyzer      │  │  Logs           │  │  Connect   │  │             │
│- Macie Admin   │  │                 │  │            │  │             │
│- Inspector     │  │                 │  │            │  │             │
└────────────────┘  └─────────────────┘  └────────────┘  └─────────────┘
```

### Security Account Responsibilities

**Centralized Security Services:**
- GuardDuty delegated administrator (findings from all accounts)
- Security Hub delegated administrator (aggregated security posture)
- AWS Config aggregator (cross-account compliance view)
- IAM Access Analyzer (organization-level external access detection)
- Macie administrator (sensitive data discovery across accounts)
- Inspector administrator (vulnerability findings aggregation)

**Access Control:**
- Least privilege IAM policies for security team
- Cross-account IAM roles for incident response
- Break-glass procedures for emergency access
- MFA enforcement for all users

### Logging Account Responsibilities

**Centralized Log Storage:**
- CloudTrail organization trail S3 bucket
- AWS Config snapshots and history
- VPC Flow Logs aggregation
- GuardDuty findings export
- S3 server access logs
- ELB access logs

**Log Retention and Lifecycle:**
- S3 lifecycle policies (90-day frequent access, 7-year archive to Glacier)
- S3 Object Lock for immutable retention (compliance mode)
- Cross-region replication for disaster recovery
- Intelligent-Tiering for cost optimization

**Log Analysis:**
- Athena for ad-hoc SQL queries
- CloudWatch Logs Insights for pattern analysis
- S3 Select for efficient filtering
- QuickSight for visualization
- Integration with SIEM (Splunk, QRadar, Sumo Logic)

### Security Baseline Pattern

Automated security baseline deployment for all new accounts:

**AWS Control Tower Integration:**
1. Account Factory provisions new account
2. Guardrails (SCPs) automatically applied
3. Baseline CloudFormation StackSet deployed:
   - Enable CloudTrail (forward to logging account)
   - Enable Config (with required rules)
   - Enable GuardDuty (auto-accept invitation)
   - Enable Security Hub (with FSBP standard)
   - Deploy IAM password policy
   - Create break-glass IAM role
   - Enable EBS encryption by default
   - Enable S3 Block Public Access (account-level)
4. Security Hub evaluates compliance within 30 minutes
5. Non-compliant findings trigger automated remediation

**Infrastructure-as-Code Baseline:**
```yaml
# CloudFormation StackSet deployed to all accounts
Resources:
  CloudTrailRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              Service: cloudtrail.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/CloudTrailServiceRolePolicy

  ConfigRole:
    Type: AWS::IAM::ServiceLinkedRole
    Properties:
      AWSServiceName: config.amazonaws.com

  EnableEBSEncryption:
    Type: AWS::EC2::EBSEncryptionByDefault
    Properties:
      EbsEncryptionByDefault: true

  S3BlockPublicAccess:
    Type: AWS::S3::AccountPublicAccessBlock
    Properties:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true

  SecurityHubEnabler:
    Type: Custom::SecurityHubEnabler
    Properties:
      ServiceToken: !GetAtt SecurityHubEnablerFunction.Arn
```

**AWS Documentation:**
- [Multi-Account Strategy](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html)
- [AWS Control Tower](https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html)
- [Security Reference Architecture](https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture/)

## Data Encryption Patterns

### Encryption at Rest

**S3 Encryption Options:**

| Method | Key Management | Performance | Cross-Account |
|--------|---------------|-------------|---------------|
| **SSE-S3** | AWS-managed (AES-256) | No overhead | Not supported |
| **SSE-KMS** | KMS CMK or AWS managed | Slight overhead (KMS API calls) | Supported |
| **SSE-C** | Customer-provided keys | Minimal overhead | Customer manages keys |
| **Client-Side** | Customer-managed before upload | Minimal (S3-side) | Customer manages keys |

**When to use SSE-KMS:**
- Require audit trail of key usage (CloudTrail)
- Need cross-account access to encrypted objects
- Require key rotation tracking
- Need granular access control (key policies)
- Compliance requires customer-controlled keys

**EBS Encryption:**
- Enable account-level default encryption
- All new volumes automatically encrypted
- KMS CMK or AWS managed key
- Snapshots inherit encryption from source volume
- Cannot remove encryption from encrypted volume

**RDS Encryption:**
- Encryption must be enabled at creation time
- Cannot enable encryption on existing unencrypted instance
- Migrate using snapshot: snapshot → copy (with encryption) → restore
- Read replicas inherit encryption from master
- Automated backups inherit encryption

**DynamoDB Encryption:**
- Encryption at rest enabled by default (AWS owned keys)
- Optional: KMS customer managed keys
- All tables encrypted (no performance impact)
- Local secondary indexes and global secondary indexes encrypted

### Encryption in Transit

**AWS Service Communications:**
- All AWS API calls use TLS 1.2+
- AWS Certificate Manager (ACM) for SSL/TLS certificates
- CloudFront requires HTTPS for viewer connections
- Application Load Balancer supports TLS termination

**Hybrid Connectivity:**
- **VPN:** IPsec encryption for Site-to-Site VPN
- **Direct Connect:** No encryption by default - use VPN over Direct Connect or MACsec
- **Direct Connect with MACsec:** Layer 2 encryption (10 Gbps or 100 Gbps connections)

**Application-Level Encryption:**
- AWS Encryption SDK for client-side encryption
- Envelope encryption pattern (data key + master key)
- Encryption context for authenticated encryption
- Support for multiple master keys (multi-region)

### Key Rotation Strategies

**Automatic Rotation:**
- KMS AWS managed keys: Automatic annual rotation (mandatory)
- KMS customer managed keys: Optional annual rotation (recommended)
- Secrets Manager: Configurable rotation schedule (Lambda-based)

**Manual Rotation:**
- Create new CMK version
- Update alias to point to new key
- Retain old key for decryption (until all data re-encrypted)
- Update application configuration

**Best Practices:**
- Enable automatic key rotation for customer managed KMS keys
- Rotate secrets in Secrets Manager at least every 90 days
- Document key rotation procedures for disaster recovery
- Test key rotation in non-production environments first
- Monitor CloudTrail for `ScheduleKeyDeletion` events (potential malicious activity)

**AWS Documentation:**
- [AWS KMS Key Rotation](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html)
- [S3 Encryption](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html)
- [EBS Encryption](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSEncryption.html)
- [AWS Encryption SDK](https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/introduction.html)

## Incident Response Automation

### EventBridge-Driven Response

Automated response to security events using EventBridge:

```
Security Event (GuardDuty, Security Hub, CloudTrail)
    │
    ▼
EventBridge Rule (pattern matching)
    │
    ├──► Lambda (automated remediation)
    ├──► SNS (notification to security team)
    ├──► Step Functions (complex workflow)
    ├──► Systems Manager Automation (runbook)
    └──► SQS (queue for batch processing)
```

**Example: Automated Response to Compromised Credentials**

*EventBridge Rule:*
```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "type": ["UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration"]
  }
}
```

*Lambda Remediation Function:*
```python
import boto3
import json

def lambda_handler(event, context):
    finding = event['detail']
    affected_user = finding['resource']['accessKeyDetails']['userName']
    access_key_id = finding['resource']['accessKeyDetails']['accessKeyId']

    iam = boto3.client('iam')
    sns = boto3.client('sns')

    # Immediately deactivate compromised access key
    iam.update_access_key(
        UserName=affected_user,
        AccessKeyId=access_key_id,
        Status='Inactive'
    )

    # Attach deny-all policy to user
    iam.attach_user_policy(
        UserName=affected_user,
        PolicyArn='arn:aws:iam::aws:policy/AWSDenyAll'
    )

    # Notify security team
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:111111111111:SecurityAlerts',
        Subject=f'CRITICAL: Compromised credentials for {affected_user}',
        Message=json.dumps({
            'user': affected_user,
            'access_key': access_key_id,
            'finding_id': finding['id'],
            'actions_taken': [
                'Access key deactivated',
                'User access revoked',
                'Incident ticket created'
            ]
        })
    )

    return {
        'statusCode': 200,
        'body': f'Remediated compromised credentials for {affected_user}'
    }
```

### Systems Manager Incident Manager

AWS Systems Manager Incident Manager provides incident response orchestration:

**Features:**
- **Response Plans:** Pre-defined runbooks for incident types
- **Contacts:** Escalation paths and on-call rotations
- **Engagement:** Automatic paging via SNS, email, SMS
- **Post-Incident Analysis:** Timeline reconstruction and root cause analysis

**Integration:**
- CloudWatch Alarms trigger incidents
- EventBridge rules create incidents from security findings
- Manual incident creation from console/API
- Integration with third-party ITSM (ServiceNow, Jira)

**AWS Documentation:**
- [EventBridge Security Automation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-security.html)
- [Systems Manager Incident Manager](https://docs.aws.amazon.com/incident-manager/latest/userguide/what-is-incident-manager.html)

## SAP-C02 Exam Tips

1. **SCPs vs. Permission Boundaries:**
   - SCPs apply to all principals in accounts/OUs (including root)
   - Permission boundaries apply to individual IAM users/roles
   - Both define maximum permissions (do not grant)
   - SCPs exempt management account; permission boundaries do not

2. **KMS Key Types:**
   - Use customer managed keys when you need audit trails, rotation control, or cross-account access
   - AWS managed keys rotate automatically (annually) and cannot be disabled
   - SSE-S3 vs. SSE-KMS: Choose KMS for compliance, cross-account, or audit requirements

3. **CloudTrail Immutability:**
   - With log file integrity validation enabled, logs cannot be modified without detection
   - Organization trail automatically includes new member accounts
   - Multi-region trail required for global service events (IAM, STS, Route 53)

4. **Config vs. CloudWatch:**
   - Config tracks configuration changes (who changed what security group rule)
   - CloudWatch monitors performance metrics (CPU, network throughput)
   - Use Config for compliance, CloudWatch for operational monitoring

5. **Security Hub as Aggregator:**
   - Does not detect threats itself (consolidates findings from other services)
   - Requires underlying services enabled (GuardDuty, Config, etc.)
   - Security standards run as Config rules (requires Config enabled)

6. **GuardDuty Data Sources:**
   - Foundational: CloudTrail, VPC Flow Logs, DNS logs (included in price)
   - Optional: S3 data events, EKS audit logs, EC2 runtime monitoring
   - Machine learning-based (not rule-based) - detects anomalies, not policy violations

7. **Permission Boundaries for Delegation:**
   - Allow safe delegation of user creation to teams
   - Prevent privilege escalation (delegated admins cannot remove boundaries)
   - Require both identity policy AND boundary allow for effective permission

8. **IAM Access Analyzer:**
   - External access analyzer: Regional (create in each region)
   - Unused access analyzer: Global (single analyzer per organization)
   - Generates findings when resources accessible outside zone of trust
   - Zone of trust = organization or account

9. **Cross-Account Encryption:**
   - Requires BOTH key policy (in key account) AND IAM policy (in user account)
   - KMS grants enable temporary permission delegation without policy changes
   - Encryption context provides cryptographic binding and audit correlation

10. **Secrets Manager vs. Parameter Store:**
    - Secrets Manager: Automatic rotation (Lambda), cross-account access, higher cost
    - Parameter Store: Manual rotation, IAM-only access, lower cost (Standard tier free)
    - Use Secrets Manager for database credentials; Parameter Store for config values

11. **Multi-Account Security Architecture:**
    - Dedicated Security account for security tooling (GuardDuty, Security Hub)
    - Dedicated Logging account for centralized log storage (CloudTrail, Config)
    - Organization trail logs ALL accounts automatically (including new accounts)
    - Use delegated administrator (not management account) for security services

12. **Compliance Automation:**
    - Config Rules evaluate compliance continuously
    - Config Remediation uses SSM Automation for automatic fixes
    - Security Hub provides compliance dashboards for multiple frameworks
    - Audit Manager automates evidence collection for audits

