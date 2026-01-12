---
title: ML Pipeline Orchestration
lastUpdated: 2026-01-11
---

# ML Pipeline Orchestration

ML pipeline orchestration is the automated coordination and execution of interconnected steps in machine learning workflows, from data preparation through model deployment. Amazon SageMaker Pipelines provides a purpose-built, serverless workflow orchestration service designed specifically for MLOps and CI/CD automation. Understanding how to design, implement, and optimize ML pipelines is critical for the MLA-C01 exam, as it directly addresses task 3-3: automating model training, testing, and deployment workflows.

This topic covers SageMaker Pipelines architecture, Step Functions integration patterns, CI/CD automation with AWS developer tools, event-driven orchestration, and production best practices for scalable ML workflows.

## Amazon SageMaker Pipelines Overview

### Core Architecture

Amazon SageMaker Pipelines is a serverless, purpose-built workflow orchestration service that enables you to create, automate, and manage end-to-end ML workflows. Unlike general-purpose orchestration tools, SageMaker Pipelines is optimized for machine learning workloads with native integration to SageMaker services including Processing, Training, Batch Transform, and Model Registry.

**Key architectural components:**

- **Pipeline Definition**: A JSON-formatted directed acyclic graph (DAG) that specifies the sequence and dependencies of steps
- **Pipeline Execution**: An instantiation of a pipeline with specific parameter values, creating a unique execution identifier
- **Step Execution**: Individual nodes in the DAG that perform specific ML tasks (preprocessing, training, evaluation)
- **Pipeline Parameters**: Variables that can be overridden at execution time to support parameterized workflows
- **Artifacts and Metadata**: Outputs from pipeline steps tracked in SageMaker Lineage for reproducibility

SageMaker Pipelines automatically provisions, scales, and shuts down orchestration infrastructure as workload demands change. The service can scale to run tens of thousands of concurrent workflows in production environments without requiring infrastructure management.

