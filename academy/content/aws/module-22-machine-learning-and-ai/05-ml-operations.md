---
title: "MLOps: Operationalizing Machine Learning"
type: content
estimated_minutes: 13
cert_tags: ["MLS-C01", "SAA-C03"]
---

# MLOps: Operationalizing Machine Learning

## Overview

Building a machine learning model is approximately 20% of the ML problem in production. The remaining 80% is the work that makes models reliable over time: automating the training pipeline so that retraining is triggered and governed, versioning models so the right model reaches production and the wrong one is blocked, serving features consistently between training and inference, and monitoring deployed models for drift so accuracy degradation is caught before it affects business outcomes. This discipline is MLOps — DevOps principles applied to the ML lifecycle.

Without MLOps, ML in production looks like: a data scientist trains a model in a notebook, copies the artifact to a shared S3 bucket, and a DevOps engineer manually updates the endpoint. A month later, accuracy has degraded due to data drift. Nobody knows which model version is currently deployed, what training data it used, or whether it was evaluated before promotion. Bugs in the model are discovered in business reports, not monitoring dashboards. SageMaker's MLOps toolset — Pipelines, Model Registry, Feature Store, and Model Monitor — addresses each of these failure modes systematically.

For the MLS and SAA exams, understand SageMaker Pipelines for automated ML workflows, Model Registry for governance and version control, Feature Store for training-serving consistency, and the closed-loop retraining pattern. After this lesson, you will be able to design an end-to-end MLOps architecture on AWS and explain why each component prevents a specific production failure mode.

---

## Core Concepts

### SageMaker Pipelines

SageMaker Pipelines is a CI/CD pipeline system specifically designed for ML workflows. A pipeline defines a DAG of steps executed in dependency order:

**Pipeline step types**:
- `ProcessingStep`: runs a SageMaker Processing Job for data preparation, feature engineering, or post-processing
- `TrainingStep`: runs a SageMaker Training Job
- `TuningStep`: runs Automatic Model Tuning across multiple training jobs
- `TransformStep`: runs a Batch Transform job
- `ModelStep`: registers a trained model artifact to the Model Registry
- `ConditionStep`: evaluates a metric and branches the pipeline — if F1 > 0.90, proceed to registration; else, fail the pipeline
- `LambdaStep`: invokes a Lambda function for custom logic
- `QualityCheckStep`: runs a data or model quality baseline capture

**Pipeline parameterization**: pipelines accept input parameters (S3 data paths, instance types, evaluation thresholds) so the same pipeline can run with different configurations — training on new data is a new execution with updated data paths, not a new pipeline definition.

**Execution triggers**: pipelines are triggered via API, EventBridge (on S3 data arrival, schedule), or the Studio UI. The standard trigger: new training data lands in S3 → EventBridge rule → start pipeline execution. Every execution is versioned and its full history (step inputs, outputs, metrics) is retained.

---

### SageMaker Model Registry

The Model Registry is a versioned catalog of trained model artifacts with associated metadata. Each registered model version carries:
- Training metrics (accuracy, F1, AUC, RMSE — whatever your evaluation step measured)
- Training data lineage (S3 URI of training dataset, data version)
- Training job ARN (link to the training job that produced the model)
- Evaluation report (link to evaluation results)
- Approval status: `PendingManualApproval`, `Approved`, `Rejected`

**Approval workflow**: a new model version submitted to the Registry starts with `PendingManualApproval`. A data scientist, ML engineer, or model risk officer reviews the metrics and approves or rejects. Only `Approved` model versions can be deployed to production. This approval gate prevents a degraded model from being deployed because automated metrics looked acceptable but qualitative review caught an issue.

**Deployment integration**: a Lambda function (or CodePipeline action) monitors the Registry for newly approved model versions and triggers a blue/green deployment to the SageMaker endpoint. The Registry maintains a history of which model version was deployed at each time — critical for audit purposes.

---

### SageMaker Feature Store

Feature Store is a managed repository for ML features — pre-computed values derived from raw data that are inputs to ML models. Examples: `customer_30day_purchase_count`, `item_average_rating`, `session_click_through_rate`.

**Two stores, two uses**:
- **Online store** (DynamoDB-backed): low-latency feature retrieval for real-time inference. When a fraud detection endpoint receives a transaction, it retrieves the relevant customer and merchant features from the online store in milliseconds.
- **Offline store** (S3-backed): historical point-in-time feature records for training data construction. When training a new model version, the data science team queries the offline store to reconstruct the exact feature values that were available at each training example's timestamp.

**Training-serving skew prevention**: the most insidious ML production bug is training-serving skew — the model trains on features computed one way but is served with features computed a different way (different logic, different data version, different aggregation window). Feature Store eliminates this by ensuring training and serving read from the same feature definitions and computation logic. If the feature computation changes, both training and serving code update together.

