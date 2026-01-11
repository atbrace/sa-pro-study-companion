---
title: Domain 1 - Data Preparation for Machine Learning
lastUpdated: 2026-01-10
---

# Data Preparation for Machine Learning

This domain focuses on the foundational skills required to prepare data for machine learning workloads on AWS. You'll need to demonstrate expertise in data ingestion, transformation, feature engineering, and ensuring data quality and integrity.

## Exam Weight

This domain represents **28%** of the MLA-C01 exam, making it the most heavily weighted area. Strong data preparation skills are essential for building effective ML solutions.

## What You'll Learn

This domain tests your ability to:

1. **Ingest and store data** - Design data pipelines using S3, Kinesis, and understand various data formats (Parquet, JSON, CSV, ORC, Avro, RecordIO)
2. **Transform data** - Clean, normalize, and transform data using Glue, Glue DataBrew, and SageMaker Data Wrangler
3. **Perform feature engineering** - Apply encoding methods, scaling, binning, and create derived features for ML models
4. **Ensure data quality** - Validate data integrity using Glue Data Quality and identify bias using SageMaker Clarify
5. **Prepare training datasets** - Split, shuffle, and augment data for model training

## Key Services

Focus your study on these primary services:

- **Amazon SageMaker Data Wrangler** - Visual data preparation and feature engineering
- **Amazon SageMaker Feature Store** - Centralized feature repository for ML
- **Amazon SageMaker Clarify** - Bias detection and explainability
- **AWS Glue** - Serverless ETL and data catalog
- **AWS Glue DataBrew** - Visual data preparation without code
- **Amazon S3** - Primary data lake storage
- **Amazon Kinesis** - Real-time data streaming

## Study Approach

Follow this recommended approach to master this domain:

1. **Understand data formats** - Know when to use Parquet vs CSV vs RecordIO for different ML scenarios
2. **Master SageMaker Data Wrangler** - This is heavily tested; practice the visual interface
3. **Learn feature engineering techniques** - Normalization, scaling, encoding methods
4. **Practice with Glue** - Understand crawlers, jobs, and the data catalog
5. **Study bias detection** - Know how SageMaker Clarify identifies different bias types
6. **Hands-on labs** - Build actual data pipelines to understand practical implementation

## Exam Tips

Key areas that frequently appear on the exam:

- **Data formats** - Parquet for analytics, RecordIO for SageMaker training, protobuf for TensorFlow
- **Feature Store** - Online vs offline stores, feature groups, data freshness
- **Data Wrangler** - Transformations, data quality insights, export to pipelines
- **Bias metrics** - Class imbalance, difference in proportions, disparate impact
- **Glue vs Data Wrangler** - Know when to use each tool
- **Streaming data** - Kinesis Data Streams vs Firehose for ML ingestion

## Common Scenarios

The exam will test scenarios such as:

- "Prepare a dataset with missing values and categorical features for a SageMaker training job"
- "Design a real-time feature pipeline for fraud detection"
- "Identify and mitigate selection bias in a lending dataset"
- "Transform raw JSON logs into optimized Parquet format for ML training"
- "Create a feature store for sharing features across multiple ML models"
- "Set up data quality rules to validate incoming training data"