**AWS Documentation:**
- [Amazon SageMaker Pipelines](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines.html)
- [Define a Pipeline](https://docs.aws.amazon.com/sagemaker/latest/dg/define-pipeline.html)

### Pipeline Definition with Python SDK

SageMaker Pipelines uses a declarative Python SDK to define workflows. The SDK provides abstractions that translate to JSON pipeline definitions executed by the SageMaker Pipelines service.

**Basic pipeline structure:**

```python
from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.parameters import ParameterString, ParameterInteger
from sagemaker.workflow.steps import ProcessingStep, TrainingStep

# Define parameters
input_data = ParameterString(name="InputData", default_value="s3://bucket/data")
instance_count = ParameterInteger(name="InstanceCount", default_value=1)

# Define steps (processing, training, etc.)
processing_step = ProcessingStep(
    name="PreprocessData",
    processor=processor,
    inputs=[...],
    outputs=[...],
    code="preprocessing.py"
)

training_step = TrainingStep(
    name="TrainModel",
    estimator=estimator,
    inputs={"train": processing_step.properties.ProcessingOutputConfig.Outputs["train"].S3Output.S3Uri}
)

# Create pipeline
pipeline = Pipeline(
    name="MLWorkflowPipeline",
    parameters=[input_data, instance_count],
    steps=[processing_step, training_step]
)

# Submit to SageMaker
pipeline.upsert(role_arn=role)
execution = pipeline.start()
```

The pipeline definition establishes dependencies between steps by passing properties from one step as inputs to another. SageMaker Pipelines analyzes these data dependencies to construct the DAG and determine execution order.

**AWS Documentation:**
- [Pipelines SDK Overview](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-sdk.html)
- [Pipeline Parameters](https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-parameters.html)

## Pipeline Steps and Components

### Core Step Types

SageMaker Pipelines supports multiple step types, each designed for specific ML workflow tasks:

**1. ProcessingStep**

Executes data preprocessing, feature engineering, or model evaluation code using SageMaker Processing. The step requires a Processor object (ScriptProcessor, SKLearnProcessor, PySparkProcessor) and supports custom Docker containers.

```python
from sagemaker.processing import ScriptProcessor
from sagemaker.workflow.steps import ProcessingStep

processor = ScriptProcessor(
    image_uri=container_image,
    role=role,
    instance_type="ml.m5.xlarge",
    instance_count=1
)

processing_step = ProcessingStep(
    name="DataPreprocessing",
    processor=processor,
    code="preprocess.py",
    inputs=[ProcessingInput(source=input_data, destination="/opt/ml/processing/input")],
    outputs=[ProcessingOutput(output_name="train", source="/opt/ml/processing/train")],
    job_arguments=["--normalize", "true"]
)
```

The ProcessingStep properties attribute matches the DescribeProcessingJob API response, allowing downstream steps to reference job outputs, CloudWatch metrics, and job metadata.

**2. TrainingStep**

Launches SageMaker Training jobs using built-in algorithms or custom training containers. The step accepts an Estimator object and training inputs.

```python
from sagemaker.estimator import Estimator
from sagemaker.workflow.steps import TrainingStep

estimator = Estimator(
    image_uri=training_image,
    role=role,
    instance_type="ml.p3.2xlarge",
    instance_count=1,
    hyperparameters={"epochs": 100, "batch-size": 32}
)

training_step = TrainingStep(
    name="ModelTraining",
    estimator=estimator,
    inputs={
        "train": TrainingInput(
            s3_data=processing_step.properties.ProcessingOutputConfig.Outputs["train"].S3Output.S3Uri
        )
    }
)
```

TrainingStep creates data dependencies automatically when referencing properties from previous steps, ensuring correct execution order.

**3. TransformStep**

Executes batch inference using SageMaker Batch Transform for offline predictions on large datasets.

```python
from sagemaker.transformer import Transformer
from sagemaker.workflow.steps import TransformStep

transformer = Transformer(
    model_name=model_step.properties.ModelName,
    instance_type="ml.m5.xlarge",
    instance_count=1,
    output_path="s3://bucket/predictions"
)

transform_step = TransformStep(
    name="BatchInference",
    transformer=transformer,
    inputs=TransformInput(data="s3://bucket/test-data")
)
```

**4. CreateModelStep**

Registers a SageMaker Model resource that can be used for hosting or batch inference.

```python
from sagemaker.model import Model
from sagemaker.workflow.model_step import ModelStep

model = Model(
    image_uri=inference_image,
    model_data=training_step.properties.ModelArtifacts.S3ModelArtifacts,
    role=role
)

model_step = ModelStep(
    name="CreateModel",
    step_args=model.create()
)
```

**5. ConditionStep**

Enables conditional branching in pipeline execution based on evaluation of conditions. Supports ConditionEquals, ConditionGreaterThan, ConditionGreaterThanOrEqualTo, ConditionLessThan, and ConditionLessThanOrEqualTo.

```python
from sagemaker.workflow.conditions import ConditionGreaterThanOrEqualTo
from sagemaker.workflow.condition_step import ConditionStep
from sagemaker.workflow.functions import JsonGet

condition = ConditionGreaterThanOrEqualTo(
    left=JsonGet(
        step_name=evaluation_step.name,
        property_file=evaluation_report,
        json_path="metrics.accuracy.value"
    ),
    right=0.85
)

condition_step = ConditionStep(
    name="CheckModelQuality",
    conditions=[condition],
    if_steps=[register_model_step],
    else_steps=[fail_step]
)
```

If all conditions evaluate to True, if_steps execute; otherwise, else_steps execute. SageMaker Pipelines does not support nested condition steps.

**6. LambdaStep**

Invokes AWS Lambda functions for custom logic not natively supported by SageMaker steps, such as data validation, external API calls, or custom approval workflows.

```python
from sagemaker.workflow.lambda_step import LambdaStep, LambdaOutput

lambda_step = LambdaStep(
    name="CustomValidation",
    lambda_func=lambda_function,
    inputs={"model_uri": training_step.properties.ModelArtifacts.S3ModelArtifacts},
    outputs=[LambdaOutput(output_name="validation_result", output_type=LambdaOutputTypeEnum.String)]
)
```

**7. CallbackStep**

Pauses pipeline execution and waits for external approval or manual intervention before continuing. Useful for human-in-the-loop workflows.

```python
from sagemaker.workflow.callback_step import CallbackStep

callback_step = CallbackStep(
    name="ManualApproval",
    sqs_queue_url=approval_queue_url,
    inputs={"model_metrics": evaluation_step.properties.MetricsReport},
    outputs=[CallbackOutput(output_name="approval_status")]
)
```

**AWS Documentation:**
- [Pipeline Steps](https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-steps.html)
- [Add a Step](https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-steps-types.html)

### Step Dependencies and DAG Construction

SageMaker Pipelines constructs the execution DAG by analyzing both explicit and implicit dependencies between steps.

**Data Dependencies (Implicit):**

Created automatically when one step references properties from another step:

```python
# training_step depends on processing_step because it references its output
training_step = TrainingStep(
    name="Train",
    estimator=estimator,
    inputs={"train": processing_step.properties.ProcessingOutputConfig.Outputs["train"].S3Output.S3Uri}
)
```

**Custom Dependencies (Explicit):**

Use the `add_depends_on` method to create execution order constraints without data dependencies:

```python
# Ensure cleanup runs after model deployment, even without data dependency
cleanup_step.add_depends_on([deployment_step])
```

**Parallel Execution:**

Steps without dependencies execute in parallel by default to minimize total pipeline execution time. However, excessive parallelism can exhaust compute resources. Use the `ParallelismConfiguration` parameter to limit concurrent step execution:

```python
pipeline = Pipeline(
    name="ControlledParallelism",
    steps=[...],
    pipeline_definition_config=PipelineDefinitionConfig(
        use_custom_job_prefix=True,
        parallelism_config={"MaxParallelExecutionSteps": 10}
    )
)
```

**AWS Documentation:**
- [Pipeline Structure and Execution](https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-pipeline.html)

## Model Registry Integration

### Conditional Model Registration

The SageMaker Model Registry provides versioning, lineage tracking, and approval workflows for ML models. Integrating Model Registry with Pipelines enables automated model promotion based on quality metrics.

**RegisterModel step with conditional execution:**

```python
from sagemaker.workflow.step_collections import RegisterModel
from sagemaker.model_metrics import ModelMetrics, MetricsSource

# Define evaluation metrics
model_metrics = ModelMetrics(
    model_statistics=MetricsSource(
        s3_uri=evaluation_step.properties.ProcessingOutputConfig.Outputs["metrics"].S3Output.S3Uri,
        content_type="application/json"
    )
)

# Register model to Model Registry
register_step = RegisterModel(
    name="RegisterModel",
    estimator=estimator,
    model_data=training_step.properties.ModelArtifacts.S3ModelArtifacts,
    content_types=["text/csv"],
    response_types=["text/csv"],
    inference_instances=["ml.m5.xlarge"],
    transform_instances=["ml.m5.xlarge"],
    model_package_group_name="credit-risk-models",
    approval_status="PendingManualApproval",
    model_metrics=model_metrics
)

# Conditionally register based on accuracy threshold
condition_step = ConditionStep(
    name="CheckAccuracy",
    conditions=[
        ConditionGreaterThanOrEqualTo(
            left=JsonGet(
                step_name=evaluation_step.name,
                property_file=evaluation_report,
                json_path="metrics.accuracy.value"
            ),
            right=0.85
        )
    ],
    if_steps=[register_step],
    else_steps=[]
)
```

Models registered with `approval_status="PendingManualApproval"` require manual review before deployment. Models with `Approved` status can trigger automated deployment pipelines via EventBridge.

### Automated Approval Workflows

Use LambdaStep or CallbackStep to implement automated approval based on custom business logic:

```python
# Lambda function evaluates model against multiple criteria
approval_lambda = LambdaStep(
    name="AutomatedApproval",
    lambda_func=approval_function,
    inputs={
        "model_package_arn": register_step.steps[0].properties.ModelPackageArn,
        "metrics": evaluation_step.properties.ProcessingOutputConfig.Outputs["metrics"].S3Output.S3Uri
    },
    outputs=[LambdaOutput(output_name="approval_decision", output_type=LambdaOutputTypeEnum.String)]
)

# Update model approval status based on Lambda result
update_approval_step = CallbackStep(
    name="UpdateModelStatus",
    sqs_queue_url=status_queue_url,
    inputs={"model_package_arn": register_step.steps[0].properties.ModelPackageArn,
            "approval_status": approval_lambda.properties.Outputs["approval_decision"]}
)
```

**AWS Documentation:**
- [Update Model Approval Status](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-approve.html)
- [Automate Model Approval Process](https://aws.amazon.com/blogs/machine-learning/automate-the-machine-learning-model-approval-process-with-amazon-sagemaker-model-registry-and-amazon-sagemaker-pipelines/)

## Step Functions Integration

### When to Use Step Functions vs SageMaker Pipelines

While SageMaker Pipelines is purpose-built for ML workflows, AWS Step Functions provides broader orchestration capabilities across any AWS service. Understanding when to use each service is critical for the exam.

**Use SageMaker Pipelines when:**
- Workflow consists primarily of SageMaker operations (Processing, Training, Transform)
- Need ML-specific features like Model Registry integration and experiment tracking
- Require native SageMaker Lineage and artifact tracking
- Want simplified pipeline definitions with Python SDK abstractions
- Workflow remains within the SageMaker ecosystem

**Use Step Functions when:**
- Workflow spans multiple AWS services beyond SageMaker (e.g., Glue, EMR, Lambda, ECS)
- Need complex error handling, retry logic, or human-in-the-loop patterns
- Require long-running workflows (Step Functions Standard supports up to 1 year execution time)
- Need visual workflow monitoring with Step Functions Graph Inspector
- Workflow involves conditional branching based on external service responses

**Use both together when:**
- Embedding SageMaker Pipelines as a task within broader business workflows
- Orchestrating multiple ML pipelines with conditional execution logic
- Coordinating ML workflows with data pipelines, application deployments, or manual approvals
- Requiring Step Functions' advanced state machine capabilities with SageMaker's ML optimizations

### Step Functions SageMaker Integration Patterns

Step Functions provides optimized SageMaker integrations for common ML tasks:

**1. SageMaker Training Job with .sync Pattern**

The `.sync` integration pattern causes Step Functions to wait for the SageMaker job to complete before proceeding:

```json
{
  "Type": "Task",
  "Resource": "arn:aws:states:::sagemaker:createTrainingJob.sync",
  "Parameters": {
    "TrainingJobName.$": "$.trainingJobName",
    "RoleArn": "arn:aws:iam::123456789012:role/SageMakerRole",
    "AlgorithmSpecification": {
      "TrainingImage": "382416733822.dkr.ecr.us-east-1.amazonaws.com/xgboost:latest",
      "TrainingInputMode": "File"
    },
    "InputDataConfig": [...],
    "OutputDataConfig": {...},
    "ResourceConfig": {...},
    "StoppingCondition": {...}
  },
  "Next": "EvaluateModel"
}
```

The `.sync` pattern supports CreateTrainingJob, CreateTransformJob, CreateProcessingJob, and CreateHyperParameterTuningJob operations.

**2. Processing Job for Evaluation**

```json
{
  "Type": "Task",
  "Resource": "arn:aws:states:::sagemaker:createProcessingJob.sync",
  "Parameters": {
    "ProcessingJobName.$": "$.processingJobName",
    "RoleArn": "arn:aws:iam::123456789012:role/SageMakerRole",
    "ProcessingInputs": [...],
    "ProcessingOutputConfig": {...},
    "AppSpecification": {
      "ImageUri": "683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-scikit-learn:0.23-1-cpu-py3",
      "ContainerEntrypoint": ["python3", "evaluate.py"]
    },
    "ProcessingResources": {...}
  },
  "ResultPath": "$.evaluationResults",
  "Next": "CheckModelQuality"
}
```

**3. Conditional Model Registration**

Combine Step Functions Choice state with SageMaker Model Registry:

```json
{
  "Type": "Choice",
  "Choices": [
    {
      "Variable": "$.evaluationResults.accuracy",
      "NumericGreaterThanEquals": 0.85,
      "Next": "RegisterModel"
    }
  ],
  "Default": "NotifyFailure"
}
```

**4. Orchestrating SageMaker Pipeline Execution**

Start SageMaker Pipeline from Step Functions and monitor execution:

```json
{
  "Type": "Task",
  "Resource": "arn:aws:states:::sagemaker:startPipelineExecution.sync",
  "Parameters": {
    "PipelineName": "ml-training-pipeline",
    "PipelineParameters": [
      {
        "Name": "InputData",
        "Value.$": "$.s3InputPath"
      }
    ]
  },
  "Next": "ProcessResults"
}
```

**AWS Documentation:**
- [Create and Manage SageMaker Jobs with Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/connect-sagemaker.html)
- [Building ML Workflows with Step Functions](https://aws.amazon.com/blogs/machine-learning/building-machine-learning-workflows-with-amazon-sagemaker-processing-jobs-and-aws-step-functions/)

## CI/CD Automation with AWS Developer Tools

### SageMaker Projects and MLOps Templates

SageMaker Projects provide pre-configured MLOps templates that integrate SageMaker Pipelines with AWS CI/CD services (CodePipeline, CodeBuild, CodeCommit) for end-to-end automation.

**Key components of SageMaker Projects:**

1. **Model Build Pipeline**: CodePipeline triggered by commits to model build repository, executing SageMaker Pipeline for training
2. **Model Deploy Pipeline**: CodePipeline triggered by model approval in Model Registry, deploying to staging and production
3. **Source Control**: CodeCommit repositories for model code and infrastructure as code
4. **Artifact Storage**: S3 buckets for model artifacts, datasets, and pipeline outputs
5. **IAM Roles**: Service roles with least-privilege permissions for pipeline execution

**Built-in project templates:**

- **MLOps template for model building, training, and deployment**: Creates two repositories (build and deploy) with SageMaker Pipeline for training and CodePipeline for deployment
- **MLOps template for model building and training**: Focuses solely on automated training workflows
- **MLOps template for image building**: Adds CI/CD for custom Docker container images

**Creating a SageMaker Project:**

```python
import boto3

sagemaker_client = boto3.client('sagemaker')

response = sagemaker_client.create_project(
    ProjectName='credit-risk-mlops',
    ServiceCatalogProvisioningDetails={
        'ProductId': 'prod-xxxxxxxxx',  # MLOps template product ID
        'ProvisioningArtifactId': 'pa-xxxxxxxxx'
    },
    Tags=[
        {'Key': 'Environment', 'Value': 'Production'},
        {'Key': 'Team', 'Value': 'DataScience'}
    ]
)
```

Projects provision AWS Service Catalog products that create all required resources using CloudFormation.

**AWS Documentation:**
- [SageMaker Projects MLOps Templates](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-projects-templates.html)
- [Use SageMaker-Provided Project Templates](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-projects-templates-sm.html)

### CodePipeline Integration

CodePipeline automates the creation, testing, and deployment of ML models through multi-stage workflows.

**Model Build CodePipeline:**

1. **Source Stage**: Triggered by CodeCommit repository commits containing training code and pipeline definition
2. **Build Stage**: CodeBuild executes tests, creates/updates SageMaker Pipeline definition, and starts pipeline execution
3. **Test Stage**: Waits for SageMaker Pipeline completion and validates model quality
4. **Approval Stage**: Manual or automated approval before model registration

**Example buildspec.yml for CodeBuild:**

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      python: 3.9
    commands:
      - pip install sagemaker boto3 pytest

  pre_build:
    commands:
      - echo "Running unit tests..."
      - pytest tests/
      - echo "Validating pipeline definition..."
      - python validate_pipeline.py

  build:
    commands:
      - echo "Creating SageMaker Pipeline..."
      - python create_pipeline.py
      - echo "Starting pipeline execution..."
      - python start_execution.py

  post_build:
    commands:
      - echo "Pipeline execution started successfully"
      - echo $PIPELINE_EXECUTION_ARN

artifacts:
  files:
    - pipeline_execution.json
```

**Model Deploy CodePipeline:**

1. **Source Stage**: Triggered by EventBridge rule when model approval status changes to "Approved"
2. **Build Stage**: Generates CloudFormation templates for SageMaker endpoints
3. **Deploy-to-Staging**: Deploys endpoint to staging environment with test traffic
4. **Integration Tests**: Runs automated tests against staging endpoint
5. **Manual Approval**: Human review of staging performance
6. **Deploy-to-Production**: Blue/green deployment to production with canary traffic shifting

**AWS Documentation:**
- [Safely Deploying with CodePipeline and CodeDeploy](https://aws.amazon.com/blogs/machine-learning/safely-deploying-and-monitoring-amazon-sagemaker-endpoints-with-aws-codepipeline-and-aws-codedeploy/)

### Blue/Green and Canary Deployments

Production model deployments should use progressive rollout strategies to minimize risk:

**Blue/Green Deployment:**

```python
import boto3

sagemaker_client = boto3.client('sagemaker')

# Update endpoint with blue/green configuration
response = sagemaker_client.update_endpoint(
    EndpointName='credit-risk-endpoint',
    EndpointConfigName='credit-risk-config-v2',
    DeploymentConfig={
        'BlueGreenUpdatePolicy': {
            'TrafficRoutingConfiguration': {
                'Type': 'ALL_AT_ONCE',
                'WaitIntervalInSeconds': 0
            },
            'TerminationWaitInSeconds': 600,
            'MaximumExecutionTimeoutInSeconds': 3600
        },
        'AutoRollbackConfiguration': {
            'Alarms': [
                {'AlarmName': 'ModelLatencyHigh'},
                {'AlarmName': 'ModelErrorRateHigh'}
            ]
        }
    }
)
```

**Canary Deployment:**

```python
response = sagemaker_client.update_endpoint(
    EndpointName='credit-risk-endpoint',
    EndpointConfigName='credit-risk-config-v2',
    DeploymentConfig={
        'BlueGreenUpdatePolicy': {
            'TrafficRoutingConfiguration': {
                'Type': 'CANARY',
                'CanarySize': {
                    'Type': 'CAPACITY_PERCENT',
                    'Value': 10
                },
                'WaitIntervalInSeconds': 300  # Wait 5 minutes before full cutover
            },
            'TerminationWaitInSeconds': 600,
            'MaximumExecutionTimeoutInSeconds': 3600
        },
        'AutoRollbackConfiguration': {
            'Alarms': [
                {'AlarmName': 'CanaryModelLatencyHigh'},
                {'AlarmName': 'CanaryModelErrorRateHigh'}
            ]
        }
    }
)
```

Canary deployments route a small percentage of traffic to the new model version while monitoring CloudWatch alarms. If alarms trigger, automatic rollback occurs. If metrics remain healthy, full traffic cutover proceeds.

**Linear Deployment:**

For gradual rollout, use LINEAR traffic shifting:

```python
'TrafficRoutingConfiguration': {
    'Type': 'LINEAR',
    'LinearStepSize': {
        'Type': 'CAPACITY_PERCENT',
        'Value': 20  # Increase by 20% every interval
    },
    'WaitIntervalInSeconds': 600  # Wait 10 minutes between increments
}
```

**AWS Documentation:**
- [Safe Deployment with CodePipeline](https://github.com/aws-samples/amazon-sagemaker-safe-deployment-pipeline)

## Event-Driven Pipeline Automation

### EventBridge Integration

Amazon EventBridge enables event-driven pipeline execution based on AWS service state changes, scheduled events, or custom application events.

**Common event-driven triggers:**

1. **S3 Object Creation**: Start pipeline when new training data arrives
2. **Model Registry Approval**: Deploy model when approval status changes
3. **Scheduled Execution**: Run retraining pipelines on fixed intervals
4. **Model Drift Detection**: Trigger retraining when Model Monitor detects drift
5. **CloudWatch Alarm**: Execute remediation pipelines when performance degrades

**EventBridge rule for S3-triggered pipeline:**

```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["ml-training-data"]
    },
    "object": {
      "key": [{
        "prefix": "incoming/credit-risk/"
      }]
    }
  }
}
```

**Target configuration to start SageMaker Pipeline:**

```json
{
  "Arn": "arn:aws:sagemaker:us-east-1:123456789012:pipeline/credit-risk-training",
  "RoleArn": "arn:aws:iam::123456789012:role/EventBridgeSageMakerRole",
  "SageMakerPipelineParameters": {
    "PipelineParameterList": [
      {
        "Name": "InputData",
        "Value": "$.detail.object.key"
      },
      {
        "Name": "ExecutionTime",
        "Value": "$.time"
      }
    ]
  }
}
```

**Creating EventBridge rule with boto3:**

```python
import boto3
import json

