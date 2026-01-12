---
title: Cost Optimization for ML Workloads
lastUpdated: 2026-01-11
---

# Cost Optimization for ML Workloads

Machine learning workloads on AWS can incur significant costs across training, inference, storage, and data transfer. Effective cost optimization requires understanding SageMaker pricing models, leveraging commitment-based savings plans, using spot instances for fault-tolerant workloads, right-sizing compute resources, and implementing automated monitoring and governance. This topic covers critical cost optimization strategies essential for the MLA-C01 exam, focusing on practical approaches to reduce ML infrastructure costs while maintaining performance and reliability.

## SageMaker Pricing Models

### On-Demand Pricing

Amazon SageMaker uses a pay-as-you-go model with separate pricing for different components:

**Training Jobs:**
- Billed per second (60-second minimum) based on ML instance type
- Charges include compute, storage (EBS volumes), and data processing
- No upfront commitments or long-term contracts required
- Pricing varies by instance family (ml.m5, ml.p3, ml.g4dn, ml.trn1, etc.)

**Inference Endpoints:**
- Real-time endpoints: Billed per hour for provisioned instances
- Serverless inference: Billed per millisecond of compute time plus data processed
- Batch transform: Billed per second for job duration
- Asynchronous inference: Same as real-time with auto-scaling capabilities

**Notebooks and IDE:**
- Studio notebooks: Billed per hour when instances are running
- Classic notebook instances: Billed per hour for provisioned capacity
- Compute remains billable until explicitly stopped

**Additional Services:**
- Data Wrangler: Billed per instance hour
- Feature Store: Storage fees plus throughput charges
- Model Monitor: Compute charges for monitoring jobs
- Ground Truth: Per-object labeling fees plus worker costs

**Critical Cost Awareness:**
On-demand pricing provides flexibility but represents the highest cost option. Always stop notebook instances when not in use, as they continue billing even during idle periods.

