---
title: "Canvas Lab: Serverless REST API with API Gateway, Lambda, and DynamoDB"
type: canvas
estimated_minutes: 35
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: Serverless REST API with API Gateway, Lambda, and DynamoDB

## Challenge

A team needs a simple product catalog API with three endpoints: GET /products (list all), GET /products/{id} (get one), and POST /products (create new). No servers should be provisioned — each endpoint triggers a separate Lambda function backed by DynamoDB. The POST endpoint must be protected with API key authentication so that only authorized clients can write new products.

## Learning Objectives

- Create an API Gateway REST API with resources, methods, and Lambda proxy integration
- Deploy three Lambda functions with execution roles scoped to DynamoDB operations
- Set up an API key and Usage Plan and require the key on a specific method
- Deploy the API to a named stage and interpret the invoke URL structure
- Test all three endpoints using curl with and without the API key header

## Steps

1. In the DynamoDB console, create a table named `Products` with partition key `productId` (String); leave all other settings as default
2. Create an IAM execution role named `lambda-products-role` with the `AWSLambdaBasicExecutionRole` managed policy plus an inline policy allowing `dynamodb:Scan`, `dynamodb:GetItem`, and `dynamodb:PutItem` on the Products table ARN
3. Create Lambda function `products-list` (Python 3.12, 128 MB, 10s timeout) with the execution role; write the handler to call `dynamodb.scan(TableName="Products")` and return all items
4. Create Lambda function `products-get` (same runtime and role); write the handler to extract `pathParameters["id"]` and call `dynamodb.get_item` with that key
5. Create Lambda function `products-create` (same runtime and role); write the handler to parse the JSON body and call `dynamodb.put_item`
6. In API Gateway, choose **Build** -> **REST API** (not HTTP API); name it `ProductCatalogAPI`
7. Create resource `/products`; add a **GET** method with **Lambda Proxy Integration** pointing to `products-list`; add a **POST** method pointing to `products-create`
8. Under `/products`, create child resource `{id}`; add a **GET** method with Lambda Proxy Integration pointing to `products-get`
9. Create an **API key** named `catalog-key`; create a **Usage Plan** named `default-plan` with throttling 100 req/s and 10,000 req/month; associate the Usage Plan with the API and stage
10. On the POST /products method, open **Method Request** and set **API Key Required** to `true`
11. Choose **Deploy API** -> **New Stage** named `prod`; copy the invoke URL
12. Test the list endpoint (no key required): `curl https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/products`
13. Test creating a product with the key: `curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/products -H "x-api-key: <key>" -H "Content-Type: application/json" -d '{"productId":"p1","name":"Widget","price":9.99}'`
14. Test the get-by-id endpoint: `curl https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/products/p1` and verify the item you just created is returned

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