events_client = boto3.client('events')

# Create rule
rule_response = events_client.put_rule(
    Name='s3-trigger-ml-pipeline',
    EventPattern=json.dumps({
        'source': ['aws.s3'],
        'detail-type': ['Object Created'],
        'detail': {
            'bucket': {'name': ['ml-training-data']},
            'object': {'key': [{'prefix': 'incoming/'}]}
        }
    }),
    State='ENABLED',
    Description='Trigger ML pipeline on new training data'
)

# Add SageMaker Pipeline as target
target_response = events_client.put_targets(
    Rule='s3-trigger-ml-pipeline',
    Targets=[
        {
            'Id': '1',
            'Arn': 'arn:aws:sagemaker:us-east-1:123456789012:pipeline/credit-risk-training',
            'RoleArn': 'arn:aws:iam::123456789012:role/EventBridgeSageMakerRole',
            'SageMakerPipelineParameters': {
                'PipelineParameterList': [
                    {'Name': 'InputData', 'Value': '$.detail.object.key'}
                ]
            }
        }
    ]
)
```

### Model Registry Approval Events

Automate model deployment when approval status changes:

**EventBridge pattern for model approval:**

```json
{
  "source": ["aws.sagemaker"],
  "detail-type": ["SageMaker Model Package State Change"],
  "detail": {
    "ModelPackageGroupName": ["credit-risk-models"],
    "ModelApprovalStatus": ["Approved"]
  }
}
```

This event triggers when a data scientist or automated process approves a model in the Model Registry, initiating the deployment CodePipeline.

### Scheduled Pipeline Execution

Create time-based triggers for periodic retraining:

```python
events_client.put_rule(
    Name='weekly-retraining',
    ScheduleExpression='cron(0 2 ? * SUN *)',  # Every Sunday at 2 AM UTC
    State='ENABLED',
    Description='Weekly model retraining'
)

