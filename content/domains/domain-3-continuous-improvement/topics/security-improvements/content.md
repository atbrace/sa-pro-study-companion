---
title: Security Improvements for Existing Solutions
lastUpdated: 2026-01-05
---

# Security Improvements for Existing Solutions

Enhancing the security posture of existing AWS workloads requires a comprehensive approach using threat detection, compliance monitoring, configuration management, data discovery, and secrets management. This topic covers the AWS services and strategies essential for continuous security improvement at the SAP-C02 professional level.

## Amazon GuardDuty - Intelligent Threat Detection

GuardDuty is a managed threat detection service that continuously monitors for malicious activity and unauthorized behavior using machine learning and threat intelligence.

### Data Sources

GuardDuty analyzes multiple data sources without requiring agents:
- **VPC Flow Logs** - Network traffic patterns
- **CloudTrail event logs** - API activity and authentication events
- **DNS logs** - Domain resolution patterns
- **EKS audit logs** - Kubernetes control plane activity (optional)
- **S3 data events** - Object-level API operations (optional)

> 📚 [GuardDuty Data Sources](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_data-sources.html)

### Finding Types and Categories

**Reconnaissance:**
- Port scans and probes
- Unusual API call patterns
- Network reconnaissance

**Instance Compromise:**
- Cryptocurrency mining
- Backdoor communication
- Command and control (C&C) activity
- Malware using domain generation algorithms
- Unusual network protocols

**Account Compromise:**
- Credential exfiltration
- Unusual API calls from anonymous proxies
- Password brute force attempts
- Unauthorized IAM activity

**S3 Bucket Compromise:**
- Suspicious data access patterns
- Credential exposure in S3
- Unusual API calls to S3

**Malicious or Unauthorized Behavior:**
- Tor client activity
- Bitcoin mining
- Port scanning from EC2

> 📚 [GuardDuty Finding Types](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-active.html)

### Multi-Account Setup

**Master/Member Architecture:**
```
┌──────────────────────┐
│  GuardDuty Master    │
│  (Security Account)  │
└──────────┬───────────┘
           │
    ┌──────┴──────┬──────────┬──────────┐
    │             │          │          │
┌───▼────┐  ┌────▼───┐ ┌────▼───┐ ┌───▼────┐
│Member  │  │Member  │ │Member  │ │Member  │
│Account │  │Account │ │Account │ │Account │
│   1    │  │   2    │ │   3    │ │  ...   │
└────────┘  └────────┘ └────────┘ └────────┘
```

**Implementation Steps:**
1. Designate a GuardDuty master account (security account)
2. Invite or auto-enable member accounts (via Organizations)
3. Member accounts accept invitation or are auto-enabled
4. Master account sees aggregated findings across all accounts
5. Configure automated response using EventBridge

### Automated Response Patterns

```yaml
# EventBridge Rule for GuardDuty Findings
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [7, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9]
  }
}

# Target: Lambda for automated remediation
# Actions:
# - Isolate compromised EC2 instance (change security group)
# - Disable compromised IAM credentials
# - Create SNS notification to security team
# - Create JIRA ticket for investigation
```

### Best Practices

- Enable GuardDuty in all regions where you have resources
- Use Organizations integration for automatic new account enablement
- Configure findings export to S3 for long-term retention
- Integrate with Security Hub for centralized visibility
- Set up automated response for high-severity findings
- Review suppression rules periodically to avoid false negatives
- Enable EKS and S3 protection for comprehensive coverage

## AWS Security Hub - Centralized Security Posture

Security Hub provides a comprehensive view of security findings and compliance status across AWS accounts and services.

### Core Capabilities

**1. Finding Aggregation:**
Consolidates findings from:
- GuardDuty (threat detection)
- Inspector (vulnerability assessment)
- Macie (data protection)
- IAM Access Analyzer (unintended access)
- Firewall Manager (policy compliance)
- Systems Manager Patch Manager
- Third-party solutions (Qualys, Palo Alto, etc.)

**2. Compliance Frameworks:**
Built-in security standards:
- **CIS AWS Foundations Benchmark** - Industry best practices
- **PCI DSS** - Payment card industry compliance
- **AWS Foundational Security Best Practices** - AWS recommendations
- **NIST Cybersecurity Framework** - Risk management framework
- **Service-Managed Standards** - Custom standards

