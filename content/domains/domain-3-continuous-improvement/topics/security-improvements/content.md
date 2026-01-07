---
title: Security Improvements for Existing Solutions
lastUpdated: 2026-01-05
---

# Security Improvements for Existing Solutions

Enhancing the security posture of existing AWS workloads requires a comprehensive approach using threat detection, compliance monitoring, configuration management, data discovery, and secrets management. This topic covers the AWS services and strategies essential for continuous security improvement at the SAP-C02 professional level.

## Amazon GuardDuty - Intelligent Threat Detection

GuardDuty is a managed threat detection service that continuously monitors for malicious activity and unauthorized behavior using machine learning, anomaly detection, and integrated threat intelligence from AWS, CrowdStrike, and Proofpoint. Unlike rule-based systems, GuardDuty uses behavioral analysis to identify threats that traditional signature-based tools miss.

### Core Data Sources and Optional Protection Plans

GuardDuty analyzes multiple data sources without requiring agents or manual log configuration:

**Foundational Data Sources (Automatically Enabled):**
- **VPC Flow Logs** - Network traffic patterns, connection metadata (source/destination IPs, ports, protocols)
- **CloudTrail Management Events** - API activity and authentication events across all AWS services
- **CloudTrail S3 Data Events** - Object-level API operations on S3 buckets
- **DNS Query Logs** - Domain resolution patterns from EC2 instances and other AWS resources

**Optional Protection Plans (Additional Cost):**

1. **EKS Protection** - Monitors Kubernetes audit logs for container-specific threats:
   - Anonymous access attempts
   - Privilege escalation via Kubernetes RBAC
   - Credential access from container workloads
   - Suspicious kubectl commands from unusual geolocations
   - *Use Case:* Organizations running production EKS clusters require visibility into container-level threats

2. **S3 Protection** - Analyzes CloudTrail S3 data events for object-level threats:
   - Unusual API call patterns (GetObject, PutObject, DeleteObject)
   - Data exfiltration attempts
   - Ransomware-like activity (mass deletion followed by unusual uploads)
   - *Cost Consideration:* Charged per million events analyzed; use selectively on sensitive buckets

3. **Malware Protection for EC2** - Agentless malware scanning of EBS volumes:
   - Scans occur when GuardDuty detects suspicious behavior
   - Creates temporary snapshots (automatically deleted after scan)
   - Identifies malware, trojans, coinminers, rootkits
   - *Key Benefit:* No performance impact on running instances; snapshots enable forensic analysis

4. **RDS Protection** - Monitors RDS login activity for database-specific threats:
   - Brute force attacks on database credentials
   - Suspicious login attempts from unusual locations
   - Anomalous database user behavior
   - *Supported Engines:* Aurora, RDS (MySQL, PostgreSQL, SQL Server, MariaDB)

5. **Lambda Protection** - Analyzes Lambda network activity data:
   - Outbound connections to known malicious IPs
   - Cryptocurrency mining from Lambda functions
   - Data exfiltration through Lambda execution
   - *No Code Changes Required:* Operates at VPC level without function modifications

**Real-World Scenario:** A financial services company enables all GuardDuty protections in their production account. When a compromised EC2 instance begins cryptocurrency mining, GuardDuty generates a high-severity finding. The malware protection plan automatically scans the EBS volume, identifies the miner binary, and provides the file hash for incident response. Meanwhile, Lambda protection detects the Lambda function attempting to exfiltrate data to an external IP, triggering automated isolation.

**AWS Documentation:**
- [GuardDuty Data Sources](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_data-sources.html)
- [GuardDuty Protection Plans](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-features-activation.html)
- [GuardDuty Malware Protection](https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection.html)

### Finding Types and Categories

GuardDuty findings are categorized by threat type with severity scores (0.1-8.9) based on risk impact. Understanding these categories is critical for prioritizing incident response.

**Reconnaissance (Information Gathering):**
- **Recon:EC2/PortProbeUnprotectedPort** - Port scans targeting unprotected services (e.g., SSH, RDP)
- **Recon:IAMUser/MaliciousIPCaller** - API calls from known malicious IP addresses
- **Recon:EC2/Portscan** - Instance performing outbound port scanning
- *Response Strategy:* Investigate source; may indicate early-stage attack or misconfigured security scanning tool

**Instance Compromise (EC2/ECS/EKS):**
- **CryptoCurrency:EC2/BitcoinTool.B!DNS** - EC2 instance querying cryptocurrency mining pool domains
- **Backdoor:EC2/C&CActivity.B** - Instance communicating with command-and-control server
- **Trojan:EC2/DNSDataExfiltration** - DNS tunneling for data exfiltration
- **UnauthorizedAccess:EC2/MaliciousIPCaller.Custom** - Instance accessed from threat list IP
- **Impact:EC2/AbusedDomainRequest.Reputation** - Accessing domains associated with malware
- *Real-World Impact:* A healthcare provider detected CryptoCurrency finding on an EC2 instance within 15 minutes of infection, preventing resource abuse and data breach

**Account Compromise (IAM Credential Abuse):**
- **UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration** - IAM temporary credentials used from external IP (credential theft)
- **Stealth:IAMUser/CloudTrailLoggingDisabled** - CloudTrail disabled to hide malicious activity
- **Policy:IAMUser/RootCredentialUsage** - Root credentials used (violates best practice)
- **CredentialAccess:IAMUser/AnomalousBehavior** - Unusual API calls pattern for IAM user
- *Critical Indicator:* InstanceCredentialExfiltration has 100% true positive rate in production environments

**S3 Bucket Compromise (Data Access Threats):**
- **Exfiltration:S3/ObjectRead.Unusual** - Unusual volume or pattern of S3 GetObject calls
- **Impact:S3/PermissionsModification.Unusual** - Bucket permissions modified suspiciously
- **Policy:S3/BucketAnonymousAccessGranted** - Bucket made publicly accessible
- **Stealth:S3/ServerAccessLoggingDisabled** - S3 access logging disabled
- *SAP-C02 Tip:* Requires S3 Protection plan; analyze findings alongside AWS Config s3-bucket-public-read-prohibited rule

**Database Compromise (RDS Protection):**
- **CredentialAccess:RDS/AnomalousBehavior.SuccessfulLogin** - Login from suspicious location or unusual time
- **CredentialAccess:RDS/MaliciousIPCaller.SuccessfulLogin** - Database accessed from known malicious IP
- **Impact:RDS/AnomalousBehavior.SuccessfulLogin** - Post-compromise unusual database queries
- *Cost vs. Risk:* Enable RDS Protection only for internet-facing or sensitive databases to optimize costs

