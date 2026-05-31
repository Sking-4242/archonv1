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

## Examples

A retail company retrains their demand forecasting model monthly by manually running training scripts on an EC2 instance, then copying the model artifact to a SageMaker endpoint by hand. When they migrate to SageMaker Pipelines, the entire workflow — data processing, training, evaluation against an accuracy threshold, and conditional deployment — runs automatically when new data lands in S3 via an EventBridge trigger. The first time the evaluation step rejects a model because accuracy dropped below threshold, the pipeline fails safely instead of pushing a degraded model to production. That guardrail alone justified the migration.

A bank's ML team uses the SageMaker Model Registry to manage their credit risk models. Every new model version submitted to the registry carries its training metrics, data lineage, and a link to the evaluation report. A model risk officer reviews and approves or rejects each version before it can be deployed. When a regulator asks which model version was scoring loans in Q2 of the prior year, the registry provides an audit trail — training data, metrics, and deployment timestamps — in minutes rather than weeks of archaeology.

A ride-sharing platform stores pre-computed features — driver acceptance rate over the last 7 days, rider's historical surge tolerance — in SageMaker Feature Store. During real-time inference, the pricing model reads fresh feature values from the online store in milliseconds. When retraining monthly, the data science team exports a point-in-time snapshot from the offline store to reconstruct exactly the feature values that were available at each historical training example's timestamp. This time-travel capability is what prevents the subtle but critical bug known as training-serving skew, where the model trains on future information that wasn't available at prediction time.

## Think About It

1. Why is training-serving skew considered one of the most dangerous bugs in ML systems — and how does SageMaker Feature Store's design specifically prevent it?
2. What would happen to a fraud detection model's accuracy if you never monitored for data drift and the bank introduced a new payment method that generated feature values outside the model's training distribution?
3. How would you design the conditional step in a SageMaker Pipeline to decide whether to promote a new model — what metrics would you evaluate, and how would you handle the case where the new model is better on accuracy but worse on fairness metrics?
4. The Model Registry requires human approval before deployment. In what situations might you want to automate that approval — and what risks does removing the human from the loop introduce?
5. MLOps applies DevOps principles to ML. What are the key differences between a software deployment pipeline and an ML pipeline that make ML operationalization uniquely challenging?

## Quick Check

**Q1.** What is the primary purpose of SageMaker Feature Store's online store?
- A) To archive historical training datasets for compliance auditing
- B) To serve pre-computed feature values with millisecond latency during real-time model inference
- C) To visualize feature importance scores from trained models
- D) To automatically compute features from raw S3 data during training

**Answer: B** — The online store (backed by DynamoDB) provides low-latency feature retrieval for real-time inference, ensuring the serving path uses the same feature definitions as training without recomputing them on the fly.

**Q2.** A SageMaker Pipeline's evaluation step compares model metrics against a quality threshold and then uses a conditional step. What happens if the new model fails the quality threshold?
- A) SageMaker automatically rolls back to the previous model version
- B) The pipeline fails at the conditional step, preventing registration and deployment of the underperforming model
- C) The model is registered with a "Rejected" status and deployed anyway for A/B testing
- D) SageMaker triggers hyperparameter tuning to improve the model automatically

**Answer: B** — The conditional step routes the pipeline based on whether metrics meet the threshold; if they don't, the pipeline terminates without registering or deploying the model, acting as a quality gate.

**Q3.** Which AWS service would you use to automatically trigger a SageMaker retraining pipeline when new training data arrives in an S3 bucket?
- A) AWS CloudTrail
- B) Amazon SQS
- C) Amazon EventBridge
- D) AWS Step Functions

**Answer: C** — EventBridge can detect S3 object creation events and invoke a SageMaker Pipeline execution as a target, enabling event-driven automated retraining without polling or manual intervention.

## What's Next

Next up: the Module 22 Canvas Labs — AI service integration and Bedrock RAG architecture.