**Point-in-time queries**: when constructing a training dataset from historical events, you must use only features that were available at the event timestamp — not future information. The offline store's time-travel capability ensures that feature values are retrieved as of the training event's timestamp, preventing "data leakage" (training on future information the model won't have at prediction time).

---

### Automated Retraining and the MLOps Loop

The closed-loop MLOps pattern connects Model Monitor → EventBridge → SageMaker Pipeline:

1. **Model Monitor** detects drift (feature distribution shift, model quality degradation) and publishes a constraint violation as a CloudWatch metric
2. **CloudWatch Alarm** breaches and publishes an EventBridge event
3. **EventBridge rule** matches the violation event and starts a SageMaker Pipeline execution
4. **Pipeline** runs: data processing → training on recent data → model evaluation → ConditionStep (if new model is better, register it)
5. **Lambda** monitors the Model Registry for newly Approved models and triggers a blue/green endpoint update
6. The updated model is deployed; Model Monitor establishes a new baseline

This loop runs automatically when drift is detected — the model retrains and redeploys without a human initiating the retraining cycle (though the Model Registry approval gate ensures a human reviews before production deployment).

---

## Configuration Reference

### Example: SageMaker Pipeline — Train, Evaluate, Conditionally Register

```python
import boto3
import sagemaker
from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.steps import TrainingStep, ProcessingStep
from sagemaker.workflow.conditions import ConditionGreaterThanOrEqualTo
from sagemaker.workflow.condition_step import ConditionStep
from sagemaker.workflow.properties import PropertyFile
from sagemaker.workflow.parameters import ParameterString, ParameterFloat
from sagemaker.sklearn.processing import SKLearnProcessor
from sagemaker.xgboost import XGBoost

session = sagemaker.Session()
role = 'arn:aws:iam::123456789012:role/sagemaker-execution-role'

# Pipeline parameters — can be overridden at execution time
training_data_uri = ParameterString(name="TrainingDataUri",
    default_value="s3://my-data-lake/curated/training/")
accuracy_threshold = ParameterFloat(name="AccuracyThreshold", default_value=0.85)

# Step 1: Processing job for feature engineering
processor = SKLearnProcessor(
    framework_version='1.2-1',
    instance_type='ml.m5.xlarge',
    instance_count=1,
    role=role
)
processing_step = ProcessingStep(
    name='FeatureEngineering',
    processor=processor,
    inputs=[sagemaker.processing.ProcessingInput(
        source=training_data_uri, destination='/opt/ml/processing/input'
    )],
    outputs=[sagemaker.processing.ProcessingOutput(
        output_name='train', source='/opt/ml/processing/output/train',
        destination='s3://my-ml-artifacts/processed/train/'
    )],
    code='feature_engineering.py'
)

# Step 2: Training job
xgb = XGBoost(
    entry_point='train.py',
    role=role,
    instance_type='ml.m5.2xlarge',
    instance_count=1,
    framework_version='1.7-1'
)
training_step = TrainingStep(
    name='TrainModel',
    estimator=xgb,
    inputs={'train': sagemaker.inputs.TrainingInput(
        s3_data=processing_step.properties.ProcessingOutputConfig.Outputs['train'].S3Output.S3Uri
    )},
    depends_on=[processing_step]
)

# Step 3: Evaluation processing job — computes accuracy on held-out test set
evaluation_report = PropertyFile(name='EvaluationReport',
    output_name='evaluation', path='evaluation.json')

evaluate_step = ProcessingStep(
    name='EvaluateModel',
    processor=processor,
    inputs=[
        sagemaker.processing.ProcessingInput(
            source=training_step.properties.ModelArtifacts.S3ModelArtifacts,
            destination='/opt/ml/processing/model'
        )
    ],
    outputs=[sagemaker.processing.ProcessingOutput(
        output_name='evaluation', source='/opt/ml/processing/output/evaluation'
    )],
    code='evaluate.py',
    property_files=[evaluation_report],
    depends_on=[training_step]
)

# Step 4: Conditional — only register if accuracy meets threshold
from sagemaker.workflow.functions import JsonGet
accuracy_condition = ConditionGreaterThanOrEqualTo(
    left=JsonGet(step_name='EvaluateModel', property_file=evaluation_report,
                 json_path='metrics.accuracy'),
    right=accuracy_threshold
)

# Step 5: Register model if condition passes
from sagemaker.workflow.model_step import ModelStep
register_step = ModelStep(
    name='RegisterModel',
    step_args=xgb.register(
        content_types=['application/json'],
        response_types=['application/json'],
        model_package_group_name='fraud-detection-models',
        approval_status='PendingManualApproval'
    )
)

condition_step = ConditionStep(
    name='CheckAccuracy',
    conditions=[accuracy_condition],
    if_steps=[register_step],   # register only if accuracy >= threshold
    else_steps=[]               # fail silently — pipeline execution ends here
)

# Assemble and upsert the pipeline (creates or updates it in SageMaker)
pipeline = Pipeline(
    name='fraud-detection-training-pipeline',
    parameters=[training_data_uri, accuracy_threshold],
    steps=[processing_step, training_step, evaluate_step, condition_step],
    sagemaker_session=session
)
pipeline.upsert(role_arn=role)

# Start an execution — e.g. triggered by EventBridge on S3 data arrival
execution = pipeline.start(
    parameters={
        'TrainingDataUri': 's3://my-data-lake/curated/training/2024-q4/',
        'AccuracyThreshold': 0.88
    }
)
print(f"Pipeline execution ARN: {execution.arn}")
execution.wait()   # blocks until complete; omit for async invocation
```