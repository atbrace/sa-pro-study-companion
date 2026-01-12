---
title: Data Ingestion and Storage Strategies
lastUpdated: 2026-01-11
---

# Data Ingestion and Storage Strategies

Data ingestion and storage form the foundation of every machine learning pipeline on AWS. The MLA-C01 exam tests your ability to design cost-effective, performant data ingestion architectures that support both real-time and batch ML workloads, select optimal storage formats and partitioning strategies, and integrate seamlessly with SageMaker training pipelines. This topic covers streaming ingestion with Amazon Kinesis, batch processing with AWS Glue, storage optimization on Amazon S3, metadata management with AWS Glue Data Catalog, and feature engineering workflows using SageMaker Feature Store.

## Amazon S3 as the Foundation for ML Data Lakes

Amazon S3 serves as the primary storage layer for ML data lakes on AWS, offering unlimited scalability, 99.999999999% durability, and seamless integration with all AWS ML services. For machine learning workloads, S3 provides the flexibility to store raw data, intermediate processed datasets, training artifacts, and model outputs in a single, unified storage layer.

### S3 Storage Classes for ML Workloads

Choose storage classes based on data access patterns and cost optimization requirements:

- **S3 Standard**: Frequent access data including active training datasets, feature stores, and data being actively processed. Optimized for low-latency, high-throughput access required during model training.

- **S3 Intelligent-Tiering**: Automatically moves objects between frequent and infrequent access tiers based on changing access patterns. Ideal for training datasets with unpredictable access patterns - intensive use during training periods, idle at other times. After 30 days of no access, objects move to Infrequent Access tier (40% cost savings), and after 90 days to Archive Instant Access tier (68% cost savings). No retrieval fees and millisecond access when needed.

- **S3 Standard-IA (Infrequent Access)**: Historical datasets, validation sets, and archived model artifacts accessed less than once per month. Lower storage cost but retrieval charges apply.

- **S3 Glacier Instant Retrieval**: Long-term backup of training data, regulatory compliance archives, and datasets for reproducibility. Millisecond retrieval when needed, 68% lower cost than S3 Standard.

**Cost Optimization Strategy**: Implement S3 Lifecycle policies to automatically transition training data from S3 Standard to Intelligent-Tiering after upload, ensuring optimal cost without manual management. For example, transition raw ingestion data to Intelligent-Tiering after 0 days, allowing AWS to optimize based on actual usage patterns.

### Data Lake Architecture Patterns

Structure S3-based data lakes in layers to optimize for different access patterns and data quality stages:

**Three-Layer Architecture**:

1. **Raw/Bronze Layer** (Landing Zone):
   - Store data exactly as ingested from sources
   - Preserve original formats and schemas
   - Immutable storage for data lineage and reproducibility
   - Partition by ingestion date: `s3://bucket/raw/source-name/year=2026/month=01/day=11/`
   - Use separate S3 buckets per layer for security and lifecycle management

2. **Processed/Silver Layer** (Transformation Zone):
   - Cleaned, validated, and transformed data
   - Standardized schemas and data types
   - Converted to optimized formats (Parquet, ORC)
   - Partition by business dimensions: `s3://bucket/processed/dataset/region=us-east-1/date=2026-01-11/`
   - Apply quality checks and data validation

3. **Curated/Gold Layer** (Analytics Zone):
   - Feature-engineered datasets ready for ML training
   - Aggregated, joined, and business-logic-enriched data
   - Highly optimized for query performance
   - Partition aligned with model training patterns
   - Register in AWS Glue Data Catalog for discoverability

This layered approach enables different teams to consume data at appropriate quality levels, supports iterative refinement, and maintains data lineage for ML reproducibility.

### S3 Partitioning Strategies for ML Performance

Effective partitioning dramatically improves query performance, reduces costs by limiting data scanned, and accelerates feature engineering pipelines. Design partitioning schemes based on common query patterns in your ML workflows.

**Time-Based Partitioning**:
```
s3://ml-data-lake/features/customer-behavior/
  year=2026/
    month=01/
      day=11/
        hour=14/
          part-00000.parquet
```

Benefits for ML workloads:
- Training on recent data: Query only last 30/90 days instead of years of history
- Incremental feature computation: Process only new partitions since last run
- Time-travel queries: Access point-in-time snapshots for reproducibility

**Multi-Dimensional Partitioning**:
```
s3://ml-data-lake/features/product-recommendations/
  region=us-east-1/
    customer_segment=premium/
      date=2026-01-11/
        features.parquet
```

Use when models are trained per region, customer segment, or product category. Reduces data scanned for segment-specific model training by 90%+ compared to full-table scans.