**Container Runtime Threats (EKS Protection):**
- **PrivilegeEscalation:Kubernetes/PrivilegedContainer** - Container running with privileged flag
- **Execution:Kubernetes/ExecInKubeSystemPod** - Exec command executed in kube-system pod
- **Persistence:Kubernetes/ContainerWithSensitiveMount** - Sensitive host path mounted in container
- *Architectural Consideration:* Combine with Falco or GuardDuty Runtime Monitoring for comprehensive container security

**Lambda Function Threats (Lambda Protection):**
- **CryptoCurrency:Lambda/BitcoinTool.B!DNS** - Lambda function querying cryptocurrency domains
- **Backdoor:Lambda/C&CActivity.B** - Lambda communicating with C&C infrastructure
- *Unique Challenge:* Short-lived Lambda executions require automated response (manual investigation often too slow)

**Severity Score Interpretation:**
| Severity | Score Range | Action Required | Response Time |
|----------|-------------|-----------------|---------------|
| **Low** | 0.1 - 3.9 | Monitor, investigate during business hours | 7 days |
| **Medium** | 4.0 - 6.9 | Investigate within 24 hours | 1 day |
| **High** | 7.0 - 8.9 | Immediate investigation and containment | 1 hour |

**AWS Documentation:**
- [GuardDuty Finding Types Reference](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-active.html)
- [GuardDuty Severity Levels](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings.html#guardduty_findings-severity)

### Multi-Account Setup with Organizations Integration

**Delegated Administrator Architecture (Recommended Pattern):**
```
┌────────────────────────────────────────────┐
│     Management Account (Organizations)     │
│  - Do NOT enable GuardDuty here           │
│  - Designate Security Account as admin    │
└────────────────┬───────────────────────────┘
                 │ Delegates administration
                 │
         ┌───────▼──────────┐
         │ Security Account │ ← GuardDuty Delegated Administrator
         │  (GuardDuty Hub) │   (Aggregates findings from all accounts)
         └───────┬──────────┘
                 │
      ┌──────────┼──────────┬──────────┐
      │          │          │          │
  ┌───▼────┐ ┌──▼────┐ ┌───▼────┐ ┌──▼────┐
  │ Member │ │Member │ │ Member │ │Member │
  │Account │ │Account│ │Account │ │Account│
  │   1    │ │  2    │ │   3    │ │  ...  │
  └────────┘ └───────┘ └────────┘ └───────┘
```

**Implementation Approaches:**

1. **Auto-Enable via Organizations (Preferred for SAP-C02):**
   - Management account designates Security Account as delegated administrator
   - Delegated administrator enables GuardDuty across all organization accounts automatically
   - New accounts joining organization automatically have GuardDuty enabled
   - Supports auto-enabling protection plans (S3, EKS, RDS, Lambda, Malware)
   - *Key Advantage:* Zero-touch deployment for new accounts; prevents security gaps

2. **Invitation-Based (Legacy Approach):**
   - Security account invites member accounts via email
   - Member accounts must accept invitation manually
   - *Limitation:* Does not auto-enable for new accounts; manual process prone to delays

**Regional Considerations:**
- GuardDuty is **regional** - must enable in each region with active resources
- Use StackSets to deploy GuardDuty enablement across all regions simultaneously
- Findings stay regional unless aggregated in Security Hub
- *Cost Optimization:* Disable GuardDuty in unused regions to avoid unnecessary charges

**Real-World Deployment Scenario:** A multinational enterprise with 150 AWS accounts uses GuardDuty delegated administrator pattern. When a new development team provisions an account, GuardDuty automatically enables with all protection plans within 5 minutes. The security team receives aggregated findings in the Security Account without any manual configuration, ensuring zero coverage gaps.

### Automated Response Patterns

**EventBridge Rule for High-Severity Findings:**
```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [
      {"numeric": [">=", 7]}
    ],
    "type": [
      "UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration",
      "CryptoCurrency:EC2/BitcoinTool.B!DNS",
      "Backdoor:EC2/C&CActivity.B"
    ]
  }
}
```

**Lambda Remediation Function Example:**
```python
import boto3

def lambda_handler(event, context):
    finding = event['detail']
    finding_type = finding['type']
    severity = finding['severity']

    ec2 = boto3.client('ec2')
    iam = boto3.client('iam')
    sns = boto3.client('sns')

    # Isolate compromised EC2 instance
    if 'EC2' in finding_type and severity >= 7:
        instance_id = finding['resource']['instanceDetails']['instanceId']

        # Create forensic snapshot before isolation
        volumes = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]['BlockDeviceMappings']
        for volume in volumes:
            ec2.create_snapshot(VolumeId=volume['Ebs']['VolumeId'],
                              Description=f"Forensic snapshot - {finding_type}")

        # Replace security group with isolation SG (no inbound/outbound)
        ec2.modify_instance_attribute(InstanceId=instance_id,
                                     Groups=['sg-isolation-quarantine'])

        # Tag instance for investigation
        ec2.create_tags(Resources=[instance_id],
                       Tags=[{'Key': 'SecurityStatus', 'Value': 'Quarantined'},
                             {'Key': 'GuardDutyFindingId', 'Value': finding['id']}])

    # Disable compromised IAM credentials
    if 'IAMUser/InstanceCredentialExfiltration' in finding_type:
        access_key = finding['resource']['accessKeyDetails']['accessKeyId']
        user_name = finding['resource']['accessKeyDetails']['userName']

        # Disable access key immediately
        iam.update_access_key(UserName=user_name, AccessKeyId=access_key, Status='Inactive')

        # Attach explicit deny policy
        iam.attach_user_policy(UserName=user_name, PolicyArn='arn:aws:iam::aws:policy/AWSDenyAll')

    # Notify security team
    sns.publish(TopicArn='arn:aws:sns:region:account:security-alerts',
                Subject=f"GuardDuty HIGH Severity: {finding_type}",
                Message=f"Automated remediation completed for finding {finding['id']}")

    return {'statusCode': 200, 'body': 'Remediation completed'}
```

**Step Functions Workflow for Complex Remediation:**
```yaml
# State Machine for coordinated incident response
States:
  1. Analyze Finding → Determine remediation strategy
  2. Create Forensic Snapshot → Preserve evidence
  3. Isolate Resource → Apply quarantine controls
  4. Notify Security Team → SNS + PagerDuty + Slack
  5. Create JIRA Ticket → Track investigation
  6. Run GuardDuty Malware Scan → If EC2 instance
  7. Update CMDB → Mark asset status
  8. Wait for Approval → Human review for termination
  9. Terminate Resource → If approved
  10. Archive Finding → Update Security Hub
```

### GuardDuty Trusted IP Lists and Threat Lists

**Trusted IP Lists (Suppress False Positives):**
- Whitelisted IP addresses that should not trigger findings
- Use cases: Corporate VPN exit IPs, security scanning tools, authorized penetration testing
- *SAP-C02 Consideration:* Overuse of trusted IPs reduces detection effectiveness; use sparingly

**Threat IP Lists (Custom Threat Intelligence):**
- Additional IPs/domains to monitor beyond GuardDuty's built-in threat feeds
- Integrate threat intel from third-party sources (e.g., ISACs, threat intel platforms)
- *Format:* Plaintext file in S3 with one IP or CIDR per line

**Real-World Use Case:** A retail company adds their CDN provider's IP ranges to the trusted IP list to prevent false positives from high-volume API calls. Simultaneously, they import threat IPs from their industry ISAC (Information Sharing and Analysis Center) to detect retail-specific threats.

### Best Practices for Production Deployments

**Enable GuardDuty Comprehensively:**
- Enable in **all regions** where resources exist (even unused regions can be attack vectors)
- Use Organizations integration for automatic enablement in new accounts
- Enable all protection plans (S3, EKS, RDS, Lambda, Malware) unless cost constraints exist
- Export findings to S3 for long-term retention (90 days minimum for compliance)

**Optimize Finding Management:**
- Integrate with Security Hub for centralized finding aggregation
- Configure finding export to S3 bucket with lifecycle policies (e.g., Glacier after 90 days)
- Set up cross-region aggregation in Security Hub if operating in multiple regions
- Use finding frequency controls to suppress recurring low-severity findings

**Automated Response Strategy:**
- Automate response for High/Critical severity findings (7.0+)
- Require human approval for destructive actions (instance termination)
- Create runbooks for Medium severity findings (manual investigation within SLA)
- Archive Low/Informational findings automatically after 30 days

**Review and Tune Regularly:**
- Review suppression rules monthly to ensure they remain relevant
- Analyze false positive rates and adjust trusted IP lists
- Update EventBridge filters based on evolving threat landscape
- Test malware protection by scanning known test volumes (EICAR test file)

**Cost Optimization:**
- Disable GuardDuty in regions with zero resources
- Use S3 Protection selectively on sensitive buckets (not all buckets)
- Consider EKS Protection only for production clusters
- RDS Protection only for internet-accessible or sensitive databases
- Monitor CloudWatch metrics for monthly cost per account

**AWS Documentation:**
- [GuardDuty Multi-Account Configuration](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html)
- [GuardDuty Trusted and Threat Lists](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload-lists.html)
- [GuardDuty Findings Export](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_exportfindings.html)

## AWS Security Hub - Centralized Security Posture

Security Hub is a cloud security posture management (CSPM) service that aggregates, organizes, and prioritizes security findings from multiple AWS services and third-party tools. It normalizes findings using AWS Security Finding Format (ASFF), enabling consistent analysis across disparate security tools.

### Core Capabilities

**1. Finding Aggregation and Normalization:**

Security Hub consolidates findings from 50+ AWS and partner integrations using the **AWS Security Finding Format (ASFF)** - a standardized JSON schema that enables cross-tool correlation.

**AWS Native Integrations:**
- **GuardDuty** - Threat detection findings (instance compromise, credential theft)
- **Inspector** - Vulnerability assessments (CVEs, network exposure, package vulnerabilities)
- **Macie** - Sensitive data discoveries (PII, PHI, credentials in S3)
- **IAM Access Analyzer** - External access findings (unintended resource sharing)
- **Firewall Manager** - Security policy compliance (WAF, Shield, VPC security groups)
- **Systems Manager Patch Manager** - Missing patches and compliance drift
- **Health** - Security-related service events
- **Audit Manager** - Compliance framework assessments

**Third-Party Integrations (via AWS Partner Network):**
- **Palo Alto Networks** - Firewall and threat prevention
- **CrowdStrike** - Endpoint detection and response
- **Qualys** - Vulnerability management
- **Tenable** - Security analytics
- **Check Point CloudGuard** - Cloud-native security
- *SAP-C02 Consideration:* ASFF normalization means all findings have consistent schema regardless of source, simplifying SIEM integration

**Real-World Scenario:** A financial services company receives a Macie finding about exposed credit card numbers in S3, a GuardDuty finding about unusual API calls from the same account, and an IAM Access Analyzer finding showing the S3 bucket accessible externally. Security Hub correlates these three findings using resource ARN and timestamps, revealing a coordinated data exfiltration attack that individual tools wouldn't detect.

**2. Compliance Frameworks and Security Standards:**

Security Hub continuously evaluates resources against security standards using automated Config rule checks.

**Available Standards (as of 2026):**

| Standard | Description | Control Count | Use Case |
|----------|-------------|---------------|----------|
| **AWS Foundational Security Best Practices (FSBP)** | AWS-recommended security configurations | 230+ controls | General AWS security baseline |
| **CIS AWS Foundations Benchmark v1.4/v3.0** | Industry consensus security practices | 50+ controls | Compliance requirement for many regulations |
| **PCI DSS v3.2.1** | Payment Card Industry Data Security Standard | 40+ controls | E-commerce, payment processing |
| **NIST 800-53 Rev. 5** | Federal information security standard | 180+ controls | Government, healthcare, defense contractors |
| **Service-Managed Standards** | Custom standards defined by your organization | Varies | Organization-specific policies |

**How Standards Work:**
1. You enable a standard (e.g., CIS AWS Foundations Benchmark)
2. Security Hub automatically runs Config rules associated with standard controls
3. Resources are evaluated (e.g., "Are S3 buckets encrypted?", "Is MFA enabled on root account?")
4. Findings are generated for non-compliant resources
5. Overall compliance score is calculated based on passing/failing controls

**Example Control - CIS 2.1.1 (S3 Bucket Encryption):**
```json
{
  "StandardsControlArn": "arn:aws:securityhub:region:account:control/cis-aws-foundations-benchmark/v/1.4.0/2.1.1",
  "Title": "Ensure S3 bucket encryption is enabled",
  "Description": "S3 buckets should have encryption at rest enabled to protect sensitive data",
  "ComplianceStatus": "FAILED",
  "RelatedRequirements": ["PCI DSS 3.4", "NIST 800-53 SC-28"],
  "Workflow": {
    "Status": "NEW"
  }
}
```

**3. Security Score and Posture Tracking:**

Security Hub calculates a **security score** representing overall compliance across enabled standards:

- **Calculation:** (Passing controls / Total controls) × 100
- **Weighting:** Critical severity findings reduce score more than Low severity
- **Trending:** Track score over time to measure security posture improvements
- **Drill-Down:** Click score to see specific failing controls by category (Protect, Detect, Respond, Recover)

**Real-World Application:** A healthcare organization enables NIST 800-53 standard in Security Hub. Initial score is 62%. After 90 days of remediation (enabling S3 encryption, enforcing MFA, patching instances), score reaches 94%, demonstrating compliance readiness for HIPAA audit.

**AWS Documentation:**
- [Security Hub Standards](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards.html)
- [AWS Security Finding Format (ASFF)](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format.html)
- [Security Hub Integrations](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-providers.html)

### Multi-Account Architecture with Cross-Region Aggregation

**Delegated Administrator Pattern with Regional Aggregation:**
```
┌──────────────────────────────────────────────────────────┐
│           Management Account (Organizations)             │
│        Designates Security Account as admin              │
└────────────────────────┬─────────────────────────────────┘
                         │
                 ┌───────▼────────────────────┐
                 │   Security Account         │
                 │   (Delegated Admin)        │
                 │                            │
                 │  ┌──────────────────────┐  │
                 │  │ Home Region (us-east-1)│  │
                 │  │ AGGREGATION REGION   │  │
                 │  │                      │  │
                 │  │ Aggregates findings  │  │
                 │  │ from all regions     │  │
                 │  └──────────┬───────────┘  │
                 │             │              │
                 │    ┌────────┼────────┐     │
                 │    │        │        │     │
                 │  ┌─▼──┐  ┌──▼─┐  ┌──▼─┐   │
                 │  │us-w2│  │eu-w1│  │ap-s1│ │
                 │  │Linked│ │Linked│ │Linked│ │
                 │  └────┘  └─────┘  └─────┘  │
                 └────────────┬────────────────┘
                              │
                    ┌─────────┼─────────┬─────────┐
                    │         │         │         │
              ┌─────▼───┐ ┌──▼────┐ ┌──▼────┐ ┌──▼────┐
              │ Workload│ │Workload│ │Workload│ │Workload│
              │Account 1│ │Account 2│ │Account 3│ │Account 4│
              └─────────┘ └────────┘ └────────┘ └────────┘
                 (each account enabled in all active regions)
```

**Cross-Region Aggregation Architecture:**

Security Hub is a **regional service**, but supports cross-region aggregation to provide unified visibility.

**Implementation Steps:**
1. **Designate Home Region** - Choose primary region for centralized management (typically us-east-1)
2. **Enable Security Hub** - Activate in home region and all regions with resources
3. **Configure Aggregation** - Link other regions to home region
4. **Enable Member Accounts** - Auto-enable across organization via delegated admin
5. **View Aggregated Findings** - All findings appear in home region console

**How Aggregation Works:**
- Home region receives **copies** of findings from linked regions
- Original findings remain in source region (not moved)
- Updates to findings in source region automatically sync to home region
- Remediation actions must be performed in the **source region** (not aggregation region)
- *SAP-C02 Exam Tip:* Aggregation is read-only; you cannot suppress findings or update workflow status from aggregation region

**Regional Considerations for Production:**
- Enable Security Hub in **all regions** (even unused regions can have stray resources)
- Link all regions to single home region for centralized dashboards
- Use CloudFormation StackSets to deploy Security Hub enablement across regions
- Monitor Security Hub costs per region (charged per security check per account per region)
- *Cost Optimization:* Disable unused standards in low-activity regions

**Real-World Multi-Region Scenario:** A global SaaS company operates in 8 AWS regions across US, EU, and APAC. They designate us-east-1 as home region and link 7 other regions. When a GuardDuty finding occurs in ap-southeast-1 (Singapore), it appears in both ap-southeast-1 Security Hub and us-east-1 aggregated view within 5 minutes. The security team in US headquarters can triage all global findings from single console, but must switch to ap-southeast-1 to perform remediation.

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

## Amazon Macie - Sensitive Data Discovery and Protection

Macie uses machine learning and pattern matching to automatically discover, classify, and protect sensitive data stored in Amazon S3. It addresses the challenge of identifying PII, PHI, financial data, and credentials across millions of S3 objects without manual inspection.

### Data Classification with Managed and Custom Identifiers

**Managed Data Identifiers (AWS-Provided):**

Macie includes 150+ pre-built data identifiers across multiple categories:

| Category | Examples | Detection Method |
|----------|----------|------------------|
| **Credentials** | AWS secret access keys, RSA private keys, OpenSSH private keys, PGP private keys | Pattern matching with entropy analysis |
| **Financial** | Credit card numbers (Visa, Mastercard, Amex), bank account numbers (IBAN, US routing), SWIFT codes | Luhn algorithm validation + format verification |
| **Personal Identifiable Information** | Social Security numbers, driver's license numbers, passport numbers, national IDs (40+ countries) | Country-specific format validation |
| **Health Information** | US Medicare/Medicaid IDs, health insurance claim numbers, DEA registration numbers, medical record numbers | HIPAA-relevant identifiers |
| **Geographic** | US addresses, international phone numbers, email addresses | Format and structure validation |

**How Managed Identifiers Work:**
- **Pattern Matching:** Regex-based detection for known formats (e.g., SSN: XXX-XX-XXXX)
- **Entropy Analysis:** Identifies high-entropy strings likely to be credentials (e.g., random API keys)
- **Checksum Validation:** Verifies credit cards using Luhn algorithm, reduces false positives
- **Context Keywords:** Detects identifiers near keywords (e.g., "SSN:", "Credit Card:")
- *SAP-C02 Tip:* Managed identifiers are continuously updated by AWS; no maintenance required

**Custom Data Identifiers (Organization-Specific):**

Create regex-based identifiers for proprietary data formats unique to your organization.

```json
{
  "name": "EmployeeIDIdentifier",
  "regex": "EMP-[0-9]{6}-[A-Z]{2}",
  "keywords": ["employee id", "employee number", "emp id"],
  "maximumMatchDistance": 50,
  "ignoreWords": ["example", "test", "sample"]
}
```

**Configuration Parameters:**
- **Regex Pattern:** Define format (e.g., `EMP-[0-9]{6}-[A-Z]{2}` matches EMP-123456-AB)
- **Keywords:** Terms that must appear near pattern (within maximumMatchDistance)
- **Maximum Match Distance:** Maximum characters between pattern and keyword (default 50)
- **Ignore Words:** Patterns to exclude (prevents false positives from test data)

**Real-World Custom Identifier Use Case:** A healthcare provider creates custom identifier for patient medical record numbers (format: MRN-YYYY-NNNNNN). Macie scans 500 S3 buckets, identifies 15,000 objects containing MRNs, revealing that development team accidentally copied production patient data to test environment.

**AWS Documentation:**
- [Macie Managed Data Identifiers](https://docs.aws.amazon.com/macie/latest/user/managed-data-identifiers.html)
- [Custom Data Identifiers](https://docs.aws.amazon.com/macie/latest/user/custom-data-identifiers.html)

### Sensitive Data Discovery Jobs and Automated Discovery

**Discovery Job Types:**

1. **One-Time Discovery Jobs** - Ad-hoc scans for immediate assessment:
   - Scan specific buckets selected manually
   - Run once and complete
   - Use case: New data migration validation, incident response, audit preparation
   - *Cost:* Pay per GB scanned (one-time charge)

2. **Scheduled Recurring Jobs** - Continuous monitoring with periodic scans:
   - Run daily, weekly, or monthly
   - Automatically scan new and modified objects
   - Use case: Ongoing compliance monitoring, detecting data sprawl
   - *SAP-C02 Consideration:* Schedule during off-peak hours to optimize performance

3. **Automated Discovery (Recommended for SAP-C02)** - Macie's intelligent continuous monitoring:
   - Macie **automatically** identifies and evaluates all S3 buckets in account
   - Uses **sampling methodology** to analyze representative subset of objects (cost-optimized)
   - Continuously monitors for new buckets and objects
   - Generates bucket-level security and sensitivity scores
   - *Key Difference:* Automated discovery provides bucket-level insights; jobs provide object-level findings

**Automated Discovery Sampling Methodology:**
```
Total Bucket Size: 1 TB (10,000 objects)
Macie Sampling:
  - Analyzes ~5% of objects (500 objects)
  - Selects representative sample across file types
  - Estimates sensitivity score for entire bucket
  - Updates monthly or when significant changes detected

Cost: ~$0.10/bucket/month vs. $1.00/GB for full job scan
```

**When to Use Each Approach:**
| Requirement | Automated Discovery | One-Time Job | Scheduled Job |
|-------------|---------------------|--------------|---------------|
| **Continuous monitoring** | Best choice | No | Good |
| **Object-level findings** | No (bucket-level only) | Yes | Yes |
| **Cost optimization** | Lowest cost | Medium cost | Highest cost |
| **Compliance reporting** | Sufficient for most | Required for forensics | Required for ongoing compliance |
| **New bucket detection** | Automatic | Manual | Manual |

**Scope Configuration for Discovery Jobs:**

Target specific buckets and object types to optimize costs and reduce false positives:

```json
{
  "bucketCriteria": {
    "includes": {
      "and": [
        {"tag": {"key": "Environment", "value": "Production"}},
        {"tag": {"key": "DataClassification", "value": "Sensitive"}}
      ]
    },
    "excludes": {
      "and": [
        {"tag": {"key": "MacieScan", "value": "Exclude"}}
      ]
    }
  },
  "scoping": {
    "includes": {
      "and": [
        {
          "simpleScopeTerm": {
            "comparator": "EQ",
            "key": "OBJECT_EXTENSION",
            "values": ["csv", "json", "txt", "log", "parquet", "avro"]
          }
        },
        {
          "simpleScopeTerm": {
            "comparator": "GT",
            "key": "OBJECT_SIZE",
            "values": [1024]
          }
        },
        {
          "simpleScopeTerm": {
            "comparator": "LT",
            "key": "OBJECT_SIZE",
            "values": [52428800]
          }
        }
      ]
    },
    "excludes": {
      "and": [
        {
          "simpleScopeTerm": {
            "comparator": "STARTS_WITH",
            "key": "OBJECT_KEY",
            "values": ["archive/", "backup/", "logs/cloudtrail/"]
          }
        }
      ]
    }
  }
}
```

**Scoping Best Practices:**
- **File Extensions:** Focus on text-based formats (csv, json, txt, log) - ignore binaries (mp4, jpg, exe)
- **Object Size:** Exclude very small (<1KB) and very large files (>50MB) to optimize performance
- **Object Age:** Scan recently modified objects (last 90 days) for active data monitoring
- **Object Prefixes:** Exclude known safe prefixes (logs/, temp/, archive/)
- **Bucket Tags:** Use tags to include/exclude entire buckets (Environment=Production vs. Test)

**Real-World Scoping Example:** A financial services firm scans 50 S3 buckets containing customer data. They exclude backup/ and archive/ prefixes (historical data already validated), limit to .csv and .json files (where customer data resides), and exclude objects <1KB (metadata files). This reduces scan volume by 60% while maintaining 100% coverage of sensitive data.

**AWS Documentation:**
- [Macie Discovery Jobs](https://docs.aws.amazon.com/macie/latest/user/discovery-jobs.html)
- [Automated Sensitive Data Discovery](https://docs.aws.amazon.com/macie/latest/user/discovery-jobs-auto.html)

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

## IAM Access Analyzer - Unintended Access Detection and Unused Access Analysis

IAM Access Analyzer uses automated reasoning (provable security) to identify resources shared with external entities, validate IAM policies before deployment, generate least-privilege policies, and detect unused permissions. Unlike heuristic-based tools, Access Analyzer provides mathematically verified results.

### Three Core Analysis Types

**1. External Access Analysis (Free)**

Identifies resource-based policies that grant access to principals outside your zone of trust.

**Supported Resources (14+ Resource Types):**
- **S3 buckets** - Bucket policies, ACLs
- **IAM roles** - Trust policies allowing external assumption
- **KMS keys** - Key policies and grants to external principals
- **Lambda functions** - Resource policies for cross-account invocation
- **SQS queues** - Queue policies
- **SNS topics** - Topic policies
- **Secrets Manager secrets** - Resource policies for cross-account access
- **ECR repositories** - Repository policies
- **RDS DB snapshots** - Snapshot sharing
- **EBS snapshots** - Snapshot sharing
- **EC2 AMIs** - AMI sharing
- **Systems Manager parameters** - Parameter policies
- **Backup vaults** - Vault access policies
- **EventBridge event buses** - Event bus policies

**Zone of Trust Definition:**
- **Account Analyzer:** Trust boundary = single AWS account (flags external account access)
- **Organization Analyzer:** Trust boundary = entire AWS Organization (flags access from outside org)
- *SAP-C02 Decision:* Use Organization analyzer for multi-account environments (most common)

**Real-World Example:** A media company enables Organization analyzer. Access Analyzer discovers an S3 bucket policy granting `s3:GetObject` to `arn:aws:iam::123456789012:root` (external account). Investigation reveals this was temporary access for a vendor project completed 6 months ago - unintended standing access that should have been revoked.

**2. Unused Access Analysis (Paid)**

Analyzes IAM roles and users to identify unused permissions based on actual access activity from CloudTrail logs.

**Three Levels of Unused Access Detection:**

| Finding Type | Description | Remediation Action |
|--------------|-------------|-------------------|
| **Unused Roles** | IAM role not assumed within tracking period (90 days default) | Delete role or investigate why unused |
| **Unused Credentials** | IAM user access keys or console password not used | Disable credentials, enforce rotation |
| **Unused Permissions** | Service-level or action-level permissions never exercised | Remove permissions, apply least privilege |

**How Unused Access Analysis Works:**
```
1. Access Analyzer analyzes CloudTrail logs (90-day window)
2. Tracks every IAM role assumption and API call
3. Compares permissions granted vs. permissions actually used
4. Generates findings for unused permissions at:
   - Service level (e.g., granted ec2:* but never used EC2)
   - Action level (e.g., granted s3:DeleteBucket but never deleted buckets)
5. Provides last accessed timestamp for each finding
```

**Example Unused Permission Finding:**
```json
{
  "findingType": "UnusedPermission",
  "principal": "arn:aws:iam::account:role/DataAnalystRole",
  "permission": "dynamodb:DeleteTable",
  "serviceNamespace": "dynamodb",
  "lastAccessed": "Never",
  "recommendation": "Remove dynamodb:DeleteTable from DataAnalystRole policy"
}
```

**Cost Consideration:**
- External access analysis: **Free**
- Unused access analysis: **$0.20 per IAM role or user analyzed per month**
- *Optimization:* Analyze only production accounts or high-privilege roles to control costs

**3. Custom Policy Checks (Free)**

Validates IAM policies before deployment to prevent security misconfigurations.

**Validation Types:**
- **Syntax Errors** - Malformed JSON, invalid ARNs
- **Security Warnings** - Risky patterns (e.g., `NotPrincipal` with `Allow` effect)
- **Suggestions** - Best practice improvements (e.g., use specific actions instead of `*`)
- **General Warnings** - Deprecated features or service limitations

**Example Security Warning:**
```json
{
  "findingType": "SECURITY_WARNING",
  "code": "PASS_ROLE_WITH_STAR_IN_RESOURCE",
  "message": "Using wildcards (*) in iam:PassRole resource can allow passing any role to any service",
  "recommendation": "Specify explicit role ARNs in Resource element",
  "location": {
    "path": "Statement[0].Resource",
    "span": {"start": {"line": 5}}
  }
}
```

**AWS Documentation:**
- [IAM Access Analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)
- [Unused Access Findings](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-findings.html)
- [Custom Policy Checks](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-validation.html)

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

### Policy Generation from Access Activity (Least Privilege Automation)

Access Analyzer can automatically generate IAM policies based on actual CloudTrail access activity, enabling least-privilege policy creation without manual analysis.

**How Policy Generation Works:**
```
1. Select IAM role to analyze (e.g., ApplicationRole)
2. Specify CloudTrail analysis period (up to 90 days)
3. Access Analyzer reviews all API calls made by the role
4. Generates policy containing ONLY permissions actually used
5. Refines policy with resource-level restrictions based on actual resource ARNs accessed
6. Returns JSON policy ready for deployment
```

**Example Policy Generation Scenario:**

**Before (Overly Permissive Policy):**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:*",
      "dynamodb:*",
      "lambda:*"
    ],
    "Resource": "*"
  }]
}
```

**After (Generated Least-Privilege Policy):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::prod-data-bucket/*",
        "arn:aws:s3:::staging-data-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:account:table/ProductCatalog"
    }
  ]
}
```

**Policy Generation Best Practices:**
- **Analyze Production Activity:** Use 90-day window to capture seasonal or periodic operations
- **Test Generated Policies:** Deploy to non-production first to validate completeness
- **Combine with Unused Access Findings:** Remove permissions, then generate new baseline
- **Iterative Refinement:** Re-generate policies quarterly as application requirements evolve
- *SAP-C02 Tip:* Policy generation is exam-relevant for migrating from overly permissive to least-privilege policies

**Real-World Application:** A startup initially grants developers `AdministratorAccess` for velocity. After 6 months, they use Access Analyzer to generate least-privilege policies based on actual development activity. Generated policies include only S3, Lambda, and DynamoDB permissions actually used, reducing blast radius from full account access to 3 services.

### Access Preview (Pre-Deployment Validation)

Preview how policy changes affect external access **before** applying changes to production resources. This "dry-run" capability prevents accidental public exposure.

**Access Preview Workflow:**
```
1. Create access preview with proposed policy changes
2. Access Analyzer analyzes proposed configuration
3. Generates preview findings showing new/changed external access
4. Review findings to validate changes are intentional
5. Apply changes to actual resource only if preview is acceptable
6. Delete access preview
```

**Supported Configuration Changes:**
```json
{
  "analyzerArn": "arn:aws:access-analyzer:region:account:analyzer/ConsoleAnalyzer",
  "configurations": {
    "s3Bucket": {
      "bucketPolicy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::my-bucket/*\"}]}",
      "bucketPublicAccessBlock": {
        "ignorePublicAcls": true,
        "restrictPublicBuckets": false,
        "blockPublicAcls": true,
        "blockPublicPolicy": false
      },
      "bucketAclGrants": []
    },
    "iamRole": {
      "trustPolicy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::123456789012:root\"},\"Action\":\"sts:AssumeRole\"}]}"
    },
    "kmsKey": {
      "keyPolicies": {
        "default": "{...}"
      },
      "grants": []
    }
  }
}
```

**Preview Finding Example:**
```json
{
  "id": "preview-finding-123",
  "status": "ACTIVE",
  "resourceType": "AWS::S3::Bucket",
  "resource": "arn:aws:s3:::my-bucket",
  "condition": {},
  "action": ["s3:GetObject"],
  "principal": {"AWS": "*"},
  "isPublic": true,
  "findingType": "ExternalAccess",
  "changeType": "NEW"
}
```

**Change Types in Preview Findings:**
- **NEW:** Policy change creates new external access (not present in current policy)
- **CHANGED:** Existing external access is modified (e.g., additional actions granted)
- **UNCHANGED:** External access exists in both current and proposed policy

**Use Cases for Access Preview:**
- **Multi-Step Policy Changes:** Validate complex policy transformations before applying
- **Compliance Validation:** Ensure policy changes don't violate compliance requirements
- **Infrastructure as Code (IaC):** Integrate preview into CI/CD pipelines to block non-compliant changes
- **Change Management:** Provide evidence to change advisory boards before production changes

**Real-World CI/CD Integration:**
```yaml
# GitLab CI pipeline
validate-policy:
  script:
    - aws accessanalyzer create-access-preview --analyzer-arn $ANALYZER_ARN --configurations file://proposed-policy.json
    - preview_id=$(aws accessanalyzer list-access-previews --analyzer-arn $ANALYZER_ARN --query 'accessPreviews[0].id' --output text)
    - findings=$(aws accessanalyzer list-access-preview-findings --analyzer-arn $ANALYZER_ARN --access-preview-id $preview_id --query 'findings[?changeType==`NEW` && isPublic==`true`]')
    - if [ -n "$findings" ]; then echo "ERROR: Policy change creates public access"; exit 1; fi
  only:
    - merge_requests
```

**AWS Documentation:**
- [IAM Access Analyzer Policy Generation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html)
- [Access Preview](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-access-preview.html)

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

## Best Practices for Security Improvements (SAP-C02 Level)

### 1. Enable Security Services Comprehensively Across Organization

**Multi-Account Deployment Strategy:**
- **Use Organizations Delegated Administration:** Designate security account as delegated admin for GuardDuty, Security Hub, Macie, Config
- **Auto-Enable for New Accounts:** Configure organization-wide auto-enablement to prevent coverage gaps
- **Deploy via CloudFormation StackSets:** Use StackSets for consistent enablement across all regions and accounts
- **Enable in All Regions:** Security threats can emerge from unused regions; enable services globally

**Implementation Checklist:**
```yaml
Services to Enable Organization-Wide:
  - GuardDuty (all protection plans in production accounts)
  - Security Hub (with at least FSBP standard)
  - Config (with organization config rules)
  - Macie (automated discovery enabled)
  - IAM Access Analyzer (organization analyzer)
  - CloudTrail (organization trail)
  - VPC Flow Logs (all VPCs)
```

**Real-World Example:** Financial institution uses CloudFormation StackSet to deploy GuardDuty, Security Hub, and Config across 200 accounts in 10 regions within 2 hours. Auto-enablement ensures new accounts created for acquisitions are automatically secured within minutes.

### 2. Centralize Security Visibility with Aggregation

**Architectural Pattern:**
```
Security Account (Delegated Admin) → Home Region (us-east-1)
  ├─ GuardDuty findings from all accounts/regions
  ├─ Security Hub cross-region aggregation
  ├─ Config aggregator for compliance data
  ├─ Macie findings from all accounts
  └─ CloudWatch centralized dashboard
```

**Aggregation Best Practices:**
- **Dedicated Security Account:** Separate from management account and workload accounts
- **Cross-Region Aggregation:** Link all regions to home region in Security Hub
- **Config Aggregator:** Centralize compliance data from all accounts
- **S3 Findings Export:** Long-term retention in centralized logging bucket
- **Avoid Management Account:** Don't run workloads or security tools in management account

### 3. Implement Risk-Based Automated Remediation

**Severity-Based Automation Matrix:**

| Severity | Automation Level | Response Time | Approval Required |
|----------|------------------|---------------|-------------------|
| **Critical (8.0+)** | Immediate automatic isolation | < 5 minutes | No - auto-isolate, post-incident review |
| **High (7.0-7.9)** | Automatic non-destructive remediation | < 15 minutes | No - remediate, notify team |
| **Medium (4.0-6.9)** | Create ticket, notify, suggest remediation | < 4 hours | Yes - manual approval |
| **Low (< 4.0)** | Log and aggregate for weekly review | < 7 days | Optional |

**Remediation Workflow Architecture:**
```
Finding → EventBridge Rule → Step Functions State Machine
                              ├─ Forensic Snapshot
                              ├─ Isolate Resource
                              ├─ Disable Credentials
                              ├─ Notify Security Team
                              ├─ Create JIRA Ticket
                              └─ Update Security Hub
```

**Start with Low-Risk, High-Frequency Remediations:**
1. Auto-enable S3 bucket encryption (non-disruptive)
2. Attach MFA delete to S3 buckets (enhances security)
3. Enable VPC Flow Logs (monitoring only)
4. Tag untagged resources (organizational)
5. Disable unused IAM credentials (credential hygiene)

**DO NOT Auto-Remediate Without Testing:**
- Security group rule modifications (may break connectivity)
- IAM policy changes (may break applications)
- Resource deletion (data loss risk)
- Network configuration changes (outage risk)

### 4. Implement Defense-in-Depth for Data Protection

**Layered Data Security Controls:**

| Layer | Control | Purpose | AWS Service |
|-------|---------|---------|-------------|
| **Discovery** | Identify sensitive data locations | Know what to protect | Macie Automated Discovery |
| **Classification** | Tag resources by sensitivity | Apply appropriate controls | Resource tagging + Macie |
| **Access Control** | Restrict who can access data | Prevent unauthorized access | IAM + Access Analyzer |
| **Encryption at Rest** | Protect stored data | Compliance + data breach protection | S3 SSE-KMS, EBS encryption |
| **Encryption in Transit** | Protect data in motion | MITM protection | TLS/SSL, VPN |
| **Monitoring** | Detect anomalous access | Detect breaches | GuardDuty S3 Protection, CloudTrail |
| **Preventive Controls** | Block public access | Prevent misconfiguration | S3 Block Public Access, SCPs |

**Implementation Sequence:**
1. Enable Macie automated discovery to inventory S3 buckets
2. Tag buckets based on sensitivity (Public, Internal, Confidential, Restricted)
3. Apply S3 Block Public Access organization-wide (preventive)
4. Enable default encryption on all buckets (protective)
5. Configure Access Analyzer to detect external sharing (detective)
6. Enable GuardDuty S3 Protection for anomalous access detection (detective)
7. Set up EventBridge rules for automated response (reactive)

### 5. Automate Secrets Rotation with Validation

**Secrets Manager Rotation Best Practices:**

**Rotation Schedule by Secret Type:**
| Secret Type | Rotation Frequency | Validation Method |
|-------------|-------------------|-------------------|
| **Database passwords** | 30-60 days | Test connection pre/post rotation |
| **API keys (external)** | 90 days | Call health endpoint with new key |
| **Service account credentials** | 60 days | Attempt authentication |
| **Encryption keys** | Annually | Decrypt test object |

**Rotation Function Architecture:**
```python
def rotate_secret(event, context):
    # AWSCURRENT version in use by application
    # AWSPENDING version being created

    step = event['Step']

    if step == 'createSecret':
        # Generate new password meeting complexity requirements
        new_password = generate_complex_password()
        put_secret_value(SecretId, new_password, VersionStage='AWSPENDING')

    elif step == 'setSecret':
        # Update password in target system (database, API)
        update_database_password(new_password)

    elif step == 'testSecret':
        # Verify new password works BEFORE finalizing
        test_connection_with_pending_secret()

    elif step == 'finishSecret':
        # Move AWSCURRENT to AWSPREVIOUS
        # Move AWSPENDING to AWSCURRENT
        finalize_secret_version_stage()
```

**Rotation Failure Handling:**
- **Automatic Rollback:** If testSecret fails, retain AWSCURRENT version
- **CloudWatch Alarms:** Alert on rotation failures within 15 minutes
- **Dead Letter Queue:** Capture failed rotation events for investigation
- **Rotation Window:** Schedule rotations during maintenance windows to minimize impact

### 6. Establish Continuous Compliance with Organization Config Rules

**Organization Config Rules Deployment:**

```python
# Deploy organization-wide Config rule
aws configservice put-organization-config-rule \
  --organization-config-rule-name required-tags \
  --organization-managed-rule-metadata '{
    "RuleIdentifier": "REQUIRED_TAGS",
    "InputParameters": "{\"tag1Key\":\"Environment\",\"tag2Key\":\"Owner\",\"tag3Key\":\"CostCenter\"}"
  }'
```

**Compliance Framework Mapping:**
| Framework | AWS Config Conformance Pack | Control Count |
|-----------|---------------------------|---------------|
| **CIS AWS Foundations Benchmark** | Operational-Best-Practices-for-CIS-AWS-v1.4.0 | 50+ |
| **PCI DSS 3.2.1** | Operational-Best-Practices-for-PCI-DSS | 40+ |
| **HIPAA** | Operational-Best-Practices-for-HIPAA-Security | 60+ |
| **NIST 800-53** | Operational-Best-Practices-for-NIST-800-53 | 180+ |

**Compliance Monitoring Workflow:**
```
Config Rule Evaluation → Non-Compliant Finding → Security Hub
                                                 ↓
                                      EventBridge Rule
                                                 ↓
                                ┌────────────────┼────────────────┐
                                ↓                ↓                ↓
                         Auto-Remediation   JIRA Ticket    SNS Notification
                         (SSM Automation)   (Tracking)     (Security Team)
```

### 7. Build Mature Incident Response Capabilities

**Incident Response Maturity Levels:**

**Level 1 - Manual (Immature):**
- Manual finding investigation in console
- Email notifications to security team
- Remediation via console clicks
- *MTTR:* Hours to days

**Level 2 - Semi-Automated (Developing):**
- EventBridge rules for high-severity findings
- Lambda functions for common remediations
- Slack/PagerDuty notifications
- *MTTR:* 30-60 minutes

**Level 3 - Fully Automated (Mature - SAP-C02 Target):**
- Step Functions orchestrated response workflows
- Automatic forensic evidence preservation
- Immediate isolation with human review
- Integration with SIEM/SOAR
- *MTTR:* 5-15 minutes

**Incident Response Runbook Example - Credential Exfiltration:**
```yaml
Playbook: InstanceCredentialExfiltration
Trigger: GuardDuty finding type UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration
Automated Actions:
  1. Disable compromised IAM credentials (90 seconds)
  2. Create forensic EC2 snapshot (2 minutes)
  3. Attach DenyAll policy to instance role (30 seconds)
  4. Isolate instance with quarantine security group (30 seconds)
  5. Create Security Hub insight with related findings (1 minute)
  6. Page security team via PagerDuty (30 seconds)
  7. Create JIRA ticket with investigation checklist (1 minute)
Manual Actions:
  8. Security team reviews CloudTrail for affected API calls
  9. Analyze forensic snapshot for malware
  10. Terminate instance if compromised
  11. Review other instances from same AMI
Total MTTR: < 10 minutes for containment
```

### 8. Measure and Improve Security Posture Continuously

**Key Security Metrics (Track in CloudWatch):**

| Metric | Target | Dashboard Widget |
|--------|--------|------------------|
| **Security Hub Score** | ≥ 90% | Line chart (7-day trend) |
| **GuardDuty Finding MTTR** | < 15 min (High), < 4 hrs (Medium) | Average by severity |
| **Config Compliance Rate** | ≥ 95% | Gauge per standard |
| **Macie Sensitive Data Findings** | Decreasing trend | Bar chart by month |
| **IAM Access Analyzer Findings** | < 10 active external access findings | Number widget |
| **Secrets Rotation Success Rate** | ≥ 99% | Success/failure pie chart |
| **% Accounts with All Services Enabled** | 100% | Single value widget |

**Continuous Improvement Process:**
```
Weekly:
  - Review new Security Hub findings
  - Triage GuardDuty findings by severity
  - Update suppression rules for false positives

Monthly:
  - Review security metrics dashboard with leadership
  - Update Config rules for new compliance requirements
  - Test incident response playbooks
  - Review and update IAM policies using Access Analyzer

Quarterly:
  - Conduct AWS Well-Architected Security Pillar review
  - Update threat models for critical applications
  - Review and rotate trusted IP lists
  - Re-generate least-privilege policies from access activity

Annually:
  - Conduct third-party security assessment
  - Update disaster recovery and incident response plans
  - Review delegated administrator access
  - Validate encryption key rotation procedures
```

**AWS Documentation and Whitepapers:**
- [AWS Security Best Practices](https://docs.aws.amazon.com/whitepapers/latest/aws-security-best-practices/)
- [AWS Well-Architected Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html)
- [AWS Security Incident Response Guide](https://docs.aws.amazon.com/whitepapers/latest/aws-security-incident-response-guide/)
- [AWS Security Maturity Model](https://aws.amazon.com/blogs/security/)
- [AWS Organizations Best Practices](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
