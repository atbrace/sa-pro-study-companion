# SageMaker Model Monitor Lab

## Overview

This lab covers SageMaker Model Monitor for tracking model performance in production. You'll set up data quality, model quality, and drift monitoring to ensure ML systems remain reliable over time.

**Difficulty:** Advanced
**Estimated Time:** 75-90 minutes
**Estimated Cost:** ~$0.05/hour (infrastructure) + monitoring job costs

## Learning Objectives

By completing this lab, you will:

1. Create baseline statistics from training data
2. Set up data quality monitoring schedules
3. Configure model quality monitoring with ground truth
4. Analyze violation reports
5. Set up CloudWatch alarms for drift
6. Integrate monitoring with ML pipelines

## Architecture

```
+------------------+     +------------------+
|   Endpoint       |     |  Ground Truth    |
| (with Data       |     |  (Labels)        |
|  Capture)        |     |                  |
+--------+---------+     +--------+---------+
         |                        |
         v                        v
+------------------+     +------------------+
| Data Quality     |     | Model Quality    |
| Monitor          |     | Monitor          |
+--------+---------+     +--------+---------+
         |                        |
         v                        v
+------------------+     +------------------+
| Violation        |     | Accuracy Drift   |
| Reports (S3)     |     | Reports (S3)     |
+--------+---------+     +--------+---------+
         |                        |
         +------------------------+
                    |
                    v
         +------------------+
         | CloudWatch Alarms|
         | SNS Notifications|
         +------------------+
```

## Cost Breakdown

| Resource | Cost (approx.) |
|----------|---------------|
| Monitoring jobs | ~$0.12/hour per run |
| S3 Storage | ~$0.023/GB/month |
| CloudWatch Alarms | ~$0.10/alarm/month |
| SNS Notifications | Minimal |
| **Total** | **~$0.05/hour** |

## Deployment

```bash
pnpm cdk:deploy lab-model-monitor
```

## Lab Exercises

### Exercise 1: Enable Data Capture on Endpoint

**Objective:** Log inference requests

```python
from sagemaker.model_monitor import DataCaptureConfig

data_capture_config = DataCaptureConfig(
    enable_capture=True,
    sampling_percentage=100,
    destination_s3_uri=f"s3://{bucket}/data-capture/",
    capture_options=["Input", "Output"],
    csv_content_types=["text/csv"],
)

predictor = model.deploy(
    instance_type="ml.m5.large",
    initial_instance_count=1,
    data_capture_config=data_capture_config,
)
```

### Exercise 2: Create Data Quality Baseline

**Objective:** Generate baseline statistics

```python
from sagemaker.model_monitor import DefaultModelMonitor
from sagemaker.model_monitor.dataset_format import DatasetFormat

data_quality_monitor = DefaultModelMonitor(
    role=role,
    instance_count=1,
    instance_type="ml.m5.large",
    volume_size_in_gb=20,
    max_runtime_in_seconds=3600,
)

# Suggest baseline from training data
data_quality_monitor.suggest_baseline(
    baseline_dataset=f"s3://{bucket}/baseline/training_data.csv",
    dataset_format=DatasetFormat.csv(header=True),
    output_s3_uri=f"s3://{bucket}/baseline/data-quality/",
    wait=True,
)

# View generated statistics
print(data_quality_monitor.baseline_statistics())
print(data_quality_monitor.suggested_constraints())
```

### Exercise 3: Schedule Data Quality Monitoring

**Objective:** Set up continuous monitoring

```python
from sagemaker.model_monitor import CronExpressionGenerator

data_quality_monitor.create_monitoring_schedule(
    monitor_schedule_name="mla-study-data-quality-schedule",
    endpoint_input=predictor.endpoint_name,
    output_s3_uri=f"s3://{bucket}/monitoring/data-quality/",
    statistics=data_quality_monitor.baseline_statistics(),
    constraints=data_quality_monitor.suggested_constraints(),
    schedule_cron_expression=CronExpressionGenerator.hourly(),
)
```

### Exercise 4: Set Up Model Quality Monitoring

**Objective:** Track prediction accuracy

```python
from sagemaker.model_monitor import ModelQualityMonitor

model_quality_monitor = ModelQualityMonitor(
    role=role,
    instance_count=1,
    instance_type="ml.m5.large",
    problem_type="BinaryClassification",
)

# Create baseline with ground truth
model_quality_monitor.suggest_baseline(
    baseline_dataset=f"s3://{bucket}/baseline/labeled_data.csv",
    dataset_format=DatasetFormat.csv(header=True),
    output_s3_uri=f"s3://{bucket}/baseline/model-quality/",
    problem_type="BinaryClassification",
    inference_attribute="prediction",
    ground_truth_attribute="label",
    wait=True,
)

# Schedule monitoring
model_quality_monitor.create_monitoring_schedule(
    monitor_schedule_name="mla-study-model-quality-schedule",
    endpoint_input=predictor.endpoint_name,
    ground_truth_input=f"s3://{bucket}/ground-truth/",
    output_s3_uri=f"s3://{bucket}/monitoring/model-quality/",
    schedule_cron_expression=CronExpressionGenerator.daily(),
    problem_type="BinaryClassification",
)
```

### Exercise 5: Analyze Violation Reports

**Objective:** Investigate detected drift

```python
import json
import boto3

s3 = boto3.client("s3")

# List monitoring executions
executions = data_quality_monitor.list_executions()

for execution in executions[:3]:
    print(f"Execution: {execution.processing_job_arn}")
    print(f"Status: {execution.exit_message}")

    # Get constraint violations
    violations = execution.constraint_violations()
    if violations:
        print("Violations found:")
        for v in violations:
            print(f"  - {v.feature_name}: {v.description}")
```

### Exercise 6: Create CloudWatch Alarms

**Objective:** Alert on drift detection

```python
import boto3

cloudwatch = boto3.client("cloudwatch")

# Create alarm for data quality violations
cloudwatch.put_metric_alarm(
    AlarmName="DataQualityViolations",
    MetricName="ConstraintViolations",
    Namespace="aws/sagemaker/Endpoints/data-quality",
    Dimensions=[
        {"Name": "Endpoint", "Value": predictor.endpoint_name},
        {"Name": "MonitoringSchedule", "Value": "mla-study-data-quality-schedule"},
    ],
    Statistic="Sum",
    Period=3600,
    EvaluationPeriods=1,
    Threshold=0,
    ComparisonOperator="GreaterThanThreshold",
    AlarmActions=[sns_topic_arn],
)
```

## Validation

- [ ] What's the difference between data quality and model quality monitoring?
- [ ] How do you handle ground truth label delays?
- [ ] When would you use bias drift monitoring?
- [ ] How do you integrate monitoring alerts with retraining pipelines?

## Cleanup

```bash
# Stop monitoring schedules first
data_quality_monitor.stop_monitoring_schedule()
model_quality_monitor.stop_monitoring_schedule()

# Delete schedules
data_quality_monitor.delete_monitoring_schedule()
model_quality_monitor.delete_monitoring_schedule()

# Destroy infrastructure
pnpm cdk:destroy lab-model-monitor
```

## Related Exam Topics

- **Domain 4:** ML Solution Monitoring
- **Task 4.1:** Monitor model inference

## Learn More

- [SageMaker Model Monitor Documentation](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html)
- [Data Quality Monitoring](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-data-quality.html)
- [Model Quality Monitoring](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality.html)

---

**Lab ID:** lab-model-monitor
**Version:** 1.0.0
**Last Updated:** 2026-01-14
