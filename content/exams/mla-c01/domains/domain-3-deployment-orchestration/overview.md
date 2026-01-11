---
title: Domain 3 - Deployment and Orchestration of ML Workflows
lastUpdated: 2026-01-10
---

# Deployment and Orchestration of ML Workflows

This domain focuses on deploying ML models to production and automating end-to-end ML workflows. You'll need to demonstrate expertise in inference options, MLOps practices, and CI/CD pipeline automation.

## Exam Weight

This domain represents **22%** of the MLA-C01 exam. This is frequently reported as one of the more challenging domains, testing not just concepts but precise configuration knowledge.

## What You'll Learn

This domain tests your ability to:

1. **Select deployment infrastructure** - Choose between real-time endpoints, batch transform, serverless, and async inference
2. **Configure inference endpoints** - Set up auto-scaling, multi-model endpoints, and inference pipelines
3. **Optimize inference** - Apply model compilation, quantization, and hardware acceleration
4. **Build ML pipelines** - Create end-to-end workflows with SageMaker Pipelines
5. **Automate CI/CD** - Set up automated testing, deployment, and rollback strategies

## Key Services

Focus your study on these primary services:

- **SageMaker Real-time Endpoints** - Low-latency inference for production applications
- **SageMaker Batch Transform** - Large-scale batch inference jobs
- **SageMaker Serverless Inference** - Pay-per-use inference for intermittent traffic
- **SageMaker Async Inference** - Queue-based inference for large payloads
- **SageMaker Pipelines** - Native ML workflow orchestration
- **SageMaker Model Registry** - Model versioning and approval workflows
- **AWS Step Functions** - General workflow orchestration
- **AWS CodePipeline/CodeBuild** - CI/CD automation

## Study Approach

Follow this recommended approach to master this domain:

1. **Know deployment options** - Understand when to use real-time vs batch vs serverless
2. **Master SageMaker Pipelines** - This is heavily tested; practice building complete pipelines
3. **Learn auto-scaling** - Target tracking, step scaling, scheduled scaling for endpoints
4. **Understand deployment strategies** - Blue/green, canary, linear rollouts
5. **Practice Model Registry** - Model versioning, approval workflows, lineage tracking
6. **Hands-on labs** - Build actual CI/CD pipelines to understand practical implementation

## Exam Tips

Key areas that frequently appear on the exam:

- **Inference options** - Real-time for <100ms latency, batch for offline, serverless for variable traffic
- **Multi-model endpoints** - Cost optimization for deploying many models
- **Inference pipelines** - Chaining preprocessing, inference, and postprocessing
- **SageMaker Neo** - Model compilation for edge deployment and optimization
- **Model Registry** - Approval status (Pending, Approved, Rejected), model packages
- **Pipeline steps** - Processing, Training, Tuning, Model, Transform, Condition, Callback
- **Deployment strategies** - Blue/green for zero-downtime, canary for gradual rollout

## Common Scenarios

The exam will test scenarios such as:

- "Deploy a model that handles variable traffic with unpredictable peaks"
- "Set up a pipeline that automatically retrains when data drift is detected"
- "Configure auto-scaling for a real-time endpoint based on invocations per instance"
- "Implement a blue/green deployment strategy with automatic rollback"
- "Design a multi-model endpoint to serve 100+ models cost-effectively"
- "Create an approval workflow where models require sign-off before production"