**Partitioning Best Practices**:
- Avoid over-partitioning: Too many small partitions (< 100 MB) creates overhead. Aim for 128 MB - 1 GB partition sizes.
- Partition on high-cardinality dimensions that appear in WHERE clauses during feature queries
- Use columnar formats (Parquet, ORC) within partitions for additional column-level pruning
- Implement partition indexes in AWS Glue Data Catalog as datasets grow to 1000+ partitions
- Balance partition size with query patterns: hourly for real-time features, daily for batch training

**AWS Documentation**:
- [S3 Intelligent-Tiering Overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html)
- [Data Lake Foundation on S3](https://docs.aws.amazon.com/whitepapers/latest/building-data-lakes/data-lake-foundation.html)

## Data Formats for Machine Learning

Choosing the right data format significantly impacts training performance, storage costs, and data processing speed. The MLA-C01 exam emphasizes understanding trade-offs between different formats and selecting optimal formats for specific ML scenarios.

### Columnar Formats: Parquet and ORC

**Apache Parquet** is the preferred format for ML workloads on AWS due to superior compression, column pruning, and AWS service integration.

**Key Characteristics**:
- Columnar storage: Organizes data by column rather than row, enabling reading only required features
- Predicate pushdown: Query engines (Athena, EMR, SageMaker) skip irrelevant data blocks based on statistics
- Compression: Typically 70-90% smaller than CSV/JSON using Snappy or GZIP codecs
- Schema evolution: Add, remove, or rename columns without rewriting existing data
- Splittable: Enables parallel processing across multiple Spark/EMR executors

**Performance Impact**:
- Training data load time: 5-10x faster than CSV due to column pruning and compression
- Storage cost reduction: 75-85% reduction compared to uncompressed CSV
- Query cost in Athena: 70-90% reduction in data scanned = proportional cost savings

**Apache ORC (Optimized Row Columnar)** offers similar benefits with slightly better compression on integer-heavy datasets. Use ORC when working with Hive-based systems or when maximum compression is priority.

**When to Use Parquet/ORC**:
- Training datasets with 10+ features where models only use subsets
- Historical data archives for long-term storage cost optimization
- Datasets queried by SageMaker Data Wrangler, Athena, or EMR Spark
- Feature stores with columnar access patterns

### Row-Oriented Formats: CSV, JSON, Avro

**CSV (Comma-Separated Values)**:
- Simple, human-readable, universally compatible
- No schema enforcement: prone to data type inconsistencies
- Poor compression and no column pruning
- Use only for: Small datasets (< 1 GB), initial data exploration, external system integrations requiring CSV

**JSON (JavaScript Object Notation)**:
- Semi-structured data with nested objects and arrays
- Self-describing with embedded schema
- Text-based: larger file sizes than binary formats
- Use for: IoT sensor data with variable schemas, API responses, event logs with nested structures

**Avro**:
- Row-oriented binary format with embedded schema
- Excellent for streaming data pipelines (Kafka, Kinesis)
- Schema evolution support with reader/writer schema compatibility
- Smaller than JSON, larger than Parquet for analytical workloads
- Use for: Data serialization in streaming pipelines, Kafka topic storage, schema registry integrations

### RecordIO-Protobuf Format for SageMaker

**RecordIO-Protobuf** is a SageMaker-optimized format combining RecordIO containerization with Protocol Buffer serialization. This format is specifically designed for high-performance training with SageMaker built-in algorithms.

**Format Structure**:
- Each record starts with 4-byte integer indicating record size
- Followed by Protobuf-encoded message containing features and labels
- Features encoded as 32-bit float arrays in Protobuf values field
- Optimized for sequential read patterns during training

**Benefits**:
- Best performance with Pipe Mode streaming (see next section)
- Minimal deserialization overhead during training
- Compact binary representation reduces I/O bottleneck
- Native format for built-in algorithms: XGBoost, Linear Learner, Factorization Machines

**Conversion Process**:
Use SageMaker Python SDK to convert NumPy arrays or Pandas DataFrames:

```python
import sagemaker
from sagemaker.amazon.common import write_numpy_to_dense_tensor

# Convert NumPy arrays to RecordIO-Protobuf
write_numpy_to_dense_tensor(
    file=f's3://bucket/train.protobuf',
    array=X_train,
    labels=y_train
)
```

**When to Use RecordIO-Protobuf**:
- Training with SageMaker built-in algorithms (Linear Learner, XGBoost, FM)
- Using Pipe Mode for datasets > 10 GB
- Maximizing training throughput on large-scale datasets (100+ GB)
- Not human-readable: convert only after data validation and feature engineering complete

**Format Selection Decision Matrix**:

| Scenario | Recommended Format | Rationale |
|----------|-------------------|-----------|
| Feature store for training | Parquet | Column pruning, compression, Athena-compatible |
| Streaming ingestion with Kinesis | JSON or Avro | Schema flexibility, streaming-friendly |
| SageMaker built-in algorithm training | RecordIO-Protobuf | Optimal Pipe Mode performance |
| Custom algorithm training | Parquet or CSV | Flexibility, library support |
| Long-term archival | Parquet with GZIP | Maximum compression, future-proof |
| Data lake raw layer | Original format | Preserve source fidelity |
| Data sharing with external teams | Parquet or CSV | Compatibility, tooling support |

**AWS Documentation**:
- [Common Data Formats for SageMaker Training](https://docs.aws.amazon.com/sagemaker/latest/dg/cdf-training.html)
- [AWS Glue Data Format Options](https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-format.html)

## SageMaker Training Data Access: Pipe Mode vs File Mode

How training data is transferred from S3 to SageMaker training instances significantly impacts training start time, instance utilization, and overall cost. Understanding the trade-offs between Pipe Mode and File Mode is critical for the MLA-C01 exam.

### File Mode (Traditional Approach)

**Mechanism**:
1. Before training starts, SageMaker downloads entire dataset from S3
2. Data written to encrypted EBS volume attached to training instance
3. Training begins only after complete download
4. Algorithm reads data from local EBS volume during training

**Characteristics**:
- Download time: Proportional to dataset size (10 GB ≈ 2-5 minutes with good network)
- Storage requirement: EBS volume must accommodate full dataset + OS + Docker image
- Random access: Training code can seek to any record at any time
- Training start delay: Noticeable on large datasets (100 GB+ can take 10-30 minutes)

**When to Use File Mode**:
- Small to medium datasets (< 10 GB) where download time is negligible
- Algorithms requiring random access to training data (e.g., some custom implementations)
- Iterating quickly during development when dataset fits in memory
- Training jobs with multiple epochs reading entire dataset repeatedly from cache

**Cost Implications**:
- EBS volume costs: Charged per GB-hour for volume size (must exceed dataset size)
- Longer billable training time: Includes data download period
- Potential for larger instance storage, increasing hourly instance cost

### Pipe Mode (Streaming Approach)

**Mechanism**:
1. SageMaker streams data directly from S3 to training container via named pipes
2. Data arrives in small chunks (typically 128 KB - 1 MB) as needed by algorithm
3. Training starts immediately without waiting for full download
4. Only small buffer kept in memory; data discarded after processing

**Characteristics**:
- Training start time: Seconds instead of minutes/hours
- Storage requirement: Minimal EBS volume (5 GB typical)
- Streaming reads: Algorithm must process data sequentially
- Memory efficiency: Only active mini-batch in memory

**Performance Benefits**:
- Faster training start: Up to 40% reduction in total training time for large datasets
- Reduced instance cost: Smaller EBS volumes and shorter training duration
- Scalability: Supports arbitrarily large datasets without storage constraints
- Best with: RecordIO-Protobuf format for optimal streaming performance

**Supported Formats**:
- RecordIO-Protobuf (best performance)
- CSV
- Augmented Manifest (for object detection, image classification)
- TFRecord (TensorFlow)

**When to Use Pipe Mode**:
- Large datasets (> 10 GB) where download time impacts cost
- Training with SageMaker built-in algorithms optimized for streaming
- Cost-sensitive training jobs where minimizing billable time matters
- Datasets too large for available EBS storage

**Limitations**:
- Sequential access only: Cannot randomly seek to arbitrary records
- Custom algorithm support: Requires specific implementation to read from named pipes
- Debugging complexity: Cannot inspect full dataset on instance during training

**FastFile Mode** (Hybrid Approach):
- AWS-managed caching layer between Pipe Mode and File Mode
- Streams data like Pipe Mode but caches accessed portions
- Enables limited random access with streaming benefits
- Useful for algorithms needing occasional random seeks

**Decision Framework**:

| Dataset Size | Access Pattern | Recommended Mode | Justification |
|--------------|----------------|------------------|---------------|
| < 5 GB | Random or sequential | File Mode | Download overhead negligible |
| 5-50 GB | Sequential | Pipe Mode | Faster start, cost savings |
| 50+ GB | Sequential | Pipe Mode with RecordIO | Maximum performance |
| Any size | Random access required | File Mode or FastFile | Algorithm constraint |
| Multiple epochs | Sequential, repeated passes | FastFile Mode | Caching benefits repeated access |

**AWS Documentation**:
- [Using Pipe Mode for SageMaker Algorithms](https://aws.amazon.com/blogs/machine-learning/using-pipe-input-mode-for-amazon-sagemaker-algorithms/)
- [Setting Up Training Jobs to Access Datasets](https://docs.aws.amazon.com/sagemaker/latest/dg/model-access-training-data.html)

## Amazon Kinesis for Real-Time Data Ingestion

Amazon Kinesis enables real-time ingestion, processing, and delivery of streaming data for ML workloads requiring low-latency feature updates, real-time predictions, or continuous model training. The MLA-C01 exam tests understanding of Kinesis service selection, capacity planning, and integration with ML pipelines.

### Kinesis Data Streams: Core Streaming Service

**Architecture**:
- Managed service for real-time data streaming at scale
- Data organized into shards (parallelization units)
- Producers write records to streams; consumers read and process
- Records ordered within each shard, retained 24 hours to 365 days

**Shard Capacity and Throughput Limits**:
Each shard provides:
- **Write capacity**: 1 MB/second or 1,000 records/second (whichever reached first)
- **Read capacity**: 2 MB/second or 5 read transactions/second per consumer
- **Enhanced Fan-Out**: Dedicated 2 MB/second read throughput per consumer (eliminates sharing)

**Capacity Planning Formula**:
```
Required shards = max(
  (Expected write MB/sec) / 1,
  (Expected write records/sec) / 1000
)
```

Example: 5 MB/sec write rate with 2,000 records/sec = max(5/1, 2000/1000) = 5 shards

**Provisioned vs On-Demand Modes**:

**Provisioned Mode**:
- Manually specify shard count
- Predictable hourly cost per shard
- Best for: Consistent traffic patterns, cost optimization through forecasting
- Scaling: Requires UpdateShardCount API call (not instant)

**On-Demand Mode**:
- Automatic capacity management based on traffic
- Pay-per-GB ingested and retrieved
- Two sub-modes: Standard (default), Advantage (new in 2026)
- Best for: Unpredictable traffic, spiky workloads, 10+ MiB/sec aggregate throughput

**On-Demand Advantage** (2026 enhancement):
- Warm throughput capability: Instantly available capacity up to 10 GiB/sec
- 60% lower cost than On-Demand Standard
- No per-stream charges; unified pricing across all streams
- Ideal for: High-throughput ML feature ingestion, multi-stream architectures

**ML Use Cases**:
- Ingest clickstream data for real-time recommendation models
- Stream IoT sensor data for anomaly detection
- Capture application logs for fraud detection feature extraction
- Continuous data feed to SageMaker Feature Store online store

**Integration with ML Services**:
- **AWS Lambda**: Process records, feature transformation, invoke SageMaker endpoints for real-time inference
- **Amazon Managed Service for Apache Flink**: Complex event processing, windowed aggregations, stateful computations
- **AWS Glue Streaming**: ETL transformations on streaming data, write to S3 data lake
- **SageMaker Feature Store**: PutRecord API for online feature updates from Kinesis consumers

**Data Retention and Cost**:
- Default: 24 hours retention included in shard cost
- Extended retention: Up to 365 days at additional GB-month cost
- First 7 days: Higher rate; beyond 7 days: Lower long-term rate
- Balance retention with cost: Archive to S3 via Firehose for training datasets

### Kinesis Data Firehose: Managed Data Delivery

**Purpose**: Simplest way to load streaming data into AWS storage and analytics services without writing custom consumers. Recently renamed from Kinesis Data Firehose to **Amazon Data Firehose** (exam may use either name).

**Capabilities**:
- Near real-time delivery (60-900 seconds latency, configurable)
- Automatic scaling with no capacity management
- Built-in data transformation via Lambda
- Compression, encryption, and format conversion
- Integrated with 20+ AWS services as sources

**Destinations for ML Workloads**:
- **Amazon S3**: Raw data archival, data lake ingestion, training dataset accumulation
- **Amazon Redshift**: Data warehousing for feature aggregation (via S3 intermediate copy)
- **Amazon OpenSearch**: Real-time log analytics, feature monitoring
- **HTTP endpoints**: Custom destinations, third-party ML platforms

**Data Transformation**:
Configure Lambda function to transform records before delivery:
- JSON to Parquet/ORC conversion for S3 data lake
- Data enrichment: Join with reference data, add metadata
- Filtering: Drop unnecessary fields, reduce storage costs
- Format standardization: Normalize schemas across sources

**Buffering Configuration**:
Balance between delivery latency and cost optimization:
- Buffer size: 1-128 MB (larger = fewer S3 PUT requests = lower cost)
- Buffer interval: 60-900 seconds (shorter = faster data availability)
- Delivery triggered when either threshold reached first

**ML Pipeline Pattern**:
```
Data Sources → Kinesis Data Streams → Firehose → S3 Data Lake → Glue Crawler → Glue Job → SageMaker Training
```

Use Data Streams for real-time processing and Firehose for S3 persistence in parallel:
- Lambda consumer on Data Streams: Real-time feature updates to Feature Store online store
- Firehose destination to S3: Batch accumulation for periodic model retraining

**Cost Optimization**:
- Charged per GB ingested (different rates for format conversion, VPC delivery)
- Enable compression (GZIP, Snappy, Zip) to reduce S3 storage costs downstream
- Use efficient formats: JSON to Parquet conversion saves 70-80% storage costs
- No charge for data delivery; only ingestion volume

**Kinesis Data Streams vs Firehose Decision Matrix**:

| Requirement | Data Streams | Data Firehose |
|-------------|--------------|---------------|
| Real-time processing (< 1 sec latency) | Yes | No (60+ sec minimum) |
| Custom consumer logic | Yes | Limited (Lambda only) |
| Multiple concurrent consumers | Yes | No (one destination) |
| Managed delivery to S3/Redshift | Manual | Automatic |
| Capacity management | Required | Automatic |
| Data retention for replay | Yes (up to 365 days) | No |
| Cost model | Per shard-hour | Per GB ingested |
| Use case | Real-time ML inference, complex processing | Simple S3 data lake loading |

**AWS Documentation**:
- [Amazon Kinesis Data Streams Quotas and Limits](https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html)
- [Amazon Kinesis Data Streams Pricing](https://aws.amazon.com/kinesis/data-streams/pricing/)
- [Amazon Data Firehose Streaming Data Pipeline](https://aws.amazon.com/firehose/)

## AWS Glue for Batch Data Ingestion and ETL

AWS Glue provides serverless data integration services for discovering, cataloging, and transforming data at scale. For ML workloads, Glue automates schema discovery, enables efficient ETL transformations, and maintains metadata required for feature engineering pipelines.

### AWS Glue Data Catalog

The Data Catalog serves as the central metadata repository for all data assets in your ML data lake. It stores table definitions, schemas, partitions, and data locations, enabling consistent metadata across AWS analytics and ML services.

**Components**:
- **Databases**: Logical grouping of tables (e.g., "ml-features-prod", "raw-data-lake")
- **Tables**: Metadata definitions including schema, location, format, partition keys
- **Partitions**: Individual partition metadata with location and statistics
- **Crawlers**: Automated schema discovery jobs that populate catalog

**Integration with ML Services**:
- **Amazon Athena**: Queries catalog tables for interactive feature exploration
- **Amazon EMR**: Reads catalog as Hive metastore for Spark jobs
- **AWS Glue ETL**: References catalog tables in transformation jobs
- **SageMaker Data Wrangler**: Imports data from catalog tables
- **Amazon Redshift Spectrum**: Queries S3 data lake via catalog definitions

**Benefits for ML Workflows**:
- Schema discoverability: Data scientists find features without manual schema documentation
- Schema evolution tracking: Historical schema versions support model reproducibility
- Unified metadata: Single source of truth across data lake layers (raw, processed, curated)
- Partition pruning: Catalog statistics enable efficient query planning

### Glue Crawlers: Automated Schema Discovery

Crawlers automatically infer schemas, detect partitions, and update catalog tables by scanning data in S3, databases, or other sources.

**How Crawlers Work**:
1. Connect to data store (e.g., S3 prefix)
2. Progress through prioritized list of built-in classifiers to determine format
3. Infer schema by sampling data files
4. Detect partitions based on S3 key structure
5. Create or update catalog tables with metadata

**Built-in Classifiers**:
- JSON, CSV, Parquet, ORC, Avro, XML, ION
- Automatically detect format without configuration
- Custom classifiers: Define Grok patterns or XML tags for proprietary formats

**Partition Detection**:
Crawlers recognize partition keys from S3 prefixes:
```
s3://bucket/features/region=us-east-1/date=2026-01-11/data.parquet
→ Creates table with partition keys: region (string), date (string)
```

**Crawler Scheduling**:
- On-demand: Run manually via console/API
- Scheduled: Cron expressions for periodic runs (daily, hourly)
- Event-driven: Trigger via EventBridge when new S3 objects arrive

**Best Practices for ML Data Lakes**:
- Run crawlers after each batch data ingestion (e.g., daily at 2 AM after overnight ETL)
- Use separate crawlers per data lake layer (raw, processed, curated) to isolate schemas
- Configure partition limits: Default 1 million partitions per table; increase if needed
- Enable column statistics computation for query optimization (Parquet, ORC, CSV supported)
- Group compatible tables: Crawlers can create multiple tables from subfolders with different schemas

**Cost Considerations**:
- Charged per DPU-hour (Data Processing Unit)
- First million objects per month: $1 per 100,000 objects
- Schema updates: Lower cost if schema unchanged
- Optimize: Crawl only new partitions instead of rescanning all data

### Glue ETL Jobs for Data Transformation

Glue ETL provides serverless Apache Spark and Python environments for transforming data at scale, essential for preparing raw data into ML-ready features.

**Job Types**:
- **Glue Spark**: PySpark or Scala for large-scale distributed transformations (TB-scale datasets)
- **Glue Python Shell**: Pure Python for lightweight transformations, API calls, orchestration
- **Glue Streaming**: Continuous processing from Kinesis or Kafka

**Common ML Transformations**:
- **Format conversion**: JSON/CSV to Parquet for training data optimization
- **Schema normalization**: Standardize column names, data types across sources
- **Deduplication**: Remove duplicate records based on business keys
- **Joins**: Combine multiple feature datasets into unified training tables
- **Aggregations**: Compute time-windowed features (e.g., 7-day rolling averages)
- **Partitioning**: Repartition data by model training dimensions (region, date)

**Dynamic Frames vs Spark DataFrames**:
- **Dynamic Frames**: Glue-specific abstraction handling schema inconsistencies
- Schema flexibility: Mixed types in columns, missing fields handled gracefully
- Automatic type resolution: ResolveChoice transformation applies casting rules
- Use for: Heterogeneous data sources, evolving schemas, semi-structured data

- **Spark DataFrames**: Standard PySpark API for structured transformations
- Better performance for homogeneous data with consistent schemas
- Use for: Parquet/ORC data lakes with stable schemas, complex Spark SQL queries

**Glue Job Configuration**:
- **DPU allocation**: Each DPU = 4 vCPU + 16 GB RAM + 64 GB disk
- Standard jobs: Minimum 2 DPUs, maximum 100 DPUs
- Auto-scaling: Dynamically adjust DPUs based on workload (enable for variable data volumes)
- Timeout: Set maximum runtime to prevent runaway costs on errors

**Integration with SageMaker Pipelines**:
Execute Glue jobs as pipeline steps using SageMaker Processing Jobs:
```python
from sagemaker.processing import ScriptProcessor
from sagemaker.workflow.steps import ProcessingStep

glue_processor = ScriptProcessor(
    role=role,
    image_uri='<glue-image>',
    instance_type='ml.m5.xlarge',
    instance_count=1
)

processing_step = ProcessingStep(
    name='GlueTransformFeatures',
    processor=glue_processor,
    code='glue_etl_script.py',
    outputs=[...]
)
```

**AWS Documentation**:
- [AWS Glue Data Catalog and Crawlers](https://docs.aws.amazon.com/glue/latest/dg/catalog-and-crawler.html)
- [Data Discovery and Cataloging in AWS Glue](https://docs.aws.amazon.com/glue/latest/dg/catalog-and-crawler.html)

## Amazon SageMaker Feature Store

SageMaker Feature Store provides a centralized repository for storing, managing, and serving ML features, solving the challenge of feature consistency across training and inference while reducing redundant feature engineering work.

### Feature Store Architecture

**Feature Groups**: Logical collections of features with a unified schema, similar to database tables. Each feature group contains:
- **Record identifier**: Unique key for each record (e.g., customer_id, transaction_id)
- **Event time**: Timestamp indicating when feature values were observed
- **Features**: Individual feature columns with defined data types

**Storage Backends**:

**Online Store**:
- Purpose: Low-latency feature retrieval for real-time inference
- Technology: Amazon DynamoDB with sub-millisecond reads
- Use case: Serving features to deployed SageMaker endpoints during prediction
- Data retention: Configurable; typically matches inference requirements
- Access pattern: Single-record retrieval by record identifier

**Offline Store**:
- Purpose: Historical feature storage for training and batch inference
- Technology: Apache Iceberg tables on S3 with Parquet format
- Use case: Training dataset creation, feature exploration, batch predictions
- Data retention: Long-term archival; supports time-travel queries
- Access pattern: Analytical queries with Athena, Spark, SageMaker

**Dual-Store Pattern**: Write to both stores simultaneously for features used in both training and inference, ensuring feature consistency and eliminating training-serving skew.

### Data Ingestion Methods

**Streaming Ingestion via PutRecord API**:
```python
import boto3

featurestore_runtime = boto3.client('sagemaker-featurestore-runtime')

record = [
    {'FeatureName': 'customer_id', 'ValueAsString': '12345'},
    {'FeatureName': 'total_purchases_30d', 'ValueAsString': '5'},
    {'FeatureName': 'avg_transaction_value', 'ValueAsString': '89.50'}
]

featurestore_runtime.put_record(
    FeatureGroupName='customer-features',
    Record=record
)
```

**Characteristics**:
- Synchronous API: Immediate write confirmation
- Supports small batches (up to 100 records per call)
- Maintains high feature freshness for real-time use cases
- Typical latency: Single-digit milliseconds

**Batch Ingestion via SageMaker Data Wrangler**:
1. Import data from S3, Athena, Redshift
2. Engineer features using visual transformations
3. Export directly to Feature Store (online or offline)
4. Generates reproducible Jupyter notebook for automation

**Batch Ingestion via Apache Spark**:
Use Amazon EMR with Feature Store Spark connector for large-scale batch ingestion:
```python
from sagemaker_feature_store_spark import FeatureStoreManager

feature_store_manager = FeatureStoreManager()

feature_store_manager.ingest_data(
    input_data_frame=spark_df,
    feature_group_name='customer-features',
    target_stores=['OfflineStore', 'OnlineStore']
)
```

**Integration with Kinesis**:
Common pattern for real-time feature updates:
```
Kinesis Data Streams → Lambda → Feature Store PutRecord → Online Store
                                                        ↓
                                                    Offline Store (S3)
```

Lambda processes Kinesis records, computes features, and writes to Feature Store for immediate availability in inference.

### Feature Discovery and Reuse

**Centralized Feature Catalog**:
- SageMaker Studio interface: Browse, search, and preview feature groups
- API access: List feature groups, describe schemas programmatically
- Feature lineage: Track data sources and transformations creating features
- Feature statistics: Automatically computed distributions, missing value rates

**Benefits for ML Teams**:
- Reduce redundant feature engineering: Discover existing features before rebuilding
- Ensure consistency: Same feature definition across models and teams
- Accelerate experimentation: Quickly assemble training datasets from feature store
- Maintain governance: Control access via IAM policies per feature group

**Training Dataset Creation**:
Query offline store using Athena or SageMaker SDK:
```python
from sagemaker.feature_store.feature_store import FeatureStore

feature_store = FeatureStore()

query = feature_store.create_dataset(
    base=feature_group,
    output_path='s3://bucket/training-datasets/run-123',
    record_identifier_value='12345',
    event_time_range=(start_time, end_time)
)

dataset = query.as_dataframe()
```

Automatically handles point-in-time correctness: Retrieves feature values as they existed at specified event times, essential for preventing data leakage in training.

**AWS Documentation**:
- [SageMaker Feature Store Data Ingestion](https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store-ingest-data.html)
- [Feature Store Overview](https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store.html)

## Data Ingestion Patterns for ML Workloads

Understanding architectural patterns for different data ingestion scenarios is critical for designing robust, cost-effective ML data pipelines.

### Batch Ingestion Pattern

**Scenario**: Daily ingestion of sales transactions from operational database to train recommendation models.

**Architecture**:
```
Source Database (RDS/Aurora)
  → AWS DMS (Database Migration Service)
  → S3 Landing Zone (Raw Layer)
  → Glue Crawler (Schema Discovery)
  → Glue ETL Job (Transform to Parquet, Add Features)
  → S3 Processed Zone
  → SageMaker Training Job
```

**Key Decisions**:
- DMS continuous replication vs scheduled snapshots: Continuous for CDC (change data capture), scheduled for full refreshes
- Compression: Enable Parquet with Snappy compression in Glue job (70% size reduction)
- Partitioning: By date to enable incremental feature recomputation
- Orchestration: AWS Step Functions or EventBridge schedule for daily workflow

**Cost Optimization**:
- Schedule Glue jobs during off-peak hours for lower spot instance pricing
- Use Glue auto-scaling to match DPUs to data volume
- Archive raw data to S3 Glacier after validation (90-day lifecycle policy)

### Streaming Ingestion Pattern

**Scenario**: Real-time clickstream data for fraud detection model requiring sub-second feature updates.

**Architecture**:
```
Web/Mobile Apps (Clickstream Events)
  → Kinesis Data Streams (Real-time Buffer)
  → Lambda Function (Feature Extraction)
  → SageMaker Feature Store Online Store (Real-time Serving)
  ↓
Kinesis Data Firehose
  → S3 Data Lake (Historical Archive)
  → Glue Crawler + Athena (Batch Analysis)
  → SageMaker Training (Model Retraining)
```

**Key Decisions**:
- Kinesis shard count: Capacity planning based on peak events/second
- Lambda concurrency: Set reserved concurrency to match shard count (avoid throttling)
- Feature computation: Lambda for lightweight transformations; Flink for complex aggregations
- Dual-path ingestion: Real-time to Feature Store + archival to S3 via Firehose

**Latency Considerations**:
- Kinesis to Lambda: < 500ms typical
- Lambda feature computation: < 100ms for simple transformations
- Feature Store PutRecord: < 20ms write latency
- End-to-end: Sub-second from event generation to feature availability

### Hybrid Pattern: Lambda Architecture

**Scenario**: Customer 360 features combining real-time activity with historical aggregations.

**Architecture**:
```
Batch Layer (Historical Aggregations):
  S3 Data Lake → Glue/EMR → Feature Store Offline Store

Speed Layer (Real-time Updates):
  Kinesis Streams → Lambda/Flink → Feature Store Online Store

Serving Layer:
  SageMaker Endpoint → Query both Online + Offline features
```

**Benefits**:
- Batch layer: Accurate, comprehensive historical features (e.g., lifetime customer value)
- Speed layer: Low-latency recent features (e.g., last 10 actions)
- Serving layer: Unified API accessing both, abstracts complexity from models

**Synchronization**:
- Periodic batch jobs backfill Online Store with updated historical features
- Online Store prioritizes recent writes over older batch data
- Feature versioning ensures consistency during transitions

**AWS Documentation**:
- [AWS Data Ingestion Patterns and Practices Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/aws-cloud-data-ingestion-patterns-practices/data-ingestion-patterns.html)
- [ML Best Practices for Public Sector: Data Ingestion](https://docs.aws.amazon.com/whitepapers/latest/ml-best-practices-public-sector-organizations/data-ingestion-and-preparation.html)

## MLA-C01 Exam Strategy

### High-Frequency Exam Topics

Based on the 28% Domain 1 weight and task-1-1 focus on ingestion and storage, expect questions covering:

1. **Data format selection**: Choosing Parquet vs CSV vs RecordIO based on scenario constraints (performance, cost, tooling)
2. **S3 partitioning trade-offs**: When to partition by time vs dimensions, avoiding over-partitioning
3. **Pipe Mode vs File Mode**: Identifying which mode suits given dataset size, algorithm requirements, cost constraints
4. **Kinesis capacity planning**: Calculating required shards given throughput requirements
5. **Glue Crawler configuration**: Understanding when to run crawlers, partition detection, schema evolution handling
6. **Feature Store dual-store usage**: Scenarios requiring Online Store, Offline Store, or both
7. **Ingestion pattern selection**: Batch vs streaming vs hybrid based on latency, cost, and data characteristics

### Common Distractors

Be alert for incorrect statements such as:
- "Use CSV for best training performance" (Incorrect: Parquet is superior for performance)
- "Kinesis Data Firehose supports millisecond latency" (Incorrect: Minimum 60 seconds)
- "File Mode is always more cost-effective" (Incorrect: Pipe Mode often reduces costs on large datasets)
- "Glue Data Catalog stores actual data" (Incorrect: Only metadata; data remains in S3)
- "Feature Store Online Store supports analytical queries" (Incorrect: Use Offline Store for analytics)

### Calculation Questions

Practice calculating:
- Kinesis shard requirements: Given MB/sec and records/sec, determine shard count
- S3 storage costs: Compare Standard vs Intelligent-Tiering for different access patterns
- Glue crawler costs: Estimate cost for crawling N objects

### Scenario-Based Questions

Expect multi-part scenarios testing your ability to:
- Design end-to-end ingestion pipeline given business requirements
- Troubleshoot performance bottlenecks (e.g., slow training start times → suggest Pipe Mode)
- Optimize costs by selecting appropriate storage classes, formats, and services
- Ensure feature consistency between training and inference using Feature Store

### Key Metrics to Remember

- **Kinesis shard limits**: 1 MB/sec write, 2 MB/sec read, 1,000 records/sec write
- **S3 Intelligent-Tiering transitions**: 30 days → Infrequent Access, 90 days → Archive Instant Access
- **Parquet compression**: Typically 70-90% smaller than CSV
- **Pipe Mode benefits**: Up to 40% faster training start times
- **Feature Store PutRecord latency**: Sub-20ms typical
- **Firehose minimum latency**: 60 seconds

### Study Recommendations

1. **Hands-on practice**: Create S3 data lake with Glue crawlers, ingest to Feature Store, train with Pipe Mode
2. **Read whitepapers**: AWS Data Ingestion Patterns, ML Best Practices guides
3. **Compare services**: Build comparison tables for Kinesis services, data formats, ingestion modes
4. **Cost analysis**: Use AWS Pricing Calculator to estimate costs for sample architectures
5. **Troubleshooting scenarios**: Practice diagnosing common issues (throttling, slow queries, schema mismatches)

Focus on understanding the "why" behind each design decision rather than memorizing facts - the MLA-C01 exam emphasizes practical application and trade-off analysis over rote knowledge.

**AWS Documentation**:
- [SageMaker Feature Store Overview](https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store.html)
- [AWS ML Best Practices Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/ml-best-practices-public-sector-organizations/data-ingestion-and-preparation.html)
- [Kinesis Data Streams FAQs](https://aws.amazon.com/kinesis/data-streams/faqs/)
