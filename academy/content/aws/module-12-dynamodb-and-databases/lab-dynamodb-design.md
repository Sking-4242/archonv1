---
title: "Canvas Lab: DynamoDB Table Design for an Order System"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: open
---

# Canvas Lab: DynamoDB Table Design for an Order System

## Challenge

Design the DynamoDB table and index structure for an e-commerce order system. The system must support the following access patterns without any table scans: (1) get customer profile by customer ID, (2) get all orders for a customer sorted by date, (3) get a specific order by order ID, (4) get all orders with status PENDING across all customers (for fulfillment workers). Design the table key schema, one or more GSIs, and explain your choices on the canvas.

## Learning Objectives

- Design a primary key schema (PK/SK) that supports patterns 1, 2, and 3 with a single table
- Identify which pattern requires a GSI and design it with a sparse index approach
- Choose appropriate attribute projections for each index
- Identify which access patterns can be served by a Query vs. which would require a Scan (and why that's unacceptable)

## Steps

1. Add a DynamoDB Table to the canvas, name it OrderSystem
2. Define the base table: PK=entity type prefix + ID (e.g. CUSTOMER#123), SK=entity subtype (e.g. PROFILE, ORDER#456)
3. Document the item format for Customer Profile items (PK=CUSTOMER#id, SK=PROFILE)
4. Document the item format for Order items (PK=CUSTOMER#id, SK=ORDER#orderId, include status and date attributes)
5. Add a GSI for the PENDING orders pattern: GSI PK=status, GSI SK=createdAt — annotate that only items with a status attribute appear in this sparse index
6. Configure the GSI projection as INCLUDE with the attributes the fulfillment API needs
7. Annotate the canvas showing which access pattern maps to which table/GSI and what the Query expression looks like
8. Add a DynamoDB Stream → Lambda connection to show how order status changes could trigger fulfillment notifications

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.