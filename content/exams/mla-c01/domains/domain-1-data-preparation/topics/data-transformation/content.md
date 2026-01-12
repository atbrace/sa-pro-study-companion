---
title: Data Transformation Pipelines
lastUpdated: 2026-01-11
---

# Data Transformation Pipelines

Data transformation is the process of converting raw data into a format suitable for machine learning model training. This critical step in the ML workflow involves cleaning, normalizing, encoding, and engineering features to improve model performance. AWS provides multiple services optimized for different transformation scenarios, from visual no-code tools to scalable distributed processing frameworks.

Understanding when to use AWS Glue for serverless ETL, SageMaker Data Wrangler for interactive feature engineering, or EMR for large-scale Spark workloads is essential for the MLA-C01 exam. This topic covers transformation techniques, service selection criteria, and production pipeline patterns.

## AWS Services for Data Transformation

### AWS Glue

AWS Glue is a serverless data integration service that simplifies the discovery, preparation, and combination of data for analytics and machine learning. Glue provides both visual and code-based interfaces for building ETL (Extract, Transform, Load) pipelines.

**Key Capabilities:**

- **Serverless Architecture**: No infrastructure management required. Glue automatically provisions, configures, and scales resources based on workload demands.
- **Apache Spark Integration**: Glue ETL jobs run on managed Apache Spark environments, supporting both PySpark and Scala for distributed data processing.
- **AWS Glue Data Catalog**: Centralized metadata repository that stores table definitions, schema information, and connection details for data sources across your organization.
- **Job Scheduling**: Built-in scheduler with support for time-based triggers, event-driven triggers, and on-demand execution.
- **Development Endpoints**: Interactive development environments for authoring, debugging, and testing ETL scripts before production deployment.

**Common Transformation Patterns:**

1. **Schema Evolution**: Handle changing data schemas by using dynamic frames, which infer schema at runtime and support semi-structured data.
2. **Data Type Conversion**: Convert between different data types (string to numeric, timestamp parsing) using built-in transforms like `ApplyMapping`.
3. **Filtering and Sampling**: Remove invalid records or create representative data samples using `Filter` and `SampleData` transforms.
4. **Partitioning**: Organize output data by key columns (date, region, category) to optimize downstream query performance.
5. **Deduplication**: Identify and remove duplicate records based on primary key columns.

**When to Use AWS Glue:**

- Serverless ETL workloads that require automatic scaling
- Integration with AWS Glue Data Catalog for metadata management
- Jobs that process data from multiple sources (S3, RDS, Redshift, DynamoDB)
- Workflows requiring orchestration of multiple dependent ETL jobs
- Teams with limited infrastructure management resources

