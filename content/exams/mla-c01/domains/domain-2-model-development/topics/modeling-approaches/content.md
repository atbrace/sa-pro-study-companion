---
title: ML Modeling Approaches and Algorithm Selection
lastUpdated: 2026-01-11
---

# ML Modeling Approaches and Algorithm Selection

Choosing the right modeling approach is critical for ML success on AWS. This topic covers the decision-making process for selecting between SageMaker built-in algorithms, AutoML with Autopilot, foundation models via Bedrock, and specialized AI services. Understanding algorithm characteristics, use case patterns, and AWS service capabilities is essential for the MLA-C01 exam and real-world ML engineering.

## Problem Type Classification

### Supervised Learning

Supervised learning uses labeled training data where each example contains input features and a corresponding target value (label). The model learns the relationship between inputs and outputs to make predictions on new, unseen data.

**Classification Problems:**

Classification predicts discrete categorical outputs. The target variable belongs to a predefined set of classes.

- **Binary Classification**: Two possible classes (e.g., fraud/not fraud, spam/ham, churn/retain)
- **Multiclass Classification**: Three or more mutually exclusive classes (e.g., product categories, sentiment labels, image object types)
- **Multilabel Classification**: Multiple non-exclusive labels per instance (e.g., document tags, medical diagnoses)

**Regression Problems:**

Regression predicts continuous numerical outputs. The target variable can take any value within a range.

- **Linear Regression**: Relationship between features and target is approximately linear
- **Non-linear Regression**: Complex relationships requiring polynomial or tree-based approaches
- **Time Series Forecasting**: Predicting future values based on historical temporal patterns

**AWS SageMaker Supervised Algorithms:**
- **Linear Learner**: Binary/multiclass classification, regression
- **XGBoost**: Classification, regression, ranking
- **Factorization Machines**: Classification, regression with high-dimensional sparse data
- **DeepAR**: Time series forecasting
- **TabularPredictor**: AutoGluon for tabular data

