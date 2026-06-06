---
title: "Canvas Lab: CI/CD Pipeline with CodePipeline, CodeBuild, and S3"
type: canvas
estimated_minutes: 35
cert_tags: ["DVA-C02", "SAA-C03"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: CI/CD Pipeline with CodePipeline, CodeBuild, and S3

## Challenge

A frontend team wants to automatically deploy their React application to an S3 static website whenever they push to the main branch of their GitHub repository. The team needs a fully automated pipeline that removes manual deployment steps. Build a CodePipeline with a GitHub source stage, a CodeBuild stage that runs `npm run build`, and an S3 deploy stage. The S3 bucket and GitHub repository are pre-created.

## Learning Objectives

- Create a CodePipeline with a GitHub source using CodeStar Connections for secure authorization
- Configure a CodeBuild project with an inline buildspec to install dependencies and produce build artifacts
- Deploy build artifacts to an S3 static website bucket and verify the live deployment
- Trigger an automatic pipeline run by committing a code change to the repository
- Understand pipeline stage transitions and how to add a Manual Approval gate before production deploys

## Steps

1. Create an S3 bucket for the static website, enable static website hosting, and set the bucket policy to allow public read access
2. In the AWS console, navigate to Developer Tools → Settings → Connections and create a new GitHub connection via CodeStar Connections; complete the OAuth authorization flow
3. Create a CodeBuild project: set the source to GitHub (use the CodeStar Connection), choose the Ubuntu standard runtime image, and define the buildspec inline with phases `build` running `npm install` and `npm run build`, and artifacts outputting `**/*` from the `build` base directory
4. Open CodePipeline and create a new pipeline; in Stage 1 (Source), select GitHub (Version 2) and choose the main branch via the CodeStar Connection created in Step 2
5. In Stage 2 (Build), select the CodeBuild project created in Step 3
6. In Stage 3 (Deploy), select Amazon S3 as the deploy provider, choose the website bucket from Step 1, and enable "Extract file before deploy"
7. Save the pipeline and observe the first automatic execution triggered by the connection
8. Watch each stage turn green in the pipeline execution view; note any build logs in CodeBuild
9. Visit the S3 static website endpoint URL and confirm the React app is visible
10. Make a small code change (e.g., update the page title), commit and push to the main branch, and watch the pipeline re-run automatically
11. Add a Manual Approval stage between the Build and Deploy stages: edit the pipeline, insert a new stage named "Approval", add an Manual Approval action, and save
12. Trigger another commit and confirm the pipeline pauses at the Approval stage until you click "Review" and "Approve"

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
