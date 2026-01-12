---
title: Storage Solutions and Data Management
lastUpdated: 2026-01-06
---

# Storage Solutions and Data Management

AWS provides a comprehensive portfolio of storage services for object, block, and file storage. Selecting the right storage solution requires understanding access patterns, performance requirements, durability needs, and cost considerations. At the SAP-C02 level, you must architect complete storage strategies that balance performance, availability, durability, and cost across multi-tier data lifecycles.

**Key Selection Criteria:**
- **Data access patterns**: Frequency, latency requirements, sequential vs. random I/O
- **Durability and availability**: Multi-AZ resilience, SLA requirements, RPO/RTO targets
- **Performance needs**: IOPS, throughput, latency constraints
- **Protocol requirements**: NFS, SMB, iSCSI, object APIs
- **Integration patterns**: Hybrid connectivity, cross-region replication, data lakes
- **Cost optimization**: Storage class transitions, lifecycle automation, data tiering

## Amazon S3 Storage Classes

All S3 storage classes provide **99.999999999% (11 nines) durability** by storing data redundantly across multiple devices. Selecting the appropriate class requires analyzing access frequency, retrieval time tolerance, and cost sensitivity.

### S3 Standard
- **Use Case**: Frequently accessed data (more than once per month)
- **Availability**: 99.99% SLA
- **Availability Zones**: 3 or more (multi-AZ resilience)
- **Retrieval**: Millisecond access, no retrieval fees
- **Cost Structure**: Highest storage cost, lowest per-request cost
- **Ideal For**: Active datasets, frequently accessed content, performance-sensitive applications

**Real-World Scenario**: Primary storage for web application assets, frequently queried data lake objects, active database backups.

### S3 Intelligent-Tiering
- **Use Case**: Unknown or changing access patterns (eliminates manual lifecycle management)
- **Automatic Tiering**: Moves objects between access tiers based on usage patterns
- **Access Tiers**:
  - **Frequent Access**: Default tier, millisecond access
  - **Infrequent Access**: Not accessed for 30 consecutive days
  - **Archive Instant Access**: Not accessed for 90 consecutive days (optional)
  - **Archive Access**: Not accessed for 90-730 days (optional, async retrieval)
  - **Deep Archive Access**: Not accessed for 180-730 days (optional, async retrieval)
- **No Retrieval Fees**: Unique advantage - no per-GB retrieval charges between tiers
- **Monitoring Fee**: Small monthly charge per object (no charge for objects <128 KB)
- **Availability**: 99.9% SLA

**Real-World Scenario**: Analytics datasets with unpredictable query patterns, media libraries with varying viewer demand, machine learning training data.

**AWS Documentation:**
- [S3 Intelligent-Tiering](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html)

### S3 Standard-IA (Infrequent Access)
- **Use Case**: Long-lived data accessed less than once per month (but requiring rapid access when needed)
- **Availability**: 99.9% SLA
- **Availability Zones**: 3 or more (multi-AZ resilience)
- **Retrieval**: Millisecond access with per-GB retrieval fees
- **Minimum Storage Duration**: 30 days (early deletion charged for full 30 days)
- **Minimum Billable Object Size**: 128 KB (smaller objects charged as 128 KB)
- **Cost**: Lower storage cost than Standard, higher per-request cost

**Real-World Scenario**: Disaster recovery backups, infrequently accessed log archives, data required for compliance audits.

**Important Consideration**: For objects accessed more than once per month, Standard is more cost-effective due to retrieval fees.

### S3 One Zone-IA
- **Use Case**: Infrequently accessed, reproducible data where multi-AZ resilience is not required
- **Availability**: 99.5% SLA (20% lower than Standard-IA)
- **Availability Zones**: Single AZ (data lost if AZ destroyed)
- **Retrieval**: Millisecond access with per-GB retrieval fees
- **Minimum Storage Duration**: 30 days
- **Minimum Billable Object Size**: 128 KB
- **Cost**: 20% cheaper than Standard-IA

**Real-World Scenario**: Secondary backup copies (when primary exists elsewhere), easily recreatable thumbnails or transcoded media, cross-region replication replicas.

**Risk Assessment**: Not resilient to physical loss of Availability Zone (natural disasters, hardware failures). Use only for data that can be regenerated or has primary copies elsewhere.

### S3 Glacier Instant Retrieval
- **Use Case**: Long-term archive data requiring immediate access (accessed once per quarter)
- **Availability**: 99.9% SLA
- **Availability Zones**: 3 or more
- **Retrieval**: Millisecond access with per-GB retrieval fees
- **Minimum Storage Duration**: 90 days
- **Minimum Billable Object Size**: 128 KB
- **Cost**: 68% cheaper storage than Standard, higher retrieval fees

**Real-World Scenario**: Medical imaging archives requiring instant retrieval for patient care, regulatory archives accessed during audits, historical financial records.