**AWS Documentation:**
- [AWS Glue Spark and PySpark Jobs](https://docs.aws.amazon.com/glue/latest/dg/spark_and_pyspark.html)
- [Configuring AWS Glue Job Properties](https://docs.aws.amazon.com/glue/latest/dg/add-job.html)
- [Running Spark ETL Jobs with Reduced Startup Times](https://docs.aws.amazon.com/glue/latest/dg/reduced-start-times-spark-etl-jobs.html)

### AWS Glue DataBrew

AWS Glue DataBrew is a visual data preparation tool designed for data analysts and scientists who need to clean and normalize data without writing code. DataBrew provides over 250 pre-built transformations and supports exploratory data analysis through an interactive interface.

**Key Features:**

- **Visual Interface**: Point-and-click interface for applying transformations, profiling data quality, and visualizing distributions.
- **Pre-built Transformations**: Over 250 transformations including missing value handling, outlier detection, string normalization, date formatting, and numerical scaling.
- **Data Profiling**: Automatic generation of data quality reports showing missing values, cardinality, correlations, and statistical summaries.
- **Recipe Creation**: Transformations are saved as reusable recipes that can be parameterized and applied to new datasets.
- **Integration with Glue**: DataBrew recipes can be integrated into AWS Glue Studio visual ETL jobs for end-to-end workflows.

**Common Use Cases:**

1. **Data Quality Assessment**: Profile datasets to understand missing values, outliers, and data distribution before ML training.
2. **String Standardization**: Remove whitespace, convert to lowercase, remove special characters for text features.
3. **Date Normalization**: Standardize date formats across datasets from different sources.
4. **Missing Value Handling**: Fill missing values with mean, median, mode, or custom values based on domain knowledge.
5. **Categorical Encoding Preparation**: Identify high-cardinality categorical features that need grouping or embedding.

**Transformation Categories:**

| Category | Examples | Use Cases |
|----------|----------|-----------|
| **Cleaning** | Remove duplicates, trim whitespace, standardize case | Text normalization, data quality improvement |
| **Filtering** | Filter rows by condition, sample data, remove outliers | Data subset creation, outlier handling |
| **Normalization** | Min-max scaling, Z-score standardization, mean normalization | Numeric feature scaling for algorithms sensitive to magnitude |
| **Aggregation** | Group by, pivot, window functions | Feature engineering from time-series or grouped data |
| **Enrichment** | Join datasets, create derived columns, extract from text | Combining data sources, feature creation |

**When to Use AWS Glue DataBrew:**

- Data exploration and profiling before building transformation pipelines
- Users without programming experience who need visual data preparation
- Rapid prototyping of data cleaning workflows
- Creating reusable transformation recipes for standardized data preparation
- Integration with AWS Glue ETL jobs for production pipelines

**AWS Documentation:**
- [What is AWS Glue DataBrew?](https://docs.aws.amazon.com/databrew/latest/dg/what-is.html)
- [7 Most Common Data Preparation Transformations in AWS Glue DataBrew](https://aws.amazon.com/blogs/big-data/7-most-common-data-preparation-transformations-in-aws-glue-databrew/)
- [Using AWS Glue DataBrew Recipes in Glue Studio ETL Jobs](https://aws.amazon.com/blogs/big-data/use-aws-glue-databrew-recipes-in-your-aws-glue-studio-visual-etl-jobs/)

### Amazon SageMaker Data Wrangler

Amazon SageMaker Data Wrangler is an integrated data preparation tool within SageMaker Studio that reduces the time to prepare data for ML from weeks to minutes. It provides over 300 built-in transformations, automatic feature engineering suggestions, and seamless integration with SageMaker training and Feature Store.

**Key Capabilities:**

- **Interactive Data Exploration**: Connect to data sources (S3, Athena, Redshift, EMR, Snowflake) and explore data directly in SageMaker Studio.
- **Automatic Data Insights**: Built-in visualizations showing data distributions, correlations, missing values, and target variable relationships.
- **300+ Built-in Transforms**: Includes both standard transforms and ML-specific transformations like text vectorization, datetime featurization, and categorical encoding.
- **Custom Transforms**: Write custom PySpark, SQL, or Pandas code for complex transformations not covered by built-in options.
- **Natural Language Interface**: Describe transformations in plain English and Data Wrangler generates the corresponding code.
- **Data Quality Reporting**: Automatically detect data quality issues like missing values, outliers, class imbalance, and target leakage.
- **Quick Model Training**: Train quick models to assess feature importance before investing in full-scale training.

**Feature Engineering Capabilities:**

1. **Text Featurization**:
   - Tokenization (word-level, character-level, subword)
   - TF-IDF vectorization
   - Bag-of-words encoding
   - Text length and character count features

2. **Datetime Features**:
   - Extract year, month, day, day of week, hour, minute
   - Calculate time differences
   - Create cyclical features (sine/cosine encoding for hour, month)
   - Business day calculations

3. **Categorical Encoding**:
   - One-hot encoding
   - Label encoding (ordinal)
   - Target encoding (mean encoding)
   - Frequency encoding
   - Hashing encoding for high-cardinality features

4. **Numerical Transformations**:
   - Min-max normalization
   - Standardization (Z-score)
   - Quantile transformation
   - Log transformation
   - Power transformation (Box-Cox, Yeo-Johnson)

5. **Custom Feature Engineering**:
   - Polynomial features
   - Binning (equal-width, equal-frequency, custom bins)
   - Mathematical operations across columns
   - Conditional feature creation

**Data Wrangler Flow:**

A Data Wrangler flow is a directed acyclic graph (DAG) where each node represents a transformation step. Flows can be:
- Exported as Python code for SageMaker Processing jobs
- Integrated into SageMaker Pipelines for MLOps workflows
- Used to populate SageMaker Feature Store for feature reuse
- Exported as Jupyter notebooks for further customization

**Scaling Data Wrangler Transformations:**

Data Wrangler operates on data samples during development (default 100,000 rows) for fast iteration. For production:
- **SageMaker Processing**: Export flow to a Processing job that runs on managed infrastructure with configurable instance types and counts.
- **SageMaker Pipelines**: Integrate as a step in an automated ML pipeline with orchestration, scheduling, and monitoring.
- **EMR Integration**: For petabyte-scale transformations, export flows to run on EMR clusters with Apache Spark.

**When to Use SageMaker Data Wrangler:**

- Interactive feature engineering with immediate visual feedback
- Teams working primarily in SageMaker Studio ecosystem
- ML workflows requiring integration with SageMaker Feature Store
- Rapid experimentation with different feature engineering approaches
- Automatic detection of data quality issues and feature importance

**AWS Documentation:**
- [Prepare ML Data with Amazon SageMaker Data Wrangler](https://docs.aws.amazon.com/sagemaker/latest/dg/data-wrangler.html)
- [Automate Feature Engineering Pipelines with Amazon SageMaker](https://aws.amazon.com/blogs/machine-learning/automate-feature-engineering-pipelines-with-amazon-sagemaker/)
- [Recommendations for Choosing Data Preparation Tools in SageMaker](https://docs.aws.amazon.com/sagemaker/latest/dg/data-prep.html)

### Amazon SageMaker Processing

Amazon SageMaker Processing provides fully managed infrastructure for running data preprocessing, feature engineering, and model evaluation workloads. Unlike Data Wrangler's interactive interface, Processing jobs are designed for production-scale transformations executed programmatically.

**Key Features:**

- **Bring Your Own Container**: Use pre-built containers (scikit-learn, PySpark, pandas) or custom Docker images with your dependencies.
- **Distributed Processing**: Run jobs across multiple instances with data automatically distributed for parallel processing.
- **Built-in Frameworks**: Native support for scikit-learn, Spark, Pandas, and XGBoost for common transformation patterns.
- **Input/Output Management**: Automatic data transfer from S3 to processing containers and results back to S3.
- **Integration with Pipelines**: First-class integration with SageMaker Pipelines for MLOps workflows.

**Scikit-learn Processing:**

The `SKLearnProcessor` class enables running scikit-learn scripts on managed infrastructure:

```python
from sagemaker.sklearn.processing import SKLearnProcessor

sklearn_processor = SKLearnProcessor(
    framework_version='1.2-1',
    role=role,
    instance_type='ml.m5.xlarge',
    instance_count=1
)

sklearn_processor.run(
    code='preprocessing.py',
    inputs=[ProcessingInput(source='s3://bucket/raw/', destination='/opt/ml/processing/input')],
    outputs=[ProcessingOutput(source='/opt/ml/processing/output', destination='s3://bucket/processed/')]
)
```

**Common Scikit-learn Transformations:**

- **StandardScaler**: Standardize features by removing mean and scaling to unit variance
- **MinMaxScaler**: Scale features to a given range (typically 0 to 1)
- **RobustScaler**: Scale features using statistics robust to outliers (median, IQR)
- **OneHotEncoder**: Convert categorical features to one-hot encoded vectors
- **LabelEncoder**: Encode categorical labels as integers
- **SimpleImputer**: Fill missing values with mean, median, mode, or constant
- **PolynomialFeatures**: Generate polynomial and interaction features

**PySpark Processing:**

For large-scale transformations, use PySparkProcessor to run Spark jobs:

```python
from sagemaker.spark.processing import PySparkProcessor

spark_processor = PySparkProcessor(
    base_job_name='spark-preprocessor',
    framework_version='3.3',
    role=role,
    instance_count=2,
    instance_type='ml.m5.xlarge',
    max_runtime_in_seconds=3600
)
```

**When to Use SageMaker Processing:**

- Production ML pipelines requiring programmatic, automated transformations
- Custom transformation logic using Python libraries (scikit-learn, pandas, custom code)
- Workflows integrated with SageMaker Pipelines for CI/CD
- Data transformations that need version control and reproducibility
- Teams already using SageMaker for training and deployment

**AWS Documentation:**
- [Data Transformation Workloads with SageMaker Processing](https://docs.aws.amazon.com/sagemaker/latest/dg/processing-job.html)
- [Run Processing Jobs with Scikit-learn](https://docs.aws.amazon.com/sagemaker/latest/dg/use-scikit-learn-processing-container.html)
- [Amazon SageMaker Processing - Fully Managed Data Processing](https://aws.amazon.com/blogs/aws/amazon-sagemaker-processing-fully-managed-data-processing-and-model-evaluation/)

### Amazon EMR

Amazon EMR (Elastic MapReduce) is a cloud-native big data platform for processing vast amounts of data using open-source frameworks like Apache Spark, Hive, Presto, and Flink. For ML workloads, EMR excels at large-scale data preprocessing and feature engineering on petabyte-scale datasets.

**Key Capabilities for ML:**

- **Performance-Optimized Spark**: EMR Runtime for Apache Spark provides 3x faster performance than open-source Spark for common workloads.
- **Multiple Deployment Options**: EMR Serverless for infrastructure-free processing, EMR on EC2 for fine-grained control, EMR on EKS for Kubernetes integration.
- **Cost Optimization**: Spot instance support, automatic scaling, and pay-per-use pricing for cost-effective large-scale processing.
- **Integration with ML Tools**: Direct integration with SageMaker, Glue DataBrew, and S3 for end-to-end ML workflows.

**Spark for Feature Engineering:**

EMR's Apache Spark provides distributed DataFrame operations ideal for feature engineering at scale:

```python
from pyspark.sql import functions as F
from pyspark.ml.feature import VectorAssembler, StandardScaler, StringIndexer

# Read data
df = spark.read.parquet("s3://bucket/raw-data/")

# Feature engineering
df_features = df.withColumn('days_since_registration',
                            F.datediff(F.current_date(), F.col('registration_date')))

# Categorical encoding
indexer = StringIndexer(inputCol="category", outputCol="category_index")
df_indexed = indexer.fit(df_features).transform(df_features)

# Numerical scaling
assembler = VectorAssembler(inputCols=["feature1", "feature2"], outputCol="features")
scaler = StandardScaler(inputCol="features", outputCol="scaled_features")
```

**EMR Integration with ML Ecosystem:**

1. **EMR + Glue DataBrew**: Use DataBrew to visually design transformations, then execute them at scale on EMR for large datasets.
2. **EMR + SageMaker Data Wrangler**: Prepare data from EMR in Data Wrangler, then export flows back to EMR for production processing.
3. **EMR + SageMaker**: Process features on EMR, store in S3 or Feature Store, then train models with SageMaker.
4. **EMR Notebooks**: Interactive Jupyter notebooks on EMR clusters for exploratory feature engineering.

**When to Use Amazon EMR:**

- Datasets larger than 1TB requiring distributed processing
- Complex Spark transformations not supported by Glue or SageMaker Processing
- Existing investment in Spark/Hadoop ecosystem
- Need for fine-grained cluster configuration and optimization
- Long-running transformation workloads (24/7 processing)
- Custom big data frameworks beyond standard AWS services

**AWS Documentation:**
- [Amazon EMR Documentation](https://docs.aws.amazon.com/emr/)
- [Data Preprocessing for Machine Learning on EMR with AWS Glue DataBrew](https://aws.amazon.com/blogs/big-data/data-preprocessing-for-machine-learning-on-amazon-emr-made-easy-with-aws-glue-databrew/)
- [Prepare Data from Amazon EMR for ML using SageMaker Data Wrangler](https://aws.amazon.com/blogs/machine-learning/prepare-data-from-amazon-emr-for-machine-learning-using-amazon-sagemaker-data-wrangler/)

## Feature Engineering Techniques

### Categorical Encoding

Categorical features must be converted to numerical representations for most ML algorithms. The choice of encoding method significantly impacts model performance and training efficiency.

**One-Hot Encoding:**

Creates binary columns for each category, where exactly one column has value 1 and others are 0. Best for nominal features with low to moderate cardinality.

**Advantages:**
- No ordinal relationship assumed between categories
- Works well with linear models and tree-based algorithms
- Interpretable feature importance

**Disadvantages:**
- High dimensionality with many categories (curse of dimensionality)
- Sparse feature matrices
- Not suitable for categories with >50 unique values

**Use Cases:**
- Color, country, product category with <50 unique values
- Linear regression, logistic regression input features
- Tree-based models (random forest, XGBoost)

**Label/Ordinal Encoding:**

Assigns integer values to categories (1, 2, 3, ..., n). Only appropriate when categories have inherent ordering.

**Advantages:**
- Compact representation (single column)
- Preserves ordinal relationships
- Memory efficient

**Disadvantages:**
- Implies ordinal relationship that may not exist
- Can mislead linear models into assuming linear relationship
- Distance between encodings may not reflect actual category similarity

**Use Cases:**
- Education level (high school, bachelor's, master's, PhD)
- T-shirt size (XS, S, M, L, XL)
- Rating scales (poor, fair, good, excellent)

**Target/Mean Encoding:**

Replaces categories with the mean of the target variable for that category. Effective for high-cardinality features but risks target leakage.

**Advantages:**
- Handles high-cardinality features efficiently
- Captures relationship between category and target
- Single numeric column per feature

**Disadvantages:**
- Risk of overfitting on training data
- Requires careful cross-validation implementation
- Not suitable for test data with unseen categories

**Implementation Best Practice:**
- Use K-fold cross-validation to calculate target means
- Apply smoothing to handle categories with few samples
- Add regularization to prevent overfitting

**Frequency Encoding:**

Replaces categories with their frequency or proportion in the dataset. Useful when category prevalence correlates with target.

**Hashing/Feature Hashing:**

Maps categories to fixed-size integer range using hash function. Ideal for extremely high-cardinality features or streaming data.

**Advantages:**
- Handles unlimited cardinality
- No need to store category mappings
- Works with unseen categories

**Disadvantages:**
- Potential hash collisions
- Loss of interpretability
- Fixed dimensionality may cause information loss

**AWS Service Support:**

| Encoding Method | Data Wrangler | Glue DataBrew | SageMaker Processing |
|----------------|---------------|---------------|----------------------|
| One-Hot | Built-in | Built-in | scikit-learn |
| Label/Ordinal | Built-in | Built-in | scikit-learn |
| Target | Built-in | Manual | Custom code |
| Frequency | Built-in | Manual | Custom code |
| Hashing | Built-in | Not available | scikit-learn |

**AWS Documentation:**
- [Machine Learning Lens - Feature Engineering](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/feature-engineering.html)
- [Amazon Machine Learning - Feature Processing](https://docs.aws.amazon.com/machine-learning/latest/dg/feature-processing.html)

### Numerical Feature Scaling

ML algorithms that use distance metrics (KNN, SVM, neural networks) or gradient descent optimization require features on similar scales. Scaling prevents features with larger magnitudes from dominating the learning process.

**Normalization (Min-Max Scaling):**

Scales features to a fixed range, typically [0, 1]:

```
X_normalized = (X - X_min) / (X_max - X_min)
```

**Characteristics:**
- Preserves relationships between values
- Bounded output range
- Sensitive to outliers (outliers compress majority of values)

**Best For:**
- Neural networks (inputs in similar range)
- Image processing (pixel values 0-255 → 0-1)
- Algorithms requiring bounded inputs
- Features with known min/max bounds

**Standardization (Z-score Scaling):**

Centers data around mean 0 with standard deviation 1:

```
X_standardized = (X - μ) / σ
```

**Characteristics:**
- Unbounded output (can exceed [-1, 1])
- Less sensitive to outliers than min-max
- Assumes approximately normal distribution

**Best For:**
- Linear regression, logistic regression
- Principal Component Analysis (PCA)
- Algorithms assuming normally distributed features
- Features with outliers

**Robust Scaling:**

Uses median and interquartile range (IQR) instead of mean and standard deviation:

```
X_robust = (X - median) / IQR
```

**Characteristics:**
- Highly resistant to outliers
- Centers data around median
- Uses robust statistics

**Best For:**
- Datasets with significant outliers
- Financial data with extreme values
- Sensor data with occasional anomalies

**Max Abs Scaling:**

Scales by maximum absolute value, preserving sign and sparsity:

```
X_maxabs = X / |X_max|
```

**Best For:**
- Sparse data (preserves zero entries)
- Data already centered around zero
- Recommendation systems with sparse user-item matrices

**Scaling Strategy by Service:**

- **AWS Glue DataBrew**: Offers min-max, Z-score, mean normalization, and custom scaling
- **SageMaker Data Wrangler**: Supports all standard scaling methods with preview of transformations
- **SageMaker Processing (scikit-learn)**: Full scikit-learn preprocessing library (StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler)

**Important Considerations:**

1. **Fit on Training Data Only**: Calculate scaling parameters (min, max, mean, std) only on training data, then apply to validation and test sets.
2. **Preserve Scaling Parameters**: Save scalers for inference to ensure consistent transformation of new data.
3. **Per-Feature Scaling**: Apply scaling independently to each feature unless features have inherent relationships.
4. **Post-Split Transformation**: Always split train/test before scaling to prevent data leakage.

**AWS Documentation:**
- [Data Preprocessing - Machine Learning Lens](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/data-preprocessing.html)
- [Storage Best Practices - Transforming Data Assets](https://docs.aws.amazon.com/whitepapers/latest/building-data-lakes/transforming-data-assets.html)

### Text Featurization

Text data requires conversion to numerical representations for ML algorithms. The choice of featurization method depends on the task (classification, sentiment analysis, semantic search) and model architecture.

**Tokenization:**

Breaking text into individual units (tokens):
- **Word-level**: Split by whitespace and punctuation
- **Character-level**: Each character is a token
- **Subword**: Byte-pair encoding (BPE) or WordPiece

**Bag-of-Words (BoW):**

Represents text as frequency count of words, ignoring order and grammar.

**TF-IDF (Term Frequency-Inverse Document Frequency):**

Weights word importance by frequency in document vs. corpus:
- High weight: Frequent in document, rare in corpus
- Low weight: Common across all documents

**Best For:**
- Document classification
- Information retrieval
- Traditional ML models (logistic regression, SVM)

**Word Embeddings:**

Dense vector representations capturing semantic meaning:
- **Pre-trained**: Word2Vec, GloVe, FastText
- **Contextual**: BERT, RoBERTa, GPT embeddings

**Text Features in SageMaker Data Wrangler:**
- Character count, word count, sentence count
- TF-IDF vectorization
- Text embedding using built-in models
- Custom regex pattern extraction

**AWS Documentation:**
- [SageMaker Data Wrangler - Text Transformations](https://docs.aws.amazon.com/sagemaker/latest/dg/data-wrangler.html)

### Datetime Feature Engineering

Datetime features contain rich information but require decomposition into meaningful components.

**Temporal Decomposition:**
- Year, month, day, day of week, hour, minute, second
- Quarter, week of year
- Is weekend, is business day, is holiday

**Cyclical Encoding:**

Datetime components like hour and month are cyclical (hour 23 is close to hour 0). Encode using sine/cosine transformation:

```python
hour_sin = sin(2π * hour / 24)
hour_cos = cos(2π * hour / 24)
```

**Time-based Features:**
- Days since event (registration, last purchase)
- Time to next event (maintenance, renewal)
- Rolling window statistics (7-day average, 30-day max)
- Lag features for time series

**AWS Service Support:**
- **Data Wrangler**: Built-in datetime transforms and cyclical encoding
- **Glue DataBrew**: Date extraction and formatting
- **SageMaker Processing**: Full pandas datetime functionality

### Handling Missing Values

Missing data can arise from collection errors, join operations, or sensor failures. The handling strategy depends on the missing data mechanism and percentage of missing values.

**Deletion Strategies:**
- **Listwise Deletion**: Remove entire rows with any missing values (only if <5% missing)
- **Column Deletion**: Remove features with >50% missing values

**Imputation Strategies:**

1. **Statistical Imputation**:
   - Mean/median for numerical features
   - Mode for categorical features
   - Zero or constant value when missingness is meaningful

2. **Forward/Backward Fill**:
   - For time-series data
   - Propagate last known value forward
   - Use next known value backward

3. **Model-based Imputation**:
   - KNN imputation (use similar samples)
   - Iterative imputation (predict missing values)
   - Matrix factorization for sparse data

4. **Indicator Variables**:
   - Create binary "is_missing" column
   - Preserves information that value was missing
   - Useful when missingness correlates with target

**Missing Value Handling in AWS Services:**

| Service | Methods Available |
|---------|------------------|
| Data Wrangler | Fill with mean/median/mode, drop missing, forward fill, indicator |
| Glue DataBrew | Fill with statistics, custom values, drop missing rows/columns |
| SageMaker Processing | scikit-learn SimpleImputer (mean, median, most_frequent, constant), custom logic |

**Best Practices:**
- Analyze patterns of missingness before choosing strategy
- Document imputation decisions for reproducibility
- Consider creating indicator variables for features with >10% missing
- Evaluate impact of different imputation strategies on model performance

## ETL Pipeline Design Patterns

### Pattern 1: Batch ETL with AWS Glue

Suitable for scheduled data transformations, data lake ingestion, and regular model retraining data preparation.

**Architecture:**
1. **Data Source**: S3, RDS, Redshift, DynamoDB
2. **AWS Glue Crawler**: Automatically discover schema and populate Data Catalog
3. **Glue ETL Job**: PySpark or Python Shell job for transformations
4. **Data Catalog**: Metadata repository for transformed data
5. **Target**: S3 (Parquet/Avro), Redshift, Feature Store

**Trigger Options:**
- Scheduled (cron expressions)
- On-demand via API/console
- Event-driven (S3 object creation, Catalog table update)
- Conditional (previous job completion)

**Optimization Techniques:**
- Use dynamic frames for schema flexibility
- Enable job bookmarks to process only new data
- Partition output data for query optimization
- Use pushdown predicates to reduce data read
- Configure worker type and count based on data volume

**Cost Optimization:**
- Use Glue Flex for non-time-critical jobs (save up to 35%)
- Implement job bookmarks to avoid reprocessing
- Right-size DPU allocation based on actual usage
- Use S3 lifecycle policies for transformed data

### Pattern 2: Interactive Feature Engineering with Data Wrangler

Ideal for data scientists exploring features, rapid prototyping, and creating reusable transformation flows.

**Workflow:**
1. **Connect to Data**: Import from S3, Athena, Redshift, Snowflake, or EMR
2. **Explore & Profile**: Use built-in analysis tools to understand data quality
3. **Apply Transformations**: Use visual interface or custom code (PySpark, SQL, Pandas)
4. **Validate**: Quick model training to assess feature importance
5. **Export**: Generate code for Processing job, Pipeline step, or Feature Store

**Export Options:**

- **SageMaker Processing Job**: Run transformation on production data with configurable compute
- **SageMaker Pipeline**: Integrate as automated step in ML workflow
- **Python Code**: Download notebook for customization
- **Feature Store**: Directly populate online/offline feature groups

**Best Practices:**
- Work on data samples during development (default 100K rows)
- Use data quality insights to identify issues early
- Create reusable flows for consistent transformations
- Version control exported code in Git
- Test flows on representative data before production

### Pattern 3: Production ML Pipeline with SageMaker Processing

Designed for automated, reproducible ML workflows with version control and monitoring.

**Pipeline Steps:**
1. **Data Validation**: Check schema, data quality, distribution shift
2. **Preprocessing**: Run Processing job with transformation code
3. **Feature Engineering**: Apply transformations, scaling, encoding
4. **Data Split**: Create train/validation/test sets
5. **Feature Store Update**: Populate feature groups for reuse
6. **Model Training**: SageMaker Training job with processed features
7. **Model Evaluation**: Processing job for model metrics
8. **Conditional Deployment**: Deploy only if metrics exceed threshold

**Infrastructure as Code:**

```python
from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.steps import ProcessingStep

processing_step = ProcessingStep(
    name="PreprocessData",
    processor=sklearn_processor,
    inputs=[ProcessingInput(source=input_data, destination="/opt/ml/processing/input")],
    outputs=[ProcessingOutput(source="/opt/ml/processing/train", destination=train_data),
             ProcessingOutput(source="/opt/ml/processing/validation", destination=val_data)],
    code="preprocessing.py"
)

pipeline = Pipeline(
    name="MLPipeline",
    steps=[processing_step, training_step, evaluation_step]
)

pipeline.upsert(role_arn=role)
pipeline.start()
```

**Monitoring and Observability:**
- CloudWatch metrics for job duration, data volume processed
- CloudWatch Logs for debugging transformation errors
- SageMaker Model Monitor for data drift detection
- EventBridge for pipeline event notifications

### Pattern 4: Large-Scale Transformation with EMR

Appropriate for petabyte-scale datasets, complex Spark transformations, and long-running processing workloads.

**Architecture:**

1. **Data Ingestion**: Kinesis, Kafka, S3 batch uploads
2. **EMR Cluster**: Auto-scaling Spark cluster (Core + Task nodes)
3. **Transformation Logic**: PySpark jobs with custom UDFs
4. **Intermediate Storage**: S3 with optimized formats (Parquet, ORC)
5. **Feature Output**: S3, Feature Store, or streaming to SageMaker

**Deployment Options:**

- **EMR on EC2**: Full control over cluster configuration, Spot instance support
- **EMR Serverless**: No cluster management, automatic scaling, pay-per-use
- **EMR on EKS**: Run Spark on existing Kubernetes clusters

**Performance Optimization:**

- Partition data by frequently filtered columns (date, region)
- Use columnar formats (Parquet, ORC) for compression and query performance
- Enable dynamic partition pruning
- Broadcast small lookup tables for joins
- Configure Spark memory and executor settings based on workload

**Cost Optimization:**

- Use Spot instances for Task nodes (50-90% cost savings)
- Implement auto-scaling to match workload demands
- Use EMR Managed Scaling for automatic cluster resizing
- Terminate clusters when idle with auto-termination policies
- Use S3 Select to reduce data transfer for filtering operations

### Pattern 5: Real-time Feature Transformation

For online predictions requiring low-latency feature computation.

**Options:**

1. **SageMaker Feature Store Online Store**: Pre-computed features with sub-20ms latency retrieval
2. **Lambda + Feature Store**: Lightweight transformations in Lambda before feature retrieval
3. **SageMaker Inference Pipeline**: Chain preprocessing containers with model serving
4. **Custom Inference Container**: Include transformation logic in model serving code

**Consistency Considerations:**

- Use same transformation code for training and inference (avoid train-serve skew)
- Version transformation logic alongside models
- Validate feature distributions in production vs. training
- Monitor feature values for drift or anomalies

## Orchestration and Workflow Management

### AWS Step Functions for ETL Workflows

Step Functions provides serverless orchestration for coordinating multiple AWS services in data transformation pipelines.

**Use Cases:**
- Coordinate Glue jobs, Lambda functions, and SageMaker Processing
- Implement retry logic and error handling
- Parallel processing of independent transformation steps
- Conditional execution based on data quality checks

**Integration with Data Services:**

```json
{
  "StartAt": "RunGlueJob",
  "States": {
    "RunGlueJob": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": {
        "JobName": "data-transformation-job"
      },
      "Next": "DataQualityCheck"
    },
    "DataQualityCheck": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "validate-data-quality"
      },
      "Next": "QualityCheckPassed"
    }
  }
}
```

**Benefits:**
- Visual workflow designer for pipeline development
- Built-in error handling and retry mechanisms
- State persistence for long-running workflows
- Integration with EventBridge for event-driven execution

### SageMaker Pipelines

SageMaker Pipelines is a purpose-built workflow orchestration service for ML workloads, providing CI/CD capabilities for ML.

**Key Features:**
- Native integration with SageMaker services (Processing, Training, Transform, Deploy)
- Parameterized pipelines for different datasets or experiments
- Caching of pipeline steps to avoid redundant computation
- Model registry integration for version tracking
- Automatic lineage tracking (data → features → model → deployment)

**Pipeline Components:**

- **Processing Step**: Data transformation and feature engineering
- **Training Step**: Model training with hyperparameters
- **Transform Step**: Batch inference on large datasets
- **Evaluation Step**: Model quality assessment
- **Condition Step**: Conditional logic (deploy if accuracy > threshold)
- **Model Step**: Register model in Model Registry

**Advantages over Step Functions:**
- ML-specific abstractions (no need to manage ARNs)
- Built-in experiment tracking and lineage
- Tighter integration with SageMaker Studio
- Automatic parameter and metric tracking

**When to Choose:**
- **SageMaker Pipelines**: End-to-end ML workflows entirely within SageMaker
- **Step Functions**: Hybrid workflows involving non-SageMaker services (Glue, Lambda, EMR)

**AWS Documentation:**
- [Prepare, Transform, and Orchestrate with Glue DataBrew, Glue ETL, and Step Functions](https://aws.amazon.com/blogs/big-data/prepare-transform-and-orchestrate-your-data-using-aws-glue-databrew-aws-glue-etl-and-aws-step-functions/)
- [Amazon SageMaker Pipelines Documentation](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines.html)

## Data Format Optimization

### Choosing Storage Formats

The file format for transformed data significantly impacts query performance, storage costs, and downstream processing efficiency.

| Format | Type | Compression | Schema Evolution | Best For |
|--------|------|-------------|------------------|----------|
| **CSV** | Row-based | Moderate (gzip) | Poor | Human readability, small datasets |
| **JSON** | Row-based | Moderate (gzip) | Good | Semi-structured, nested data |
| **Parquet** | Columnar | Excellent | Good | Analytics, columnar queries, ML training |
| **ORC** | Columnar | Excellent | Excellent | Hive/Presto queries, large-scale analytics |
| **Avro** | Row-based | Good | Excellent | Streaming, schema evolution |

**Parquet for ML Workloads:**

Parquet is the recommended format for ML training data due to:
- Efficient compression (up to 75% space savings vs. CSV)
- Column pruning (read only needed features)
- Predicate pushdown (filter at storage layer)
- Native support in Spark, Athena, Redshift Spectrum, SageMaker

**Conversion in AWS Services:**

- **Glue**: Write output as Parquet using `format="glueparquet"`
- **Data Wrangler**: Export data in Parquet format
- **SageMaker Processing**: Use pandas `to_parquet()` or PySpark `write.parquet()`
- **EMR**: Spark DataFrames can read/write Parquet natively

### Partitioning Strategies

Partitioning organizes data into subdirectories based on column values, enabling query engines to skip irrelevant data.

**Common Partition Keys:**
- Date/time: `year=2026/month=01/day=11/`
- Region: `region=us-east-1/`
- Category: `product_category=electronics/`

**Partition Best Practices:**

1. **Choose High-Cardinality Keys Carefully**: Avoid creating too many small partitions (>10,000 partitions can degrade performance)
2. **Left-to-Right Ordering**: Most frequently filtered columns first (date, then region, then category)
3. **Partition Size**: Aim for 128MB-1GB per partition file
4. **Hive-Style Partitioning**: Use `key=value` format for compatibility with Athena, Glue, Spark

**Glue Partitioning:**

```python
datasink = glueContext.write_dynamic_frame.from_options(
    frame=transformed_data,
    connection_type="s3",
    connection_options={
        "path": "s3://bucket/output",
        "partitionKeys": ["year", "month", "day"]
    },
    format="parquet"
)
```

## Data Quality and Validation

### Data Quality Checks

Implementing validation ensures transformed data meets quality standards before training.

**Common Checks:**

1. **Schema Validation**: Verify column names, data types, and nullability
2. **Range Validation**: Ensure numerical features within expected bounds
3. **Categorical Validation**: Check for unexpected category values
4. **Statistical Validation**: Compare distribution statistics (mean, std, quantiles) vs. baseline
5. **Completeness**: Check for acceptable levels of missing data
6. **Uniqueness**: Verify primary key constraints
7. **Referential Integrity**: Ensure foreign keys exist in referenced tables

**AWS Deequ for Data Quality:**

AWS Deequ is an open-source library for defining data quality constraints on Spark DataFrames. It integrates with Glue and EMR.

```python
from pydeequ.checks import Check, CheckLevel
from pydeequ.verification import VerificationSuite

check = Check(spark, CheckLevel.Error, "Data Quality Check") \
    .hasSize(lambda x: x >= 100) \
    .hasMin("price", lambda x: x >= 0) \
    .hasMax("discount", lambda x: x <= 1.0) \
    .isComplete("customer_id") \
    .isUnique("transaction_id")

result = VerificationSuite(spark) \
    .onData(df) \
    .addCheck(check) \
    .run()
```

**SageMaker Data Wrangler Analysis:**

Data Wrangler provides built-in data quality and bias reports:
- Missing value percentage per feature
- Outlier detection using IQR method
- Class imbalance metrics for classification
- Feature correlation matrix
- Target leakage detection

**Integration Points:**

- Run Deequ checks in Glue ETL jobs before writing output
- Implement validation in SageMaker Processing before training
- Use Step Functions to halt pipeline if quality checks fail
- Log quality metrics to CloudWatch for monitoring

**AWS Documentation:**
- [Data Preprocessing - Machine Learning Lens](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/data-preprocessing.html)

## MLA-C01 Exam Strategy

### Service Selection Criteria

**Choose AWS Glue when:**
- Serverless ETL at scale (TB to PB)
- Integration with Glue Data Catalog required
- Scheduling and workflow orchestration needed
- Team has Spark/PySpark expertise
- Jobs run on recurring schedules

**Choose AWS Glue DataBrew when:**
- Visual, no-code data preparation preferred
- Data analysts without programming background
- Rapid prototyping of transformation recipes
- Data profiling and quality assessment needed
- Reusable recipes for standardized transformations

**Choose SageMaker Data Wrangler when:**
- Interactive feature engineering in Studio
- ML-specific transformations (target encoding, datetime featurization)
- Integration with SageMaker Feature Store
- Quick model training to validate features
- Primarily working within SageMaker ecosystem

**Choose SageMaker Processing when:**
- Custom Python transformation logic (scikit-learn, pandas)
- Production ML pipelines with version control
- Integration with SageMaker Pipelines for MLOps
- Need for specific Python libraries or custom containers
- Automated, reproducible workflows

**Choose Amazon EMR when:**
- Datasets exceeding 10TB
- Complex Spark transformations not supported elsewhere
- Long-running, continuous processing workloads
- Need for fine-grained cluster optimization
- Integration with Hadoop ecosystem tools

### Common Exam Scenarios

**Scenario 1: High-Cardinality Categorical Feature**

*Question*: A model uses a feature with 10,000 unique city names. One-hot encoding creates excessive dimensionality. What encoding method should be used?

*Answer*: Use target encoding (mean encoding) or feature hashing. Target encoding replaces cities with the mean target value for that city, reducing to a single numeric column. Feature hashing maps cities to a fixed-size vector (e.g., 100 dimensions) using a hash function.

**Scenario 2: Scaling Different Algorithms**

*Question*: A data scientist needs to prepare features for both XGBoost and neural network models. What scaling strategy should be applied?

*Answer*: Tree-based models (XGBoost) are invariant to feature scaling and don't require it. Neural networks require scaled features (use standardization or min-max normalization). Prepare two versions of the data or apply scaling only for neural network training.

**Scenario 3: Missing Value Handling for Time Series**

*Question*: A time-series dataset has 15% missing values for a sensor reading feature. What imputation method is most appropriate?

*Answer*: Use forward fill (carry last known value forward) or interpolation methods. For time series, temporal relationships matter, making mean/median imputation inappropriate. Consider creating an indicator variable to flag imputed values.

**Scenario 4: Train-Test Data Leakage**

*Question*: A model performs well in training but poorly in production. Investigation reveals target encoding was applied before train-test split. What went wrong?

*Answer*: Data leakage occurred. Target encoding calculated means using the entire dataset, allowing test set information to leak into training. Correct approach: split data first, then calculate target encoding statistics only on training data and apply to test data.

**Scenario 5: Service Selection for Interactive Feature Engineering**

*Question*: A data scientist wants to visually explore feature transformations and see immediate impact on a quick model. Which service is best?

*Answer*: Amazon SageMaker Data Wrangler. It provides interactive exploration, visual transformation interface, built-in quick model training, and automatic feature importance analysis.

### Key Concepts to Remember

**Encoding Decision Tree:**
- Nominal, low cardinality (<50) → One-hot encoding
- Nominal, high cardinality (>50) → Target encoding, hashing, or frequency encoding
- Ordinal → Label/ordinal encoding preserving order
- High cardinality, streaming data → Feature hashing

**Scaling Decision Tree:**
- Tree-based models → No scaling needed
- Neural networks → Standardization or min-max normalization
- SVM, KNN → Standardization (distance-based algorithms)
- Features with outliers → Robust scaling

**Service for Pipeline Type:**
- Batch ETL, scheduled → AWS Glue
- Visual exploration → AWS Glue DataBrew or SageMaker Data Wrangler
- ML pipeline automation → SageMaker Processing + SageMaker Pipelines
- Petabyte-scale → Amazon EMR
- Real-time feature computation → Lambda + Feature Store

**Data Format Best Practices:**
- Training data → Parquet (columnar, compressed)
- Streaming data → Avro (schema evolution)
- Schema changes frequent → JSON or Avro
- Human readability required → CSV (small datasets only)

### Exam Tips

1. **Understand Trade-offs**: Questions often present scenarios where multiple services could work. Choose based on scale, team skills, integration requirements, and cost.

2. **Data Leakage Prevention**: Any question involving train-test split or cross-validation should trigger consideration of data leakage risks. Always fit transformations on training data only.

3. **Feature Engineering Justification**: Be prepared to explain *why* a particular encoding or scaling method is appropriate, not just *what* it does.

4. **Service Limitations**: Know when services aren't suitable (e.g., Glue DataBrew for petabyte-scale transformations, Data Wrangler for batch scheduled jobs).

5. **Pipeline Orchestration**: Understand when to use SageMaker Pipelines (pure ML workflows) vs. Step Functions (hybrid workflows with non-SageMaker services).

6. **Cost Optimization**: Questions may test knowledge of cost-saving features like Glue Flex, EMR Spot instances, or SageMaker Processing Spot training.

7. **Real-world Constraints**: Scenarios often include constraints (team skills, timeline, budget) that influence service selection beyond pure technical capability.

**AWS Documentation:**
- [Machine Learning Lens - Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/machine-learning-lens.html)
- [Recommendations for Choosing Data Preparation Tools in SageMaker](https://docs.aws.amazon.com/sagemaker/latest/dg/data-prep.html)

---

**Sources:**
- [AWS Glue Spark and PySpark Jobs](https://docs.aws.amazon.com/glue/latest/dg/spark_and_pyspark.html)
- [AWS Glue DataBrew - Visual Data Preparation](https://aws.amazon.com/glue/features/databrew/)
- [Amazon SageMaker Data Wrangler Documentation](https://docs.aws.amazon.com/sagemaker/latest/dg/data-wrangler.html)
- [7 Most Common Data Preparation Transformations in DataBrew](https://aws.amazon.com/blogs/big-data/7-most-common-data-preparation-transformations-in-aws-glue-databrew/)
- [SageMaker Processing - Data Transformation Workloads](https://docs.aws.amazon.com/sagemaker/latest/dg/processing-job.html)
- [Data Preprocessing for ML on EMR with Glue DataBrew](https://aws.amazon.com/blogs/big-data/data-preprocessing-for-machine-learning-on-amazon-emr-made-easy-with-aws-glue-databrew/)
- [Machine Learning Lens - Feature Engineering](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/feature-engineering.html)
- [Storage Best Practices - Transforming Data Assets](https://docs.aws.amazon.com/whitepapers/latest/building-data-lakes/transforming-data-assets.html)
- [Automate Feature Engineering Pipelines with SageMaker](https://aws.amazon.com/blogs/machine-learning/automate-feature-engineering-pipelines-with-amazon-sagemaker/)