**3. Security Score:**
- Aggregate compliance score across all standards
- Identifies security posture trends over time
- Weighted by finding severity

> 📚 [Security Hub Standards](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards.html)

### Multi-Account Architecture

**Delegated Administrator Pattern:**
```
┌─────────────────────┐
│ Management Account  │
│  (Organizations)    │
└──────────┬──────────┘
           │ Delegates administration
           │
    ┌──────▼──────┐
    │  Security   │ ← Security Hub Administrator
    │  Account    │   (Aggregates all findings)
    └──────┬──────┘
           │
    ┌──────┴──────┬──────────┬──────────┐
    │             │          │          │
┌───▼────┐  ┌────▼───┐ ┌────▼───┐ ┌───▼────┐
│Member  │  │Member  │ │Member  │ │Member  │
│Account │  │Account │ │Account │ │Account │
└────────┘  └────────┘ └────────┘ └────────┘
```

**Regional Considerations:**
- Security Hub is regional (must enable in each region)
- Use aggregation regions to consolidate cross-region findings
- Designate a home region for centralized management

### Custom Insights

Create custom queries for specific security concerns:

```json
{
  "Name": "High Severity Unresolved Findings",
  "Filters": {
    "SeverityLabel": [{"Value": "CRITICAL", "Comparison": "EQUALS"}],
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}]
  },
  "GroupByAttribute": "ResourceType"
}
```

**Common Custom Insights:**
- Unpatched EC2 instances by criticality
- S3 buckets with public access
- IAM users without MFA
- Unencrypted resources
- Resources missing required tags

### Automated Remediation

**EventBridge Integration:**
```
GuardDuty Finding → Security Hub → EventBridge → Lambda/Systems Manager
                                              → SNS (notification)
                                              → JIRA/ServiceNow
```

**Example Remediation Actions:**
- Auto-enable S3 bucket encryption
- Disable unused IAM credentials
- Attach required security group rules
- Enable CloudTrail in non-compliant accounts
- Revoke overly permissive security group rules

> 📚 [Security Hub Automated Remediation](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cloudwatch-events.html)

## AWS Config - Continuous Compliance

AWS Config tracks resource configuration changes and evaluates compliance against desired configurations.

### Configuration Recording

**What Config Records:**
- Resource configurations (current and historical)
- Relationships between resources
- Configuration change timeline
- CloudTrail API calls that changed resources

**Supported Resources:**
- 100+ AWS resource types
- Custom resources via CloudFormation
- Third-party resources via resource providers

