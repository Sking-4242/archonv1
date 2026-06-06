---
title: "Canvas Lab: Automated Image Moderation Pipeline with Rekognition and Lambda"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "MLA-C01"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: Automated Image Moderation Pipeline with Rekognition and Lambda

## Challenge

A social media platform needs to automatically moderate user-uploaded images for inappropriate content before making them publicly visible. Manual review cannot scale to thousands of uploads per hour. Build an automated event-driven pipeline where an S3 upload triggers a Lambda function that calls Rekognition DetectModerationLabels and routes the image to an approved or quarantine prefix based on the results. The Lambda execution role and both S3 buckets are pre-created.

## Learning Objectives

- Call the Rekognition DetectModerationLabels API and interpret confidence scores and label taxonomy
- Build a Lambda function that triggers on S3 PUT events and routes images based on moderation results
- Copy images to an approved bucket or quarantine prefix depending on whether any label exceeds the confidence threshold
- Configure the MinConfidence threshold and understand the trade-off between false positives and false negatives
- Verify pipeline behavior end-to-end using CloudWatch Logs

## Steps

1. Confirm the two S3 buckets exist: `uploads-staging` (where users upload) and `uploads-approved` (destination for clean images)
2. Create a Lambda function using Python 3.12 with a 30-second timeout
3. Add an S3 event trigger on the `uploads-staging` bucket for all ObjectCreated events
4. Attach an execution role with permissions for S3 GetObject, PutObject, and CopyObject on both buckets, plus Rekognition DetectModerationLabels
5. Write the Lambda handler: extract the bucket name and object key from the S3 event record, then call `rekognition.detect_moderation_labels(Image={"S3Object": {"Bucket": bucket, "Name": key}}, MinConfidence=75)`
6. If the response `ModerationLabels` list contains any label with Confidence >= 75, copy the object to the `uploads-staging/quarantine/` prefix in the same bucket
7. If no moderation labels are returned, copy the object to the `uploads-approved` bucket under the same key name
8. Deploy the Lambda function and upload a clearly safe test image (for example, a landscape photo) to `uploads-staging`
9. Verify in the S3 console that the safe image appears in `uploads-approved` and is absent from `uploads-staging/quarantine/`
10. Upload an image known to trigger Rekognition moderation labels (use one of the sample images from the Rekognition documentation)
11. Open CloudWatch Logs for the Lambda function and confirm the moderation labels, their categories, and confidence scores are printed
12. Update the Lambda environment variable `MIN_CONFIDENCE` to 90 and re-upload the same borderline image; observe whether the routing decision changes, demonstrating the threshold trade-off

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