**AWS Documentation:**
- [Amazon SageMaker Pricing](https://aws.amazon.com/sagemaker/pricing/)
- [SageMaker Billing and Metering](https://docs.aws.amazon.com/sagemaker/latest/dg/billing.html)

### Machine Learning Savings Plans

ML Savings Plans provide significant discounts (up to 64%) in exchange for a commitment to a consistent amount of usage measured in dollars per hour for a one or three-year term.

**How ML Savings Plans Work:**

Commitment-based pricing model:
```
Hourly Commitment: $10/hour
Term: 3 years (all upfront, partial upfront, or no upfront)
Discount: Up to 64% vs on-demand rates
Application: Automatic across all eligible SageMaker usage
```

**Eligible Services:**
- SageMaker Studio notebooks
- SageMaker notebook instances
- SageMaker Processing jobs
- SageMaker Data Wrangler
- SageMaker Training jobs
- SageMaker Real-time inference endpoints
- SageMaker Batch Transform

**Payment Options:**
1. **All Upfront:** Maximum discount (pay entire commitment upfront)
2. **Partial Upfront:** Moderate discount (50% upfront, remainder monthly)
3. **No Upfront:** Minimum discount (pay monthly)

**Flexibility Characteristics:**
- Automatically apply to any instance family (ml.m5, ml.p3, ml.g5, etc.)
- Cover usage across all AWS regions
- No need to specify instance types in advance
- Apply to different SageMaker services within eligible scope
- Usage beyond commitment charged at on-demand rates

**Usage Application Logic:**

ML Savings Plans apply automatically to maximize savings:
```
Hour 1: $15 of SageMaker usage
  - First $10 covered by Savings Plan (64% discount)
  - Remaining $5 charged at on-demand rates

Hour 2: $8 of SageMaker usage
  - All $8 covered by Savings Plan
  - $2 of commitment unused (no rollover)
```

**Strategic Considerations:**
- Analyze 30-90 days of historical usage before committing
- Start with conservative commitments and scale up
- Use Cost Explorer to model commitment scenarios
- Consider separate plans for training vs inference workloads
- Three-year terms provide maximum savings for stable workloads
- One-year terms better for evolving ML platforms

**When to Use Savings Plans:**
- Sustained production inference endpoints running 24/7
- Regular training job schedules (daily/weekly model retraining)
- Long-term ML platform deployments
- Predictable notebook usage for data science teams

**When NOT to Use Savings Plans:**
- Experimental or proof-of-concept projects
- Highly variable workloads with unpredictable usage
- Short-term projects (less than 6 months)
- Workloads better suited for spot instances

**AWS Documentation:**
- [Machine Learning Savings Plans](https://aws.amazon.com/savingsplans/ml-pricing/)
- [Understanding ML Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [Savings Plans FAQ](https://aws.amazon.com/savingsplans/faq/)

### Spot Instances for Training

SageMaker Managed Spot Training can reduce training costs by up to 90% compared to on-demand instances by leveraging spare EC2 capacity.

**How Managed Spot Training Works:**

SageMaker automatically manages the spot instance lifecycle:
1. Requests spot capacity when training job submitted
2. Provisions instances when capacity available
3. Saves checkpoints to S3 at regular intervals
4. Handles interruptions gracefully (spot reclamation)
5. Automatically resumes from last checkpoint on new instance
6. Completes job when training finishes

**Spot Instance Pricing Model:**

Billing based on actual runtime:
```
Training Job Duration: 10 hours
Spot Interruptions: 2 hours (training paused)
Billable Time: 8 hours (actual compute time)
Max Wait Time: 24 hours (configurable timeout)

Cost Calculation:
On-Demand: 10 hours × $3.06/hour = $30.60
Managed Spot: 8 hours × $0.918/hour = $7.34
Savings: 76% ($23.26 saved)
```

**Interruption Handling:**

When spot capacity is reclaimed:
- Training job automatically paused (not terminated)
- Latest checkpoint preserved in S3
- Job waits for new spot capacity (up to MaxWaitTimeInSeconds)
- Training resumes from checkpoint when capacity available
- If MaxWaitTimeInSeconds exceeded, job fails with timeout error

**Checkpoint Configuration Requirements:**

Essential for spot training fault tolerance:
```python
from sagemaker.estimator import Estimator

estimator = Estimator(
    image_uri='training-image',
    role='SageMakerRole',
    instance_count=1,
    instance_type='ml.p3.2xlarge',

    # Enable spot training
    use_spot_instances=True,
    max_run=86400,  # 24 hours max training time
    max_wait=172800,  # 48 hours max wait for spot capacity

    # Checkpoint configuration
    checkpoint_s3_uri='s3://bucket/checkpoints/',
    checkpoint_local_path='/opt/ml/checkpoints/'
)
```

**Checkpoint Best Practices:**

Checkpoint frequency considerations:
- **Frequent checkpoints (every 5-10 minutes):** Minimize re-computation after interruptions but increase S3 API calls and costs
- **Infrequent checkpoints (every 30-60 minutes):** Reduce S3 costs but increase re-training time after interruptions
- **Optimal frequency:** Balance based on average interruption rate and training job duration

**Framework Support:**

Built-in checkpointing for:
- TensorFlow (ModelCheckpoint callback)
- PyTorch (torch.save() in training loop)
- MXNet (module.save_checkpoint())
- XGBoost (saved models at intervals)
- Hugging Face Transformers (Trainer API)

Custom checkpointing required for:
- Custom training algorithms
- Non-standard ML frameworks
- Legacy code requiring modification

**Interruption Rate Statistics:**

Historical spot interruption rates:
- Average: Less than 5% of instances interrupted
- ml.p3 instances: Typically 2-4% interruption rate
- ml.g4dn instances: Typically 1-3% interruption rate
- ml.c5 instances: Less than 2% interruption rate

**Workload Suitability:**

Ideal for spot training:
- Long-running training jobs (multi-hour to multi-day)
- Fault-tolerant algorithms with checkpointing support
- Hyperparameter tuning jobs (multiple independent trials)
- Batch inference jobs that can be paused
- Cost-sensitive workloads without strict deadlines

Not suitable for spot:
- Training jobs requiring guaranteed completion times
- Jobs under 30 minutes (checkpoint overhead not justified)
- Algorithms without checkpoint support
- Compliance workloads requiring audit trails of uninterrupted execution

**Cost Optimization Patterns:**

Combining pricing models:
```
Development: Spot instances (90% savings)
Staging: Savings Plans (64% savings)
Production Critical: On-demand (guaranteed capacity)
```

**AWS Documentation:**
- [Managed Spot Training in Amazon SageMaker](https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html)
- [Checkpoints in Amazon SageMaker](https://docs.aws.amazon.com/sagemaker/latest/dg/model-checkpoints.html)
- [EC2 Spot Instance Best Practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html)

## Training Cost Optimization

### Instance Selection and Right-Sizing

Choosing appropriate instance types significantly impacts training costs and performance.

**Instance Family Selection:**

**General Purpose (ml.m5, ml.m6i, ml.m7g):**
- Use case: CPU-based training, small to medium datasets
- Cost: Lowest per-hour cost
- When to use: Initial experimentation, linear models, tree-based models (XGBoost, Random Forest)
- Starting point: ml.m5.xlarge or ml.m5.2xlarge

**Compute Optimized (ml.c5, ml.c6i, ml.c7g):**
- Use case: CPU-intensive training with higher compute requirements
- Cost: 20-30% more than general purpose
- When to use: Large-scale CPU-based training, batch transform jobs
- Starting point: ml.c5.2xlarge

**GPU Instances (ml.p3, ml.p4d, ml.g5):**
- Use case: Deep learning, neural networks, computer vision, NLP
- Cost: 5-20x more than general purpose
- When to use: Models benefiting from GPU acceleration (CNNs, RNNs, Transformers)
- Starting point: ml.g5.xlarge (most cost-effective GPU option)

**Purpose-Built ML Accelerators (ml.trn1, ml.inf2):**
- Use case: Large language models, generative AI training and inference
- Cost: 30-50% better price-performance than comparable GPU instances
- When to use: Supported frameworks (PyTorch, TensorFlow) and model architectures
- Starting point: ml.trn1.2xlarge for training, ml.inf2.xlarge for inference

**Graviton-Based Instances (ml.m7g, ml.c7g):**
- Use case: CPU-based workloads optimized for ARM architecture
- Cost: Up to 20% better price-performance than x86 equivalents
- When to use: Compatible frameworks and libraries
- Consideration: Verify ARM compatibility before migration

**Right-Sizing Methodology:**

Progressive scaling approach:
```
Step 1: Start Small
  - Begin with ml.m5.xlarge or ml.m5.2xlarge
  - Profile training job performance
  - Identify bottlenecks (CPU, memory, I/O)

Step 2: Analyze Resource Utilization
  - Check CloudWatch metrics: CPUUtilization, MemoryUtilization, GPUUtilization
  - If CPU consistently >80%: Scale up compute
  - If GPU <50%: Consider smaller/cheaper GPU instance
  - If Memory >90%: Increase instance size or implement data streaming

Step 3: Test GPU Requirement
  - Train sample batch on CPU instance
  - Train same batch on smallest GPU (ml.g5.xlarge)
  - Calculate speedup and cost difference
  - GPU justified if: (speedup × CPU_cost) > GPU_cost

Step 4: Scale Appropriately
  - Scale horizontally (distributed training) for very large datasets
  - Scale vertically (larger instances) for models requiring high memory
```

**Resource Utilization Monitoring:**

Use CloudWatch to track instance efficiency:
- **CPUUtilization:** Target 70-90% for cost efficiency
- **MemoryUtilization:** Target 80-95% (leave buffer for spikes)
- **GPUUtilization:** Target >70% (below 50% indicates GPU not needed)
- **GPUMemoryUtilization:** Should be >60% to justify GPU instance cost
- **DiskUtilization:** High I/O wait may indicate need for Pipe Mode

**Common Right-Sizing Mistakes:**

Over-provisioning patterns:
- Using ml.p3.8xlarge when ml.g5.2xlarge sufficient (400% cost increase)
- Provisioning 32 GB instance for 4 GB model (wasting 28 GB capacity)
- Using GPU for tabular data models (XGBoost runs faster on CPU)
- Not stopping notebook instances (24/7 billing for intermittent use)

**AWS Documentation:**
- [SageMaker ML Instance Types](https://aws.amazon.com/sagemaker/pricing/)
- [Instance Selection Best Practices](https://docs.aws.amazon.com/sagemaker/latest/dg/notebooks-run-and-manage-choose.html)

### Distributed Training Optimization

Distributed training can reduce training time but requires careful configuration to avoid cost increases without proportional performance gains.

**When to Use Distributed Training:**

Scenarios justifying distributed training:
- Dataset size exceeds single instance memory (100+ GB)
- Training time on single instance exceeds 24 hours
- Model size requires distributed computation (large language models)
- Hyperparameter tuning with parallel job execution

**Distribution Strategies:**

**Data Parallelism:**
- Splits data across multiple instances
- Each instance trains on different data subset
- Gradients synchronized across instances
- Ideal for: Large datasets with standard model architectures
- Scaling efficiency: 70-85% (4 instances = 3-3.4x speedup)

**Model Parallelism:**
- Splits model layers across multiple instances
- Each instance computes portion of model
- Activations passed between instances
- Ideal for: Models too large for single GPU memory
- Scaling efficiency: Varies (high communication overhead)

**Pipeline Parallelism:**
- Combines data and model parallelism
- Splits model into stages, processes micro-batches
- Reduces communication overhead
- Ideal for: Very large models (billion+ parameters)

**Cost-Performance Analysis:**

Calculate distributed training ROI:
```
Single Instance:
  Duration: 24 hours
  Instance: ml.p3.2xlarge ($3.825/hour)
  Cost: $91.80

4-Instance Distributed (Data Parallel):
  Duration: 8 hours (3x speedup, 75% efficiency)
  Instance: 4 × ml.p3.2xlarge
  Cost: 4 × 8 × $3.825 = $122.40

Analysis:
  Time saved: 16 hours (67% faster)
  Additional cost: $30.60 (33% more expensive)

Decision: Justify if time-to-market value exceeds $30.60
```

**Distributed Training Best Practices:**

Optimize communication overhead:
- Use placement groups for low-latency networking
- Batch gradient updates to reduce synchronization frequency
- Use gradient compression for large models
- Enable mixed precision training to reduce data transfer

**Framework-Specific Features:**

**PyTorch DDP (DistributedDataParallel):**
- Built-in data parallelism
- Efficient gradient synchronization
- Supports spot training with checkpointing

**TensorFlow MultiWorkerMirroredStrategy:**
- Data parallelism across workers
- Synchronous training with all-reduce
- Native SageMaker support

**Horovod:**
- Framework-agnostic distributed training
- Efficient MPI-based communication
- Excellent scaling for 8+ instances

**AWS Documentation:**
- [Distributed Training in SageMaker](https://docs.aws.amazon.com/sagemaker/latest/dg/distributed-training.html)
- [Data Parallelism Library](https://docs.aws.amazon.com/sagemaker/latest/dg/data-parallel.html)
- [Model Parallelism Library](https://docs.aws.amazon.com/sagemaker/latest/dg/model-parallel.html)

### Training Job Optimization Techniques

**Pipe Mode vs File Mode:**

**File Mode (default):**
- Downloads entire dataset to EBS volume before training
- Requires EBS volume larger than dataset
- Incurs download time before training starts
- Suitable for: Small datasets (<10 GB), random access patterns

**Pipe Mode:**
- Streams data directly from S3 to training algorithm
- No EBS storage required for data
- Training starts immediately (no download delay)
- Reduces training time and storage costs
- Suitable for: Large datasets (10+ GB), sequential access patterns

Cost comparison:
```
File Mode (100 GB dataset):
  EBS storage: 200 GB × $0.10/GB-month = $20/month
  Download time: 15 minutes
  Training instance idle during download

Pipe Mode:
  EBS storage: 50 GB (OS + checkpoints only) × $0.10/GB-month = $5/month
  Download time: 0 (streaming)
  Savings: $15/month + reduced training time
```

**Mixed Precision Training:**

Use 16-bit floating point (FP16) instead of 32-bit (FP32):

Benefits:
- 2x reduction in memory usage
- 2-3x faster training on compatible hardware (V100, A100 GPUs)
- No significant accuracy loss for most models
- Enables larger batch sizes or models

Implementation with automatic mixed precision:
```python
# PyTorch
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()
for data, target in dataloader:
    with autocast():
        output = model(data)
        loss = criterion(output, target)

    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

Cost impact:
- Reduces training time by 2-3x on compatible GPUs
- Allows smaller GPU instances for same model size
- Example: ml.p3.8xlarge reduced to ml.p3.2xlarge (75% cost reduction)

**Hyperparameter Optimization Strategies:**

SageMaker Automatic Model Tuning can be expensive if not configured properly.

**Cost-Effective HPO Approaches:**

Random Search with Early Stopping:
```python
from sagemaker.tuner import HyperparameterTuner

tuner = HyperparameterTuner(
    estimator=estimator,
    objective_metric_name='validation:accuracy',
    hyperparameter_ranges=hyperparameter_ranges,
    max_jobs=50,
    max_parallel_jobs=5,  # Limit concurrent jobs to control cost
    strategy='Random',  # More efficient than Grid
    early_stopping_type='Auto'  # Stop poor performers early
)
```

Progressive HPO strategy:
1. Coarse search with 20-30 jobs on small instance types
2. Refine search space based on top performers
3. Fine-tune with 10-15 jobs on production instance types
4. Use spot instances for all HPO jobs (90% savings)

**Smart Defaults:**

Pre-trained model starting points:
- Use SageMaker JumpStart for 150+ pre-trained models
- Transfer learning reduces training time by 80-95%
- Fine-tuning requires fraction of compute vs training from scratch

**AWS Documentation:**
- [Pipe Mode for Training](https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-training-algo-running-container.html#your-algorithms-training-algo-running-container-trainingdata)
- [Automatic Model Tuning](https://docs.aws.amazon.com/sagemaker/latest/dg/automatic-model-tuning.html)

## Inference Cost Optimization

### Endpoint Hosting Options

SageMaker provides multiple inference hosting options with different cost characteristics.

**Real-Time Endpoints (Instance-Based):**

Provisioned capacity with per-hour billing:

Characteristics:
- Dedicated instances running 24/7
- Consistent low-latency inference (<100ms)
- Suitable for high-throughput, predictable traffic
- Billed continuously regardless of utilization

Cost structure:
```
Instance: ml.m5.xlarge
Rate: $0.269/hour
Monthly cost: $0.269 × 24 × 30 = $193.68

Utilization: 20% (inference 4.8 hours/day)
Effective cost per active hour: $0.269 ÷ 0.20 = $1.35/hour
Waste: 80% of capacity ($154.94/month)
```

When to use:
- Production applications requiring <100ms latency
- Consistent traffic patterns throughout day
- Predictable load (benefits from Savings Plans)
- Business-critical applications requiring guaranteed capacity

**Serverless Inference:**

Pay-per-use with automatic scaling to zero:

Characteristics:
- No provisioned capacity (scales automatically)
- Billed per millisecond of compute time
- Scales to zero during idle periods (no cost)
- Cold start latency: 1-5 seconds
- Max request timeout: 60 seconds
- Max request payload: 4 MB

Cost structure:
```
Pricing: Compute time (ms) + Data processed (MB)
Example: 2048 MB memory configuration
  - Compute: $0.0000133 per ms
  - Data: $0.000020 per MB

Request processing:
  - Duration: 500ms
  - Payload: 2 MB
  - Cost: (500 × $0.0000133) + (2 × $0.000020) = $0.0067 per request

Monthly inference:
  - 100,000 requests
  - Cost: $670

vs Real-Time (ml.m5.xlarge): $193.68/month
Analysis: Real-time cheaper at high volume
```

When to use:
- Unpredictable or sporadic traffic patterns
- Applications tolerating cold start latency (1-5s)
- Low to medium request volumes (<100,000/month)
- Development and testing environments
- Cost-sensitive applications without strict SLAs

**Serverless with Provisioned Concurrency:**

Keeps endpoints warm for predictable bursts:

Characteristics:
- Pre-warmed capacity to eliminate cold starts
- Billed for provisioned concurrency plus compute time
- Ideal for predictable traffic spikes (business hours)

Cost structure:
```
Provisioned Concurrency: 5 endpoints
Memory: 4096 MB
Rate: $0.0000204 per provisioned endpoint-hour
Monthly base: 5 × 730 × $0.0000204 = $74.46

Plus compute time: Standard serverless rates

Use case: Peak traffic 9am-5pm weekdays
  - Provision during business hours: 8 hours × 5 days = 40 hours/week
  - Unprovision nights/weekends
  - Monthly cost: ~$35 + compute
```

When to use:
- Predictable traffic patterns (business hours)
- Need to eliminate cold starts for user experience
- Traffic concentrated in specific time windows
- Cost optimization over pure serverless or real-time

**Asynchronous Inference:**

Queue-based inference with auto-scaling:

Characteristics:
- Requests placed in queue, processed asynchronously
- Auto-scales based on queue depth
- Suitable for large payloads (up to 1 GB)
- Near real-time latency (seconds to minutes)
- Supports spot instances for compute (70% savings)

Cost structure:
```
Base instance cost: Same as real-time endpoints
Auto-scaling: Scales to 0 when queue empty
Request storage: S3 costs for input/output

Example (100,000 requests/month, avg 5 min processing):
  - Active time: 8,333 hours/month
  - Instance: ml.m5.xlarge with auto-scaling
  - Min instances: 0
  - Max instances: 10
  - Average utilization: 2 instances
  - Cost: 2 × 730 × $0.269 = $392.74/month
```

When to use:
- Batch inference workloads
- Large payload processing (>4 MB)
- Traffic with high variability
- Non-urgent inference (seconds to minutes acceptable)
- Long-running inference jobs (several minutes)

**Batch Transform:**

Offline batch processing:

Characteristics:
- Processes entire dataset offline
- No endpoint infrastructure required
- Ideal for periodic scoring jobs
- Supports spot instances

Cost structure:
```
Pay only for job duration:
  - Job duration: 2 hours
  - Instance: ml.m5.xlarge
  - Cost: 2 × $0.269 = $0.54

vs Real-time endpoint (monthly):
  - Running 24/7: $193.68
  - Batch (daily 2-hour jobs): 60 × $0.54 = $32.40
  - Savings: 83%
```

When to use:
- Periodic scoring (daily, weekly reports)
- Large dataset inference
- No real-time requirements
- Cost-sensitive batch workloads

**Decision Matrix:**

| Traffic Pattern | Volume | Latency Requirement | Recommended Option | Estimated Monthly Cost |
|----------------|--------|---------------------|-------------------|----------------------|
| 24/7 steady | High | <100ms | Real-time + Savings Plan | $100-500 |
| Business hours | Medium | <100ms | Serverless + Provisioned Concurrency | $50-200 |
| Sporadic | Low | 1-5s acceptable | Serverless | $10-100 |
| Variable queue | Medium-High | Seconds-minutes | Asynchronous | $200-800 |
| Batch periodic | Any | Hours-days | Batch Transform | $10-100 |

**AWS Documentation:**
- [Deploy Models for Real-Time Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/realtime-endpoints.html)
- [Serverless Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html)
- [Asynchronous Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference.html)
- [Batch Transform](https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform.html)

### Inference Optimization Strategies

**Multi-Model Endpoints:**

Host multiple models on shared infrastructure:

How it works:
- Single endpoint serves multiple models from S3
- Models loaded into memory dynamically on request
- Memory time-sharing across models
- Ideal for hundreds or thousands of similar models

Cost savings calculation:
```
Scenario: 100 models, each receiving 1000 requests/day

Individual Endpoints:
  - 100 endpoints × ml.m5.xlarge
  - Cost: 100 × $193.68/month = $19,368/month

Multi-Model Endpoint:
  - 5 instances × ml.m5.xlarge (auto-scaled)
  - Cost: 5 × $193.68/month = $968.40/month
  - Savings: 95% ($18,399.60/month)
```

Requirements:
- Models must use same framework and container
- Models should have similar latency characteristics
- Models should be similar in size (efficient memory packing)

Not suitable for:
- Models with significantly different TPS requirements
- Very large models (requires dedicated capacity)
- Models requiring GPU inference (limited multi-model GPU support)

**Configuration example:**
```python
from sagemaker.multidatamodel import MultiDataModel

# Create multi-model endpoint
mme = MultiDataModel(
    name='multi-model-endpoint',
    model_data_prefix='s3://bucket/models/',
    image_uri='inference-container',
    role='SageMakerRole'
)

# Deploy with auto-scaling
predictor = mme.deploy(
    initial_instance_count=2,
    instance_type='ml.m5.2xlarge',
    endpoint_name='mme-endpoint'
)

# Invoke specific model
prediction = predictor.predict(data, target_model='model-v1.tar.gz')
```

**SageMaker Inference Recommender:**

Automated instance selection tool that benchmarks models across instance types.

How it works:
1. Register model in SageMaker Model Registry
2. Run Inference Recommender job (default or advanced)
3. Receives recommendations optimized for cost, latency, or throughput
4. Deploy model to recommended instance type

**Default job (quick recommendations):**
- Provides top 5 instance type recommendations instantly
- Based on model size and framework
- No load testing required
- Free to run

**Advanced job (load testing):**
- Benchmarks model across up to 10 instance types
- Simulates production traffic patterns
- Measures latency percentiles (p50, p90, p99)
- Tests different concurrency levels
- Provides cost-performance trade-off analysis

Cost optimization insights:
```
Inference Recommender Output:
  Model: ResNet50 image classification

  Instance Type    | Latency (p99) | Throughput | Cost/Month | Cost/1M Inferences
  -----------------|---------------|------------|------------|-------------------
  ml.g5.xlarge     | 45ms          | 500 TPS    | $844       | $1.17
  ml.m5.2xlarge    | 85ms          | 200 TPS    | $387       | $1.34
  ml.c6i.4xlarge   | 62ms          | 350 TPS    | $520       | $1.03  <- Optimal

  Recommendation: ml.c6i.4xlarge balances latency and cost
```

**Model Optimization Techniques:**

**SageMaker Neo (Model Compilation):**
- Compiles models for specific hardware targets
- Reduces model size by 90%
- Speeds up inference by 2x
- Enables deployment on edge devices
- Supports TensorFlow, PyTorch, MXNet, XGBoost

Cost benefits:
- Smaller instance types required (30-50% cost reduction)
- Lower latency enables higher throughput per instance
- Example: ml.c5.2xlarge compiled model vs ml.c5.4xlarge uncompiled

**Elastic Inference (Deprecated):**
- NOTE: Elastic Inference is deprecated; use Inferentia instances instead

**AWS Inferentia and Trainium Instances:**

Purpose-built ML accelerators:

**Inferentia (ml.inf2 instances):**
- Optimized for deep learning inference
- Up to 50% lower cost than comparable GPU instances
- Supports TensorFlow, PyTorch via AWS Neuron SDK
- Ideal for: Transformers, CNNs, RNNs

**Trainium (ml.trn1 instances):**
- Optimized for deep learning training and inference
- 30-50% better price-performance than GPU instances
- Supports large language models and generative AI
- Ideal for: LLMs, stable diffusion, large-scale training

Cost comparison:
```
Deployment: BERT-Large inference

GPU (ml.g5.xlarge):
  - Rate: $1.408/hour
  - Throughput: 400 TPS
  - Monthly cost: $1,028

Inferentia (ml.inf2.xlarge):
  - Rate: $0.7581/hour
  - Throughput: 450 TPS (optimized)
  - Monthly cost: $553
  - Savings: 46%
```

**Auto-Scaling for Real-Time Endpoints:**

Dynamically adjust instance count based on load:

Scaling policies:
1. **Target tracking:** Maintain specific metric value (e.g., 70% CPU)
2. **Step scaling:** Add/remove instances based on CloudWatch alarms
3. **Scheduled scaling:** Scale for predictable patterns

Configuration:
```python
import boto3

client = boto3.client('application-autoscaling')

# Register endpoint as scalable target
client.register_scalable_target(
    ServiceNamespace='sagemaker',
    ResourceId='endpoint/my-endpoint/variant/AllTraffic',
    ScalableDimension='sagemaker:variant:DesiredInstanceCount',
    MinCapacity=1,
    MaxCapacity=10
)

# Define target tracking policy
client.put_scaling_policy(
    PolicyName='target-tracking-policy',
    ServiceNamespace='sagemaker',
    ResourceId='endpoint/my-endpoint/variant/AllTraffic',
    ScalableDimension='sagemaker:variant:DesiredInstanceCount',
    PolicyType='TargetTrackingScaling',
    TargetTrackingScalingPolicyConfiguration={
        'TargetValue': 70.0,
        'PredefinedMetricSpecification': {
            'PredefinedMetricType': 'SageMakerVariantInvocationsPerInstance'
        },
        'ScaleInCooldown': 300,
        'ScaleOutCooldown': 60
    }
)
```

Cost optimization:
- Scales to minimum capacity during low traffic (nights, weekends)
- Prevents over-provisioning for peak capacity
- Example: Scales from 10 instances (business hours) to 2 (nights)
  - Savings: 67% during off-peak (16 hours/day)

**AWS Documentation:**
- [Multi-Model Endpoints](https://docs.aws.amazon.com/sagemaker/latest/dg/multi-model-endpoints.html)
- [Inference Recommender](https://docs.aws.amazon.com/sagemaker/latest/dg/inference-recommender.html)
- [SageMaker Neo](https://docs.aws.amazon.com/sagemaker/latest/dg/neo.html)
- [Auto-Scaling Endpoints](https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling.html)

## Storage Cost Optimization

### Data Storage Strategies

ML workloads generate and consume significant data across training datasets, model artifacts, and inference results.

**S3 Storage Class Selection:**

**S3 Standard:**
- Use for: Frequently accessed training data, active model artifacts
- Cost: $0.023 per GB-month (first 50 TB)
- Retrieval: No retrieval fees

**S3 Intelligent-Tiering:**
- Automatically moves data between access tiers
- Use for: Datasets with unpredictable access patterns
- Cost: $0.0025 per 1,000 objects monitored
- Tiers:
  - Frequent Access: $0.023/GB-month
  - Infrequent Access: $0.0125/GB-month (>30 days)
  - Archive Instant Access: $0.004/GB-month (>90 days)
  - Deep Archive: $0.00099/GB-month (>180 days)

**S3 Standard-IA (Infrequent Access):**
- Use for: Archived training datasets, old model versions
- Cost: $0.0125/GB-month
- Retrieval: $0.01/GB
- Minimum: 128 KB per object, 30-day storage

**S3 Glacier Flexible Retrieval:**
- Use for: Long-term dataset archives, compliance retention
- Cost: $0.0036/GB-month
- Retrieval: Minutes to hours, $0.02-0.03/GB

Cost optimization example:
```
Training Data Lifecycle:

Active Dataset (0-30 days): S3 Standard
  - Size: 500 GB
  - Cost: 500 × $0.023 = $11.50/month

Historical Dataset (30-180 days): S3 Standard-IA
  - Size: 2 TB
  - Cost: 2000 × $0.0125 = $25/month

Archive (180+ days): S3 Glacier
  - Size: 10 TB
  - Cost: 10000 × $0.0036 = $36/month

Total: $72.50/month vs $288/month (all Standard)
Savings: 75%
```

**S3 Lifecycle Policies:**

Automate data tier transitions:
```json
{
  "Rules": [
    {
      "Id": "TrainingDataLifecycle",
      "Filter": {"Prefix": "training-data/"},
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "INTELLIGENT_TIERING"
        },
        {
          "Days": 180,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

**Data Deduplication:**

Eliminate redundant storage:
- Use S3 versioning judiciously (previous model versions)
- Implement checksum-based deduplication for datasets
- Store feature-engineered data once, reference in multiple jobs
- Use SageMaker Feature Store to avoid duplicate feature computation

**Model Artifact Management:**

Model Registry best practices:
- Compress model artifacts (gzip, tar)
- Delete old model versions after deprecation
- Use S3 lifecycle policies for retired models
- Store only production-approved models in expensive storage tiers

Example compression savings:
```
Uncompressed Model: 4.2 GB
Compressed (tar.gz): 1.1 GB
Savings: 74% storage reduction
```

**EBS Volume Optimization:**

Training job storage:
- Default: 30 GB EBS volume attached
- Adjust based on dataset size: `volume_size_in_gb` parameter
- Use Pipe Mode to eliminate EBS data storage
- Delete volumes when jobs complete (automatic in SageMaker)

Notebook instance storage:
- Right-size EBS volumes (default: 5 GB)
- Use SageMaker Studio for ephemeral storage
- Store data in S3, not local EBS volumes

**AWS Documentation:**
- [Amazon S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [S3 Lifecycle Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [SageMaker Storage Best Practices](https://docs.aws.amazon.com/sagemaker/latest/dg/model-train-storage.html)

### Feature Store Cost Optimization

SageMaker Feature Store provides online and offline feature storage with different cost characteristics.

**Feature Store Pricing:**

**Online Store:**
- Write throughput: $0.0000011 per write unit
- Read throughput: $0.000000223 per read unit
- Storage: $0.25 per GB-month
- Use for: Real-time inference requiring low-latency feature retrieval

**Offline Store:**
- Stored in S3 (S3 pricing applies)
- Athena query charges for feature extraction
- Use for: Batch training, historical feature analysis

Cost optimization strategies:
- Use offline store for training (cheaper S3 storage)
- Use online store only for real-time inference
- Implement TTL (time-to-live) for stale features
- Batch feature updates to reduce write costs

**AWS Documentation:**
- [SageMaker Feature Store Pricing](https://aws.amazon.com/sagemaker/pricing/)
- [Feature Store Best Practices](https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store.html)

## Cost Monitoring and Governance

### AWS Cost Explorer

Cost Explorer provides granular visibility into SageMaker spending patterns.

**Key Cost Explorer Features for ML:**

**Service-Level Analysis:**
- Filter by service: Amazon SageMaker
- Break down by: Training, Inference, Notebooks, Processing
- Time granularity: Daily, monthly, custom ranges

**Cost Allocation Tags:**

Tag all SageMaker resources for tracking:
```python
tags = [
    {'Key': 'Project', 'Value': 'RecommendationEngine'},
    {'Key': 'Environment', 'Value': 'Production'},
    {'Key': 'Team', 'Value': 'DataScience'},
    {'Key': 'CostCenter', 'Value': 'ML-Platform'}
]

# Apply to training jobs
estimator = Estimator(
    image_uri='training-image',
    role='SageMakerRole',
    instance_type='ml.p3.2xlarge',
    tags=tags
)

# Apply to endpoints
predictor.deploy(
    initial_instance_count=2,
    instance_type='ml.m5.xlarge',
    endpoint_name='production-endpoint',
    tags=tags
)
```

**Tag-Based Cost Analysis:**

Cost Explorer filtering:
- Group by: Project (compare multiple ML initiatives)
- Filter by: Environment (production vs development costs)
- Breakdown: Team (allocate costs to data science teams)

**Cost Anomaly Detection:**

Machine learning-powered anomaly detection:
- Automatically detect unusual spending patterns
- Alert on unexpected cost increases
- Root cause analysis (which service, resource, or account)

Configuration:
```
Create Cost Anomaly Monitor:
  - Service: Amazon SageMaker
  - Threshold: $500 anomaly
  - Notification: SNS topic / email

Example anomaly alert:
  "Detected $2,400 anomaly in SageMaker Training costs"
  Root cause: "Accidental p3.16xlarge instance running 24 hours"
```

**AWS Documentation:**
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
- [Cost Allocation Tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html)
- [AWS Cost Anomaly Detection](https://aws.amazon.com/aws-cost-management/aws-cost-anomaly-detection/)

### AWS Budgets

Proactive cost control with alerts and automated actions.

**Budget Types:**

**Cost Budgets:**
- Set spending limits for SageMaker services
- Alert when costs exceed thresholds
- Forecast-based alerts for projected overruns

**Usage Budgets:**
- Track specific usage metrics (instance hours, API calls)
- Prevent overconsumption of resources

**Savings Plans Budgets:**
- Monitor Savings Plans utilization
- Alert on low commitment utilization (<80%)

**Configuration Example:**

```
Budget: ML Production Workloads
  - Amount: $5,000/month
  - Scope: Filtered to tags (Environment=Production)
  - Alerts:
    - 80% threshold: Email notification
    - 100% threshold: Email + SNS notification
    - 120% forecasted: Email warning

Budget: SageMaker Training Development
  - Amount: $1,000/month
  - Scope: Filtered to tags (Environment=Development)
  - Alerts:
    - 90% threshold: Email notification
  - Actions:
    - 100% threshold: Stop all training jobs (automated response)
```

**Budget Actions (Automated Responses):**

Available automated actions:
- Apply IAM policies to prevent additional resource creation
- Stop EC2 instances (for self-managed ML infrastructure)
- Trigger Lambda function for custom remediation

Example automated response:
```python
# Lambda function triggered at budget threshold
import boto3

def lambda_handler(event, context):
    sagemaker = boto3.client('sagemaker')

    # Stop all running training jobs in specific project
    response = sagemaker.list_training_jobs(
        StatusEquals='InProgress',
        NameContains='development'
    )

    for job in response['TrainingJobSummaries']:
        sagemaker.stop_training_job(
            TrainingJobName=job['TrainingJobName']
        )
```

**AWS Documentation:**
- [AWS Budgets](https://aws.amazon.com/aws-cost-management/aws-budgets/)
- [Budget Actions](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html)

### CloudWatch Metrics for Cost Optimization

Monitor resource utilization to identify optimization opportunities.

**Key Metrics:**

**Training Jobs:**
- CPUUtilization: Target 70-90% for efficiency
- MemoryUtilization: Target 80-95%
- GPUUtilization: Target >70% (if using GPU instances)
- GPUMemoryUtilization: Target >60%
- DiskUtilization: Identify I/O bottlenecks

**Inference Endpoints:**
- ModelLatency: Identify over-provisioned instances
- Invocations: Track request volume
- InvocationsPerInstance: Measure instance efficiency
- CPUUtilization: Scale-in opportunity if consistently <30%

**Cost Optimization Insights from Metrics:**

Under-utilized GPU example:
```
Instance: ml.p3.2xlarge (V100 GPU)
Cost: $3.825/hour
GPUUtilization: 15% (average)

Analysis:
  - GPU underutilized (target >70%)
  - Model likely doesn't benefit from GPU
  - Recommendation: Migrate to ml.m5.2xlarge (CPU)
  - New cost: $0.538/hour
  - Savings: 86% ($3.287/hour)
```

Over-provisioned endpoint example:
```
Endpoint: ml.m5.xlarge (2 instances)
CPUUtilization: 12% (average)
InvocationsPerInstance: 50/hour

Analysis:
  - Severe under-utilization
  - Recommendation: Migrate to serverless inference
  - Current cost: $387/month (2 instances)
  - Serverless cost: ~$45/month (estimated)
  - Savings: 88%
```

**CloudWatch Alarms for Cost Events:**

Set alarms for cost-impacting scenarios:
- Long-running training jobs (>24 hours)
- Idle notebook instances (>2 hours no activity)
- Low endpoint utilization (<20% CPU for >1 hour)
- High endpoint latency (may need scaling up, increasing cost)

**AWS Documentation:**
- [SageMaker CloudWatch Metrics](https://docs.aws.amazon.com/sagemaker/latest/dg/monitoring-cloudwatch.html)
- [CloudWatch Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)

### Resource Cleanup and Lifecycle Management

Proactive resource management prevents cost accumulation.

**Automated Cleanup Strategies:**

**Idle Resource Detection:**

Lambda function for notebook cleanup:
```python
import boto3
from datetime import datetime, timedelta

def lambda_handler(event, context):
    sagemaker = boto3.client('sagemaker')
    cloudwatch = boto3.client('cloudwatch')

    # List all notebook instances
    notebooks = sagemaker.list_notebook_instances(
        StatusEquals='InService'
    )

    for nb in notebooks['NotebookInstances']:
        # Check if idle for 2+ hours
        metrics = cloudwatch.get_metric_statistics(
            Namespace='AWS/SageMaker',
            MetricName='CPUUtilization',
            Dimensions=[{
                'Name': 'NotebookInstanceName',
                'Value': nb['NotebookInstanceName']
            }],
            StartTime=datetime.now() - timedelta(hours=2),
            EndTime=datetime.now(),
            Period=3600,
            Statistics=['Average']
        )

        if all(m['Average'] < 5 for m in metrics['Datapoints']):
            # Stop idle notebook
            sagemaker.stop_notebook_instance(
                NotebookInstanceName=nb['NotebookInstanceName']
            )
```

**Endpoint Lifecycle Management:**

EventBridge rule for endpoint monitoring:
```json
{
  "source": ["aws.sagemaker"],
  "detail-type": ["SageMaker Endpoint State Change"],
  "detail": {
    "EndpointStatus": ["InService"]
  }
}
```

Connected Lambda tags endpoints with creation timestamp:
```python
def tag_new_endpoint(event, context):
    endpoint_name = event['detail']['EndpointName']

    sagemaker = boto3.client('sagemaker')
    sagemaker.add_tags(
        ResourceArn=f'arn:aws:sagemaker:region:account:endpoint/{endpoint_name}',
        Tags=[{
            'Key': 'CreatedAt',
            'Value': datetime.now().isoformat()
        }]
    )
```

Scheduled cleanup of old endpoints:
- Scan endpoints with CreatedAt tag >90 days
- Check invocation metrics (if zero, candidate for deletion)
- Send notification to owner before deletion
- Automated deletion after grace period

**Training Job Artifact Cleanup:**

SageMaker outputs model artifacts to S3 after training. Implement retention policies:
```json
{
  "Rules": [
    {
      "Id": "CleanupExperimentArtifacts",
      "Filter": {"Prefix": "experiments/"},
      "Status": "Enabled",
      "Expiration": {
        "Days": 30
      }
    },
    {
      "Id": "ArchiveProductionModels",
      "Filter": {"Prefix": "production-models/"},
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

**Development vs Production Governance:**

Enforce cost controls through tagging and SCPs:

Service Control Policy example:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyExpensiveInstancesInDevelopment",
      "Effect": "Deny",
      "Action": [
        "sagemaker:CreateTrainingJob",
        "sagemaker:CreateEndpoint"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestTag/Environment": "Development"
        },
        "StringLike": {
          "sagemaker:InstanceTypes": [
            "ml.p3.8xlarge",
            "ml.p3.16xlarge",
            "ml.p4d.*"
          ]
        }
      }
    }
  ]
}
```

**AWS Documentation:**
- [SageMaker Resource Lifecycle](https://docs.aws.amazon.com/sagemaker/latest/dg/ex1-cleanup.html)
- [EventBridge Integration](https://docs.aws.amazon.com/sagemaker/latest/dg/automating-sagemaker-with-eventbridge.html)

## MLA-C01 Exam Strategy

### Cost Optimization Concepts for the Exam

The MLA-C01 exam tests your ability to make cost-effective architecture decisions for ML workloads across the entire ML lifecycle.

**Key Exam Themes:**

**1. Pricing Model Selection:**

Understand when to apply each pricing model:
- Savings Plans: Predictable, sustained workloads (production inference, regular training)
- Spot instances: Fault-tolerant training jobs with checkpointing
- On-demand: Short-term, unpredictable, or critical workloads
- Serverless: Intermittent, unpredictable, or low-volume inference

**Exam scenario pattern:**
> "A company runs daily model retraining jobs on ml.p3.2xlarge instances, consuming 200 hours/month consistently. How can they reduce costs?"

Answer approach:
- Recognize predictable usage pattern
- Recommend ML Savings Plans (up to 64% savings)
- Mention one or three-year commitment trade-offs

**2. Right-Sizing Decisions:**

Exam will present scenarios with resource utilization data:

> "CloudWatch metrics show GPUUtilization at 18% for an ml.g5.xlarge inference endpoint serving a tabular data model. How should you optimize?"

Answer approach:
- Identify under-utilized GPU (target >70%)
- Tabular models don't benefit from GPU acceleration
- Recommend CPU instance (ml.m5.xlarge or ml.c5.xlarge)
- Calculate cost savings (GPU → CPU = ~75% reduction)

**3. Checkpoint Strategy for Spot Training:**

Expect questions on managed spot training configuration:

> "A 12-hour training job needs cost optimization. The model supports checkpointing every 15 minutes. Which configuration is most cost-effective?"

Answer approach:
- Enable `use_spot_instances=True`
- Configure `checkpoint_s3_uri` for fault tolerance
- Set appropriate `max_run` and `max_wait` parameters
- Expect 70-90% cost savings with spot instances

**4. Endpoint Hosting Trade-Offs:**

Exam scenarios will describe traffic patterns requiring endpoint selection:

Scenario patterns:
- **24/7 high traffic** → Real-time with Savings Plans or auto-scaling
- **Business hours only** → Serverless with provisioned concurrency
- **Unpredictable sporadic** → Serverless (pay-per-use)
- **Large payloads, async processing** → Asynchronous inference
- **Batch scoring** → Batch Transform

**5. Multi-Model Endpoint Use Cases:**

Recognize when multi-model endpoints provide cost benefits:

Suitable scenarios:
- Hundreds or thousands of similar models (personalization, tenant-specific)
- Models with low individual TPS requirements
- Same framework and container
- Similar model sizes and latency

Unsuitable scenarios:
- Models requiring different instance types (CPU vs GPU)
- High-TPS models requiring dedicated capacity
- Models with vastly different sizes

**6. Storage Cost Optimization:**

Exam will test S3 lifecycle policy knowledge:

> "A training dataset is accessed frequently for 30 days during active development, then occasionally for the next 60 days, and rarely afterward for compliance. What S3 storage strategy minimizes costs?"

Answer approach:
- 0-30 days: S3 Standard (frequent access)
- 30-90 days: S3 Standard-IA (infrequent access)
- 90+ days: S3 Glacier or Intelligent-Tiering
- Implement S3 Lifecycle policies for automation

**7. Purpose-Built Accelerators:**

Understand when to recommend Inferentia and Trainium:

Inferentia (ml.inf2):
- Deep learning inference optimization
- Transformers, CNNs, RNNs
- Up to 50% lower cost vs comparable GPU instances
- Requires AWS Neuron SDK compatibility

Trainium (ml.trn1):
- Training and inference for large models
- LLMs, generative AI
- 30-50% better price-performance than GPU
- Supports PyTorch and TensorFlow

**8. Cost Monitoring and Governance:**

Expect questions on cost visibility and control:

Tools and features:
- **AWS Cost Explorer:** Analyze spending patterns, forecast costs
- **Cost Allocation Tags:** Track costs by project, team, environment
- **AWS Budgets:** Set spending limits with alerts
- **CloudWatch Metrics:** Monitor resource utilization for right-sizing
- **SageMaker Inference Recommender:** Automated instance selection

**Common Exam Question Patterns:**

**Pattern 1: "MOST cost-effective" questions**
- Evaluate all options for total cost of ownership
- Consider both direct costs (instances) and indirect (storage, data transfer)
- Account for operational overhead (managed services vs self-managed)

**Pattern 2: "Minimize costs while meeting requirements"**
- Identify mandatory requirements (latency, throughput, availability)
- Eliminate options violating requirements
- Select cheapest option among remaining valid choices

**Pattern 3: Multi-select cost optimization strategies**
- Expect combinations: Spot + Checkpointing, Savings Plans + Auto-scaling
- Look for complementary strategies, not mutually exclusive
- Typical answer: 2-3 strategies working together

**Practice Approach:**

For cost optimization scenarios:
1. Identify workload characteristics (predictable vs variable, latency requirements)
2. Map to appropriate pricing model (Savings Plans, spot, on-demand, serverless)
3. Validate with right-sizing (instance type selection based on utilization)
4. Add optimization layers (auto-scaling, multi-model endpoints, storage lifecycle)
5. Consider monitoring and governance (tags, budgets, alarms)

**Cost Calculation Skills:**

Be prepared to compare costs mentally:

Example calculation:
```
Option A: Real-time endpoint (ml.m5.xlarge, 24/7)
  - Cost: $0.269/hour × 730 hours = $196/month

Option B: Serverless inference (1000 requests/day, 500ms each)
  - Requests/month: 30,000
  - Compute: 30,000 × 500ms × $0.0000133 = $200/month

Analysis: Similar cost, choose based on latency requirements
```

**AWS Documentation:**
- [SageMaker Pricing](https://aws.amazon.com/sagemaker/pricing/)
- [Well-Architected Framework - Cost Optimization](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/cost-optimization.html)

## Summary

Cost optimization for ML workloads requires a comprehensive approach spanning training, inference, storage, and governance. Key strategies include leveraging ML Savings Plans for predictable workloads (up to 64% savings), using managed spot training with checkpointing for fault-tolerant jobs (up to 90% savings), right-sizing instances based on CloudWatch metrics, selecting appropriate endpoint hosting options (real-time, serverless, asynchronous, batch), implementing multi-model endpoints for serving multiple models on shared infrastructure, optimizing storage with S3 lifecycle policies, using purpose-built accelerators (Inferentia, Trainium) for better price-performance, and establishing cost monitoring with Cost Explorer, Budgets, and cost allocation tags.

Effective cost optimization balances performance requirements with budget constraints, requiring continuous monitoring and adjustment as workloads evolve. For the MLA-C01 exam, focus on understanding pricing model selection criteria, recognizing appropriate use cases for each optimization strategy, and calculating cost trade-offs across different architectural approaches.