> 📚 [Supported Resource Types](https://docs.aws.amazon.com/config/latest/developerguide/resource-config-reference.html)

### Config Rules

**Managed Rules (AWS-provided):**
```yaml
# Example: Ensure EBS volumes are encrypted
Rule: encrypted-volumes
Scope: EC2::Volume
Evaluation: Configuration change
Parameters: None
Non-compliant if: EBS volume is not encrypted
```

**Common Managed Rules:**
- `required-tags` - Enforce tagging strategy
- `encrypted-volumes` - EBS encryption
- `s3-bucket-public-read-prohibited` - Prevent public S3 buckets
- `rds-encryption-enabled` - RDS encryption
- `ec2-instance-managed-by-ssm` - Systems Manager agent
- `cloudtrail-enabled` - CloudTrail in all regions
- `mfa-enabled-for-iam-console-access` - IAM user MFA
- `iam-password-policy` - Password complexity
- `vpc-flow-logs-enabled` - VPC Flow Logs
- `s3-bucket-versioning-enabled` - S3 versioning

**Custom Rules:**
Create Lambda-backed rules for organization-specific requirements:
```python
# Lambda function evaluates compliance
def lambda_handler(event, context):
    config = boto3.client('config')

    # Evaluate resource configuration
    compliance_type = 'COMPLIANT' if meets_requirement() else 'NON_COMPLIANT'

    config.put_evaluations(
        Evaluations=[{
            'ComplianceResourceType': event['configRuleInvokingEvent']['configurationItem']['resourceType'],
            'ComplianceResourceId': event['configRuleInvokingEvent']['configurationItem']['resourceId'],
            'ComplianceType': compliance_type,
            'OrderingTimestamp': event['configRuleInvokingEvent']['configurationItem']['configurationItemCaptureTime']
        }],
        ResultToken=event['resultToken']
    )
```

### Conformance Packs

Conformance packs bundle Config rules and remediation actions for compliance frameworks:

**Available Packs:**
- **Operational Best Practices for CIS AWS Foundations Benchmark**
- **Operational Best Practices for PCI DSS**
- **Operational Best Practices for HIPAA**
- **Operational Best Practices for NIST 800-53**
- **AWS Control Tower Detective Guardrails**

**Custom Conformance Packs:**
```yaml
# conformance-pack.yaml
Resources:
  EncryptedVolumesRule:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: encrypted-volumes-rule
      Source:
        Owner: AWS
        SourceIdentifier: ENCRYPTED_VOLUMES

  S3BucketEncryptionRule:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: s3-default-encryption-rule
      Source:
        Owner: AWS
        SourceIdentifier: S3_DEFAULT_ENCRYPTION_KMS
```

> 📚 [Conformance Packs](https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html)

### Automatic Remediation

**Systems Manager Automation Integration:**
```yaml
ConfigRule: s3-bucket-public-read-prohibited
RemediationAction: AWS-PublishSNSNotification
AutomationAssumeRole: arn:aws:iam::ACCOUNT:role/ConfigRemediationRole
Parameters:
  AutomationAssumeRole: arn:aws:iam::ACCOUNT:role/ConfigRemediationRole
  TopicArn: arn:aws:sns:region:ACCOUNT:security-alerts
```

**Common Remediation Actions:**
- `AWS-DisableS3BucketPublicReadWrite` - Remove public access
- `AWS-EnableCloudTrailCloudWatchLogs` - Enable CloudTrail logging
- `AWS-EnableEncryptionOnS3Bucket` - Add default encryption
- `AWS-DeleteIamUser` - Remove unused IAM users
- `AWSConfigRemediation-EnableEbsEncryptionByDefault` - Enable EBS encryption

### Multi-Account Config Aggregator

```
┌────────────────────┐
│  Config Aggregator │
│ (Security Account) │
└─────────┬──────────┘
          │
   ┌──────┴──────┬──────────┬──────────┐
   │             │          │          │
┌──▼──┐     ┌───▼──┐  ┌────▼───┐ ┌───▼────┐
│Acct │     │Acct  │  │Acct    │ │Acct    │
│  1  │     │  2   │  │   3    │ │  ...   │
└─────┘     └──────┘  └────────┘ └────────┘
```

**Benefits:**
- Centralized compliance dashboard
- Cross-account configuration queries
- Organization-wide compliance reporting
- Reduced Config costs (single aggregator)

## Amazon Macie - Sensitive Data Discovery

Macie uses machine learning to automatically discover, classify, and protect sensitive data in S3.

### Data Classification

**Managed Data Identifiers:**
- **Credentials:** AWS secret keys, private keys
- **Financial:** Credit card numbers, bank account numbers
- **Personal:** Social Security numbers, passport numbers
- **Health:** Medical record numbers, health insurance IDs

**Custom Data Identifiers:**
- Regex patterns for proprietary data formats
- Maximum match distance for keywords
- Ignore words/patterns

> 📚 [Macie Managed Data Identifiers](https://docs.aws.amazon.com/macie/latest/user/managed-data-identifiers.html)

### Sensitive Data Discovery Jobs

**Job Types:**
- **One-time jobs** - Scan specific buckets once
- **Scheduled jobs** - Recurring scans (daily, weekly, monthly)

**Scope Configuration:**
```json
{
  "bucketCriteria": {
    "includes": {
      "and": [
        {"tag": {"key": "Environment", "value": "Production"}},
        {"tag": {"key": "DataClassification", "value": "Sensitive"}}
      ]
    }
  },
  "scoping": {
    "includes": {
      "and": [
        {"simpleScopeTerm": {
          "comparator": "EQ",
          "key": "OBJECT_EXTENSION",
          "values": ["csv", "json", "txt", "log"]
        }}
      ]
    }
  }
}
```

### Findings and Alerts

**Finding Types:**
- **Policy findings** - S3 bucket policy or encryption issues
- **Sensitive data findings** - Objects containing sensitive data

**Severity Levels:**
- High - Multiple types of sensitive data
- Medium - Single type with multiple occurrences
- Low - Single occurrence

**Automated Response:**
```
Macie Finding → EventBridge → Lambda → Remediation
                           → SNS → Security Team
                           → S3 → Archive finding
```

### Integration with Security Hub

Macie automatically publishes findings to Security Hub for centralized visibility:
- S3 buckets with public access
- Unencrypted buckets
- Buckets shared externally
- Sensitive data findings

## IAM Access Analyzer - Unintended Access Detection

Access Analyzer helps identify resources shared with external entities and validates IAM policies.

### External Access Analysis

**Supported Resources:**
- S3 buckets
- IAM roles
- KMS keys
- Lambda functions
- SQS queues
- Secrets Manager secrets
- SNS topics
- ECR repositories

**Zone of Trust:**
- Define organization or account as trusted zone
- Access Analyzer flags resources accessible from outside zone
- Findings show who can access and how

> 📚 [IAM Access Analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)

### Finding Types

**Active Findings:**
```
S3 Bucket: production-data
Principal: arn:aws:iam::123456789012:root (External Account)
Access: Read, Write
Condition: None
Recommendation: Review and remove if unintended
```

**Common Scenarios:**
- S3 bucket accessible to external account
- KMS key grants to external principals
- IAM role assumable by external entities
- Lambda function with overly permissive resource policy

### Policy Validation

**Custom Policy Checks:**
- Validates IAM policy syntax
- Checks for security warnings
- Identifies policy errors
- Suggests improvements

**Validation Types:**
```python
# AWS CLI example
aws accessanalyzer validate-policy \
  --policy-type IDENTITY_POLICY \
  --policy-document file://policy.json \
  --region us-east-1

# Results:
# - Syntax errors
# - Security warnings (e.g., NotPrincipal with Allow)
# - Suggestions (e.g., use specific actions instead of *)
# - General warnings
```

### Access Preview

Preview how policy changes affect external access BEFORE applying:

```json
{
  "analyzerArn": "arn:aws:access-analyzer:region:account:analyzer/name",
  "configurations": {
    "s3Bucket": {
      "bucketPolicy": "{\"Version\":\"2012-10-17\",...}",
      "bucketPublicAccessBlock": {
        "ignorePublicAcls": true,
        "restrictPublicBuckets": true
      }
    }
  }
}
```

**Use Cases:**
- Validate policy changes before deployment
- Test different access scenarios
- Ensure compliance before implementation

## Secrets Management

### AWS Secrets Manager

**Key Features:**
- Automatic secret rotation with Lambda
- Resource-based policies for cross-account access
- Integration with RDS, Redshift, DocumentDB
- Versioning and audit trail
- Encryption at rest with KMS

**Automatic Rotation:**
```python
# Lambda rotation function
def lambda_handler(event, context):
    service_client = boto3.client('secretsmanager')

    # Create new secret
    new_secret = generate_new_password()

    # Test new secret
    test_secret(new_secret)

    # Update secret in Secrets Manager
    service_client.put_secret_value(
        SecretId=event['SecretId'],
        ClientRequestToken=event['ClientRequestToken'],
        SecretString=json.dumps(new_secret),
        VersionStages=['AWSCURRENT']
    )
```

**Built-in Rotation for:**
- Amazon RDS (MySQL, PostgreSQL, Oracle, SQL Server)
- Amazon DocumentDB
- Amazon Redshift
- Custom applications (with Lambda function)

**Cross-Account Access:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::ACCOUNT-B:role/AppRole"},
    "Action": ["secretsmanager:GetSecretValue"],
    "Resource": "*",
    "Condition": {
      "StringEquals": {
        "secretsmanager:VersionStage": "AWSCURRENT"
      }
    }
  }]
}
```

> 📚 [Secrets Manager Rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)

### AWS Systems Manager Parameter Store

**Parameter Types:**
- **String** - Plain text
- **StringList** - Comma-separated values
- **SecureString** - Encrypted with KMS

**Tiers:**
| Feature | Standard | Advanced |
|---------|----------|----------|
| **Max parameters** | 10,000 | 100,000 |
| **Max size** | 4 KB | 8 KB |
| **Parameter policies** | No | Yes |
| **Cost** | Free | $0.05 per parameter/month |

**Parameter Policies:**
```json
{
  "Type": "Expiration",
  "Version": "1.0",
  "Attributes": {
    "Timestamp": "2026-12-31T23:59:59.000Z"
  }
}
```

**Policy Types:**
- **Expiration** - Delete parameter after date
- **ExpirationNotification** - EventBridge notification before expiration
- **NoChangeNotification** - Alert if parameter hasn't changed

**Best Practices:**
- Use hierarchical naming: `/app/environment/config/value`
- Use SecureString for sensitive data
- Enable versioning for audit trail
- Use parameter policies for lifecycle management
- Tag parameters for organization

### Secrets Manager vs. Parameter Store Decision Matrix

| Requirement | Secrets Manager | Parameter Store |
|-------------|-----------------|-----------------|
| **Automatic rotation** | ✅ Yes (native) | ❌ No (manual with Lambda) |
| **Cross-account access** | ✅ Resource policies | ⚠️ IAM only |
| **RDS integration** | ✅ Native | ⚠️ Manual |
| **Versioning** | ✅ Automatic | ✅ Automatic |
| **Audit trail** | ✅ CloudTrail | ✅ CloudTrail |
| **Cost** | $ Per secret + API | Free (Standard) |
| **Max size** | 64 KB | 4 KB / 8 KB |
| **Use case** | Database credentials, API keys | Config values, simple secrets |

## Security Improvement Workflows

### 1. Threat Detection and Response

```
GuardDuty → Security Hub → EventBridge → Lambda (Isolate resource)
                                      → SNS (Alert team)
                                      → Step Functions (Investigation workflow)
