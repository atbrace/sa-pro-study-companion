# SageMaker Hyperparameter Tuning Lab

## Overview

This lab covers Automatic Model Tuning (AMT) in SageMaker. You'll configure hyperparameter ranges, choose tuning strategies, and optimize model performance through systematic experimentation.

**Difficulty:** Intermediate
**Estimated Time:** 60-90 minutes
**Estimated Cost:** ~$0.05/hour (infrastructure) + training job costs

## Learning Objectives

By completing this lab, you will:

1. Configure hyperparameter tuning jobs
2. Define parameter ranges and scaling types
3. Choose appropriate tuning strategies
4. Enable early stopping for efficiency
5. Analyze tuning results and select best model
6. Implement warm start for continued tuning

## Architecture

```
+------------------------+
| Tuning Job Definition  |
| - Objective metric     |
| - Parameter ranges     |
| - Resource limits      |
+----------+-------------+
           |
           v
+------------------------+
|   Bayesian Optimizer   |
|   (or Random/Grid)     |
+----------+-------------+
           |
    +------+------+
    |      |      |
    v      v      v
+-----+ +-----+ +-----+
|Job 1| |Job 2| |Job N|
+-----+ +-----+ +-----+
    |      |      |
    v      v      v
+------------------------+
|   Best Model Selected  |
+------------------------+
```

## Cost Breakdown

| Resource | Cost (approx.) |
|----------|---------------|
| Tuning Job (10 trials) | ~$1.15 total |
| Each training job | ~$0.115/hour |
| S3 Storage | ~$0.023/GB/month |
| **Total estimate** | **~$1-5 per tuning job** |

## Deployment

```bash
pnpm cdk:deploy lab-hyperparameter-tuning
```

## Lab Exercises

### Exercise 1: Configure Hyperparameter Ranges

**Objective:** Define the search space

```python
from sagemaker.tuner import (
    IntegerParameter,
    ContinuousParameter,
    CategoricalParameter
)

hyperparameter_ranges = {
    # Continuous - use for learning rates, regularization
    "eta": ContinuousParameter(0.01, 0.5, scaling_type="Logarithmic"),
    "gamma": ContinuousParameter(0, 5, scaling_type="Linear"),

    # Integer - use for tree depth, iterations
    "max_depth": IntegerParameter(3, 10),
    "num_round": IntegerParameter(50, 300),

    # Categorical - use for discrete choices
    "booster": CategoricalParameter(["gbtree", "dart"]),
}
```

### Exercise 2: Create Tuning Job

**Objective:** Configure and launch hyperparameter tuning

```python
from sagemaker.tuner import HyperparameterTuner
from sagemaker.xgboost import XGBoost

# Base estimator
xgb = XGBoost(
    role=role,
    instance_count=1,
    instance_type="ml.m5.large",
    framework_version="1.5-1",
)

# Tuner configuration
tuner = HyperparameterTuner(
    estimator=xgb,
    objective_metric_name="validation:auc",
    hyperparameter_ranges=hyperparameter_ranges,
    max_jobs=20,
    max_parallel_jobs=3,
    strategy="Bayesian",  # or "Random", "Grid", "Hyperband"
    objective_type="Maximize",
    early_stopping_type="Auto",
)

# Start tuning
tuner.fit({
    "train": f"s3://{bucket}/data/train/",
    "validation": f"s3://{bucket}/data/validation/",
})
```

### Exercise 3: Compare Tuning Strategies

**Objective:** Understand when to use each strategy

| Strategy | Best For | Pros | Cons |
|----------|----------|------|------|
| Bayesian | Most cases | Converges faster | Sequential dependency |
| Random | Large spaces | Highly parallel | No optimization |
| Grid | Small discrete | Exhaustive | Exponential growth |
| Hyperband | Expensive training | Early stopping | Complex config |

### Exercise 4: Analyze Results

**Objective:** Extract insights from tuning

```python
from sagemaker.analytics import HyperparameterTuningJobAnalytics

# Get tuning results
tuning_analytics = HyperparameterTuningJobAnalytics(
    tuner.latest_tuning_job.name
)

# Convert to DataFrame
results_df = tuning_analytics.dataframe()

# Best hyperparameters
best_job = tuner.best_training_job()
print(f"Best training job: {best_job}")

# Describe best job
tuner.describe_best_training_job()
```

### Exercise 5: Warm Start Tuning

**Objective:** Continue tuning from previous results

```python
from sagemaker.tuner import WarmStartConfig, WarmStartTypes

warm_start_config = WarmStartConfig(
    warm_start_type=WarmStartTypes.IDENTICAL_DATA_AND_ALGORITHM,
    parents={tuner.latest_tuning_job.name}
)

tuner_continued = HyperparameterTuner(
    estimator=xgb,
    objective_metric_name="validation:auc",
    hyperparameter_ranges=hyperparameter_ranges,
    max_jobs=10,  # Additional jobs
    max_parallel_jobs=3,
    warm_start_config=warm_start_config,
)

tuner_continued.fit(inputs)
```

### Exercise 6: Deploy Best Model

**Objective:** Deploy the tuned model

```python
# Deploy best model from tuning job
predictor = tuner.deploy(
    initial_instance_count=1,
    instance_type="ml.t2.medium",
)

# Make predictions
result = predictor.predict(test_data)
```

## Validation

- [ ] When should you use Logarithmic vs Linear scaling?
- [ ] What's the trade-off between max_jobs and max_parallel_jobs?
- [ ] How does early stopping improve tuning efficiency?
- [ ] When would you use warm start?

## Cleanup

```bash
pnpm cdk:destroy lab-hyperparameter-tuning
```

## Related Exam Topics

- **Domain 2:** ML Model Development
- **Task 2.2:** Train and refine models

## Learn More

- [Automatic Model Tuning](https://docs.aws.amazon.com/sagemaker/latest/dg/automatic-model-tuning.html)
- [Hyperparameter Tuning Best Practices](https://docs.aws.amazon.com/sagemaker/latest/dg/automatic-model-tuning-considerations.html)

---

**Lab ID:** lab-hyperparameter-tuning
**Version:** 1.0.0
**Last Updated:** 2026-01-14