events_client.put_targets(
    Rule='weekly-retraining',
    Targets=[
        {
            'Id': '1',
            'Arn': 'arn:aws:sagemaker:us-east-1:123456789012:pipeline/credit-risk-training',
            'RoleArn': 'arn:aws:iam::123456789012:role/EventBridgeSageMakerRole',
            'SageMakerPipelineParameters': {
                'PipelineParameterList': [
                    {'Name': 'InputData', 'Value': 's3://ml-training-data/latest/'},
                    {'Name': 'ScheduledRun', 'Value': 'true'}
                ]
            }
        }
    ]
)
```

**AWS Documentation:**
- [Schedule Pipeline Runs](https://docs.aws.amazon.com/sagemaker/latest/dg/pipeline-eventbridge.html)
- [Events that SageMaker Sends to EventBridge](https://docs.aws.amazon.com/sagemaker/latest/dg/automating-sagemaker-with-eventbridge.html)

## Pipeline Optimization and Best Practices

### Step Caching

Step caching reuses outputs from previous successful executions when step configuration and inputs remain unchanged, significantly reducing execution time and cost for iterative development.

**Enabling step caching:**

```python
from sagemaker.workflow.steps import CacheConfig

cache_config = CacheConfig(
    enable_caching=True,
    expire_after="P30D"  # ISO 8601 duration: 30 days
)