```

### 2. Compliance Monitoring

```
Config Rules → Compliance Status → Security Hub
                                 → EventBridge → Auto-remediation
                                               → Compliance dashboard
```

### 3. Data Protection

```
Macie Discovery Job → Findings → Security Hub → EventBridge → Lambda (Tag/encrypt)
                                                             → SNS (Alert DPO)
```

### 4. Access Governance

```
Access Analyzer → External Access Finding → Security Hub → EventBridge → Lambda (Revoke access)
                                                                       → SNS (Review needed)
```

## Exam Tips

1. **GuardDuty is intelligent** - Uses ML for threat detection, not rule-based like Config
2. **Security Hub is an aggregator** - Doesn't generate findings, consolidates from other services
3. **Config is for compliance** - Tracks configuration drift and evaluates rules
4. **Macie is data-focused** - Discovers and protects sensitive data in S3
5. **Access Analyzer finds unintended access** - Shows resources accessible from outside zone of trust
6. **Secrets Manager has native rotation** - Parameter Store requires custom Lambda
7. **Multi-account security requires delegated administration** - Use Organizations integration
8. **Automated remediation requires Systems Manager** - Config rules + SSM Automation documents
9. **Conformance packs are pre-built compliance bundles** - Deploy multiple rules at once
10. **Regional services require cross-region aggregation** - Use Security Hub aggregation regions
11. **Findings have severity levels** - Critical, High, Medium, Low, Informational
12. **EventBridge is the integration hub** - Connects all security services for automation
13. **Zone of trust defines scope** - Access Analyzer compares resource access against zone
14. **Secrets Manager supports cross-account** - Resource-based policies enable sharing
15. **Parameter Store policies manage lifecycle** - Expiration, change notifications

## Common Architectural Patterns

### Multi-Account Security Monitoring

```
┌─────────────────────────────────────────────────────────┐
│              Management Account (Organizations)          │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
┌─────────▼──────────┐      ┌──────────▼─────────┐
│  Security Account  │      │  Logging Account   │
│                    │      │                    │
│ • Security Hub     │      │ • CloudTrail logs  │
│   (Delegated Admin)│      │ • Config snapshots │
│ • GuardDuty Master │      │ • VPC Flow Logs    │
│ • Macie Admin      │      │ • GuardDuty finds  │
│ • Access Analyzer  │      │ • Macie finds      │
│ • Config Aggregator│      │                    │
└────────────────────┘      └────────────────────┘
          │
          │ Monitors
          │