**AWS Documentation:**
- [S3 Glacier Instant Retrieval](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html#sc-glacier-instant)

### S3 Glacier Flexible Retrieval (formerly S3 Glacier)
- **Use Case**: Archive data accessed 1-2 times per year with flexible retrieval times
- **Availability After Restore**: 99.99% (objects must be restored before access)
- **Availability Zones**: 3 or more
- **Retrieval Options**:
  - **Expedited**: 1-5 minutes (highest cost)
  - **Standard**: 3-5 hours (moderate cost)
  - **Bulk**: 5-12 hours (lowest cost, free tier eligible)
- **Minimum Storage Duration**: 90 days
- **Storage Overhead**: 40 KB per object (32 KB for index/metadata + 8 KB for user metadata)
- **Cost**: Very low storage cost, retrieval fees per GB and per request

**Real-World Scenario**: Annual compliance archives, historical data warehousing, long-term backup retention, genomics data archives.

**Important**: Objects are not immediately accessible. You must initiate a restore request and wait for the retrieval time window.

**AWS Documentation:**
- [S3 Glacier Flexible Retrieval](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html#sc-glacier)

### S3 Glacier Deep Archive
- **Use Case**: Long-term retention of data accessed less than once per year (lowest cost archival)
- **Availability After Restore**: 99.99%
- **Availability Zones**: 3 or more
- **Retrieval Options**:
  - **Standard**: Within 12 hours
  - **Bulk**: Within 48 hours (lowest cost)
- **Minimum Storage Duration**: 180 days (longest minimum of all classes)
- **Storage Overhead**: 40 KB per object
- **Cost**: Lowest storage cost of all S3 classes, retrieval fees per GB and per request

**Real-World Scenario**: 7-10 year regulatory compliance archives (financial, healthcare), digital preservation, long-term scientific data retention, disaster recovery archives.

**Design Consideration**: For small objects, storage overhead (40 KB) can exceed actual object size. Aggregate small files into larger archives (TAR, ZIP) before archiving.

**AWS Documentation:**
- [S3 Glacier Deep Archive](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html#sc-glacier-deep-archive)
- [S3 Storage Classes Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)

## S3 Lifecycle Policies

S3 Lifecycle policies automate cost optimization by transitioning objects between storage classes and expiring objects that are no longer needed. Policies use a **waterfall model** where objects can only transition to less expensive storage classes.

### Lifecycle Transition Waterfall

```
S3 Standard
    ↓
S3 Standard-IA / S3 Intelligent-Tiering / S3 One Zone-IA
    ↓
S3 Glacier Instant Retrieval
    ↓
S3 Glacier Flexible Retrieval
    ↓
S3 Glacier Deep Archive (terminal state)
```

### Key Lifecycle Constraints

**Minimum Storage Durations (must be respected when chaining transitions):**
- Standard-IA / One Zone-IA: 30 days minimum
- Glacier Instant Retrieval: 90 days minimum
- Glacier Flexible Retrieval: 90 days minimum
- Glacier Deep Archive: 180 days minimum

**Example Invalid Policy**: Transitioning to Glacier Instant Retrieval after 30 days, then to Deep Archive after 60 days total. This violates the 90-day minimum for Glacier Instant Retrieval.

**Minimum Object Size Transitions**: As of September 2024, objects smaller than 128 KB do not transition by default (transition request costs exceed storage savings). Use `ObjectSizeGreaterThan` filters to control this behavior.

### Lifecycle Policy Example

```json
{
  "Rules": [{
    "Id": "Optimize-logs-lifecycle",
    "Status": "Enabled",
    "Filter": {
      "And": {
        "Prefix": "application-logs/",
        "Tags": [{"Key": "archive", "Value": "true"}],
        "ObjectSizeGreaterThan": 131072
      }
    },
    "Transitions": [
      {
        "Days": 30,
        "StorageClass": "STANDARD_IA"
      },
      {
        "Days": 90,
        "StorageClass": "GLACIER_IR"
      },
      {
        "Days": 365,
        "StorageClass": "DEEP_ARCHIVE"
      }
    ],
    "NoncurrentVersionTransitions": [
      {
        "NoncurrentDays": 30,
        "StorageClass": "GLACIER_IR"
      }
    ],
    "Expiration": {
      "Days": 2555
    },
    "NoncurrentVersionExpiration": {
      "NoncurrentDays": 90
    }
  }]
}
```

### Advanced Lifecycle Features

**Versioned Objects**: Separate lifecycle rules for current vs. noncurrent versions using `NoncurrentVersionTransitions` and `NoncurrentVersionExpiration`.

**Incomplete Multipart Uploads**: Use `AbortIncompleteMultipartUpload` to clean up abandoned uploads (saves storage costs).

**Delete Markers**: Configure `ExpiredObjectDeleteMarker` to remove delete markers when all object versions are deleted.

**Cost Optimization Strategies:**
1. Use Intelligent-Tiering for unpredictable access patterns (eliminates lifecycle management)
2. Aggregate small objects before archiving to Glacier classes (reduces 40 KB overhead impact)
3. Apply lifecycle policies to specific prefixes or tags for granular control
4. Monitor early deletion fees if objects might be deleted before minimum storage duration

**AWS Documentation:**
- [S3 Lifecycle Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [Lifecycle Transition Constraints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html)

## S3 Performance Optimization

S3 is designed for massive scale and can achieve aggregate throughput of multiple terabits per second. Optimizing performance requires understanding request rate limits, parallelization strategies, and specialized features.

### Request Rate Performance

**Per-Prefix Limits (automatically scalable):**
- **3,500 PUT/COPY/POST/DELETE** requests per second per prefix
- **5,500 GET/HEAD** requests per second per prefix
- **No limit** on the number of prefixes in a bucket

**Scaling Strategy**: Distribute objects across multiple prefixes to parallelize requests. Ten prefixes can support 55,000 GET requests per second and 35,000 write requests per second.

**Example Prefix Distribution:**
```
bucket/prefix-1/object-a.jpg
bucket/prefix-2/object-b.jpg
bucket/prefix-3/object-c.jpg
...
bucket/prefix-100/object-z.jpg
```

**Performance Scaling**: S3 automatically scales to high request rates. If you expect a sudden increase to more than 3,000 PUT requests per second or 5,000 GET requests per second, contact AWS Support to prepare for the workload. Gradual scaling happens automatically, though you may see temporary 503 (Slow Down) errors during ramp-up.

**Single EC2 Instance Performance**: Data lake applications can achieve **100 Gb/s** per instance on current-generation EC2 instances.

### Key Naming Strategy (Historical Consideration)

**Note**: As of 2018, S3 automatically partitions buckets by prefix, making randomized key prefixes unnecessary for performance. However, logical prefixes remain important for:
- Organizing objects by workload or application
- Applying lifecycle policies to subsets of data
- Controlling access with IAM prefix-based policies
- Distributing load across prefixes for extreme scale

**Modern Approach**: Use meaningful prefixes that align with your application structure:
```
bucket/application-logs/2026/01/05/log-12-00-01.json
bucket/user-uploads/user-123/photo-001.jpg
bucket/analytics-data/2026-01/dataset-20260105.parquet
```

### Multipart Upload

Multipart upload improves throughput and reliability for large objects by uploading parts in parallel and resuming failed uploads from the last successful part.

**Requirements:**
- **Required**: Objects larger than 5 GB (single PUT limited to 5 GB)
- **Recommended**: Objects 100 MB or larger

**Benefits:**
- **Parallel uploads**: Upload parts concurrently to improve throughput
- **Quick recovery**: Resume failed uploads without restarting from beginning
- **Streaming uploads**: Begin upload before knowing final object size
- **Improved throughput**: Network bandwidth fully utilized with parallel connections

**Best Practices:**
- Use part sizes between 25 MB and 500 MB for optimal performance
- Configure lifecycle policies to delete incomplete multipart uploads after 7 days (reduces storage costs)
- Use the AWS CLI, SDKs, or S3 Transfer Manager (automatically handles multipart upload)

**Implementation Example (AWS CLI):**
```bash
aws s3 cp large-file.zip s3://bucket/large-file.zip \
  --storage-class INTELLIGENT_TIERING \
  --metadata "source=application"
# CLI automatically uses multipart upload for files >8 MB
```

### S3 Transfer Acceleration

Transfer Acceleration uses Amazon CloudFront's globally distributed edge locations to accelerate uploads and downloads over long distances.

**How It Works**:
1. Client uploads to nearest CloudFront edge location (optimized routing)
2. Data routed over AWS's optimized network backbone to S3 bucket region
3. Reduces latency and variability compared to public internet routing

**Performance Gains**: Typically 50-500% faster for long-distance transfers (intercontinental uploads).

**When to Use**:
- Uploads from geographically distributed users or IoT devices
- Multi-GB files uploaded over long distances
- Applications requiring consistent upload performance globally

**Cost**: Additional $0.04-0.08 per GB transferred (varies by region). Use the [S3 Transfer Acceleration Speed Comparison tool](http://s3-accelerate-speedtest.s3-accelerate.amazonaws.com/en/accelerate-speed-comparsion.html) to test potential performance improvements.

**Enabling Transfer Acceleration**:
```bash
aws s3api put-bucket-accelerate-configuration \
  --bucket my-bucket \
  --accelerate-configuration Status=Enabled
```

**Accelerated Endpoint**: `bucket-name.s3-accelerate.amazonaws.com`

### Additional Performance Optimizations

**Byte-Range Fetches**: Download only specific byte ranges of an object (useful for parallel downloads or resuming failed downloads).

**CloudFront Caching**: Place CloudFront distribution in front of S3 for frequently accessed objects (reduces S3 GET requests, improves global latency).

**S3 Select**: Retrieve only a subset of object data using SQL expressions (reduces data transfer and client-side processing).

**AWS PrivateLink for S3**: Access S3 from on-premises or other AWS regions via private connectivity (bypasses public internet for improved performance and security).

**AWS Documentation:**
- [S3 Performance Optimization](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html)
- [Multipart Upload Overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
- [S3 Transfer Acceleration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration.html)

## Amazon EBS Volume Types

Amazon Elastic Block Store (EBS) provides block-level storage volumes for EC2 instances. Volume selection depends on workload characteristics: IOPS requirements, throughput needs, latency sensitivity, and cost constraints.

**All EBS volumes provide:**
- 99.8-99.9% durability (0.1-0.2% annual failure rate) for SSD/HDD
- 99.999% durability for io2 Block Express
- Automatic replication within a single Availability Zone
- Snapshot backup to S3 (cross-region copy supported)

### SSD Volume Types (Optimized for IOPS)

#### General Purpose SSD (gp3) - Recommended Default

**Current generation** - best price-performance for most workloads:

- **Baseline Performance**: 3,000 IOPS and 125 MB/s (independent of volume size)
- **Maximum Performance**: 80,000 IOPS and 2,000 MB/s (when using Nitro instances)
- **Standard Maximum**: 16,000 IOPS and 1,000 MB/s (non-Nitro instances)
- **Volume Size Range**: 1 GB - 64 TB
- **Durability**: 99.8-99.9% annual durability
- **Cost Advantage**: 20% cheaper than gp2 with better baseline performance
- **Boot Volume**: Supported

**Key Benefit**: Decouple storage size from performance. Provision IOPS and throughput independently based on application needs.

**Use Cases**:
- Virtual desktops
- Medium-sized single-instance databases (MySQL, PostgreSQL)
- Development and test environments
- Boot volumes
- Interactive applications with moderate IOPS requirements

**Real-World Scenario**: Web application with 500 GB data requiring 5,000 IOPS. With gp3, provision 500 GB with 5,000 IOPS. With gp2, you'd need 1,667 GB to achieve 5,000 IOPS (3 IOPS per GB), wasting 1,167 GB of capacity.

#### General Purpose SSD (gp2) - Previous Generation

- **Performance Model**: 3 IOPS per GB (minimum 100 IOPS, maximum 16,000 IOPS)
- **Burst Performance**: Up to 3,000 IOPS using I/O credits for volumes under 1 TB
- **Burst Duration**: Credit bucket with 5.4 million I/O credits (enough for 30 minutes at 3,000 IOPS)
- **Volume Size Range**: 1 GB - 16 TB
- **Throughput**: 128-250 MB/s (scales with volume size)

**Migration Recommendation**: Migrate gp2 volumes to gp3 for 20% cost savings and better baseline performance. Use AWS CLI or console to modify volume type in place (no downtime for most workloads).

#### Provisioned IOPS SSD (io2 Block Express) - Highest Performance

**Cutting-edge performance** for mission-critical workloads:

- **Maximum IOPS**: 256,000 IOPS (requires Nitro-based EC2 instances)
- **Maximum Throughput**: 4,000 MB/s
- **Volume Size Range**: 4 GB - 64 TB
- **Durability**: 99.999% (five nines) - 100x more durable than gp3
- **Latency**: Sub-millisecond average latency (hundreds of microseconds)
- **IOPS:GB Ratio**: Up to 1,000:1 (provision 64,000 IOPS with 64 GB volume)
- **Multi-Attach**: Supported (up to 16 Nitro instances in same AZ)
- **Boot Volume**: Supported

**Use Cases**:
- Large relational databases (Oracle, SQL Server, MySQL, PostgreSQL)
- NoSQL databases (MongoDB, Cassandra)
- Latency-sensitive transactional workloads
- Applications requiring 99.999% durability SLA

**Real-World Scenario**: E-commerce database supporting Black Friday traffic requiring 100,000 IOPS with sub-millisecond latency. io2 Block Express with Multi-Attach enables shared storage across multiple active database nodes.

**Cost Consideration**: Charged per provisioned IOPS and GB-month. Cost-effective when consistent high IOPS are required.

#### Provisioned IOPS SSD (io2) - Standard

- **Maximum IOPS**: 64,000 (256,000 on io2 Block Express)
- **Maximum Throughput**: 1,000 MB/s
- **Volume Size Range**: 4 GB - 16 TB (64 TB on Block Express)
- **Durability**: 99.999%
- **Multi-Attach**: Supported
- **IOPS:GB Ratio**: Up to 500:1

**When to Use io2 vs. io2 Block Express**: Use io2 Block Express when you need >64,000 IOPS, >1,000 MB/s throughput, or volumes >16 TB. Otherwise, io2 standard provides the same durability at lower cost.

### HDD Volume Types (Optimized for Throughput)

#### Throughput Optimized HDD (st1)

**Designed for** sequential, throughput-intensive workloads:

- **Baseline Throughput**: 40 MB/s per TB of volume size
- **Burst Throughput**: 250 MB/s per TB of volume size
- **Maximum Throughput**: 500 MB/s per volume
- **Maximum IOPS**: 500 (1 MB I/O size)
- **Volume Size Range**: 125 GB - 16 TB
- **Durability**: 99.8-99.9%
- **Boot Volume**: Not supported
- **Cost**: Lowest per-GB cost for frequently accessed HDD storage

**Performance Calculation**: A 2 TB st1 volume provides 80 MB/s baseline and can burst to 500 MB/s (capped at max throughput).

**Use Cases**:
- Big data workloads (Hadoop, Kafka)
- Data warehouses (Amazon Redshift, Snowflake on EC2)
- Log processing and analytics
- ETL workloads with sequential data access

**Real-World Scenario**: Hadoop cluster processing 10 TB datasets daily. st1 volumes provide cost-effective throughput for sequential MapReduce jobs without the cost of SSD storage.

**Important Limitation**: Designed for large, sequential I/O. Random I/O workloads perform poorly on st1 (use gp3 instead).

#### Cold HDD (sc1) - Lowest Cost

**Optimized for** infrequent access scenarios:

- **Baseline Throughput**: 12 MB/s per TB of volume size
- **Burst Throughput**: 80 MB/s per TB of volume size
- **Maximum Throughput**: 250 MB/s per volume
- **Maximum IOPS**: 250 (1 MB I/O size)
- **Volume Size Range**: 125 GB - 16 TB
- **Durability**: 99.8-99.9%
- **Boot Volume**: Not supported
- **Cost**: Lowest cost per GB of all EBS volume types

**Use Cases**:
- Colder data requiring fewer scans per day
- Archival storage with occasional access
- Scenarios where lowest storage cost is paramount

**Real-World Scenario**: Quarterly accessed compliance archives requiring occasional full scans. sc1 provides 50% lower cost than st1 while supporting infrequent sequential reads.

### EBS Volume Selection Decision Tree

```
Need boot volume? → gp3
High IOPS (>16,000) or sub-ms latency? → io2 Block Express
Moderate IOPS (3,000-16,000)? → gp3
99.999% durability required? → io2 or io2 Block Express
Sequential throughput workload (>500 MB/s)? → st1
Infrequent access, cost-sensitive? → sc1
Default choice for most workloads → gp3
```

### EBS Multi-Attach

Attach a single io2 or io2 Block Express volume to up to 16 Nitro-based EC2 instances within the same Availability Zone.

**Use Cases**:
- High-availability clustered applications (Oracle RAC)
- Applications requiring concurrent write access from multiple instances
- Achieve higher application availability in clustered Linux applications

**Requirements**:
- Volume must be io2 or io2 Block Express
- Instances must be Nitro-based
- All instances must be in the same AZ
- Cluster-aware file system required (GFS2, OCFS2) to prevent data corruption

### EBS Snapshots and Lifecycle Management

**EBS Snapshots** are incremental backups stored in Amazon S3. Only blocks changed since last snapshot are saved.

**Best Practices**:
- Schedule automated snapshots using Amazon Data Lifecycle Manager (DLM)
- Copy snapshots to another region for disaster recovery
- Use EBS Fast Snapshot Restore (FSR) to eliminate snapshot restoration latency (pre-warm snapshots)
- Archive old snapshots to S3 Glacier for 75% cost reduction

**AWS Documentation:**
- [EBS Volume Types](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html)
- [EBS Performance](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-performance.html)
- [EBS Multi-Attach](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html)

## Amazon EFS (Elastic File System)

Amazon EFS provides serverless, fully elastic NFS file storage that automatically scales up to petabytes without disrupting applications. EFS is designed for Linux-based workloads requiring shared file system access across multiple EC2 instances, containers, and Lambda functions.

### Key Characteristics

- **Protocol**: NFSv4.1 and NFSv4.0 (POSIX-compliant)
- **Availability**: Regional (Multi-AZ) or One Zone storage classes
- **Scalability**: Automatically grows and shrinks as files are added/removed (no pre-provisioning)
- **Maximum Size**: Petabyte-scale
- **Concurrent Access**: Thousands of EC2 instances, containers, and Lambda functions simultaneously
- **Performance**: Up to 10+ GB/s throughput and 500,000+ IOPS

### File System Types

| Type | Storage | Availability | Use Case |
|------|---------|-------------|----------|
| **Regional** | Redundant across multiple AZs | High (99.99%) | Production workloads requiring maximum durability and availability |
| **One Zone** | Single Availability Zone | Standard | Development, cost-optimized workloads where data loss risk is acceptable |

**Cost Consideration**: One Zone storage classes provide 47% cost savings compared to Regional storage classes.

### Performance Modes (selected at file system creation, cannot be changed)

#### General Purpose (Default and Recommended)

- **Latency**: Lowest latency per operation (sub-millisecond on average)
- **Operations Per Second**: Up to 7,000 file operations per second per file system
- **Use Cases**: Web serving, content management, home directories, general file serving
- **Suitable For**: 99% of workloads

#### Max I/O

- **Latency**: Slightly higher latency than General Purpose
- **Operations Per Second**: Virtually unlimited (scales to 500,000+ operations per second)
- **Use Cases**: Highly parallel workloads (big data analytics, media processing, genomics)
- **When to Choose**: When hundreds or thousands of EC2 instances access the file system concurrently

**Selection Guidance**: Start with General Purpose. Only use Max I/O if you're hitting the 7,000 operations per second limit (monitor `PercentIOLimit` CloudWatch metric).

### Throughput Modes

#### Bursting Throughput (Default)

- **Baseline Throughput**: Scales with file system size at 50 MB/s per TB of storage
- **Burst Capability**: All file systems can burst to 100 MB/s regardless of size
- **Burst Duration**: File systems <1 TB accrue burst credits to sustain elevated throughput
- **Use Case**: Workloads with variable throughput patterns and enough storage to support baseline needs

**Example**: A 2 TB file system has 100 MB/s baseline throughput and can burst to 100 MB/s (already at burst limit).

#### Provisioned Throughput

- **Configuration**: Specify throughput independent of storage size
- **Maximum**: Up to 1,024 MB/s (can request higher limits)
- **Pricing**: Pay for storage separately from provisioned throughput
- **Use Case**: High throughput required without corresponding storage capacity

**Example**: 100 GB file system requiring 200 MB/s throughput. Bursting mode only provides 5 MB/s baseline, so provision 200 MB/s throughput.

#### Elastic Throughput (Recommended for Most Workloads)

- **Automatic Scaling**: Instantly scales throughput up or down based on workload demands
- **Performance**: Up to 3 GB/s for reads and 1 GB/s for writes
- **Pricing**: Pay only for throughput consumed (no baseline charges)
- **Use Case**: Spiky or unpredictable workloads, simplifying throughput management

**Cost Optimization**: Elastic is ideal for workloads with variable throughput. You pay per GB transferred instead of for provisioned capacity.

### Storage Classes and Lifecycle Management

#### Storage Classes

| Storage Class | Use Case | Cost | Performance |
|--------------|----------|------|-------------|
| **Standard** | Frequently accessed files | Standard rate | Full performance |
| **Infrequent Access (IA)** | Files accessed less than once per month | 92% lower storage cost | First-byte latency in low single-digit milliseconds |

#### Lifecycle Management

**Automatic Tiering**: Transition files not accessed for a specified period (7, 14, 30, 60, or 90 days) from Standard to IA storage class.

**Lifecycle Management Policies**:
- **Transition to IA**: Move files to IA after N days of inactivity
- **Transition to Standard**: Automatically move files back to Standard on first access (transparent to applications)

**Cost Savings**: 92% storage cost reduction for infrequently accessed data while maintaining immediate access capability.

**Real-World Scenario**: Home directories with 10 TB of user files. Only 1 TB actively accessed daily. Lifecycle policy moves inactive files to IA, saving 90% of storage costs (9 TB in IA).

### Security and Access Control

- **Encryption at Rest**: Automatic using AWS KMS (enabled at creation)
- **Encryption in Transit**: TLS 1.2 when mounting with EFS mount helper
- **Access Control**:
  - VPC security groups (network-level)
  - IAM policies (API-level)
  - POSIX permissions (file/directory-level)
  - EFS Access Points (application-specific entry points with IAM)
- **Compliance**: PCI DSS, SOC, ISO, HIPAA eligible

### Integration Patterns

**Compute Services**:
- EC2 instances (Linux)
- ECS containers
- EKS pods (via EFS CSI driver)
- AWS Lambda functions (for serverless file processing)
- AWS Batch jobs

**Cross-Region and Hybrid Access**:
- VPC Peering and Transit Gateway (multi-VPC access)
- AWS Direct Connect or Site-to-Site VPN (on-premises access)
- EFS Replication (automatic cross-region disaster recovery)

### EFS Replication

- **Cross-Region Replication**: Asynchronous replication to another region for disaster recovery
- **RPO**: Typically under 15 minutes
- **Use Case**: Meet compliance requirements, enable disaster recovery, centralize data from multiple regions

### Common Use Cases

1. **Content Management Systems**: WordPress, Drupal with auto-scaling web servers
2. **Web Serving**: Shared storage for application code and assets across web tier
3. **Home Directories**: Corporate user directories accessible from multiple workstations
4. **Development Environments**: Shared code repositories for development teams
5. **Machine Learning**: Shared training datasets across SageMaker or EC2 training instances
6. **Big Data Analytics**: Shared input/output for Hadoop, Spark, or custom analytics workflows

**Real-World Architecture**: Auto-scaling WordPress deployment. EFS stores WordPress content (themes, plugins, uploads). Auto Scaling group launches new web servers that mount the shared EFS file system automatically. All servers see identical content without file synchronization logic.

**AWS Documentation:**
- [Amazon EFS User Guide](https://docs.aws.amazon.com/efs/latest/ug/)
- [EFS Performance](https://docs.aws.amazon.com/efs/latest/ug/performance.html)
- [EFS Storage Classes](https://docs.aws.amazon.com/efs/latest/ug/storage-classes.html)

## Amazon FSx Family

AWS offers four fully managed third-party file systems, each optimized for specific workload requirements. FSx services eliminate the operational overhead of deploying and managing file servers while providing enterprise-grade capabilities.

### FSx for Windows File Server

Fully managed native Windows file system built on Windows Server, providing shared file storage accessible via SMB protocol with full Windows compatibility.

#### Key Features

- **Protocol**: SMB 2.0 to 3.1.1 (native Windows file system)
- **Active Directory Integration**: Seamless integration with AWS Directory Service or on-premises Active Directory
- **Performance**: Sub-millisecond latencies, configurable throughput (8 MB/s to 2 GB/s per file system)
- **Storage Types**:
  - **SSD**: Latency-sensitive workloads (databases, media processing, data analytics)
  - **HDD**: Broad workloads (home directories, content management, web serving)
- **Deployment Options**:
  - **Single-AZ**: Standard deployment with automatic failover within AZ
  - **Multi-AZ**: High availability deployment with standby file server in separate AZ (automatic failover in minutes)

#### Advanced Capabilities

- **DFS Namespaces**: Group file shares across multiple file systems into a single namespace
- **Data Deduplication**: Reduce storage costs by eliminating redundant data
- **Shadow Copies**: Point-in-time snapshots using Windows Volume Shadow Copy Service (VSS)
- **User Quotas**: Limit storage consumption per user or group
- **Access Control**: Windows ACLs for file and folder level permissions

#### Security and Backup

- **Encryption at Rest**: Automatic using AWS KMS
- **Encryption in Transit**: SMB Kerberos session keys
- **Automatic Backups**: Daily backups with configurable retention (up to 90 days)
- **Manual Backups**: On-demand backups (retained until explicitly deleted)
- **Compliance**: ISO, PCI-DSS, SOC, HIPAA eligible

#### Use Cases

- **Business Applications**: Microsoft SQL Server, SharePoint, IIS web servers
- **Home Directories**: Centralized Windows user home directories
- **Web Serving**: Windows-based web servers requiring shared file storage
- **Content Management**: Media workflows, digital asset management
- **Database Workloads**: SQL Server with SMB file shares (FILESTREAM, SQL Server Failover Cluster Instance)

**Real-World Scenario**: Enterprise running Microsoft SharePoint requiring high availability. Multi-AZ FSx for Windows File Server provides Active Directory integration, automatic failover, and sub-millisecond access for SharePoint content databases.

**AWS Documentation:**
- [FSx for Windows File Server](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/)
- [FSx for Windows Performance](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/performance.html)

### FSx for Lustre

High-performance parallel file system designed for compute-intensive workloads requiring fast storage for hot data. Built on the open-source Lustre file system (Linux + cluster).

#### Key Features

- **Performance**:
  - Hundreds of GB/s throughput per file system
  - Millions of IOPS
  - Sub-millisecond latencies
- **Protocol**: POSIX-compliant (native Linux access)
- **S3 Integration**: Transparent presentation of S3 objects as files (lazy-load from S3)
- **Scalability**: Scale to hundreds of petabytes

#### Deployment Types

| Type | Data Persistence | Replication | Use Case | Cost |
|------|-----------------|-------------|----------|------|
| **Scratch** | Temporary | None | Short-term processing, cost-optimized | Lower |
| **Persistent** | Long-term | Within single AZ | Long-term storage, mission-critical | Higher |

#### Storage Classes

- **SSD**: Sub-millisecond latencies, random I/O workloads (small files, databases)
- **HDD**: Lower cost, sequential I/O workloads (large files, streaming)
- **Intelligent-Tiering**: Most general workloads, automatically optimizes cost (recommended)

#### S3 Data Repository Integration

FSx for Lustre can link to S3 buckets as data repositories:
- **Lazy Load**: Files materialized from S3 on first access (appear as Lustre files)
- **Automatic Export**: Write changes back to S3 automatically or on-demand
- **Data Repository Tasks**: Bulk transfer data between FSx and S3 (import/export)
- **Release**: Remove local copies to free capacity while maintaining S3 link

**Performance Pattern**: Process 100 TB dataset in S3. Create FSx for Lustre linked to S3 bucket. Compute cluster accesses data as files (lazy-loaded from S3 at line rate). Results written back to FSx and exported to S3.

#### Use Cases

- **High Performance Computing (HPC)**: Seismic processing, computational fluid dynamics, weather modeling
- **Machine Learning**: Training datasets for SageMaker or EC2-based ML workloads (fast random access to training data)
- **Media Processing**: Video rendering, visual effects, transcoding workflows
- **Electronic Design Automation (EDA)**: Chip design verification, simulation
- **Financial Modeling**: Risk analysis, monte carlo simulations

**Real-World Scenario**: Genomics research lab processing DNA sequencing data. Raw sequencing files stored in S3 (100 TB). FSx for Lustre Persistent file system with S3 link provides high-throughput access for Nextflow bioinformatics pipeline running on AWS Batch. Processed results automatically exported back to S3.

**AWS Documentation:**
- [FSx for Lustre User Guide](https://docs.aws.amazon.com/fsx/latest/LustreGuide/)
- [FSx for Lustre Performance](https://docs.aws.amazon.com/fsx/latest/LustreGuide/performance.html)
- [FSx for Lustre S3 Integration](https://docs.aws.amazon.com/fsx/latest/LustreGuide/fsx-data-repositories.html)

### FSx for NetApp ONTAP

Fully managed NetApp ONTAP file system providing enterprise-grade data management features with multi-protocol support.

#### Key Features

- **Multi-Protocol Support**: NFS, SMB, iSCSI, NVMe-over-TCP (access from Linux, Windows, macOS simultaneously)
- **Performance**: Up to tens of GB/s throughput, sub-millisecond latencies
- **Deployment**: Multi-AZ (active-active) or Single-AZ
- **Scale**: Petabyte-scale with single namespace
- **Storage Efficiency**:
  - Automatic data deduplication and compression
  - Compaction to reduce storage footprint
  - Thin provisioning

#### Advanced Data Management

- **NetApp Snapshots**: Near-instant, space-efficient point-in-time copies
- **SnapMirror Replication**: Asynchronous replication between file systems (DR, backup)
- **FlexClone**: Instant, writable clones of volumes (testing, development)
- **Data Tiering**: Automatically tier cold data to capacity pool storage (92% cost reduction)

#### Security Features

- **Encryption**: At rest (AWS KMS) and in transit (SMB Kerberos, NFS Kerberos, IPSec)
- **Access Control**: POSIX permissions, Windows ACLs, NFSv4 ACLs
- **Active Directory Integration**: Windows authentication and authorization
- **Audit Logging**: File access auditing
- **SnapLock**: WORM (Write-Once-Read-Many) compliance for regulatory requirements

#### Use Cases

- **Enterprise Applications**: SAP, Oracle, VMware workloads
- **Databases**: Oracle, MySQL, PostgreSQL requiring multi-protocol access
- **DevOps**: Instant cloning for development/test environments
- **Hybrid Cloud Storage**: Extend on-premises NetApp storage to AWS
- **Disaster Recovery**: SnapMirror replication for business continuity

**Real-World Scenario**: Financial institution migrating on-premises Oracle RAC database to AWS. FSx for NetApp ONTAP provides iSCSI LUNs for database storage with SnapMirror replication for disaster recovery, FlexClone for instant test environment creation, and snapshot-based backups.

**AWS Documentation:**
- [FSx for NetApp ONTAP User Guide](https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/)
- [FSx for ONTAP Performance](https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/performance.html)

### FSx for OpenZFS

Fully managed OpenZFS file system providing high-performance shared file storage for Linux-based workloads with advanced ZFS features.

#### Key Features

- **Protocol**: NFS v3, v4.0, v4.1, v4.2 (IPv4 and IPv6)
- **Performance**:
  - Up to 2 million IOPS
  - Up to 21 GB/s throughput (cached reads), 10 GB/s disk throughput
  - Hundreds of microseconds latency for cached data
- **Deployment**: Multi-AZ (HA with 60-second failover) or Single-AZ
- **Volume Management**: Multiple volumes per file system

#### Storage Classes

- **Intelligent-Tiering**: Fully elastic storage, pay-per-GB with optional SSD read cache
- **SSD**: Predictable, provisioned capacity with high performance

#### Advanced ZFS Features

- **Snapshots**: Near-instant, local point-in-time snapshots (no performance impact)
- **Clones**: Instant, writable copies from snapshots (testing, development)
- **Data Compression**: Automatic compression (LZ4, ZSTD) for storage savings
- **Thin Provisioning**: Allocate storage capacity on demand
- **User and Group Quotas**: Control storage consumption

#### Backup and Data Protection

- **Automatic Daily Backups**: Fully managed, stored in S3
- **Cross-Region Backup**: Copy backups to different region for disaster recovery
- **Backup Retention**: Up to 90 days

#### Use Cases

- **Linux Workloads**: Migrate on-premises ZFS or Linux file servers to AWS
- **High-Performance Applications**: Databases, media processing, financial analytics
- **Development Environments**: Instant cloning for developer workspaces
- **Data-Intensive Applications**: Big data analytics, machine learning preprocessing

**Real-World Scenario**: Software development company running Linux-based development environment. FSx for OpenZFS stores shared code repositories with instant snapshots for version control integration and FlexClone for per-developer environment isolation (each developer gets instant clone of production dataset).

**AWS Documentation:**
- [FSx for OpenZFS User Guide](https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/)
- [FSx for OpenZFS Performance](https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/performance.html)

### FSx Family Comparison

| Feature | Windows File Server | Lustre | NetApp ONTAP | OpenZFS |
|---------|-------------------|--------|--------------|---------|
| **Protocol** | SMB | POSIX (NFS-like) | NFS, SMB, iSCSI | NFS |
| **OS Compatibility** | Windows | Linux | Linux, Windows, macOS | Linux, macOS, Windows |
| **Max IOPS** | Hundreds of thousands | Millions | Hundreds of thousands | 2 million |
| **Max Throughput** | 2 GB/s | Hundreds of GB/s | Tens of GB/s | 21 GB/s |
| **Multi-AZ** | Yes | No | Yes | Yes |
| **S3 Integration** | No | Yes (native) | Limited | No |
| **Primary Use Case** | Windows apps, AD | HPC, ML | Enterprise apps | Linux workloads |
| **Data Deduplication** | Yes | No | Yes | No |
| **Snapshots** | Yes (VSS) | Limited | Yes (NetApp) | Yes (ZFS) |

## AWS Storage Gateway

AWS Storage Gateway is a hybrid cloud storage service that provides on-premises applications with seamless access to AWS cloud storage. It acts as a bridge between on-premises infrastructure and AWS storage services (S3, EBS, Glacier).

**Deployment Options:**
- Virtual appliance (VMware ESXi, Microsoft Hyper-V, Linux KVM)
- Hardware appliance (physical device shipped by AWS)
- EC2 instance (for cloud-to-cloud or VPC-to-VPC connectivity)

### File Gateway

Presents Amazon S3 storage as NFS or SMB file shares, making S3 accessible as a file system to on-premises applications.

#### How It Works

1. **File Interface**: Applications write/read files via NFS (v3, v4.1) or SMB protocols
2. **Local Cache**: Recently accessed files cached locally for low-latency access
3. **S3 Storage**: All files asynchronously uploaded to S3 as objects (1:1 mapping)
4. **Metadata Storage**: File metadata stored in S3 (permissions, timestamps, ownership)

#### Key Features

- **Storage Classes**: Objects stored in any S3 storage class (Standard, IA, Intelligent-Tiering, Glacier)
- **Lifecycle Policies**: Apply S3 lifecycle policies for automatic tiering to Glacier
- **Versioning**: S3 bucket versioning supported (access previous file versions)
- **S3 Object Lock**: Enforce WORM compliance requirements
- **Bandwidth Throttling**: Control upload bandwidth to AWS

#### Use Cases

- **Cloud Migration**: Gradual migration of file shares to S3 (applications continue using NFS/SMB)
- **Backup and Archive**: Low-cost backup target with S3 lifecycle transitions to Glacier
- **Disaster Recovery**: Replicate file data to S3 for offsite backup
- **Content Distribution**: Local cache for frequently accessed content stored in S3
- **Hybrid Workflows**: On-premises processing with cloud-based storage

**Real-World Scenario**: Video production company with 500 TB of media assets. File Gateway presents S3 bucket as NFS share to editing workstations. Active projects cached locally for fast access. Completed projects automatically transitioned to S3 Glacier Deep Archive via lifecycle policy (99% cost reduction).

#### Access Patterns

- **Read-through caching**: Files downloaded from S3 on first access, cached locally for subsequent reads
- **Write-back caching**: Writes acknowledged immediately to local cache, uploaded to S3 asynchronously
- **Cache eviction**: Least recently used (LRU) algorithm frees cache for new data

**AWS Documentation:**
- [File Gateway Overview](https://docs.aws.amazon.com/filegateway/latest/files3/what-is-file-s3.html)

### Volume Gateway

Presents cloud-backed block storage volumes as iSCSI targets to on-premises applications. Provides low-latency access to frequently used data while storing the full dataset in AWS.

#### Cached Volumes Mode

- **Primary Storage**: All data stored in Amazon S3
- **Local Cache**: Frequently accessed data subset cached locally (SSD recommended)
- **Cache Size**: 1 GB - 32 TB per cached volume
- **Total Volume Size**: Up to 32 TB per volume
- **Maximum Volumes**: 32 volumes per gateway (1 PB total)
- **Snapshots**: Automatic EBS snapshots stored in S3 (point-in-time recovery)

**Use Cases**:
- Primary storage in cloud with local cache for performance
- Capacity expansion without procuring on-premises hardware
- Disaster recovery (restore volumes to EC2 from snapshots)

**Real-World Scenario**: Manufacturing facility with space-constrained server room. Volume Gateway (Cached mode) provides 100 TB storage capacity for production database with only 2 TB local cache. Full dataset stored in S3, active working set cached locally.

#### Stored Volumes Mode

- **Primary Storage**: Complete dataset stored locally (on-premises)
- **Async Backup**: Continuous point-in-time snapshots to Amazon S3 (EBS snapshots)
- **Volume Size**: Up to 16 TB per volume
- **Maximum Volumes**: 32 volumes per gateway (512 TB total)
- **Snapshot Schedule**: Configurable (hourly, daily, weekly)

**Use Cases**:
- Low-latency access to entire dataset (local storage performance)
- Compliance requirements for local data retention
- Disaster recovery (restore to EC2 or Volume Gateway)
- Gradual migration to cloud (backup established before workload migration)

**Real-World Scenario**: Healthcare provider with HIPAA data sovereignty requirements. Patient records stored on-premises (Stored mode) for compliance and low-latency access. Continuous snapshots to S3 provide disaster recovery capability with ability to restore to EC2 in minutes.

#### Volume Gateway Features

- **EBS Snapshot Integration**: Snapshots can be restored as EBS volumes in EC2
- **Snapshot Scheduling**: Automated snapshot creation (hourly to daily)
- **Point-in-Time Recovery**: Restore volumes from any snapshot
- **Bandwidth Throttling**: Control snapshot upload bandwidth
- **Encryption**: Data encrypted at rest in S3 and in transit to AWS

**AWS Documentation:**
- [Volume Gateway Overview](https://docs.aws.amazon.com/storagegateway/latest/vgw/WhatIsStorageGateway.html)

### Tape Gateway

Presents a Virtual Tape Library (VTL) interface for backup applications, replacing physical tape infrastructure with cloud-based archival storage.

#### How It Works

1. **Virtual Tapes**: Backup applications see virtual tapes (iSCSI-based VTL)
2. **Local Cache**: Active tapes cached locally during backup operations
3. **S3 Storage**: Ejected virtual tapes stored in Virtual Tape Library (S3 Standard)
4. **Glacier Archive**: Archived tapes moved to Virtual Tape Shelf (S3 Glacier Flexible Retrieval or Deep Archive)

#### Key Features

- **Tape Size**: 100 GB to 5 TB per virtual tape
- **Tape Library Capacity**: Up to 1 PB (1,500 tapes)
- **Archive Capacity**: Virtually unlimited (S3 Glacier)
- **Supported Protocols**: iSCSI-based VTL interface
- **Backup Software**: Compatible with Veeam, Veritas NetBackup, Commvault, IBM Spectrum Protect, Microsoft DPM
- **WORM Compliance**: Tape retention lock for compliance (indelible, immutable tapes)

#### Tape Lifecycle

```
Active Backup → Virtual Tape (cached locally + S3)
     ↓
Eject Tape → Virtual Tape Library (S3 Standard)
     ↓
Archive Tape → Virtual Tape Shelf (S3 Glacier Flexible Retrieval)
     ↓
Long-term Archive → Virtual Tape Shelf (S3 Glacier Deep Archive)
```

#### Use Cases

- **Tape Replacement**: Eliminate physical tape infrastructure and logistics
- **Long-Term Retention**: 7-10 year retention for compliance (financial, healthcare)
- **Disaster Recovery**: Offsite backup without shipping physical tapes
- **Cost Optimization**: Lower cost than physical tape over multi-year retention

**Real-World Scenario**: Financial services firm with 10-year retention requirement for transaction logs. Tape Gateway replaces physical tape library. Veeam backups written to virtual tapes (ejected to S3 Standard). After 90 days, archived to S3 Glacier Deep Archive (lowest cost). Retrieval within 12 hours if needed for audit.

#### Tape Retrieval

- **From Virtual Tape Library (S3)**: Instant retrieval (tapes already in S3 Standard)
- **From Virtual Tape Shelf (Glacier Flexible)**: 3-5 hours (Standard retrieval)
- **From Virtual Tape Shelf (Glacier Deep Archive)**: 12 hours (Standard retrieval)

**AWS Documentation:**
- [Tape Gateway Overview](https://docs.aws.amazon.com/storagegateway/latest/tgw/WhatIsStorageGateway.html)
- [Storage Gateway Documentation](https://docs.aws.amazon.com/storagegateway/)

## AWS DataSync

AWS DataSync is a secure, online data transfer service that simplifies, automates, and accelerates moving large amounts of data between on-premises storage and AWS storage services, or between AWS storage services.

### Key Features

- **Performance**: Up to 10x faster than open-source tools (purpose-built network protocol)
- **Automation**: Scheduled transfers, automatic retry logic, data integrity validation
- **Security**:
  - End-to-end encryption (TLS 1.2)
  - Data integrity verification (checksum validation)
  - VPC endpoint support (private transfer, no public internet)
- **Bandwidth Control**: Throttle bandwidth to avoid impacting production workloads
- **Filtering**: Include/exclude patterns for selective data transfer

### Supported Data Sources and Destinations

#### On-Premises Sources
- Network File System (NFS) v3, v4.0, v4.1
- Server Message Block (SMB) v2.x, v3.x
- Hadoop Distributed File System (HDFS)
- Object storage (any S3-compatible API)

#### AWS Destinations
- **Amazon S3**: All storage classes (Standard, IA, Glacier, etc.)
- **Amazon EFS**: Regional and One Zone file systems
- **Amazon FSx for Windows File Server**
- **Amazon FSx for Lustre**
- **Amazon FSx for OpenZFS**
- **Amazon FSx for NetApp ONTAP**

#### Cloud-to-Cloud Support
- Google Cloud Storage
- Microsoft Azure Blob Storage and Azure Files
- Oracle Cloud Infrastructure Object Storage
- Wasabi, DigitalOcean Spaces, Cloudflare R2, and other S3-compatible storage

### How DataSync Works

1. **Deploy Agent**: Install DataSync agent VM on-premises (VMware, Hyper-V, KVM) or use EC2 instance for cloud-to-cloud transfers
2. **Create Task**: Define source, destination, and transfer settings
3. **Schedule or Run**: Execute on-demand or schedule recurring transfers
4. **Monitor**: Track progress via CloudWatch metrics and logs
5. **Verify**: Automatic data integrity verification (checksums compared)

### Transfer Process

- **Incremental Transfers**: Only changed data transferred after initial full copy (reduces time and bandwidth)
- **Metadata Preservation**: Preserves timestamps, permissions, ownership, and other metadata
- **Parallel Transfer**: Multiple threads and network connections for maximum throughput
- **Automatic Recovery**: Retries failed transfers automatically

### Use Cases

#### 1. Data Migration

**Scenario**: Migrate 500 TB file server from on-premises data center to Amazon EFS.

**Solution**: Deploy DataSync agent on-premises, create task to transfer data from NFS server to EFS. DataSync handles incremental transfers during migration window. After cutover, validate data integrity.

**Benefits**: 10x faster than rsync, automatic retry, built-in validation.

#### 2. Hybrid Cloud Storage

**Scenario**: Burst analytics workloads to AWS during peak demand.

**Solution**: Scheduled DataSync tasks replicate on-premises datasets to S3 nightly. EC2-based analytics cluster processes data from S3.

**Benefits**: Automated replication, bandwidth throttling to protect production network.

#### 3. Data Protection and DR

**Scenario**: Offsite backup for disaster recovery.

**Solution**: Daily DataSync tasks replicate critical file shares from on-premises NFS to S3 (Standard-IA or Glacier). Enable S3 Cross-Region Replication for additional resiliency.

**Benefits**: Automated backup, cost-effective archival, encrypted transfer.

#### 4. Archive Cold Data

**Scenario**: Free on-premises capacity by archiving infrequently accessed data.

**Solution**: DataSync transfers cold data from on-premises SMB shares to S3 Glacier Deep Archive. After validation, delete on-premises copies.

**Benefits**: 99% cost reduction vs. on-premises storage, retrieval within 12 hours if needed.

#### 5. Data Lake Ingestion

**Scenario**: Centralize data from multiple regional offices into S3 data lake.

**Solution**: DataSync agents deployed in each regional office transfer data to central S3 bucket. Scheduled tasks run during off-hours.

**Benefits**: Simplified data consolidation, automatic metadata preservation, encrypted transfer.

### Performance Characteristics

- **Network Throughput**: Fully utilizes available bandwidth (tested at 10 Gbps per task)
- **File Operations**: Optimized for millions of small files and large files (TBs)
- **Concurrency**: Multiple concurrent tasks supported
- **Bottleneck Mitigation**: Automatically tunes buffer sizes, network parameters, and concurrency

### Cost Optimization

- **Pricing**: Pay per GB transferred (no infrastructure costs, licensing fees)
- **Bandwidth Scheduling**: Schedule transfers during off-peak hours to reduce WAN costs
- **Destination Storage Class**: Transfer directly to cost-optimized S3 storage class (IA, Glacier)
- **CloudWatch Metrics**: Monitor transfer costs and optimize task frequency

### DataSync vs. Other Transfer Methods

| Method | Speed | Automation | Validation | Use Case |
|--------|-------|------------|-----------|----------|
| **DataSync** | 10x faster | Scheduled tasks | Automatic | Recurring transfers, migrations |
| **S3 Transfer Acceleration** | Fast (CloudFront) | Manual | None | One-time uploads, global uploads |
| **AWS Snow Family** | Offline (PB-scale) | Manual | Checksum | Petabyte-scale migrations, limited bandwidth |
| **Direct Connect** | Consistent (private) | Manual | Manual | Ongoing hybrid connectivity |

**AWS Documentation:**
- [AWS DataSync User Guide](https://docs.aws.amazon.com/datasync/latest/userguide/)
- [DataSync Use Cases](https://docs.aws.amazon.com/datasync/latest/userguide/use-cases.html)

## S3 Replication

S3 Replication enables automatic, asynchronous copying of objects across S3 buckets. Replication supports compliance requirements, disaster recovery, and data locality needs.

### Types of S3 Replication

#### Cross-Region Replication (CRR)

Replicates objects across S3 buckets in **different AWS Regions**.

**Use Cases:**
- **Compliance**: Meet geographic data residency requirements (store data copies in specific regions)
- **Latency Reduction**: Replicate data closer to geographically distributed users
- **Disaster Recovery**: Maintain cross-region backup for business continuity
- **Operational Efficiency**: Replicate datasets to regions where compute clusters run

**Example**: E-commerce company with customers in US and EU. Product catalog bucket in us-east-1 replicated to eu-west-1 (reduces latency for EU customers, meets GDPR locality requirements).

#### Same-Region Replication (SRR)

Replicates objects across S3 buckets in the **same AWS Region**.

**Use Cases:**
- **Log Aggregation**: Aggregate logs from multiple accounts/buckets into central bucket
- **Production/Test Separation**: Replicate production data to test account for development
- **Data Sovereignty**: Maintain multiple copies within same region for compliance
- **Backup and Disaster Recovery**: Separate backup bucket with different access controls

**Example**: Multi-account organization aggregates application logs from development, staging, and production accounts into central audit bucket in same region.

### Replication Configuration

#### Prerequisites

- **Versioning**: Must be enabled on both source and destination buckets
- **IAM Permissions**: Source bucket requires permissions to replicate objects to destination
- **Ownership**: Can configure ownership override for cross-account replication

#### Replication Rules

**Scope Filters:**
- **All objects**: Replicate entire bucket
- **Prefix-based**: Replicate only objects with specific prefix (e.g., `logs/`)
- **Tag-based**: Replicate only objects with specific tags (e.g., `replicate=true`)
- **Combination**: Combine prefix and tag filters for granular control

**Replication Options:**
- **Storage Class**: Replicate to different storage class (e.g., Standard to Glacier for cost savings)
- **Ownership**: Change object ownership to destination account owner
- **Encryption**: Replicate encrypted objects (supports SSE-S3, SSE-KMS, SSE-C)
- **Replication Time Control (RTC)**: Predictable replication timing (SLA-backed)
- **Delete Marker Replication**: Optionally replicate delete markers
- **Replica Modification Sync**: Replicate metadata changes (ACLs, tags, Object Lock settings)

### S3 Replication Time Control (RTC)

Provides SLA-backed replication timing for compliance and business continuity requirements.

- **Replication SLA**: 99.99% of objects replicated within 15 minutes of upload
- **Metrics**: CloudWatch metrics track RTC-eligible objects and replication lag
- **Use Cases**: Disaster recovery with RPO < 15 minutes, compliance requirements for data redundancy
- **Cost**: Additional charge per GB replicated with RTC

**Example**: Financial institution with 15-minute RPO requirement. RTC ensures transaction logs replicated to DR region within SLA window.

### S3 Batch Replication

Replicates existing objects that were created before replication was configured or that previously failed to replicate.

**Use Cases:**
- **Backfill**: Replicate existing objects when enabling replication on bucket with existing data
- **Retry Failed Objects**: Replicate objects with FAILED replication status
- **New Destination**: Replicate objects to newly added destination bucket
- **Re-replicate**: Replicate replicas created by different replication rules

**How It Works:**
1. Create S3 Batch Replication job
2. Specify source bucket and optional filters (prefix, creation date, replication status)
3. S3 generates manifest of objects to replicate
4. Batch job replicates objects based on replication rules
5. Track progress via completion report

**Example**: Enable CRR on bucket with 10 TB existing data. Configure live replication for new objects. Create Batch Replication job to backfill existing 10 TB to destination region.

### Replication Metadata and Behavior

**What Gets Replicated:**
- Object data
- Object metadata (system metadata and user-defined metadata)
- Object tags
- Object ACLs
- S3 Object Lock information (if enabled)

**What Does NOT Get Replicated (by default):**
- Objects created before replication was enabled (use Batch Replication)
- Objects encrypted with SSE-C (customer-provided keys) unless configured
- Delete markers (optional, can be enabled)
- Objects in Glacier or Deep Archive storage class
- Objects with storage class transitions in lifecycle rules

### Bi-Directional Replication

Configure two replication rules to replicate changes in both directions between two buckets.

**Use Cases:**
- **Active-Active Data Sharing**: Multiple regions actively write to local bucket, changes replicated globally
- **Metadata Sync**: Replicate metadata changes (tags, ACLs) back to source

**Configuration**: Create replication rule in bucket A to bucket B, and separate rule in bucket B to bucket A. S3 prevents replication loops automatically.

**Example**: Global collaboration platform with users in US and Asia. us-west-2 and ap-northeast-1 buckets configured with bi-directional replication. Users upload to nearest region, data synchronized automatically.

### Cost Considerations

**Replication Costs:**
- **Data Transfer**: Cross-region data transfer charges (CRR only)
- **Storage**: Duplicate storage costs in destination bucket
- **Replication PUT Requests**: Per-request charges for replication
- **RTC**: Additional per-GB charge for Replication Time Control

**Cost Optimization Strategies:**
- Use S3 Intelligent-Tiering on destination to automatically optimize storage class
- Replicate to cheaper storage class if immediate access not required
- Use prefix/tag filters to replicate only necessary objects
- Consider SRR instead of CRR if cross-region redundancy not required

### Replication Monitoring

**CloudWatch Metrics:**
- `ReplicationLatency`: Time between object upload and replication completion
- `BytesPendingReplication`: Bytes waiting to be replicated
- `OperationsPendingReplication`: Number of operations pending replication
- `OperationsFailedReplication`: Failed replication operations

**S3 Replication Status:**
- **PENDING**: Replication in progress
- **COMPLETED**: Object successfully replicated
- **FAILED**: Replication failed (check permissions, encryption settings)
- **REPLICA**: Object is a replica (created by replication)

**AWS Documentation:**
- [S3 Replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)
- [S3 Replication Time Control](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html)
- [S3 Batch Replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-batch-replication.html)

## SAP-C02 Exam Tips

### Storage Service Selection

1. **gp3 is the default EBS choice**: 20% cheaper than gp2, better baseline performance (3,000 IOPS independent of size), can provision IOPS/throughput separately
2. **io2 Block Express for extreme performance**: 256,000 IOPS, 4,000 MB/s throughput, 99.999% durability (use for mission-critical databases)
3. **S3 Intelligent-Tiering for unknown patterns**: No retrieval fees, automatic optimization between tiers (eliminates manual lifecycle management)
4. **Lifecycle policy minimum durations matter**: Standard-IA 30 days, Glacier Instant Retrieval 90 days, Deep Archive 180 days (early deletion incurs charges)
5. **Objects <128 KB don't transition by default**: September 2024 change to prevent transition costs exceeding storage savings

### File System Selection

6. **EFS vs FSx decision tree**:
   - Linux + NFS + Multi-AZ = **EFS**
   - Windows + SMB + Active Directory = **FSx for Windows File Server**
   - HPC + S3 integration + extreme performance = **FSx for Lustre**
   - NetApp features + multi-protocol = **FSx for NetApp ONTAP**
   - Linux + ZFS features + snapshots = **FSx for OpenZFS**

7. **EFS Performance Modes**: General Purpose (99% of workloads), Max I/O only if hitting 7,000 ops/sec limit
8. **EFS Throughput Modes**: Elastic (recommended, pay for usage), Bursting (scales with size), Provisioned (fixed throughput)

### Hybrid and Migration

9. **Storage Gateway types**:
   - **File Gateway**: S3 as NFS/SMB (file interface to S3)
   - **Volume Gateway Cached**: Primary data in S3, cache on-premises (capacity expansion)
   - **Volume Gateway Stored**: Primary data on-premises, backup to S3 (compliance, low latency)
   - **Tape Gateway**: Virtual tapes to S3/Glacier (replace physical tape infrastructure)

10. **DataSync vs Transfer Acceleration**:
    - **DataSync**: Automated, scheduled transfers, 10x faster than rsync (NFS/SMB to AWS)
    - **Transfer Acceleration**: One-time uploads via CloudFront edges (global user uploads to S3)

### S3 Performance and Replication

11. **Multipart upload**: Required for >5 GB objects, recommended for >100 MB (parallel upload, resume capability)
12. **S3 request rate limits**: 3,500 PUT/DELETE per prefix per second, 5,500 GET per prefix per second (scale with multiple prefixes)
13. **S3 Replication Time Control (RTC)**: 99.99% of objects within 15 minutes (SLA-backed, for RPO requirements)
14. **S3 Batch Replication**: Backfill existing objects (live replication only applies to new objects after rule creation)
15. **CRR vs SRR**: Cross-Region (compliance, DR, latency) vs Same-Region (log aggregation, test/prod separation)

### Cost Optimization

16. **S3 storage class waterfall**: Can only transition to cheaper classes (Standard → IA → Glacier IR → Glacier → Deep Archive)
17. **EBS snapshot archival**: Archive old snapshots to S3 Glacier for 75% cost reduction
18. **FSx for Lustre deployment types**: Scratch (temporary, no replication, cheaper) vs Persistent (long-term, replicated, durable)
19. **Storage Gateway cache sizing**: Cache hit ratio determines on-premises cache size (monitor CloudWatch metrics)
20. **S3 Intelligent-Tiering monitoring fee**: Small monthly per-object fee, but no retrieval fees (breaks even if accessed unpredictably)

## Common SAP-C02 Scenario Patterns

### Data Access and Performance

**"Unknown or changing access patterns for S3 data"**
→ **S3 Intelligent-Tiering** (automatic optimization, no retrieval fees)

**"Sub-millisecond latency, 100,000 IOPS database workload"**
→ **EBS io2 Block Express** (256,000 IOPS, sub-ms latency, 99.999% durability)

**"Shared file system for Linux instances across multiple AZs"**
→ **Amazon EFS Regional** (NFS, multi-AZ, automatic scaling)

**"Sequential log processing, cost-optimized, 1 TB/hour throughput"**
→ **EBS st1** (throughput-optimized HDD, 500 MB/s max, low cost)

**"500 GB database, need 8,000 IOPS"**
→ **EBS gp3** (provision 8,000 IOPS independent of size, cost-effective)

### File System Requirements

**"Windows file shares with Active Directory integration and Multi-AZ HA"**
→ **FSx for Windows File Server Multi-AZ** (SMB, AD, DFS, VSS snapshots)

**"HPC workload processing 100 TB dataset in S3, need millions of IOPS"**
→ **FSx for Lustre with S3 data repository** (lazy load from S3, high performance, export results back)

**"Migrate on-premises NetApp ONTAP storage to AWS with multi-protocol access"**
→ **FSx for NetApp ONTAP** (NFS, SMB, iSCSI, SnapMirror replication, FlexClone)

**"Linux development environment requiring instant clones and snapshots"**
→ **FSx for OpenZFS** (ZFS snapshots, instant clones, 2M IOPS)

### Hybrid Cloud and Migration

**"On-premises NFS file share backed by S3 for cloud migration"**
→ **Storage Gateway File Gateway** (present S3 as NFS, local cache, gradual migration)

**"On-premises iSCSI volumes with disaster recovery in AWS"**
→ **Storage Gateway Volume Gateway Stored Mode** (local data, async snapshots to S3, restore to EC2)

**"Replace physical tape library with cloud archival (Veeam backups)"**
→ **Storage Gateway Tape Gateway** (VTL interface, virtual tapes in S3/Glacier)

**"Migrate 500 TB from on-premises NFS to Amazon EFS"**
→ **AWS DataSync** (10x faster than rsync, automated, incremental, data validation)

**"Fast upload of multi-GB files from Asia to us-east-1"**
→ **S3 Transfer Acceleration** (CloudFront edge upload, optimized routing to S3 region)

### Compliance and Data Protection

**"Archive financial records for 10 years, lowest cost, annual access"**
→ **S3 Glacier Deep Archive** (lowest cost, 12-hour retrieval, 180-day minimum)

**"Medical imaging requiring instant retrieval for patient care, long-term retention"**
→ **S3 Glacier Instant Retrieval** (millisecond access, 90-day minimum, 68% cheaper than Standard)

**"Disaster recovery with 15-minute RPO across regions"**
→ **S3 Cross-Region Replication with RTC** (99.99% within 15 minutes, SLA-backed)

**"Replicate production bucket to test account in same region"**
→ **S3 Same-Region Replication** (cross-account, log aggregation, prod/test separation)

**"WORM compliance for regulatory archives"**
→ **S3 Object Lock** (immutable, indelible, with Glacier or Standard storage)

### Multi-Region and Global Access

**"Global content distribution with low-latency access"**
→ **CloudFront + S3** (cache at edge, reduce origin requests, improve global performance)

**"Active-active data replication between US and EU regions"**
→ **S3 Bi-directional Replication** (two-way CRR, prevents loops, metadata sync)

**"Multi-region analytics requiring consistent dataset access"**
→ **S3 CRR to multiple regions** + **S3 Same-Region Replication for aggregation**

**AWS Documentation:**
- [AWS Storage Services Overview](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/storage-services.html)
- [Cost Optimization for Storage](https://docs.aws.amazon.com/whitepapers/latest/cost-optimization-storage-optimization/welcome.html)
- [Storage Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/framework/a-storage.html)
