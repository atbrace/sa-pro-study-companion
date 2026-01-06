---
title: Storage Solutions and Data Management
lastUpdated: 2026-01-05
---

# Storage Solutions and Data Management

AWS provides a comprehensive portfolio of storage services for object, block, and file storage. Selecting the right storage solution requires understanding access patterns, performance requirements, durability needs, and cost considerations.

## Amazon S3 Storage Classes

### S3 Standard
- **Use Case**: Frequently accessed data
- **Availability**: 99.99%
- **Durability**: 99.999999999% (11 9's)
- **Retrieval**: Instant, no retrieval fees
- **Cost**: Highest storage cost, lowest access cost

### S3 Intelligent-Tiering
- **Use Case**: Unknown or changing access patterns
- **Features**: Automatic tiering between frequent and infrequent access
- **No retrieval fees** between tiers
- **Monitoring fee**: Small monthly fee per object
- **Archive tiers**: Optional deep archive tiers (90/180 days)

### S3 Standard-IA (Infrequent Access)
- **Use Case**: Long-lived, infrequently accessed data
- **Minimum storage duration**: 30 days
- **Minimum object size**: 128 KB
- **Retrieval fees** apply
- **Lower storage cost** than Standard

### S3 One Zone-IA
- **Use Case**: Infrequently accessed, reproducible data
- **Availability**: 99.5% (single AZ)
- **Lower cost** than Standard-IA
- **Risk**: Data lost if AZ fails

### S3 Glacier Instant Retrieval
- **Use Case**: Archive data requiring instant access
- **Retrieval**: Milliseconds
- **Minimum storage**: 90 days
- **68% lower cost** than S3 Standard

### S3 Glacier Flexible Retrieval (formerly Glacier)
- **Use Case**: Archive data accessed 1-2 times per year
- **Retrieval**: Minutes to hours
  - Expedited: 1-5 minutes
  - Standard: 3-5 hours  
  - Bulk: 5-12 hours
- **Minimum storage**: 90 days

### S3 Glacier Deep Archive
- **Use Case**: Long-term archive, compliance
- **Retrieval**: 12-48 hours
  - Standard: 12 hours
  - Bulk: 48 hours
- **Minimum storage**: 180 days
- **Lowest cost** storage class

> 📚 [S3 Storage Classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)

## S3 Lifecycle Policies

Automate transitions between storage classes and expiration:

```json
{
  "Rules": [{
    "Id": "Archive-policy",
    "Status": "Enabled",
    "Filter": {"Prefix": "documents/"},
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 90, "StorageClass": "GLACIER"},
      {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
    ],
    "Expiration": {"Days": 2555}
  }]
}
```

## S3 Performance Optimization

### Request Rate Performance

S3 supports:
- **3,500 PUT/COPY/POST/DELETE** requests per second per prefix
- **5,500 GET/HEAD** requests per second per prefix

### Key Naming Strategy

**Problem**: Sequential keys (timestamps) create hot partitions
```
2026-01-05-12-00-01-file.jpg  # Sequential
2026-01-05-12-00-02-file.jpg  # Sequential
```

**Solution**: Add random hash prefix
```
a3f2-2026-01-05-12-00-01-file.jpg  # Randomized
b7d1-2026-01-05-12-00-02-file.jpg  # Randomized
```

### Multipart Upload

- **Required**: Objects larger than 5 GB
- **Recommended**: Objects larger than 100 MB
- **Benefits**:
  - Parallel uploads improve throughput
  - Resume failed uploads
  - Begin upload before knowing final object size

### S3 Transfer Acceleration

- Uses CloudFront edge locations for faster uploads
- Optimizes long-distance transfers
- Costs extra ($0.04-0.08 per GB)

## EBS Volume Types

### General Purpose SSD (gp3)

**Current generation** - recommended for most workloads:
- **Baseline**: 3,000 IOPS, 125 MB/s
- **Max**: 16,000 IOPS, 1,000 MB/s
- **Size**: 1 GB - 16 TB
- **Cost**: ~$0.08/GB-month
- **20% cheaper** than gp2 with better performance

### General Purpose SSD (gp2)

**Previous generation**:
- Baseline: 3 IOPS per GB (min 100, max 16,000)
- Burst to 3,000 IOPS using credits
- Use gp3 instead for new workloads

### Provisioned IOPS SSD (io2)

**Mission-critical, high-performance**:
- **IOPS**: 100 - 64,000 (256,000 with io2 Block Express)
- **Throughput**: 1,000 MB/s (4,000 MB/s Block Express)
- **Durability**: 99.999% (5 9's)
- **Size**: 4 GB - 16 TB (64 TB Block Express)
- **Use Case**: Databases, latency-sensitive workloads

### Throughput Optimized HDD (st1)

**Sequential, throughput-intensive**:
- **Throughput**: Baseline 40 MB/s per TB, burst to 250 MB/s per TB
- **Max**: 500 MB/s per volume
- **Size**: 125 GB - 16 TB
- **Use Case**: Big data, log processing, data warehouses
- **Cannot be boot volume**

### Cold HDD (sc1)

**Infrequent access, lowest cost**:
- **Throughput**: Baseline 12 MB/s per TB, burst to 80 MB/s per TB
- **Max**: 250 MB/s per volume
- **Size**: 125 GB - 16 TB
- **Use Case**: Archival storage, infrequently accessed data
- **Cannot be boot volume**

> 📚 [EBS Volume Types](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html)

## Amazon EFS (Elastic File System)

### Overview
- **Managed NFS** file system
- **Multi-AZ** durability and availability
- **Petabyte-scale** with automatic scaling
- **POSIX-compliant**

### Performance Modes

**General Purpose** (default):
- Lowest latency
- Max 7,000 file operations per second

**Max I/O**:
- Higher latency
- Virtually unlimited file operations
- For highly parallel workloads

### Throughput Modes

**Bursting** (default):
- Scales with file system size
- 50 MB/s per TB of storage
- Burst to 100 MB/s

**Provisioned**:
- Specify throughput independent of storage size
- Pay for throughput provisioned

**Elastic** (recommended):
- Automatically scales up/down based on workload
- Pay for throughput used

### Storage Classes

**Standard**: Frequently accessed files
**Infrequent Access (IA)**: Lower-cost for infrequently accessed files

**Lifecycle Management**: Automatically move files to IA after N days (7, 14, 30, 60, 90 days)

> 📚 [Amazon EFS](https://docs.aws.amazon.com/efs/latest/ug/)

## Amazon FSx Family

### FSx for Windows File Server

- **Fully managed Windows** file servers
- **SMB protocol** support
- **Active Directory** integration
- **DFS namespaces** support
- **SSD and HDD** storage options
- **Automatic backups** and snapshots
- **Use Case**: Windows-based applications, SQL Server, SharePoint

### FSx for Lustre

- **High-performance** parallel file system
- **Hundreds of GB/s** throughput
- **Millions of IOPS**
- **S3 integration**: Data repository associations
- **Use Case**: HPC, machine learning, media processing

**Deployment Types**:
- **Scratch**: Temporary, no replication (cheaper)
- **Persistent**: Replicated within AZ (durable)

### FSx for NetApp ONTAP

- **NetApp's ONTAP** file system on AWS
- **Multi-protocol**: NFS, SMB, iSCSI
- **Snapshots, replication, cloning**
- **Storage efficiency**: Deduplication, compression
- **Use Case**: Enterprise applications, databases

### FSx for OpenZFS

- **Linux-based** file system
- **Up to 1 million IOPS**
- **Point-in-time snapshots**
- **Use Case**: Linux-based workloads, databases

## AWS Storage Gateway

### File Gateway

- **Presents S3 as NFS/SMB** file shares
- **Local caching** for low-latency access
- **All data stored in S3**
- **Use Case**: File-based workloads, backup, disaster recovery

### Volume Gateway

**Cached Mode**:
- Primary data in S3
- Frequently accessed data cached locally
- Presents iSCSI block storage

**Stored Mode**:
- Primary data stored locally
- Async backup to S3 as snapshots
- Complete dataset on-premises

### Tape Gateway

- **Virtual Tape Library (VTL)**
- **Backup to S3 and Glacier**
- **Works with existing backup software** (Veeam, Veritas, etc.)
- **Use Case**: Tape backup replacement

> 📚 [AWS Storage Gateway](https://docs.aws.amazon.com/storagegateway/)

## AWS DataSync

- **Fast data transfer** service
- **10x faster** than open-source tools
- **Automated and scheduled** transfers
- **Supports**:
  - On-premises to AWS (NFS, SMB)
  - AWS to AWS (S3, EFS, FSx)
  - Between AWS services

**Use Cases**:
- Data migration
- Data replication for DR
- Archive cold data
- ETL processing

## S3 Cross-Region Replication (CRR)

- **Replicate objects** across AWS regions
- **Versioning required** on both source and destination
- **Replication** can be:
  - All objects or filtered by prefix/tags
  - Different storage class
  - Different ownership (cross-account)

**S3 Replication Time Control (RTC)**:
- 99.99% of objects replicated within 15 minutes
- SLA-backed replication time

**S3 Batch Replication**:
- Replicate existing objects (backfill)
- CRR only replicates new objects by default

## Exam Tips

1. **gp3 vs gp2**: gp3 is 20% cheaper and better performance
2. **S3 Intelligent-Tiering**: No retrieval fees, best for unknown patterns
3. **EFS vs FSx for Windows**: EFS for Linux/NFS, FSx for Windows/SMB
4. **FSx for Lustre**: HPC and ML workloads, S3 integration
5. **Storage Gateway File vs Volume**: File for NFS/SMB, Volume for iSCSI block
6. **io2**: 99.999% durability for mission-critical databases
7. **S3 lifecycle minimum durations**: Standard-IA 30 days, Glacier 90 days, Deep Archive 180 days
8. **Multipart upload**: Required >5 GB, recommended >100 MB
9. **S3 Transfer Acceleration**: Uses CloudFront edges for faster uploads
10. **DataSync**: Automated, scheduled data transfer (10x faster than open source)

## Common Scenarios

**"Unknown access patterns for S3 data"** → S3 Intelligent-Tiering

**"Sub-millisecond latency, high IOPS database"** → EBS io2

**"Windows file shares with AD integration"** → FSx for Windows File Server

**"HPC workload processing S3 data"** → FSx for Lustre

**"Sequential log processing, cost-optimized"** → EBS st1

**"Multi-AZ shared file system for Linux"** → Amazon EFS

**"On-premises file share backed by S3"** → Storage Gateway File Gateway

**"Fast data migration to AWS"** → AWS DataSync

> 📚 [AWS Storage Services Overview](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/storage-services.html)
