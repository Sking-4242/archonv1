---
title: "Canvas Lab: Serverless API Development with AWS SAM"
type: canvas
estimated_minutes: 30
cert_tags: ["DVA-C02", "SAA-C03"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: Serverless API Development with AWS SAM

## Challenge

A developer needs to build a simple serverless API that responds to GET /hello with a JSON greeting, test it locally before incurring any AWS costs, then deploy it through the full SAM workflow. The lab demonstrates the complete SAM development loop from scaffolding to cleanup. Docker is pre-installed in the lab environment for local testing.

## Learning Objectives

- Scaffold a SAM project with `sam init` and understand the generated template.yaml structure
- Define an AWS::Serverless::Function resource with an HttpApi event in template.yaml
- Test the function locally with `sam local invoke` and `sam local start-api` before deploying
- Build and deploy the application to AWS with `sam deploy --guided` and invoke the live endpoint
- Clean up all deployed resources with `sam delete`

## Steps

1. Run `sam init --runtime python3.12 --name hello-api --app-template hello-world` and examine the generated project structure
2. Open `template.yaml` and review the AWS::Serverless::Function resource, the Events section, and the HttpApi definition
3. Modify the Lambda handler in `app.py` to return `{"message": "Hello from SAM!", "stage": os.environ["STAGE"]}` and import `os` at the top
4. In `template.yaml`, add a `Globals` section that sets the `STAGE` environment variable to `dev` for all functions
5. Run `sam build` and confirm the `.aws-sam/build` directory is created with dependencies packaged
6. Run `sam local invoke HelloWorldFunction --event events/event.json` and verify the JSON response contains `"message": "Hello from SAM!"`
7. Run `sam local start-api` then in a second terminal run `curl http://localhost:3000/hello` and verify the live local response
8. Run `sam deploy --guided`, accept the default stack name `hello-api`, choose `us-east-1`, and allow SAM to create the IAM role
9. After the deployment completes, note the `HelloWorldApi` URL printed in the Outputs section of the CloudFormation stack
10. Run `curl https://<api-id>.execute-api.us-east-1.amazonaws.com/Prod/hello` against the deployed endpoint and verify the response
11. Run `sam logs -n HelloWorldFunction --stack-name hello-api --tail` to stream live CloudWatch Logs from the deployed function
12. Run `sam delete` and confirm all CloudFormation resources including the S3 artifact bucket are removed

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