processing_step = ProcessingStep(
    name="DataPreprocessing",
    processor=processor,
    inputs=[...],
    outputs=[...],
    code="preprocess.py",
    cache_config=cache_config
)
```

**Cache behavior:**

- Caching only considers successful executions; failed runs are never reused
- Cache key includes step name, input data locations, hyperparameters, and container images
- Cache is scoped per pipeline (cannot reuse cached steps from different pipelines)
- When multiple cached runs exist, the most recent successful run is used
- Cache expiration uses ISO 8601 duration format (P30D = 30 days, PT1H = 1 hour)

**When to use caching:**
- Development and testing phases where inputs frequently remain unchanged
- Steps with expensive computation or long execution times
- Debugging later pipeline stages without re-running early steps

**When to disable caching:**
- Production training pipelines where data freshness is critical
- Steps that depend on current time or random seeds
- Steps with external dependencies that may change (APIs, databases)

**AWS Documentation:**
- [Caching Pipeline Steps](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-caching.html)
- [Turn on Step Caching](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-caching-enabling.html)

### Parallelism Configuration

Control concurrent step execution to balance speed with resource consumption:

```python
from sagemaker.workflow.pipeline_definition_config import PipelineDefinitionConfig

pipeline = Pipeline(
    name="OptimizedPipeline",
    parameters=[...],
    steps=[...],
    pipeline_definition_config=PipelineDefinitionConfig(
        use_custom_job_prefix=True,
        parallelism_config={"MaxParallelExecutionSteps": 10}
    )
)
```

**Optimization strategies:**

1. **Identify parallelizable steps**: Steps without dependencies can run concurrently
2. **Set appropriate limits**: Prevent resource exhaustion while maximizing throughput
3. **Use custom dependencies**: Add explicit dependencies to control execution order
4. **Monitor execution patterns**: Use SageMaker Studio Pipelines view to visualize DAG

**Example parallel processing pattern:**

```python
# These steps can run in parallel (no dependencies)
preprocess_train = ProcessingStep(name="PreprocessTrain", ...)
preprocess_validation = ProcessingStep(name="PreprocessValidation", ...)
preprocess_test = ProcessingStep(name="PreprocessTest", ...)