┌─────────▼──────────────────────────────────────┐
│           Workload Accounts                    │
│  (Dev, Test, Prod, Shared Services)           │
│                                                │
│  • GuardDuty member                           │
│  • Security Hub member                        │
│  • Config enabled                             │
│  • Macie member                               │
└────────────────────────────────────────────────┘
```

### Automated Security Remediation Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Security   │───>│   Security   │───>│ EventBridge  │
│   Service    │    │     Hub      │    │    Rule      │
│ (GuardDuty,  │    │ (Aggregator) │    │  (Filter &   │
│  Config,     │    │              │    │   Route)     │
│  Macie, etc.)│    │              │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                           ┌───────────────────┼──────────────────┐
                           │                   │                  │
                    ┌──────▼──────┐    ┌──────▼──────┐   ┌──────▼──────┐
                    │   Lambda    │    │   Systems   │   │     SNS     │
                    │ (Immediate  │    │   Manager   │   │ (Notification)│
                    │ Remediation)│    │  Automation │   │             │
                    └─────────────┘    │  (Workflow  │   └─────────────┘
                                       │ Remediation)│
                                       └─────────────┘
```

### Secrets Lifecycle Management

```
┌─────────────────────────────────────────────────────────┐
│              Application (EC2, Lambda, ECS)              │
└───────────────────────────┬─────────────────────────────┘
                            │ Retrieves secret
                            │
                    ┌───────▼──────────┐
                    │ Secrets Manager  │
                    │                  │
                    │ • Encrypted      │
                    │ • Versioned      │
                    │ • Auto-rotation  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────────┐ ┌──▼────┐  ┌─────▼──────┐
     │     Lambda      │ │  KMS  │  │ CloudTrail │
     │ (Rotation Fn)   │ │ (Key) │  │  (Audit)   │
     │                 │ │       │  │            │
     │ • Create new    │ │       │  │ • GetSecret│
     │ • Test          │ │       │  │ • Rotate   │
     │ • Finalize      │ │       │  │            │
     └─────────────────┘ └───────┘  └────────────┘
              │
              │ Updates
              │
     ┌────────▼────────┐
     │   RDS/Redshift  │
     │    Database     │
     │                 │
     │ • Password      │
     │   updated       │
     └─────────────────┘
```

