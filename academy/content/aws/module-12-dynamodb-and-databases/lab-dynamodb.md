---
title: "Canvas Lab: DynamoDB Single-Table Design for an E-Commerce Order System"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: open
---

# Canvas Lab: DynamoDB Single-Table Design for an E-Commerce Order System

## Challenge

An e-commerce company needs to model customer orders in DynamoDB and support three distinct access patterns without running expensive table scans: (1) get all orders for a specific customer, (2) get a single order by its ID, and (3) get all orders with a given status (pending, shipped, or delivered). Your task is to design a single-table schema with a partition key and sort key that satisfies access patterns 1 and 2, then create a Global Secondary Index (GSI) to support access pattern 3 — and demonstrate the cost difference between using a GSI Query versus a full table Scan.

## Learning Objectives

- Design a DynamoDB partition key and sort key schema that supports multiple access patterns for a single entity type
- Create a Global Secondary Index (GSI) to enable queries on a non-primary attribute without performing a full table scan
- Write and query items using the DynamoDB console or AWS CLI, including filtered Query and GSI Query operations
- Explain when a GSI is required versus when a Scan is acceptable, using RCU cost as the deciding factor

## Steps

1. Navigate to **DynamoDB → Tables → Create table** — set **Partition key** = `customerId` (String) and **Sort key** = `orderId` (String); use **Default settings** for capacity (on-demand); name the table `Orders`
2. Once the table is active, click **Explore table items → Create item** — add the following attributes to the first item: `customerId = CUST-001`, `orderId = ORD-1001`, `status = pending`, `createdAt = 2026-01-15T10:00:00Z`, `total = 59.99`
3. Add three more items using the same method: `(CUST-001, ORD-1002, shipped, 2026-01-20, 124.50)`, `(CUST-002, ORD-1003, pending, 2026-01-21, 34.00)`, `(CUST-001, ORD-1004, delivered, 2026-01-10, 89.95)`
4. Run a **Query** for access pattern 1 — in Explore Items, switch to **Query**, set Partition key = `CUST-001`; observe that all three orders for that customer are returned using only the primary key, consuming minimal RCUs
5. Run a **Query** for access pattern 2 — set Partition key = `CUST-001` and Sort key condition = `Equals ORD-1002`; confirm only the single matching order is returned
6. Attempt access pattern 3 without a GSI — switch the operation to **Scan** and add a filter `status = pending`; note that a Scan reads every item in the table before filtering, consuming RCUs proportional to the full table size regardless of how many items match
7. Navigate to the table's **Indexes** tab → **Create index** — set **Partition key** = `status` (String), **Sort key** = `createdAt` (String), index name = `status-createdAt-index`; wait for the index to become Active
8. Return to **Explore table items**, switch operation to **Query**, select the `status-createdAt-index` GSI from the index dropdown, set Partition key = `pending`; confirm only the two pending orders are returned efficiently
9. On the canvas, diagram the table with its primary key and the GSI — annotate each access pattern with an arrow showing whether it hits the base table or the GSI, and label the RCU efficiency of each path
10. Add a design note on the canvas explaining why a fourth access pattern — "get all orders placed in the last 30 days across all customers" — would still require a Scan or a different GSI design, and what trade-offs that involves

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
