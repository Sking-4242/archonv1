---
title: "MLOps: Operationalizing Machine Learning"
type: content
estimated_minutes: 8
cert_tags: ["MLS-C01", "SAA-C03"]
---

# MLOps: Operationalizing Machine Learning

## Overview

Building a model is 20% of the ML problem. The other 80% is getting it to production reliably, monitoring it, and retraining it when it degrades. MLOps (Machine Learning Operations) applies DevOps principles to the ML lifecycle. This lesson covers the SageMaker MLOps toolset.

## SageMaker Pipelines

SageMaker Pipelines is a CI/CD pipeline system for ML workflows. A pipeline defines a sequence of steps: data processing (SageMaker Processing Job), training (SageMaker Training Job), evaluation (compare model metrics against a quality threshold), conditional step (if metrics above threshold, register the model; else, fail the pipeline), model registration. Pipelines are version-controlled, parameterized, and triggered via API or EventBridge (e.g., trigger when new training data lands in S3).

## SageMaker Model Registry

The Model Registry is a catalog of model versions with associated metadata: training metrics (accuracy, F1, AUC), training data lineage, evaluation results, and approval status (Pending, Approved, Rejected). Teams submit new model versions to the registry; a model review process approves or rejects before deployment. The registry tracks which model version is deployed to each endpoint, enabling rollback. This governance layer is what separates ad-hoc model experiments from production ML.

## Feature Store

SageMaker Feature Store is a managed repository for ML features — pre-computed values (customer's 30-day purchase count, item's average rating) used for both training and real-time inference. Features are stored in two stores: online (DynamoDB-backed, millisecond read for real-time inference) and offline (S3-backed, for training data export). Using a Feature Store ensures training and serving use the same feature computation — preventing training-serving skew, one of the most common ML production bugs.

## Model Drift and Retraining

Models degrade over time as the real-world data distribution shifts (concept drift) or input features change (data drift). SageMaker Model Monitor detects drift by comparing current traffic distributions against a baseline captured from training data. When Monitor finds drift, trigger a retraining pipeline: EventBridge event → SageMaker Pipeline → retrain model on recent data → evaluate → if improved, promote to production. Automating this loop is what enables models to stay accurate without manual intervention.

## Summary

MLOps connects the ML lifecycle end-to-end: Pipelines automate train-evaluate-deploy, Model Registry provides governance and version control, Feature Store prevents training-serving skew, Model Monitor detects drift and triggers retraining. These tools transform a one-time model into a continuously improving production system. MLOps is not optional for any ML deployment that must remain accurate over time.

## What's Next

Next up: the Module 22 Canvas Labs — AI service integration and Bedrock RAG architecture.