## Best Practices for Security Improvements

**1. Enable Security Services in All Accounts:**
- Use Organizations to auto-enable GuardDuty, Security Hub, Config
- Deploy via StackSets for consistency
- Enable in all active regions

**2. Centralize Security Visibility:**
- Designate a dedicated security account
- Use delegated administration (not management account)
- Aggregate findings in Security Hub
- Create cross-account CloudWatch dashboards

**3. Automate Remediation:**
- Start with low-risk, high-frequency findings
- Use Systems Manager for complex workflows
- Test remediation in non-production first
- Maintain audit trail of all automated actions

**4. Implement Layered Data Protection:**
- Macie for discovery and classification
- KMS for encryption at rest
- Access Analyzer for access governance
- S3 Block Public Access as preventive control

**5. Rotate Secrets Automatically:**
- Use Secrets Manager for database credentials
- Implement 30-60 day rotation schedules
- Test rotation functions in non-production
- Monitor rotation failures via CloudWatch

**6. Establish Baseline Compliance:**
- Deploy conformance packs for regulatory requirements
- Create custom Config rules for organization policies
- Set up compliance dashboards for leadership
- Review non-compliant resources weekly

**7. Respond to Threats Quickly:**
- Configure automated response for critical findings
- Create incident response runbooks
- Practice incident response via GameDay exercises
- Integrate with SIEM/SOAR platforms

**8. Monitor and Improve:**
- Review security metrics weekly
- Track Mean Time to Detect (MTTD) and Mean Time to Respond (MTTR)
- Conduct security reviews for new workloads
- Continuously update Config rules and conformance packs

> 📚 [AWS Security Best Practices](https://docs.aws.amazon.com/whitepapers/latest/aws-security-best-practices/)
