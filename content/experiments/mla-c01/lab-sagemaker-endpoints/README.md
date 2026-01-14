# SageMaker Real-time Inference Endpoints Lab

## Overview

This lab covers SageMaker real-time inference endpoints, including configuration, auto-scaling, A/B testing, and serverless options. Master the deployment patterns essential for production ML systems.

**Difficulty:** Intermediate
**Estimated Time:** 60-75 minutes
**Estimated Cost:** ~$0.12/hour when endpoint running

## Learning Objectives

By completing this lab, you will:

1. Deploy real-time inference endpoints
2. Configure auto-scaling policies
3. Implement A/B testing with production variants
4. Set up serverless inference
5. Enable data capture for monitoring
6. Manage endpoint lifecycle

## Architecture

```
          +------------------+
          |   API Gateway    |
          | (or Direct SDK)  |
          +--------+---------+
                   |
                   v
          +------------------+
          | SageMaker        |
          | Endpoint         |
          +------------------+
          | +------+ +------+|
          | |Var A | |Var B ||
          | | 70%  | | 30%  ||
          | +------+ +------+|
          +--------+---------+
                   |
          +--------+---------+
          |                  |
          v                  v
   +------------+    +------------+
   | Model v1   |    | Model v2   |
   +------------+    +------------+
```

## Cost Breakdown

| Resource | Cost (approx.) |
|----------|---------------|
| ml.t2.medium | $0.056/hour |
| ml.m5.large | $0.115/hour |
| Serverless | $0.0001/inference + compute |
| Data capture | S3 storage costs |
| **Total** | **~$0.12/hour** |

## Deployment

```bash
pnpm cdk:deploy lab-sagemaker-endpoints
```

## Lab Exercises

### Exercise 1: Deploy a Basic Endpoint

**Objective:** Create a real-time endpoint

```python
from sagemaker.xgboost import XGBoostModel

model = XGBoostModel(
    model_data=f"s3://{bucket}/models/model.tar.gz",
    role=role,
    framework_version="1.5-1",
)

predictor = model.deploy(
    initial_instance_count=1,
    instance_type="ml.t2.medium",
    endpoint_name="mla-study-endpoint",
)
```

### Exercise 2: Make Predictions

**Objective:** Invoke the endpoint

```python
import json

# Using the predictor
result = predictor.predict([[1.0, 2.0, 3.0, 4.0]])
print(f"Prediction: {result}")

# Using boto3 directly
import boto3
runtime = boto3.client("sagemaker-runtime")

response = runtime.invoke_endpoint(
    EndpointName="mla-study-endpoint",
    ContentType="text/csv",
    Body="1.0,2.0,3.0,4.0"
)
prediction = response["Body"].read().decode()
```

### Exercise 3: Configure Auto-scaling

**Objective:** Scale endpoint based on traffic

```python
import boto3

client = boto3.client("application-autoscaling")

# Register scalable target
client.register_scalable_target(
    ServiceNamespace="sagemaker",
    ResourceId=f"endpoint/{endpoint_name}/variant/AllTraffic",
    ScalableDimension="sagemaker:variant:DesiredInstanceCount",
    MinCapacity=1,
    MaxCapacity=4,
)

# Create scaling policy
client.put_scaling_policy(
    PolicyName="SageMakerEndpointScaling",
    ServiceNamespace="sagemaker",
    ResourceId=f"endpoint/{endpoint_name}/variant/AllTraffic",
    ScalableDimension="sagemaker:variant:DesiredInstanceCount",
    PolicyType="TargetTrackingScaling",
    TargetTrackingScalingPolicyConfiguration={
        "TargetValue": 1000,  # Invocations per instance
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "SageMakerVariantInvocationsPerInstance"
        },
        "ScaleInCooldown": 600,
        "ScaleOutCooldown": 60,
    },
)
```

### Exercise 4: A/B Testing with Variants

**Objective:** Compare model versions in production

```python
from sagemaker.predictor import Predictor

# Create endpoint config with multiple variants
endpoint_config = {
    "ProductionVariants": [
        {
            "VariantName": "VariantA",
            "ModelName": "model-v1",
            "InstanceType": "ml.t2.medium",
            "InitialInstanceCount": 1,
            "InitialVariantWeight": 0.7,  # 70% traffic
        },
        {
            "VariantName": "VariantB",
            "ModelName": "model-v2",
            "InstanceType": "ml.t2.medium",
            "InitialInstanceCount": 1,
            "InitialVariantWeight": 0.3,  # 30% traffic
        },
    ]
}

# Target specific variant
response = runtime.invoke_endpoint(
    EndpointName="ab-test-endpoint",
    ContentType="text/csv",
    Body="1.0,2.0,3.0,4.0",
    TargetVariant="VariantB"  # Force specific variant
)
```

### Exercise 5: Serverless Inference

**Objective:** Deploy pay-per-request endpoint

```python
from sagemaker.serverless import ServerlessInferenceConfig

serverless_config = ServerlessInferenceConfig(
    memory_size_in_mb=2048,  # 1024-6144
    max_concurrency=5,        # 1-200
)

predictor = model.deploy(
    serverless_inference_config=serverless_config,
    endpoint_name="mla-study-serverless",
)
```

### Exercise 6: Enable Data Capture

**Objective:** Log inference requests for monitoring

```python
from sagemaker.model_monitor import DataCaptureConfig

data_capture_config = DataCaptureConfig(
    enable_capture=True,
    sampling_percentage=100,
    destination_s3_uri=f"s3://{bucket}/data-capture/",
    capture_options=["Input", "Output"],
)

predictor = model.deploy(
    initial_instance_count=1,
    instance_type="ml.t2.medium",
    data_capture_config=data_capture_config,
)
```

## Validation

- [ ] When should you use serverless vs provisioned endpoints?
- [ ] How do you perform blue/green deployments?
- [ ] What metrics should you monitor for auto-scaling?
- [ ] How does data capture integrate with Model Monitor?

## Cleanup

```bash
# Delete endpoint
predictor.delete_endpoint()

# Destroy infrastructure
pnpm cdk:destroy lab-sagemaker-endpoints
```

## Related Exam Topics

- **Domain 3:** Deployment and Orchestration
- **Task 3.1:** Select deployment infrastructure

## Learn More

- [Deploy Models for Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model.html)
- [Auto Scaling for Endpoints](https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling.html)
- [Serverless Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html)

---

**Lab ID:** lab-sagemaker-endpoints
**Version:** 1.0.0
**Last Updated:** 2026-01-14