**AWS Documentation:**
- [Supervised vs Unsupervised Learning](https://aws.amazon.com/compare/the-difference-between-machine-learning-supervised-and-unsupervised/)
- [Types of Algorithms](https://docs.aws.amazon.com/sagemaker/latest/dg/algorithms-choose.html)

### Unsupervised Learning

Unsupervised learning works with unlabeled data, discovering hidden patterns, structures, or relationships without predefined outputs. The algorithm identifies natural groupings or reduces dimensionality for visualization and feature engineering.

**Clustering:**

Clustering groups similar data points together based on feature similarity.

- **K-Means**: Partition data into K clusters with centroids, optimizing within-cluster variance
- **Hierarchical Clustering**: Build nested cluster hierarchies (agglomerative or divisive)
- **DBSCAN**: Density-based clustering that identifies arbitrary-shaped clusters and outliers

**Dimensionality Reduction:**

Reduce the number of features while preserving important information.

- **Principal Component Analysis (PCA)**: Linear transformation to orthogonal principal components
- **t-SNE**: Non-linear dimensionality reduction for visualization (not a SageMaker built-in)
- **Autoencoders**: Neural network-based compression and reconstruction

**Anomaly Detection:**

Identify data points that deviate significantly from normal patterns.

- **Random Cut Forest (RCF)**: Unsupervised anomaly detection assigning anomaly scores
- **Isolation Forest**: Tree-based anomaly detection isolating outliers
- **One-Class SVM**: Learn decision boundary around normal data

**AWS SageMaker Unsupervised Algorithms:**
- **K-Means**: Clustering algorithm
- **Principal Component Analysis (PCA)**: Dimensionality reduction
- **Random Cut Forest (RCF)**: Anomaly detection
- **IP Insights**: Unsupervised learning to detect anomalous IP addresses

**AWS Documentation:**
- [K-Means Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/k-means.html)
- [PCA Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/pca.html)
- [Random Cut Forest Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/randomcutforest.html)

### Semi-Supervised and Reinforcement Learning

**Semi-Supervised Learning:**

Combines small amounts of labeled data with large amounts of unlabeled data during training. Useful when labeling is expensive or time-consuming.

- **Self-Training**: Model trained on labeled data pseudo-labels unlabeled data
- **Co-Training**: Multiple models train on different feature subsets
- **Label Propagation**: Labels propagate through similarity graphs

**Reinforcement Learning:**

Agent learns optimal actions through trial and error in an environment, receiving rewards or penalties.

- **AWS DeepRacer**: Reinforcement learning for autonomous racing
- **SageMaker RL**: Supports TensorFlow and PyTorch RL frameworks
- **Common Use Cases**: Robotics, game playing, resource optimization, recommendation systems

**AWS Documentation:**
- [SageMaker Reinforcement Learning](https://docs.aws.amazon.com/sagemaker/latest/dg/reinforcement-learning.html)

## SageMaker Built-in Algorithms

Amazon SageMaker provides production-ready, highly optimized implementations of common ML algorithms. These built-in algorithms are containerized, support distributed training, GPU acceleration, and automatic hyperparameter tuning.

### XGBoost Algorithm

XGBoost (Extreme Gradient Boosting) is an optimized implementation of gradient boosted decision trees. It builds an ensemble of decision trees sequentially, with each tree correcting errors from previous trees.

**Core Characteristics:**
- **Algorithm Type**: Supervised learning (gradient boosting framework)
- **Problem Types**: Binary classification, multiclass classification, regression, ranking
- **Data Format**: CSV, LibSVM, Parquet, RecordIO-protobuf
- **Training**: Distributed training across multiple instances, GPU support
- **Strengths**: Handles missing values, captures non-linear relationships, feature importance, regularization to prevent overfitting

**When to Use XGBoost:**
- Tabular/structured data with complex non-linear relationships
- Need for feature importance and model interpretability
- Categorical variables and missing data present
- Require high predictive accuracy with regularization
- Medium to large datasets (thousands to millions of rows)

**XGBoost Hyperparameters:**
- `num_round`: Number of boosting rounds (trees)
- `max_depth`: Maximum tree depth (controls complexity)
- `eta`: Learning rate/step size shrinkage
- `subsample`: Fraction of training data to sample per tree
- `colsample_bytree`: Fraction of features to sample per tree
- `alpha`: L1 regularization on weights
- `lambda`: L2 regularization on weights
- `objective`: Loss function (reg:squarederror, binary:logistic, multi:softmax)

**Real-World Use Cases:**
- Credit risk scoring and loan default prediction
- Customer churn prediction with mixed feature types
- Click-through rate (CTR) prediction for ad targeting
- Fraud detection with imbalanced datasets
- Medical diagnosis with structured clinical data

**AWS Documentation:**
- [XGBoost Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/xgboost.html)
- [XGBoost Hyperparameters](https://docs.aws.amazon.com/sagemaker/latest/dg/xgboost_hyperparameters.html)

### Linear Learner Algorithm

Linear Learner trains linear models for classification or regression problems. It provides multiple optimization algorithms (SGD, Adam, AdaGrad) and automatically explores different hyperparameter configurations.

**Core Characteristics:**
- **Algorithm Type**: Supervised learning (linear models)
- **Problem Types**: Binary classification, multiclass classification, regression
- **Data Format**: RecordIO-protobuf, CSV
- **Training**: Distributed training with automatic data sharding
- **Strengths**: Fast training, interpretable coefficients, handles high-dimensional sparse data, multiple optimizers

**When to Use Linear Learner:**
- Linear or approximately linear relationships between features and target
- High-dimensional sparse data (e.g., text features, one-hot encoded variables)
- Need for fast training and low-latency inference
- Require interpretable model coefficients
- Baseline model for comparison with complex algorithms

**Linear Learner Hyperparameters:**
- `predictor_type`: binary_classifier, multiclass_classifier, regressor
- `binary_classifier_model_selection_criteria`: accuracy, f1, precision, recall, cross_entropy_loss
- `num_models`: Number of parallel models trained with different hyperparameters (auto-tuning)
- `epochs`: Number of passes through training data
- `learning_rate`: Step size for gradient descent
- `mini_batch_size`: Batch size for training
- `l1`: L1 regularization parameter
- `wd`: Weight decay (L2 regularization)
- `optimizer`: auto, sgd, adam, adagrad, rmsprop

**Linear Learner vs XGBoost:**

| Aspect | Linear Learner | XGBoost |
|--------|---------------|---------|
| **Model Type** | Linear models | Tree ensemble |
| **Relationships** | Linear | Non-linear |
| **Interpretability** | High (coefficients) | Medium (feature importance) |
| **Training Speed** | Fast | Moderate |
| **Missing Values** | Requires imputation | Handles natively |
| **Sparse Data** | Excellent | Good |
| **Regularization** | L1/L2 | L1/L2 + tree-based |
| **Use Case** | Linear problems, baselines | Complex patterns, tabular data |

**Real-World Use Cases:**
- Spam detection with text features (high-dimensional sparse)
- Ad click prediction with categorical features
- Linear regression for demand forecasting
- Logistic regression for binary outcomes
- Quick baseline models before trying complex algorithms

**AWS Documentation:**
- [Linear Learner Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/linear-learner.html)
- [Linear Learner Hyperparameters](https://docs.aws.amazon.com/sagemaker/latest/dg/ll_hyperparameters.html)

### Factorization Machines Algorithm

Factorization Machines (FM) excel at capturing feature interactions in high-dimensional sparse datasets, particularly effective for recommendation systems and click prediction.

**Core Characteristics:**
- **Algorithm Type**: Supervised learning (matrix factorization)
- **Problem Types**: Binary classification, regression
- **Data Format**: RecordIO-protobuf
- **Training**: Distributed training, CPU and GPU support
- **Strengths**: Captures feature interactions, handles sparse data, efficient with millions of dimensions

**When to Use Factorization Machines:**
- High-dimensional sparse data (user-item matrices, categorical variables)
- Need to capture pairwise feature interactions automatically
- Recommendation systems (collaborative filtering)
- Click-through rate (CTR) prediction with sparse categorical features
- Limited labeled examples per feature value

**Key Hyperparameters:**
- `feature_dim`: Total number of features (input dimension)
- `num_factors`: Dimensionality of factorization (latent factors)
- `predictor_type`: binary_classifier, regressor
- `epochs`: Training passes
- `mini_batch_size`: Batch size

**Real-World Use Cases:**
- E-commerce product recommendations (user-item-context)
- Ad click prediction with user demographics and ad features
- Content recommendation with sparse user engagement data
- Personalized search ranking
- Movie/music recommendation systems

**AWS Documentation:**
- [Factorization Machines Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/fact-machines.html)

### K-Nearest Neighbors (k-NN) Algorithm

SageMaker k-NN is an index-based algorithm used for classification and regression. It uses a non-parametric approach, finding the k closest training examples to a query point.

**Core Characteristics:**
- **Algorithm Type**: Supervised learning (instance-based)
- **Problem Types**: Classification, regression
- **Data Format**: RecordIO-protobuf, CSV
- **Inference**: Uses dimension reduction (LSH, random projection) for efficient search
- **Strengths**: No training phase (lazy learning), handles non-linear decision boundaries, simple concept

**When to Use k-NN:**
- Small to medium datasets (inference scales with data size)
- Non-linear decision boundaries with localized patterns
- Need for simple, interpretable predictions (voting/averaging)
- Anomaly detection (low-density regions)
- Image similarity or content-based filtering

**Key Hyperparameters:**
- `k`: Number of nearest neighbors to consider
- `predictor_type`: classifier, regressor
- `sample_size`: Subsample of training data for indexing
- `dimension_reduction_type`: sign, fjlt (for high dimensions)
- `index_type`: faiss.Flat, faiss.IVFFlat, faiss.IVFPQ (index structure)

**Real-World Use Cases:**
- Image similarity search (find visually similar products)
- Document classification based on similar documents
- Real-time recommendation (similar users/items)
- Anomaly detection (unusual patterns far from neighbors)
- Handwriting recognition

**AWS Documentation:**
- [K-Nearest Neighbors Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/k-nearest-neighbors.html)

### DeepAR Forecasting Algorithm

DeepAR is a supervised learning algorithm for forecasting scalar time series using recurrent neural networks (RNNs). It learns across multiple related time series, capturing patterns and seasonality.

**Core Characteristics:**
- **Algorithm Type**: Supervised learning (RNN-based forecasting)
- **Problem Types**: Time series forecasting
- **Data Format**: JSON Lines, Parquet
- **Training**: Multiple related time series, probabilistic forecasts
- **Strengths**: Learns from related time series, handles cold-start, probabilistic predictions with quantiles

**When to Use DeepAR:**
- Forecasting multiple related time series (e.g., demand across SKUs)
- Need probabilistic forecasts (prediction intervals)
- Time series with missing values or irregular sampling
- Cold-start scenarios (new products with limited history)
- Complex seasonality and trend patterns

**Key Hyperparameters:**
- `context_length`: Number of time points the model sees before making predictions
- `prediction_length`: Forecast horizon (number of time steps to predict)
- `epochs`: Training iterations
- `num_layers`: Number of RNN layers
- `num_cells`: Number of RNN cells per layer
- `likelihood`: Likelihood model (gaussian, negative-binomial, student-t)

**Real-World Use Cases:**
- Retail demand forecasting across thousands of products
- Server capacity planning across multiple services
- Energy consumption forecasting for buildings/cities
- Financial time series prediction (stock prices, volatility)
- Website traffic prediction

**AWS Documentation:**
- [DeepAR Forecasting Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/deepar.html)

### Random Cut Forest (RCF)

Random Cut Forest is an unsupervised algorithm for anomaly detection. It assigns an anomaly score to each data point, identifying outliers and unusual patterns in streaming or batch data.

**Core Characteristics:**
- **Algorithm Type**: Unsupervised learning (ensemble of random cut trees)
- **Problem Types**: Anomaly detection, outlier detection
- **Data Format**: RecordIO-protobuf, CSV
- **Training**: Unsupervised (no labels required)
- **Strengths**: Real-time streaming, scalable, provides anomaly scores, handles high dimensions

**When to Use Random Cut Forest:**
- Anomaly detection without labeled anomaly examples
- Real-time streaming data monitoring
- Multivariate outlier detection
- Time series anomaly detection (spikes, level shifts)
- Arbitrary-dimensional input data

**How It Works:**

RCF builds an ensemble of random decision trees (isolation trees). For each data point:
1. Multiple trees isolate the point through random cuts
2. Anomalous points are isolated with fewer cuts (easier to separate)
3. Anomaly score is based on average isolation depth across trees
4. High scores indicate anomalies (typically beyond 3 standard deviations from mean)

**Key Hyperparameters:**
- `num_trees`: Number of trees in the forest (more trees = more stable scores)
- `num_samples_per_tree`: Number of random samples per tree
- `feature_dim`: Number of input features

**Real-World Use Cases:**
- Fraud detection in financial transactions
- Network intrusion detection
- Equipment sensor anomaly monitoring (predictive maintenance)
- Log analysis for system anomalies
- Quality control in manufacturing (defect detection)
- NASA spacecraft sensor anomaly detection (real example from 2025)

**AWS Documentation:**
- [Random Cut Forest Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/randomcutforest.html)
- [How RCF Works](https://docs.aws.amazon.com/sagemaker/latest/dg/rcf_how-it-works.html)

### Image and Text Algorithms

**Image Classification:**

SageMaker Image Classification is a supervised learning algorithm built on ResNet (Residual Neural Network). It supports multi-label classification and fine-tuning on custom datasets.

- **Input**: Images (RGB, grayscale)
- **Output**: Class labels with confidence scores
- **Transfer Learning**: Pre-trained on ImageNet, fine-tune on custom data
- **Use Cases**: Product categorization, medical image classification, quality inspection

**Object Detection:**

SageMaker Object Detection uses Single Shot MultiBox Detector (SSD) to identify and locate multiple objects within images.

- **Input**: Images with bounding box annotations
- **Output**: Object classes and bounding box coordinates
- **Use Cases**: Autonomous vehicles, retail shelf monitoring, security surveillance

**Semantic Segmentation:**

Pixel-level classification using Fully Convolutional Networks (FCN) or Mask R-CNN.

- **Input**: Images with pixel-wise labeled masks
- **Output**: Segmentation mask (class per pixel)
- **Use Cases**: Medical image segmentation, autonomous driving scene understanding

**BlazingText:**

Highly optimized implementation of Word2vec and text classification algorithms.

- **Modes**: Word embeddings (unsupervised), text classification (supervised)
- **Use Cases**: Sentiment analysis, document categorization, semantic similarity
- **Speed**: Optimized for scale, trains on millions of documents quickly

**Sequence-to-Sequence (Seq2Seq):**

Neural machine translation using encoder-decoder RNN architecture with attention mechanism.

- **Use Cases**: Language translation, text summarization, speech recognition transcription

**AWS Documentation:**
- [Image Classification Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/image-classification.html)
- [Object Detection Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/object-detection.html)
- [BlazingText Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/blazingtext.html)
- [Sequence-to-Sequence Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/seq-2-seq.html)

### Algorithm Selection Decision Tree

```
Start: What is your problem?
│
├─ Labeled data available?
│  │
│  ├─ YES (Supervised Learning)
│  │  │
│  │  ├─ What is the target variable?
│  │  │  │
│  │  │  ├─ Categorical (Classification)
│  │  │  │  │
│  │  │  │  ├─ Linear relationships? → Linear Learner
│  │  │  │  ├─ Complex/non-linear? → XGBoost
│  │  │  │  ├─ High-dimensional sparse? → Factorization Machines
│  │  │  │  ├─ Instance-based? → k-NN
│  │  │  │  ├─ Images? → Image Classification
│  │  │  │  └─ Text? → BlazingText
│  │  │  │
│  │  │  └─ Continuous (Regression)
│  │  │     │
│  │  │     ├─ Time series? → DeepAR
│  │  │     ├─ Linear relationships? → Linear Learner
│  │  │     └─ Non-linear? → XGBoost
│  │  │
│  │  └─ Special tasks?
│  │     │
│  │     ├─ Object localization? → Object Detection
│  │     ├─ Pixel segmentation? → Semantic Segmentation
│  │     └─ Sequence translation? → Seq2Seq
│  │
│  └─ NO (Unsupervised Learning)
│     │
│     ├─ Find groups? → K-Means (clustering)
│     ├─ Reduce dimensions? → PCA
│     ├─ Detect anomalies? → Random Cut Forest
│     └─ Word embeddings? → BlazingText (unsupervised mode)
│
└─ Agent learning from environment? → Reinforcement Learning (SageMaker RL)
```

**AWS Documentation:**
- [Built-in Algorithms and Pretrained Models](https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html)

## Amazon SageMaker Autopilot

SageMaker Autopilot is an AutoML capability that automatically explores different solutions and finds the best model for your dataset. It handles feature engineering, algorithm selection, and hyperparameter tuning.

### How Autopilot Works

**Workflow:**
1. **Data Analysis**: Inspects dataset, identifies data types, missing values, cardinality
2. **Feature Engineering**: Automatically generates feature transformations
3. **Model Selection**: Tries multiple algorithms and configurations
4. **Hyperparameter Tuning**: Optimizes model hyperparameters
5. **Model Ranking**: Compares models using cross-validation
6. **Deployment**: Provides best model for deployment

**Training Modes:**

**Ensembling Mode:**
- Builds stacked ensembles combining multiple base models
- Supported algorithms: XGBoost, LightGBM, CatBoost, Random Forest, Extra Trees, Linear Models, Neural Networks
- Best for smaller datasets (<100 MB)
- Higher accuracy through model diversity
- Automatically selected when dataset < 100 MB

**Hyperparameter Optimization (HPO) Mode:**
- Uses Bayesian optimization to find optimal hyperparameters
- Supported algorithms: XGBoost, Linear Learner, Deep Learning models
- Best for larger datasets (>100 MB)
- Faster than ensembling on large data
- Automatically selected when dataset >= 100 MB

**Auto Mode vs Manual Selection:**
- **Auto**: Autopilot automatically chooses ensembling or HPO based on dataset size
- **Manual**: Specify training mode and algorithms explicitly

**Key Features:**
- **Transparency**: Generates notebooks showing feature engineering and model training code
- **Explainability**: Provides feature importance and model insights
- **Deployment**: One-click deployment to real-time or batch inference
- **Problem Types**: Binary classification, multiclass classification, regression

**When to Use Autopilot:**
- Rapid prototyping and baseline model creation
- Limited ML expertise on team
- Need transparent, explainable AutoML
- Tabular data (CSV/Parquet format)
- Want to understand feature engineering steps
- Exploratory analysis to identify promising approaches

**When NOT to Use Autopilot:**
- Specialized problem requiring custom algorithms
- Non-tabular data (images, text, time series)
- Need for specific architecture (e.g., custom neural networks)
- Real-time training constraints (Autopilot explores many candidates)

**Autopilot Limits:**
- **Input data size**: 100 GB maximum
- **Features**: 1,000 columns maximum
- **Target column**: Must be categorical (classification) or numerical (regression)
- **Missing values**: Handled automatically
- **Training time**: Can be long for large datasets (explores many candidates)

**Real-World Use Cases:**
- Customer churn prediction (quick baseline)
- Fraud detection model prototyping
- Demand forecasting for retail
- Credit risk assessment
- Lead scoring for sales teams

**AWS Documentation:**
- [SageMaker Autopilot](https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-automate-model-development.html)
- [Autopilot Training Modes and Algorithms](https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-model-support-validation.html)
- [Create Autopilot Experiment](https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-automate-model-development-create-experiment.html)

## Amazon Bedrock and Foundation Models

Amazon Bedrock provides access to high-performing foundation models (FMs) from leading AI companies through a unified API. Bedrock enables generative AI use cases without managing infrastructure.

### Available Foundation Models (2026)

Amazon Bedrock now offers nearly 100 serverless models, including recent additions like Claude 3.7 Sonnet (February 2025) and 18 new open-weight models from Google, MiniMax AI, Mistral AI, Moonshot AI, NVIDIA, OpenAI, and Qwen.

**Model Providers and Specializations:**

**Anthropic (Claude):**
- **Claude 3.7 Sonnet**: Most advanced Claude model, extended context, coding, analysis
- **Claude 3.5 Sonnet**: Enterprise tasks, long documents, function calling
- **Claude 3 Opus**: Highest capability, complex reasoning
- **Strengths**: Reasoning, creative writing, dialogue, coding, safety

**Amazon (Titan):**
- **Titan Text**: Text generation, summarization, classification, Q&A, information extraction
- **Titan Embeddings**: Text embeddings for semantic search and RAG
- **Titan Image Generator**: Text-to-image generation
- **Titan Multimodal Embeddings**: Image and text embeddings
- **Strengths**: Enterprise-focused, cost-effective, responsible AI features

**AI21 Labs (Jurassic):**
- **Jurassic-2 Ultra/Mid**: Long-form text generation, Q&A, summarization
- **Strengths**: Enterprise text tasks, multilingual, instruction following

**Cohere:**
- **Command**: Text generation, summarization, dialogue
- **Command R/R+**: Retrieval-augmented generation (RAG) optimized
- **Embed**: Multilingual embeddings for search and classification
- **Strengths**: RAG, multilingual support, semantic search

**Meta (Llama):**
- **Llama 3.2/3.3**: Open-weight models for text and code
- **Strengths**: Open source, customizable, cost-effective

**Mistral AI:**
- **Mistral Large 3**: Long context, multimodal, agentic workflows, coding
- **Ministral (3B, 8B, 14B)**: Efficient smaller models
- **Strengths**: Multilingual, math/coding, tool use

**Stability AI:**
- **Stable Diffusion XL**: Text-to-image generation
- **Strengths**: Image generation, customization

### Foundation Model Selection Criteria

**Task Alignment:**
- **Text Generation**: Claude, Titan Text, Jurassic, Command, Llama
- **Conversational AI**: Claude, Command
- **Code Generation**: Claude, Llama, Mistral
- **Embeddings**: Titan Embeddings, Cohere Embed
- **Image Generation**: Titan Image Generator, Stable Diffusion
- **Multimodal**: Claude, Titan Multimodal

**Context Length:**
- **Short context (<8K tokens)**: Most models
- **Medium context (8K-32K)**: Claude 3.5 Sonnet, Command R
- **Long context (>100K tokens)**: Claude 3.7 Sonnet (200K), Mistral Large 3

**Cost Optimization:**
- **On-Demand**: Pay per token (input/output pricing)
- **Provisioned Throughput**: Reserved capacity for consistent workloads
- **Model Size**: Smaller models (Ministral 3B) cheaper than large models (Claude Opus)

**Customization Needs:**
- **Fine-tuning**: Titan, Jurassic, Cohere, Llama (supports custom training)
- **Prompt Engineering**: All models (varies in instruction-following capability)
- **Retrieval-Augmented Generation (RAG)**: Command R+, Claude, Titan with vector DBs

**Compliance and Safety:**
- **Bedrock Guardrails**: Block harmful content, apply safety filters (up to 88% harmful content blocked)
- **Data Privacy**: No data used for model improvement (customer data isolation)
- **Responsible AI**: Model cards, bias mitigation, explainability tools

### Bedrock Use Cases

**Document Intelligence:**
- Extract insights from PDFs, contracts, reports
- Summarize long documents
- Q&A over enterprise knowledge bases
- Pattern: Textract (extract) → Bedrock (understand/summarize) → Application

**Conversational AI:**
- Customer service chatbots
- Virtual assistants
- Technical support automation
- Pattern: User input → Bedrock (Claude) → Response with conversation history

**Content Generation:**
- Marketing copy, product descriptions
- Code generation and documentation
- Email drafting, report writing
- Pattern: Prompt template → Bedrock → Generated content → Human review

**Search and Recommendations:**
- Semantic search with embeddings
- Product/content recommendations
- Knowledge base search
- Pattern: Content → Titan Embeddings → Vector DB → Similarity search

**Real-World Success Story:**

Robinhood transformed into an AI-first financial platform using Bedrock:
- Scaled from 500 million to 5 billion tokens daily in 6 months
- Reduced AI costs by 80%
- Cut development time in half
- Enabled personalized financial insights at scale

### Bedrock vs SageMaker Decision

**Use Bedrock When:**
- Need pre-trained foundation models for general tasks
- Limited ML expertise or small ML team
- Want serverless, fully managed inference
- Focus on generative AI (text, images, embeddings)
- Rapid prototyping and time-to-market critical
- Don't need custom model training

**Use SageMaker When:**
- Need custom models trained on proprietary data
- Have specialized ML requirements (custom algorithms, architectures)
- Require full control over training, data, infrastructure
- Building domain-specific models (e.g., medical imaging, industrial IoT)
- Need advanced MLOps (experiments, model registry, pipelines)
- Have data science expertise to build and tune models

**Combined Approach:**

Many organizations use both:
- Bedrock for rapid prototyping and general-purpose AI
- SageMaker for custom models requiring fine-grained control
- Example: Use Bedrock for customer-facing chatbot, SageMaker for proprietary fraud detection model

**AWS Documentation:**
- [What is Amazon Bedrock?](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html)
- [Supported Foundation Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
- [Bedrock Foundation Model Information](https://docs.aws.amazon.com/bedrock/latest/userguide/foundation-models-reference.html)
- [Amazon Bedrock or SageMaker Decision Guide](https://docs.aws.amazon.com/decision-guides/latest/bedrock-or-sagemaker/bedrock-or-sagemaker.html)

## AWS AI Services

AWS AI Services provide pre-trained ML capabilities for common use cases via simple API calls. These services eliminate the need for ML expertise and infrastructure management.

### Computer Vision Services

**Amazon Rekognition:**

Rekognition provides deep learning-based image and video analysis without requiring ML expertise.

**Key Capabilities:**
- **Object and Scene Detection**: Identify thousands of objects (cars, pets, furniture) and scenes (beach, cityscape)
- **Facial Analysis**: Detect faces, estimate age range, identify emotions, facial recognition
- **Text Detection**: Extract text from images (OCR) with location and confidence scores
- **Content Moderation**: Detect inappropriate content (explicit, suggestive, violent)
- **Celebrity Recognition**: Identify famous individuals
- **Face Comparison**: Compare faces across images
- **Video Analysis**: Real-time streaming video or stored video analysis

**Use Cases:**
- User verification (facial recognition for authentication)
- Content moderation for user-generated images/videos
- Sentiment analysis from facial expressions
- Searchable image/video libraries
- Automated metadata tagging for media assets
- Compliance monitoring (detect inappropriate content)

**When to Use Rekognition:**
- Image/video analysis without ML expertise
- Pre-built models meet requirements (no custom training needed)
- Need fast deployment with minimal code
- Standard computer vision tasks (face detection, object recognition, OCR)

**When NOT to Use Rekognition:**
- Highly specialized object detection (custom industrial parts)
- Need custom-trained models on proprietary data
- Require fine-grained control over model architecture
- Domain-specific objects not covered by pre-trained models

**AWS Documentation:**
- [What is Amazon Rekognition?](https://docs.aws.amazon.com/rekognition/latest/dg/what-is.html)
- [Rekognition Image Analysis](https://docs.aws.amazon.com/rekognition/latest/dg/images.html)
- [Rekognition Video Analysis](https://docs.aws.amazon.com/rekognition/latest/dg/video.html)

### Natural Language Processing Services

**Amazon Comprehend:**

Comprehend uses NLP to extract insights and relationships from unstructured text.

**Key Capabilities:**
- **Sentiment Analysis**: Positive, negative, neutral, mixed sentiment detection
- **Entity Recognition**: Extract entities (people, places, organizations, dates, quantities)
- **Key Phrase Extraction**: Identify main topics and phrases
- **Language Detection**: Identify dominant language (100+ languages)
- **Syntax Analysis**: Part-of-speech tagging, tokenization
- **Topic Modeling**: Discover topics across document collections
- **Custom Classification**: Train custom classifiers on labeled data
- **Custom Entity Recognition**: Detect domain-specific entities

**Use Cases:**
- Customer feedback analysis (sentiment from reviews, support tickets)
- Document classification (route documents to appropriate teams)
- Content recommendation based on topics
- Brand monitoring across social media
- Compliance and risk detection in financial documents
- Medical record analysis (using Comprehend Medical)

**When to Use Comprehend:**
- Text analysis without NLP expertise
- Standard NLP tasks (sentiment, entities, topics)
- Need for pre-trained models with minimal setup
- Quick insights from customer feedback or documents

**When NOT to Use Comprehend:**
- Highly specialized domain language requiring extensive custom training
- Need for custom NLP architectures (e.g., custom transformers)
- Real-time streaming text analysis with sub-second latency requirements (use SageMaker)

**AWS Documentation:**
- [What is Amazon Comprehend?](https://docs.aws.amazon.com/comprehend/latest/dg/what-is.html)
- [Comprehend Insights](https://docs.aws.amazon.com/comprehend/latest/dg/how-it-works.html)

**Amazon Translate:**

Translate provides neural machine translation for 75+ languages with high accuracy.

**Key Capabilities:**
- **Real-Time Translation**: Translate text on-demand via API
- **Batch Translation**: Translate large document collections asynchronously
- **Custom Terminology**: Specify domain-specific translations (brand names, technical terms)
- **Formality Control**: Formal vs informal tone translation
- **Profanity Masking**: Mask profane words in translations
- **Auto Language Detection**: Automatically detect source language

**Use Cases:**
- Multilingual customer support (translate tickets, responses)
- Website/app localization (translate content for global users)
- Real-time chat translation for international teams
- Document translation for legal, medical, technical content
- E-commerce product description translation

**Integration Patterns:**
- **Lambda + Translate**: Real-time translation API
- **S3 + Translate**: Batch translate documents stored in S3
- **Comprehend + Translate**: Detect language, then translate
- **Polly + Translate**: Translate text, then convert to speech

**When to Use Translate:**
- Need for high-quality neural machine translation
- Support for 75+ languages out of the box
- Custom terminology for brand consistency
- Serverless, pay-per-use pricing model

**When NOT to Use Translate:**
- Need for custom translation models (rare language pairs)
- Require translation memory or CAT tool integration (use specialized services)

**AWS Documentation:**
- [What is Amazon Translate?](https://docs.aws.amazon.com/translate/latest/dg/what-is.html)
- [Supported Languages](https://docs.aws.amazon.com/translate/latest/dg/what-is-languages.html)

**Amazon Transcribe:**

Transcribe converts speech to text using automatic speech recognition (ASR).

**Key Capabilities:**
- **Real-Time Transcription**: Stream audio and receive text transcriptions
- **Batch Transcription**: Upload audio files for asynchronous processing
- **Speaker Identification**: Identify and label different speakers (diarization)
- **Custom Vocabulary**: Improve accuracy for domain-specific terms
- **Automatic Language Identification**: Detect spoken language
- **Redaction**: Automatically redact PII (personally identifiable information)
- **Subtitle Generation**: Create subtitles/captions for videos
- **Medical Transcription**: Transcribe Medical for clinical documentation

**Use Cases:**
- Call center analytics (transcribe customer calls)
- Video subtitling and accessibility
- Meeting transcription and note-taking
- Voice-controlled applications
- Medical documentation (clinical notes)
- Podcast/video content searchability

**When to Use Transcribe:**
- Speech-to-text without building ASR models
- Standard languages and accents (30+ languages)
- Need for speaker diarization
- PII redaction for compliance

**When NOT to Use Transcribe:**
- Highly specialized acoustic environments (noisy industrial settings)
- Custom ASR models for domain-specific vocabulary (use SageMaker)

**AWS Documentation:**
- [What is Amazon Transcribe?](https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html)
- [Transcribe Features](https://docs.aws.amazon.com/transcribe/latest/dg/how-it-works.html)

### Specialized AI Services

**Amazon Forecast:**

Forecast is a time series forecasting service using ML to predict future values based on historical data.

**Key Capabilities:**
- **AutoML**: Automatically selects best algorithm (CNN-QR, DeepAR+, Prophet, ARIMA, ETS, NPTS)
- **Related Time Series**: Incorporate related features (promotions, weather, holidays)
- **Probabilistic Forecasts**: Generate prediction intervals (P10, P50, P90 quantiles)
- **What-If Analysis**: Simulate scenarios with different assumptions

**Use Cases:**
- Retail demand forecasting (inventory optimization)
- Resource planning (staffing, capacity)
- Financial forecasting (revenue, cash flow)
- Energy demand prediction

**Forecast vs DeepAR (SageMaker):**
- **Forecast**: AutoML, fully managed, no code, optimized for business users
- **DeepAR**: More control, custom training, integration with SageMaker pipelines

**AWS Documentation:**
- [What is Amazon Forecast?](https://docs.aws.amazon.com/forecast/latest/dg/what-is-forecast.html)

**Amazon Personalize:**

Personalize creates real-time personalized recommendations using ML.

**Key Capabilities:**
- **User Personalization**: Recommend items based on user behavior
- **Similar Items**: Find items similar to a given item
- **Personalized Ranking**: Rerank items based on user preferences
- **Real-Time Events**: Update recommendations based on real-time user interactions

**Use Cases:**
- E-commerce product recommendations
- Video/music streaming recommendations
- Content personalization (news, articles)
- Email marketing personalization

**AWS Documentation:**
- [What is Amazon Personalize?](https://docs.aws.amazon.com/personalize/latest/dg/what-is-personalize.html)

**Amazon Textract:**

Textract extracts text, handwriting, and structured data from scanned documents using ML.

**Key Capabilities:**
- **Text Detection**: OCR for printed and handwritten text
- **Form Extraction**: Key-value pairs from forms
- **Table Extraction**: Extract tables with structure
- **Invoice/Receipt Processing**: Specialized APIs for invoices, receipts, IDs

**Use Cases:**
- Document digitization (PDFs, scanned images)
- Invoice processing automation
- Form data extraction (insurance claims, applications)
- Identity verification (passport, driver's license)

**AWS Documentation:**
- [What is Amazon Textract?](https://docs.aws.amazon.com/textract/latest/dg/what-is.html)

### AI Service Selection Decision Guide

**Use AI Services When:**
- Standard ML tasks (sentiment analysis, image recognition, translation)
- Limited ML expertise or tight timelines
- Need for quick deployment with minimal code
- Pre-trained models meet accuracy requirements
- Serverless, pay-per-use model preferred

**Use SageMaker Built-in Algorithms When:**
- Need for custom training on proprietary data
- Require model tuning and experimentation
- More control over hyperparameters and training
- Integration with SageMaker pipelines and MLOps

**Use SageMaker Custom Models When:**
- Specialized problem requiring custom architecture
- Pre-trained models don't meet accuracy requirements
- Domain-specific data requiring fine-tuning
- Full control over model lifecycle

**Decision Matrix:**

| Task | AI Service | SageMaker Built-in | Custom SageMaker |
|------|-----------|-------------------|------------------|
| **Image classification (general)** | Rekognition | Image Classification | Custom CNN |
| **Object detection (custom objects)** | - | Object Detection | Custom YOLO/R-CNN |
| **Sentiment analysis (standard)** | Comprehend | BlazingText | Custom BERT |
| **Entity extraction (custom)** | Comprehend Custom | - | Custom NER model |
| **Machine translation** | Translate | Seq2Seq | Custom transformer |
| **Speech-to-text** | Transcribe | - | Custom ASR |
| **Time series forecasting** | Forecast | DeepAR | Custom RNN/LSTM |
| **Tabular classification** | - | XGBoost, Linear Learner | Custom model |
| **Anomaly detection** | - | Random Cut Forest | Custom autoencoder |
| **Recommendation** | Personalize | Factorization Machines | Custom collaborative filtering |

**AWS Documentation:**
- [Choosing an AWS Machine Learning Service](https://docs.aws.amazon.com/decision-guides/latest/machine-learning-on-aws-how-to-choose/guide.html)

## Algorithm Selection Criteria

Selecting the right algorithm requires evaluating multiple factors beyond just problem type. Consider data characteristics, business constraints, and operational requirements.

### Data Characteristics

**Data Size:**
- **Small (<10K rows)**: k-NN, Linear Learner, simpler models (avoid overfitting)
- **Medium (10K-1M rows)**: XGBoost, Linear Learner, Random Forest
- **Large (>1M rows)**: XGBoost with distributed training, Linear Learner, Deep Learning
- **Very Large (>100M rows)**: Distributed algorithms, SageMaker distributed training

**Data Dimensionality:**
- **Low dimensions (<100 features)**: Most algorithms work well
- **High dimensions (100-1,000 features)**: Linear Learner, XGBoost, feature selection
- **Very high dimensions (>1,000 features)**: Linear Learner (handles sparse), PCA for reduction, Factorization Machines

**Data Sparsity:**
- **Dense data**: XGBoost, k-NN, most algorithms
- **Sparse data (many zeros)**: Linear Learner, Factorization Machines (optimized for sparse)
- **Text/categorical data**: BlazingText, Linear Learner with one-hot encoding

**Data Quality:**
- **Missing values**: XGBoost (handles natively), imputation + other algorithms
- **Outliers**: Tree-based models (XGBoost, Random Forest) robust to outliers
- **Imbalanced classes**: Class weighting, SMOTE, specialized loss functions (focal loss)

### Business Requirements

**Interpretability:**
- **High**: Linear Learner (coefficients), Decision Trees (rules)
- **Medium**: XGBoost (feature importance), Random Forest (feature importance)
- **Low**: Deep Learning (black box, requires explainability tools)

**Latency Requirements:**
- **Real-time (<10ms)**: Linear Learner, small models, model optimization (pruning, quantization)
- **Near real-time (<100ms)**: XGBoost, k-NN with indexing
- **Batch (minutes/hours)**: Any algorithm, prioritize accuracy over latency

**Cost Constraints:**
- **Training cost**: Linear Learner (fast), XGBoost (moderate), Deep Learning (expensive)
- **Inference cost**: Small models (Linear Learner), model compression, SageMaker Serverless Inference
- **Storage cost**: Model size (Linear Learner small, ensemble models larger)

**Accuracy vs Speed Tradeoff:**
- **Accuracy priority**: XGBoost with extensive tuning, ensemble methods, Deep Learning
- **Speed priority**: Linear Learner, shallow decision trees, simple models
- **Balanced**: XGBoost with moderate tuning, Random Forest

### Technical Considerations

**Feature Engineering:**
- **Minimal feature engineering**: XGBoost, Deep Learning (automatic feature interactions)
- **Extensive feature engineering**: Linear Learner (requires manual feature creation)
- **Automatic feature engineering**: SageMaker Autopilot, AutoGluon

**Scalability:**
- **Horizontal scaling**: Distributed algorithms (XGBoost, Linear Learner)
- **GPU acceleration**: Deep Learning, Image Classification, XGBoost (GPU support)
- **Streaming data**: k-NN, online learning algorithms, incremental training

**Model Updates:**
- **Frequent retraining**: Fast algorithms (Linear Learner), incremental learning
- **Infrequent retraining**: Complex models acceptable (Deep Learning, extensive XGBoost tuning)
- **Online learning**: Algorithms supporting incremental updates

### Practical Selection Examples

**Example 1: Credit Card Fraud Detection**

**Requirements:**
- Binary classification (fraud/not fraud)
- Highly imbalanced data (0.1% fraud rate)
- Real-time detection (<50ms latency)
- Interpretability for regulatory compliance
- Missing values in some features

**Algorithm Choice**: XGBoost
- **Rationale**:
  - Handles imbalanced data with `scale_pos_weight` parameter
  - Natively handles missing values
  - Provides feature importance (interpretability)
  - Fast inference with optimized model
  - High accuracy with regularization
- **Alternative**: Random Cut Forest for anomaly detection approach

**Example 2: E-commerce Product Recommendations**

**Requirements:**
- Predict user-item ratings (regression) or clicks (classification)
- High-dimensional sparse data (millions of users, products)
- Need to capture user-product interactions
- Cold-start problem (new users/products)

**Algorithm Choice**: Factorization Machines
- **Rationale**:
  - Optimized for sparse, high-dimensional data
  - Captures pairwise feature interactions
  - Handles cold-start with side features
  - Efficient training and inference
- **Alternative**: Amazon Personalize (fully managed, no code)

**Example 3: Manufacturing Quality Control**

**Requirements:**
- Detect defective products from sensor data
- No labeled defect data (rare failures)
- Real-time detection on production line
- Multivariate sensor readings (temperature, pressure, vibration)

**Algorithm Choice**: Random Cut Forest
- **Rationale**:
  - Unsupervised (no labels needed)
  - Real-time streaming anomaly detection
  - Handles multivariate data
  - Provides anomaly scores for threshold tuning
- **Alternative**: Isolation Forest, One-Class SVM (if batch processing acceptable)

**Example 4: Customer Support Ticket Routing**

**Requirements:**
- Multiclass classification (route to appropriate team)
- Text data (ticket descriptions)
- Need fast training (retrain weekly)
- High accuracy for customer satisfaction

**Algorithm Choice**: BlazingText (classification mode)
- **Rationale**:
  - Optimized for text classification
  - Fast training on large text datasets
  - High accuracy with pre-trained embeddings
  - Supports multiclass classification
- **Alternative**: Amazon Comprehend Custom Classification (no code, fully managed)

## MLA-C01 Exam Strategy

### High-Priority Exam Topics

**Algorithm Selection (Critical):**
- Map business requirements to appropriate algorithms
- Understand when to use supervised vs unsupervised learning
- Compare XGBoost, Linear Learner, Factorization Machines, k-NN use cases
- Identify appropriate algorithms for time series (DeepAR), anomaly detection (RCF), clustering (K-Means)

**Built-in Algorithm Characteristics:**
- XGBoost: Non-linear, handles missing values, feature importance
- Linear Learner: Linear relationships, sparse data, interpretable
- DeepAR: Time series, multiple related series, probabilistic forecasts
- Random Cut Forest: Anomaly detection, unsupervised, streaming data
- Factorization Machines: Sparse high-dimensional, feature interactions

**Autopilot:**
- Ensembling vs HPO modes (dataset size trigger: 100 MB)
- Supported problem types (binary/multiclass classification, regression)
- Transparency (generates notebooks)
- When to use Autopilot (rapid prototyping, limited expertise)

**Bedrock:**
- Foundation model providers (Anthropic, Amazon, AI21 Labs, Cohere, Meta, Mistral, Stability AI)
- Model selection criteria (task type, context length, cost)
- Bedrock vs SageMaker decision (pre-trained vs custom)
- Use cases (conversational AI, document intelligence, content generation)

**AI Services:**
- Rekognition: Image/video analysis, face detection, content moderation
- Comprehend: Sentiment, entities, topics, custom classification
- Translate: Neural machine translation, custom terminology
- Transcribe: Speech-to-text, speaker diarization
- When to use AI services vs SageMaker (pre-trained vs custom)

### Exam Question Patterns

**Scenario-Based Questions:**
- Given business requirements, select most appropriate algorithm
- Identify when to use AI service vs SageMaker built-in vs custom model
- Choose Bedrock foundation model based on task and constraints
- Determine Autopilot training mode based on dataset characteristics

**Comparison Questions:**
- XGBoost vs Linear Learner (non-linear vs linear, interpretability)
- Supervised vs unsupervised (labeled vs unlabeled data)
- Bedrock vs SageMaker (pre-trained vs custom)
- Ensembling vs HPO mode in Autopilot (accuracy vs speed, dataset size)

**Constraint-Based Questions:**
- Low latency requirements: simpler models (Linear Learner)
- High interpretability: Linear Learner, XGBoost feature importance
- Sparse high-dimensional data: Linear Learner, Factorization Machines
- No labeled data: unsupervised algorithms (K-Means, RCF, PCA)

**Troubleshooting Questions:**
- Poor performance on non-linear data: switch from Linear Learner to XGBoost
- Overfitting: increase regularization, reduce model complexity
- Underfitting: increase model complexity, add features
- Imbalanced data: use class weighting, specialized algorithms

### Study Tips

1. **Create comparison tables**: Build tables comparing algorithm characteristics (data type, problem type, strengths, limitations)
2. **Memorize key algorithms**: XGBoost, Linear Learner, DeepAR, RCF, K-Means, PCA
3. **Understand decision trees**: Practice mental decision trees for algorithm selection
4. **Know AI service capabilities**: Understand what each AI service does and when to use it
5. **Practice scenarios**: Work through business requirements and map to algorithms
6. **Review AWS documentation**: Focus on algorithm overviews and use cases in official docs
7. **Hands-on practice**: Deploy built-in algorithms in SageMaker to understand practical aspects

### Common Exam Traps

- **Don't confuse problem types**: Classification (categorical) vs regression (continuous)
- **Remember data format requirements**: Some algorithms require specific formats (RecordIO, LibSVM)
- **Know Autopilot limits**: 100 GB max data, 1,000 columns max, tabular data only
- **Understand Bedrock pricing**: On-demand (per-token) vs Provisioned Throughput
- **AI service vs SageMaker**: Pre-trained sufficiency vs need for custom training
- **Algorithm strengths**: XGBoost handles missing values natively, Linear Learner doesn't
- **Supervised requires labels**: Can't use supervised algorithms without labeled training data

### Key Formulas and Concepts

**Precision vs Recall:**
- **Precision**: TP / (TP + FP) - How many predicted positives are actually positive?
- **Recall**: TP / (TP + FN) - How many actual positives did we find?
- **F1 Score**: 2 * (Precision * Recall) / (Precision + Recall) - Harmonic mean

**Bias-Variance Tradeoff:**
- **High Bias**: Underfitting, model too simple (e.g., linear model on non-linear data)
- **High Variance**: Overfitting, model too complex (memorizing training data)
- **Solution**: Regularization (L1/L2), cross-validation, ensemble methods

**Cross-Validation:**
- K-fold: Split data into K subsets, train on K-1, validate on 1, repeat K times
- Used by Autopilot to evaluate model candidates
- Provides more robust performance estimates than single train/test split

**AWS Documentation:**
- [MLA-C01 Exam Guide](https://d1.awsstatic.com/training-and-certification/docs-machine-learning-engineer-associate/AWS-Certified-Machine-Learning-Engineer-Associate_Exam-Guide.pdf)
- [Built-in Algorithms Overview](https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html)

## Summary

Effective algorithm selection on AWS requires understanding:

1. **Problem type classification**: Supervised (classification, regression) vs unsupervised (clustering, dimensionality reduction, anomaly detection)
2. **SageMaker built-in algorithms**: XGBoost (non-linear tabular), Linear Learner (linear/sparse), Factorization Machines (sparse interactions), DeepAR (time series), Random Cut Forest (anomalies), K-Means (clustering), PCA (dimensionality reduction)
3. **SageMaker Autopilot**: AutoML for rapid prototyping with ensembling (<100 MB) or HPO (>=100 MB) modes
4. **Amazon Bedrock**: Foundation models for generative AI (Claude, Titan, Jurassic, Command, Llama, Mistral, Stable Diffusion)
5. **AWS AI Services**: Pre-trained APIs for common tasks (Rekognition, Comprehend, Translate, Transcribe, Forecast, Personalize)
6. **Selection criteria**: Data characteristics (size, dimensionality, sparsity), business requirements (interpretability, latency, cost), technical considerations (scalability, feature engineering)

The MLA-C01 exam tests your ability to map business requirements to appropriate AWS ML services and algorithms, understanding tradeoffs and making informed decisions for production ML systems.

**AWS Documentation:**
- [SageMaker Built-in Algorithms](https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html)
- [Types of Algorithms - Choose Algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/algorithms-choose.html)
- [SageMaker Autopilot](https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-automate-model-development.html)
- [Amazon Bedrock User Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html)
- [Choosing an AWS Machine Learning Service](https://docs.aws.amazon.com/decision-guides/latest/machine-learning-on-aws-how-to-choose/guide.html)
