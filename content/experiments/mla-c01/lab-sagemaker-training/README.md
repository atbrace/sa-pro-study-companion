# SageMaker Model Training Lab

## Overview

This lab covers SageMaker training job configuration, built-in algorithms, and cost optimization with spot instances. You'll train ML models at scale and understand the training infrastructure essential for the MLA-C01 exam.

**Difficulty:** Intermediate
**Estimated Time:** 60-90 minutes
**Estimated Cost:** ~$0.05/hour (infrastructure) + training instance costs

## Learning Objectives

By completing this lab, you will:

1. Configure SageMaker training jobs
2. Use built-in algorithms (XGBoost, Linear Learner)
3. Set up input channels and hyperparameters
4. Enable spot training for cost savings
5. Monitor training with CloudWatch metrics
6. Retrieve and analyze model artifacts

## Architecture

```
+------------------+     +------------------+
|  Training Data   |     |  Validation Data |
|  (S3 train/)     |     |  (S3 validation/)|
+--------+---------+     +--------+---------+
         |                        |
         +------------------------+
                    |
                    v
         +-------------------+
         |  Training Job     |
         |  +-------------+  |
         |  | Algorithm   |  |
         |  | Container   |  |
         |  +-------------+  |
         |  | ml.m5.large |  |
         |  +-------------+  |
         +--------+----------+
                  |
                  v
         +------------------+
         |  Model Artifacts |
         |  (S3 models/)    |
         +------------------+
```

## Prerequisites

- AWS Account with SageMaker access
- Sample training data in CSV format
- Lab S3 bucket deployed

## Cost Breakdown

| Resource | Cost (approx.) |
|----------|---------------|
| ml.m5.large (On-demand) | $0.115/hour |
| ml.m5.large (Spot) | ~$0.035/hour (70% savings) |
| S3 Storage | ~$0.023/GB/month |
| NAT Gateway | $0.045/hour |
| **Total (Spot)** | **~$0.08/hour** |

## Deployment

```bash
pnpm cdk:deploy lab-sagemaker-training
```

## Lab Exercises

### Exercise 1: Prepare Training Data

**Objective:** Upload data to S3

```bash
# Upload training data
aws s3 cp train.csv s3://your-bucket/data/train/
aws s3 cp validation.csv s3://your-bucket/data/validation/
```

### Exercise 2: Train with XGBoost

**Objective:** Run a training job with built-in XGBoost

```python
import sagemaker
from sagemaker.xgboost import XGBoost

session = sagemaker.Session()
role = "your-execution-role-arn"
bucket = "your-bucket"

# Configure estimator
xgb = XGBoost(
    entry_point="train.py",  # Optional custom script
    role=role,
    instance_count=1,
    instance_type="ml.m5.large",
    framework_version="1.5-1",
    hyperparameters={
        "objective": "binary:logistic",
        "num_round": 100,
        "max_depth": 5,
        "eta": 0.2,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
    },
)

# Start training
xgb.fit({
    "train": f"s3://{bucket}/data/train/",
    "validation": f"s3://{bucket}/data/validation/",
})
```

### Exercise 3: Enable Spot Training

**Objective:** Reduce costs with managed spot instances

```python
xgb_spot = XGBoost(
    role=role,
    instance_count=1,
    instance_type="ml.m5.large",
    framework_version="1.5-1",
    # Spot configuration
    use_spot_instances=True,
    max_wait=7200,  # Max 2 hours including interruptions
    max_run=3600,   # Max 1 hour of actual training
    checkpoint_s3_uri=f"s3://{bucket}/checkpoints/",
)
```

### Exercise 4: Monitor Training Metrics

**Objective:** Track training progress

1. Open CloudWatch Console
2. Navigate to Metrics > AWS/SageMaker
3. View training metrics:
   - `train:error`
   - `validation:error`
   - `train:auc`

Or programmatically:
```python
# Get training job metrics
from sagemaker.analytics import TrainingJobAnalytics

analytics = TrainingJobAnalytics(
    training_job_name=xgb.latest_training_job.name
)
metrics_df = analytics.dataframe()
print(metrics_df)
```

### Exercise 5: Distributed Training

**Objective:** Scale training across multiple instances

```python
xgb_distributed = XGBoost(
    role=role,
    instance_count=4,  # Multiple instances
    instance_type="ml.m5.xlarge",
    framework_version="1.5-1",
    hyperparameters={
        "objective": "binary:logistic",
        "num_round": 100,
        "tree_method": "approx",  # Required for distributed
    },
    distribution={"type": "smdistributed"},
)
```

### Exercise 6: Retrieve Model Artifacts

**Objective:** Access trained model

```python
# Get model location
model_path = xgb.model_data
print(f"Model artifacts: {model_path}")

# Download model
import boto3
s3 = boto3.client('s3')
s3.download_file(
    bucket,
    model_path.replace(f"s3://{bucket}/", ""),
    "model.tar.gz"
)
```

## Validation

- [ ] What's the difference between entry_point and image_uri?
- [ ] When should you use spot vs on-demand instances?
- [ ] How does SageMaker handle spot interruptions?
- [ ] What hyperparameters are most important for XGBoost?

## Cleanup

```bash
pnpm cdk:destroy lab-sagemaker-training
```

## Related Exam Topics

- **Domain 2:** ML Model Development
- **Task 2.2:** Train and refine models

## Learn More

- [Train Models with SageMaker](https://docs.aws.amazon.com/sagemaker/latest/dg/train-model.html)
- [SageMaker Built-in Algorithms](https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html)
- [Managed Spot Training](https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html)

---

**Lab ID:** lab-sagemaker-training
**Version:** 1.0.0
**Last Updated:** 2026-01-14
