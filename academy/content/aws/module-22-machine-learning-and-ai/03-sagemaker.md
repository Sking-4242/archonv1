---
title: "Amazon SageMaker: Custom ML Model Development"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "MLS-C01"]
---

# Amazon SageMaker: Custom ML Model Development

## Overview

When pre-built AI services and foundation models aren't sufficient, SageMaker provides the full MLOps platform for custom model development. This lesson covers the SageMaker workflow: data preparation, training, evaluation, deployment, and monitoring.

## SageMaker Studio

SageMaker Studio is a web-based IDE with integrated Jupyter notebooks, a visual pipeline editor, and access to all SageMaker features. Data scientists use Studio for: exploratory data analysis, feature engineering (with SageMaker Data Wrangler), model training, experiment tracking (SageMaker Experiments), and deploying to SageMaker endpoints. Studio runs on managed infrastructure — no EC2 instance to manage.

## Training Jobs

SageMaker Training Jobs run model training on fully managed infrastructure. You provide: the Docker container (built-in algorithm containers for XGBoost, linear regression, image classification, NLP, or your custom container), input data location (S3), output model artifacts location (S3), instance type and count, and hyperparameters. SageMaker handles instance provisioning, data download, training execution, model artifact upload, and instance shutdown. Distributed training splits work across multiple instances for large models and datasets.

## Hyperparameter Tuning and Autopilot

SageMaker Automatic Model Tuning (hyperparameter tuning) runs multiple training jobs with different hyperparameter combinations using Bayesian optimization or random search to find the optimal configuration without manual trial-and-error. SageMaker Autopilot is AutoML — provide a tabular dataset with a target column, and Autopilot automatically selects algorithms, tunes hyperparameters, and produces multiple candidate models ranked by accuracy. Best for teams without deep ML expertise who need a quick custom model baseline.

## Model Deployment and Monitoring

SageMaker Real-Time Endpoints: deploy a model artifact to a managed HTTPS endpoint for synchronous inference. Supports auto-scaling and blue/green deployments. SageMaker Serverless Inference: pay per inference request, scales to zero — for infrequent inference workloads. SageMaker Batch Transform: process large datasets offline, returning predictions for each row. SageMaker Model Monitor: continuously monitor endpoint inputs and outputs for data quality drift (feature distribution shifts), model quality drift (accuracy decay), and bias. Alerts when drift exceeds thresholds so you know when to retrain.

## Summary

SageMaker is the end-to-end MLOps platform: Studio for development, Training Jobs for managed compute, Autopilot for AutoML, Endpoints for deployment, Model Monitor for drift detection. SageMaker Pipelines automates the train → evaluate → deploy workflow as versioned, reproducible pipelines. Use SageMaker when you need a custom model trained on your own data that pre-built AI services can't address.

## Examples

An e-commerce company wants to predict which customers are likely to churn in the next 30 days, using their own transaction and behavior data. No pre-built AI service covers this domain-specific problem. They use SageMaker Autopilot: they provide a CSV with customer features and a "churned" label column, and Autopilot generates multiple candidate models. Within hours they have a ranked leaderboard of approaches — XGBoost, linear learner, neural network — without writing a single training script. This is the right entry point for teams that need a custom model baseline quickly.

A computer vision team at a logistics company trains a custom object detection model to identify damaged parcels on a conveyor belt. Their dataset lives in S3, and their model uses a PyTorch container. They submit a SageMaker Training Job specifying a `ml.p3.8xlarge` instance with four GPUs, and SageMaker handles provisioning, data staging, distributed training, and uploading the final model artifact — the team never SSH's into an instance. When they need to retrain on new data weekly, the same Training Job definition is reused with updated S3 paths.

A data science team at a bank deploys a fraud detection model to a SageMaker Real-Time Endpoint with auto-scaling configured between two and twenty instances. They also enable SageMaker Model Monitor with a baseline captured from their training data distribution. Three months later, Monitor raises a drift alert — a new payment channel is generating feature values outside the training distribution. The alert triggers a retraining pipeline rather than a production incident, because they built monitoring into the deployment from day one.

## Think About It

1. Why does SageMaker separate Training Jobs from hosting infrastructure, rather than just running training on the same instance that serves predictions?
2. What would happen if you deployed a model to a SageMaker Real-Time Endpoint without enabling Model Monitor — and that model's accuracy degraded silently over six months?
3. How would you decide between SageMaker Serverless Inference and a provisioned Real-Time Endpoint for a fraud detection model that must respond within 100 milliseconds at peak load?
4. SageMaker Autopilot runs many training jobs in parallel and ranks them. What trade-offs exist between using Autopilot's best model versus investing in a hand-tuned custom model for a production use case?
5. Distributed training splits work across multiple instances for large models. Why might adding more instances not always reduce training time proportionally — and what factors limit the speedup?

## Quick Check

**Q1.** A data science team wants to find the best hyperparameter settings for their training job without manually running hundreds of experiments. Which SageMaker feature should they use?
- A) SageMaker Data Wrangler
- B) SageMaker Automatic Model Tuning
- C) SageMaker Batch Transform
- D) SageMaker Feature Store

**Answer: B** — Automatic Model Tuning (hyperparameter tuning) runs multiple training jobs with different hyperparameter combinations using Bayesian optimization to find the optimal configuration automatically.

**Q2.** What does SageMaker Model Monitor detect?
- A) Unauthorized API calls to SageMaker endpoints
- B) Cost anomalies in training job spending
- C) Drift in input feature distributions or model output quality compared to a training baseline
- D) Mismatches between the model container version and the SageMaker runtime

**Answer: C** — Model Monitor continuously compares live endpoint traffic against a baseline captured from training data, alerting when feature distributions or model quality metrics shift beyond configured thresholds.

**Q3.** Which SageMaker inference option scales to zero and charges only per inference request — best suited for infrequent workloads?
- A) Real-Time Endpoints with auto-scaling set to a minimum of zero
- B) Batch Transform
- C) Serverless Inference
- D) Asynchronous Inference

**Answer: C** — SageMaker Serverless Inference is designed for infrequent or unpredictable traffic, scaling to zero between requests and billing only for the compute used per inference call.

## What's Next

Next up: Key AI/ML services — Rekognition, Comprehend, Textract, Forecast, and Personalize.