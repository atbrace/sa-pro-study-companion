---
title: Domain 2 - ML Model Development
lastUpdated: 2026-01-10
---

# ML Model Development

This domain focuses on selecting appropriate modeling approaches, training models effectively, tuning hyperparameters, and evaluating model performance. You'll need to demonstrate expertise with SageMaker training capabilities and AWS AI services.

## Exam Weight

This domain represents **26%** of the MLA-C01 exam. Strong understanding of ML algorithms, training processes, and SageMaker capabilities is essential.

## What You'll Learn

This domain tests your ability to:

1. **Choose modeling approaches** - Select appropriate ML algorithms and AWS AI services based on problem type and requirements
2. **Configure training jobs** - Set up SageMaker training with appropriate instance types, batch sizes, and epochs
3. **Apply regularization** - Use dropout, weight decay, L1/L2 regularization to prevent overfitting
4. **Tune hyperparameters** - Apply random search, Bayesian optimization, and grid search techniques
5. **Evaluate models** - Use appropriate metrics and analyze model performance

## Key Services

Focus your study on these primary services:

- **Amazon SageMaker Training** - Managed training infrastructure
- **SageMaker Built-in Algorithms** - XGBoost, Linear Learner, BlazingText, Image Classification, etc.
- **SageMaker Autopilot** - AutoML for automatic model selection and tuning
- **SageMaker Debugger** - Real-time training job monitoring and debugging
- **SageMaker Experiments** - Track and compare training runs
- **Amazon Bedrock** - Foundation models for generative AI
- **AWS AI Services** - Rekognition, Comprehend, Translate, Transcribe for specific use cases

## Study Approach

Follow this recommended approach to master this domain:

1. **Know the built-in algorithms** - Understand when to use XGBoost vs Linear Learner vs Neural Networks
2. **Master training configuration** - Instance types, distributed training, spot instances
3. **Understand hyperparameters** - Learning rate, batch size, epochs, regularization parameters
4. **Practice tuning jobs** - Set up automatic model tuning with different strategies
5. **Learn evaluation metrics** - Accuracy, precision, recall, F1, AUC, RMSE based on problem type
6. **Hands-on labs** - Train actual models to understand the end-to-end process

## Exam Tips

Key areas that frequently appear on the exam:

- **Algorithm selection** - XGBoost for tabular data, BlazingText for NLP, Image Classification CNN for images
- **Training parameters** - Epoch, steps, batch size, learning rate effects
- **Distributed training** - Data parallelism vs model parallelism, when to use each
- **Regularization** - Dropout for neural networks, L1 for sparse features, L2 for weight decay
- **Hyperparameter tuning** - Bayesian optimization for expensive training, random search for quick exploration
- **Bring your own container** - How to integrate custom frameworks with SageMaker
- **Spot training** - Cost optimization with managed spot training and checkpoints

## Common Scenarios

The exam will test scenarios such as:

- "Select the appropriate SageMaker built-in algorithm for a fraud detection use case"
- "Configure a distributed training job for a large image classification model"
- "Set up hyperparameter tuning to optimize a regression model"
- "Reduce overfitting in a neural network using appropriate regularization"
- "Choose between training a custom model vs using Amazon Rekognition"
- "Optimize training costs using spot instances while ensuring job completion"