# Training depends on all preprocessing steps
training_step = TrainingStep(
    name="Train",
    estimator=estimator,
    inputs={
        "train": preprocess_train.properties.ProcessingOutputConfig.Outputs["train"].S3Output.S3Uri,
        "validation": preprocess_validation.properties.ProcessingOutputConfig.Outputs["validation"].S3Output.S3Uri
    }
)

# All three preprocessing steps execute in parallel; training waits for all to complete
```

### Selective Execution

Run subsets of pipeline steps while reusing outputs from previous executions:

```python
execution = pipeline.start(
    execution_display_name="selective-run-001",
    execution_description="Re-run evaluation only",
    selective_execution_config={
        "SourcePipelineExecutionArn": "arn:aws:sagemaker:us-east-1:123456789012:pipeline/credit-risk-training/execution/abcd1234",
        "SelectedSteps": [
            {"StepName": "EvaluateModel"},
            {"StepName": "RegisterModel"}
        ]
    }
)
```

Selective execution reuses outputs from the source execution for non-selected steps, enabling rapid iteration on later pipeline stages without re-running expensive early steps.

**AWS Documentation:**
- [Selective Execution of Pipeline Steps](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-selective-ex.html)

### Local Mode Testing

Test pipelines locally before running in the cloud to reduce development cost and iteration time:

```python
from sagemaker.workflow.pipeline_context import LocalPipelineSession

# Create local session
local_session = LocalPipelineSession()

# Define processor with local session
processor = SKLearnProcessor(
    framework_version='0.23-1',
    role=role,
    instance_type='local',
    instance_count=1,
    sagemaker_session=local_session
)

# Create pipeline with local session
pipeline = Pipeline(
    name="LocalTestPipeline",
    parameters=[...],
    steps=[...],
    sagemaker_session=local_session
)

# Execute locally
pipeline.create(role)
execution = pipeline.start()
execution.wait()
```

**Local mode requirements:**

- Docker installed and running on local machine
- Small subset of data for rapid testing
- Compatible step types (Processing, Training with custom containers)
- Not supported: SageMaker built-in algorithms (e.g., XGBoost)

**Local mode limitations:**

- Executions not recorded in SageMaker Experiments
- Cannot use SageMaker-managed spot instances
- Limited to local machine compute resources

**AWS Documentation:**
- [Run Pipelines Using Local Mode](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-local-mode.html)
- [Reduce Cost with Local Mode](https://aws.amazon.com/blogs/machine-learning/reduce-cost-and-development-time-with-amazon-sagemaker-pipelines-local-mode/)

### Pipeline Monitoring and Debugging

**CloudWatch Integration:**

All SageMaker Pipeline executions emit CloudWatch metrics and logs:

- `PipelineExecutionDuration`: Total execution time
- `StepExecutionDuration`: Per-step execution time
- `PipelineExecutionStatus`: Success, failed, or stopped
- `StepExecutionStatus`: Per-step status

**SageMaker Studio Pipelines View:**

Visual DAG representation showing:
- Step execution status (running, completed, failed)
- Data lineage between steps
- Step inputs and outputs
- CloudWatch logs links
- Execution history and comparisons

**Debugging failed steps:**

```python
import boto3

