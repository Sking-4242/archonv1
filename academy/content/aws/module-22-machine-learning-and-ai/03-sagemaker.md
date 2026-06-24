---
title: "Amazon SageMaker: Custom ML Model Development"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "AIF-C01", "MLA-C01"]
---

# Amazon SageMaker: Custom ML Model Development

## Overview

When pre-built AI services and foundation models are insufficient for your use case, Amazon SageMaker provides the complete, managed MLOps platform for building, training, evaluating, and deploying custom machine learning models on your own data. SageMaker handles every stage of the ML lifecycle — from data preparation through feature engineering, model training on managed GPU clusters, evaluation, governance, deployment to production endpoints, and ongoing drift monitoring.

The problem SageMaker solves is operational complexity for custom ML. Before managed ML platforms, data science teams ran training on self-managed EC2 instances, tracked experiments in spreadsheets, deployed models by SSHing into servers, and had no systematic way to detect when a deployed model's accuracy degraded. SageMaker provides managed infrastructure at each stage — so data scientists focus on model quality rather than instance management, and ML engineers can enforce governance and reproducibility across the model lifecycle.

For the MLS and SAA exams, understand Training Jobs, Automatic Model Tuning (hyperparameter tuning), Autopilot, Real-Time Endpoints, Serverless Inference, Model Monitor, and SageMaker Pipelines. After this lesson, you will be able to design the full ML lifecycle using SageMaker and explain when each component is appropriate.

---

## Core Concepts

### SageMaker Studio

SageMaker Studio is the web-based IDE for the SageMaker platform. It provides: Jupyter notebooks running on managed kernel gateway instances (no EC2 to manage), the SageMaker Experiments dashboard for tracking training runs, a Model Registry view, a Pipeline visualizer, and the Data Wrangler interface for visual feature engineering. All SageMaker features are accessible through Studio's unified interface.

**Data Wrangler**: a no-code/low-code data preparation tool within Studio. Analysts and data scientists can import data from S3, Redshift, Athena, or SageMaker Feature Store, apply 300+ built-in transforms (normalize, encode, impute missing values, remove outliers), visualize distributions, and export the transformation recipe as a SageMaker Processing Job or Glue ETL job. Data Wrangler bridges data engineering and model training within a single interface.

---

### Training Jobs

SageMaker Training Jobs run model training on fully managed compute. You provide:
- **Docker container**: a built-in algorithm container (XGBoost, Linear Learner, BlazingText, Image Classification, etc.) or a custom container with your own training script
- **Input data**: S3 URI for training and validation data
- **Output**: S3 URI where model artifacts are written
- **Instance type and count**: `ml.p3.2xlarge` (1 GPU), `ml.p3.8xlarge` (4 GPUs), `ml.p3.16xlarge` (8 GPUs), or multi-instance for distributed training
- **Hyperparameters**: passed to the training script as arguments

SageMaker handles: instance provisioning, data download from S3, container execution, artifact upload to S3, and instance termination. No SSH, no cluster management, no manual lifecycle. Training instances are ephemeral — they exist only for the duration of the job.

**Distributed training**: for large models or datasets, SageMaker supports data parallelism (split data across instances, each trains a copy of the model) and model parallelism (split the model itself across instances for models too large to fit on one GPU). The SageMaker Distributed Training Library implements both strategies with optimizations for AWS infrastructure.

---

### Hyperparameter Tuning and Autopilot

**Automatic Model Tuning (AMT)**: runs multiple training jobs with different hyperparameter combinations using Bayesian optimization (or random search, or Hyperband). You define: the hyperparameter ranges to explore, the objective metric to optimize (validation accuracy, AUC, F1), and the maximum number of training jobs. AMT learns from each completed job to guide subsequent jobs toward promising regions of the hyperparameter space — more efficient than grid search or manual trial-and-error.

**SageMaker Autopilot**: full AutoML — provide a CSV or Parquet tabular dataset with a target column, and Autopilot automatically: explores feature engineering transformations, selects candidate algorithms (XGBoost, linear learner, neural networks), tunes hyperparameters, trains multiple candidate models, and ranks them by the selected objective metric. The best model can be deployed in one click. Autopilot also generates full explainability reports. Use for: teams without deep ML expertise who need a solid custom model baseline quickly.

---

### Model Deployment Options

**Real-Time Endpoints**: deploy a model artifact to a managed HTTPS endpoint. The endpoint runs continuously on specified instance types, serving synchronous inference requests. Supports: multi-model endpoints (host multiple models on one endpoint to share compute), blue/green deployments (shift traffic between model versions with configurable split), and auto-scaling (scale instances based on InvocationsPerInstance CloudWatch metric).

**SageMaker Serverless Inference**: provision an endpoint that scales to zero when idle and scales up on demand. Billed per millisecond of compute used per inference request. Appropriate for: infrequent inference workloads, development endpoints, or any workload where the cold start latency (typically < 1 second) is acceptable.

**Batch Transform**: process a large dataset offline, generating predictions for all records and writing results to S3. No persistent endpoint required. Appropriate for: nightly scoring of a customer database, generating recommendations for an entire catalog offline, or evaluating a model against a historical test set.

**Asynchronous Inference**: for large input payloads (up to 1 GB) or long inference times (up to 15 minutes). The client submits a request and receives an S3 path where results will be written when complete. SNS notifies the client on completion. Appropriate for: processing large documents, running batch ML on individual large files.

---

### Model Monitor

SageMaker Model Monitor continuously monitors deployed Real-Time Endpoints for:
- **Data quality drift**: the distribution of input features shifts from what the model was trained on (e.g., a new payment method generates feature values never seen in training data)
- **Model quality drift**: the model's predictions degrade in accuracy compared to a ground-truth baseline
- **Bias drift**: the model's fairness metrics shift over time for protected groups
- **Feature attribution drift**: which features most influence predictions changes (using SHAP values)

Model Monitor captures a **baseline** from the training dataset (feature statistics, distributions). It then samples endpoint traffic on a schedule, compares the traffic distribution against the baseline, and publishes CloudWatch metrics with constraint violations. Configure a CloudWatch Alarm on violation counts to trigger a retraining pipeline via EventBridge.

---

## Configuration Reference

### Example: Training Job with Custom Python Script (boto3)

```python
import boto3
import sagemaker
from sagemaker.pytorch import PyTorch

session = sagemaker.Session()
role = 'arn:aws:iam::123456789012:role/sagemaker-execution-role'

# Define a PyTorch Training Job
estimator = PyTorch(
    entry_point='train.py',                    # your training script
    source_dir='./src',                         # directory containing train.py and requirements.txt
    role=role,
    framework_version='2.0',
    py_version='py310',
    instance_type='ml.p3.2xlarge',             # 1 NVIDIA V100 GPU
    instance_count=1,
    hyperparameters={
        'epochs': 50,
        'learning-rate': 0.001,
        'batch-size': 64
    },
    output_path='s3://my-ml-artifacts/model-outputs/',
    checkpoint_s3_uri='s3://my-ml-artifacts/checkpoints/',   # resume training on interruption
)

# Launch the training job — SageMaker provisions the instance, runs train.py, uploads artifacts
estimator.fit({
    'training': 's3://my-data-lake/training/',
    'validation': 's3://my-data-lake/validation/'
})

# After the job completes, deploy to a real-time endpoint
predictor = estimator.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.xlarge'
)

# Invoke the endpoint
import json
result = predictor.predict({'features': [1.2, 3.4, 0.8, 2.1]})
print(f"Inference result: {result}")
```