sagemaker_client = boto3.client('sagemaker')

# Get execution details
execution = sagemaker_client.describe_pipeline_execution(
    PipelineExecutionArn='arn:aws:sagemaker:us-east-1:123456789012:pipeline/my-pipeline/execution/xyz789'
)

# List steps in execution
steps = sagemaker_client.list_pipeline_execution_steps(
    PipelineExecutionArn='arn:aws:sagemaker:us-east-1:123456789012:pipeline/my-pipeline/execution/xyz789'
)

# Find failed steps
failed_steps = [s for s in steps['PipelineExecutionSteps'] if s['StepStatus'] == 'Failed']

for step in failed_steps:
    print(f"Failed step: {step['StepName']}")
    print(f"Failure reason: {step.get('FailureReason', 'No reason provided')}")

    # Get detailed metadata
    metadata = step.get('Metadata', {})
    if 'ProcessingJob' in metadata:
        job_name = metadata['ProcessingJob']['Arn'].split('/')[-1]
        print(f"Processing job: {job_name}")

        # Retrieve CloudWatch logs
        logs_client = boto3.client('logs')
        log_group = f"/aws/sagemaker/ProcessingJobs"
        log_stream = f"{job_name}/processing-container"

        log_events = logs_client.get_log_events(
            logGroupName=log_group,
            logStreamName=log_stream,
            startFromHead=False,
            limit=50
        )

        print("Recent log events:")
        for event in log_events['events']:
            print(event['message'])
```

## Cross-Account and Multi-Region Patterns

### Cross-Account Model Deployment

Enterprise ML workflows often span multiple AWS accounts for separation of concerns:

- **Development Account**: Data scientists build and test models
- **Staging Account**: Integration testing and pre-production validation
- **Production Account**: Serving models to end users

**Cross-account architecture components:**

1. **Shared Model Registry**: Central account hosts Model Registry with cross-account IAM permissions
2. **CodePipeline in Production Account**: Triggered by EventBridge rule monitoring Model Registry
3. **IAM Roles**: Cross-account roles allowing production account to read model artifacts from development account
4. **S3 Bucket Policies**: Allow cross-account access to model artifacts

**Example IAM role in development account:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::PROD-ACCOUNT-ID:role/ModelDeploymentRole"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::dev-model-artifacts/*",
        "arn:aws:s3:::dev-model-artifacts"
      ]
    }
  ]
}
```

**Cross-account pipeline step:**

```python
# In production account CodePipeline
deploy_action = codepipeline_actions.CloudFormationCreateUpdateStackAction(
    action_name="DeployModel",
    stack_name="ml-model-endpoint",
    template_path=build_output.at_path("template.yaml"),
    admin_permissions=False,
    role=cfn_role,
    parameter_overrides={
        "ModelDataUrl": f"s3://dev-model-artifacts/models/credit-risk/model.tar.gz",
        "ExecutionRoleArn": production_execution_role.role_arn
    },
    extra_inputs=[model_artifact_from_dev_account]
)
```

### Multi-Region Deployment

For global applications, deploy models to multiple regions:

```python
# CodePipeline with multi-region deployment
for region in ['us-east-1', 'eu-west-1', 'ap-southeast-1']:
    deploy_stage = pipeline.add_stage(
        stage_name=f"Deploy-{region}",
        actions=[
            codepipeline_actions.CloudFormationCreateUpdateStackAction(
                action_name=f"DeployEndpoint-{region}",
                stack_name=f"ml-endpoint-{region}",
                template_path=build_output.at_path("template.yaml"),
                admin_permissions=False,
                region=region,
                parameter_overrides={
                    "ModelDataUrl": model_data_url,
                    "EndpointName": f"credit-risk-endpoint-{region}"
                }
            )
        ]
    )
```

**Considerations:**

- Replicate model artifacts to regional S3 buckets for low-latency access
- Use AWS Global Accelerator or Route 53 for global endpoint routing
- Monitor regional endpoint performance with CloudWatch cross-region dashboards
- Coordinate model updates across regions with canary deployments

## MLA-C01 Exam Strategy

### Key Exam Concepts

For the MLA-C01 exam, focus on these ML pipeline orchestration concepts:

**1. SageMaker Pipelines Core Capabilities**
- Understand DAG construction through data and custom dependencies
- Know all step types (Processing, Training, Transform, Condition, Lambda, Callback, RegisterModel)
- Recognize when to use conditional execution with ConditionStep
- Identify scenarios requiring LambdaStep for custom logic

**2. CI/CD Integration Patterns**
- Differentiate between SageMaker Projects templates (model building vs. model deployment)
- Understand CodePipeline stages for ML workflows (source, build, test, deploy)
- Know when to use blue/green vs. canary vs. linear deployment strategies
- Recognize EventBridge triggers for automated pipeline execution

**3. Step Functions vs. SageMaker Pipelines**
- Choose SageMaker Pipelines for ML-centric workflows within SageMaker ecosystem
- Choose Step Functions for complex orchestration across multiple AWS services
- Understand hybrid patterns using both services together

**4. Model Registry Integration**
- Know how to conditionally register models based on quality metrics
- Understand approval workflows (manual vs. automated)
- Recognize EventBridge patterns for deployment triggered by model approval

**5. Optimization Techniques**
- Apply step caching for development and testing scenarios
- Configure parallelism limits to balance speed and resource usage
- Use selective execution for debugging and iteration
- Apply local mode for cost-effective development

**6. Event-Driven Automation**
- Identify S3, CloudWatch, and Model Registry events that trigger pipelines
- Configure EventBridge rules with dynamic parameter passing
- Recognize scheduled execution patterns for periodic retraining

### Common Exam Scenarios

**Scenario 1: Automated Retraining on New Data**
- **Pattern**: EventBridge rule monitoring S3 bucket, triggering SageMaker Pipeline
- **Key services**: EventBridge, S3, SageMaker Pipelines
- **Implementation**: Object Created event pattern with prefix matching

**Scenario 2: Conditional Model Registration**
- **Pattern**: EvaluationStep → ConditionStep → RegisterModel
- **Key concepts**: JsonGet function, ConditionGreaterThanOrEqualTo, Model Registry
- **Implementation**: Condition evaluates model metrics; registers only if threshold met

**Scenario 3: Multi-Stage Deployment with Approval**
- **Pattern**: CodePipeline with staging deployment, integration tests, manual approval, production deployment
- **Key services**: CodePipeline, SageMaker endpoints, Lambda for testing, SNS for approval
- **Implementation**: Blue/green deployment with canary traffic shifting

**Scenario 4: Cross-Account Model Deployment**
- **Pattern**: Model Registry in shared account, EventBridge rule in production account, CodePipeline for deployment
- **Key concepts**: Cross-account IAM roles, S3 bucket policies, EventBridge cross-account events
- **Implementation**: Production account assumes role to read model artifacts from development account

**Scenario 5: Orchestrating Complex Multi-Service Workflow**
- **Pattern**: Step Functions orchestrating Glue job, SageMaker Pipeline, Lambda validation, SNS notification
- **Key decision**: Use Step Functions (not SageMaker Pipelines) for workflows spanning multiple services
- **Implementation**: Step Functions state machine with service integrations and error handling

### Exam Tips

1. **Recognize pipeline vs. endpoint deployment questions**: Pipeline orchestration focuses on training workflows; endpoint deployment focuses on serving infrastructure
2. **Identify optimization opportunities**: Questions mentioning "reduce cost" or "faster iteration" often relate to caching, local mode, or selective execution
3. **Understand event-driven patterns**: Look for keywords like "automatically trigger," "when new data arrives," or "upon model approval"
4. **Know service integration limits**: SageMaker Pipelines does not support nested condition steps; Step Functions required for complex conditional branching
5. **Differentiate approval workflows**: Manual approval uses CallbackStep or CodePipeline approval stage; automated approval uses LambdaStep with custom logic
6. **Recognize cross-account patterns**: Questions about "separate environments" or "production isolation" typically require cross-account architecture

### Practice Scenario Analysis

**Question Pattern**: "A data science team needs to automatically retrain their fraud detection model whenever the weekly data ingestion process completes. The retraining should only occur if the new data volume exceeds 10,000 records. What is the most efficient solution?"

**Analysis**:
- **Trigger**: Event-driven (data ingestion completion)
- **Condition**: Data volume threshold (10,000 records)
- **Action**: Start SageMaker Pipeline

**Solution**: EventBridge rule triggered by S3 object creation (weekly data file) → Lambda function validates record count → Starts SageMaker Pipeline if threshold met. Alternatively, Step Functions state machine with S3 integration → Choice state checking record count → SageMaker Pipeline execution.

**Why not**: Scheduled EventBridge rule (doesn't account for data ingestion completion), Manual pipeline execution (not automated), ConditionStep in SageMaker Pipeline (condition must be checked before pipeline starts, not during execution).

**Question Pattern**: "A machine learning platform needs to support multiple data science teams building models independently. Each team should have separate development environments but share a common production deployment pipeline. What architecture best supports this requirement?"

**Analysis**:
- **Requirement**: Multi-tenancy with isolated development
- **Shared component**: Production deployment
- **Key concepts**: Separation of concerns, standardized deployment

**Solution**: SageMaker Projects in separate development accounts per team → Models registered to shared Model Registry in central account → EventBridge rule in production account triggers CodePipeline when model approved → Cross-account IAM roles allow production to access model artifacts.

**Why not**: Single shared account (lacks isolation), Separate production accounts per team (operational overhead, no standardization), Manual cross-account artifact copying (not automated).

## Summary

ML pipeline orchestration with SageMaker Pipelines, Step Functions, and AWS CI/CD services enables end-to-end automation of machine learning workflows. Key takeaways for the MLA-C01 exam:

- **SageMaker Pipelines** provides purpose-built ML workflow orchestration with native SageMaker integration, DAG construction, and Model Registry support
- **Step Functions** offers broader orchestration across multiple AWS services with advanced state management and error handling
- **CI/CD integration** through SageMaker Projects, CodePipeline, and CodeBuild automates model building and deployment
- **Event-driven patterns** with EventBridge enable automated pipeline execution based on data arrivals, model approvals, and scheduled events
- **Optimization techniques** including caching, parallelism configuration, selective execution, and local mode reduce cost and accelerate development
- **Production patterns** like blue/green deployments, canary releases, and cross-account architectures ensure safe, scalable model serving

Mastering these concepts enables you to design robust, automated ML workflows that reduce operational overhead, accelerate model deployment, and maintain high quality standards across the ML lifecycle.

**AWS Documentation:**
- [Amazon SageMaker Pipelines](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines.html)
- [Create and Manage SageMaker Jobs with Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/connect-sagemaker.html)
- [SageMaker Projects MLOps Templates](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-projects-templates.html)
- [Schedule Pipeline Runs](https://docs.aws.amazon.com/sagemaker/latest/dg/pipeline-eventbridge.html)
- [Events that SageMaker Sends to EventBridge](https://docs.aws.amazon.com/sagemaker/latest/dg/automating-sagemaker-with-eventbridge.html)
