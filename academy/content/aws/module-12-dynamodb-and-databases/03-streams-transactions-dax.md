---
title: "DynamoDB Streams, Transactions, and DAX"
type: content
estimated_minutes: 15
cert_tags: ["SAA-C03", "DVA-C02"]
---

# DynamoDB Streams, Transactions, and DAX

## Overview

DynamoDB's base functionality — key-value reads and writes with secondary indexes — is powerful, but three additional features transform it into a platform for event-driven, transactional, and high-performance architectures: Streams, Transactions, and DAX. Each addresses a different operational concern, and each carries its own cost model and constraint set that the exam tests directly.

DynamoDB Streams is DynamoDB's built-in change data capture system. Every item modification — insert, update, or delete — generates an ordered stream record. Lambda can poll this stream and react to changes in near real-time, making Streams the standard mechanism for DynamoDB-triggered event pipelines. The 24-hour retention window and stream view type options (which control how much before/after data is included) are both common exam topics. The critical thing to understand is that streams are ordered per shard and per item, but DynamoDB may distribute items across multiple shards — so global ordering is not guaranteed.

Transactions add ACID guarantees to DynamoDB. Without transactions, a write to two items is not atomic: if the second write fails, the first has already been applied. `TransactWriteItems` solves this by making all-or-nothing guarantees across up to 100 items in a single request. The cost is 2x WCUs and 2x RCUs compared to non-transactional equivalents. DAX (DynamoDB Accelerator) is a fully managed, in-memory cache cluster that sits transparently in front of DynamoDB and reduces read latency from single-digit milliseconds to microseconds for cached items. The exam tests when DAX helps, when it doesn't, and what consistency trade-offs it introduces.

## Core Concepts

### DynamoDB Streams

**DynamoDB Streams** captures a time-ordered log of every item-level modification on a table. Each stream record represents one change event and is retained for **24 hours** from the time of the modification. After 24 hours the record is gone — there is no way to recover or replay it.

Stream records contain:
- The type of operation: `INSERT`, `MODIFY`, or `REMOVE`.
- Key attributes of the affected item (always present).
- Item data according to the **stream view type** you configure.

**Stream View Types:**
- `KEYS_ONLY`: Only the key attributes of the modified item are written to the stream. Smallest record size, lowest overhead. Use when you only need to know which item changed, not its data.
- `NEW_IMAGE`: The entire item as it appears after the modification. Use when downstream consumers need the current state of the item.
- `OLD_IMAGE`: The entire item as it appeared before the modification. Use for audit trails that need to capture what was deleted or overwritten.
- `NEW_AND_OLD_IMAGES`: Both the pre- and post-modification images. Most complete, largest record size. Use for change-delta computation (e.g., "what fields changed?") or bidirectional replication.

**Streams + Lambda**: The primary integration pattern is an AWS Lambda function configured as a stream event source. Lambda polls the stream shard(s) using the streams API and invokes your function with a batch of records. Failures in Lambda processing do not re-generate stream records — if your function fails and retries, it replays the same records from the stream (within the 24-hour window). After 24 hours, unprocessed records are gone.

Streams are partitioned into shards. The number of shards scales with the table's partition count. Lambda manages the shard reader automatically when configured as an event source mapping. You do not have to manage shard iterators manually.

Common Streams patterns:
- Trigger downstream microservices on data changes without polling.
- Replicate changes to an Elasticsearch / OpenSearch cluster for full-text search.
- Aggregate statistics in real-time (e.g., update a counter table when orders are placed).
- Implement event sourcing: every item write is a domain event, the stream is the event log.
- Drive cross-region replication (though DynamoDB Global Tables is the managed alternative).

### DynamoDB Transactions

**TransactWriteItems** and **TransactGetItems** bring ACID semantics to DynamoDB:

- **Atomicity**: all operations in the transaction succeed or all are rolled back.
- **Consistency**: condition expressions in the transaction are evaluated atomically — you can check a balance before deducting it and guarantee the check and the deduct happen together.
- **Isolation**: transactions are serializable — no other operation can observe a partial transaction.
- **Durability**: committed transactions are persisted to DynamoDB's multi-AZ storage.

**TransactWriteItems** can include up to **100 items** per request across **multiple tables in the same region**, subject to a **4 MB total request size limit** across all items in the transaction. Supported operations within a transaction: `Put`, `Update`, `Delete`, and `ConditionCheck` (read an item and assert a condition without writing to it). If any condition check fails or any write fails, the entire transaction rolls back.

**TransactGetItems** reads up to **100 items** atomically — all reads reflect the same point-in-time snapshot, preventing phantom reads.

**Cost**: Transactions consume **2x the WCUs/RCUs** of equivalent non-transactional operations — one unit for the prepare phase and one for the commit phase. A transactional write of a 2 KB item costs `ceil(2/1) × 2 = 4 WCUs`. A transactional read of a 6 KB item with eventual consistency would be... actually, transactional reads are always strongly consistent: `ceil(6/4) × 2 = 4 RCUs`.

**When to use**: fund transfers, inventory reservation + order creation (must both succeed), multi-step game state changes. Do not use transactions for single-item writes where standard conditional writes (`ConditionExpression` on a `PutItem`) would suffice — condition expressions are atomic and cheaper.

**When NOT to use**: transactions are not the right tool for high-throughput hot paths. The 2x cost and higher latency (two-phase commit internals) add up quickly. If you're running hundreds of thousands of transactional writes per second, the cost is substantial.

### DynamoDB Accelerator (DAX)

**DAX** is a fully managed, highly available, in-memory cache cluster purpose-built for DynamoDB. It runs inside your VPC and speaks the DynamoDB API — you point your SDK at the DAX cluster endpoint instead of the DynamoDB endpoint, and reads that hit the cache return in **microseconds** (compared to single-digit milliseconds from DynamoDB directly).

**How DAX works:**
- **Item cache**: caches individual item reads (GetItem responses). Cache hit returns directly from memory without touching DynamoDB.
- **Query cache**: caches Query and Scan results. Cache entries are keyed by the exact request parameters.
- **Write-through**: writes go to DynamoDB first, then DAX updates its item cache with the new value. This ensures the cache is consistent with the database immediately after a write.
- **TTL**: cached items expire after a configurable time-to-live (default 5 minutes for item cache, 60 seconds for query cache).

**DAX is best for:**
- Read-heavy workloads with high cache-hit rates (same items read repeatedly).
- Hot partitions: a few popular items absorbing most of your read traffic.
- Applications where single-digit millisecond latency is not fast enough (real-time auctions, gaming, social feeds).

**DAX is NOT appropriate for:**
- **Strongly consistent reads**: DAX does not support `ConsistentRead=true`. If your application requires strong consistency, DAX will bypass the cache and go directly to DynamoDB — negating the performance benefit. Do not use DAX in front of a table where you depend on strong consistency.
- **Write-heavy workloads**: DAX's cache benefit is on reads. If your access pattern is 90% writes, DAX adds latency and cost without helping throughput.
- **Infrequently accessed data**: low cache-hit rates mean most requests miss the cache and still hit DynamoDB, while you still pay for the DAX cluster (node-hour pricing).

**DAX cluster**: runs as a cluster of nodes (minimum 3 for production high availability across AZs). Node types range from `dax.t3.small` to `dax.r5.8xlarge`. You pay per node-hour. DAX does not support IAM-based fine-grained access control at the item level — it relies on the IAM role of the DAX cluster itself to access DynamoDB.

### TTL (Time to Live)

**TTL** enables automatic expiration and deletion of items based on a timestamp attribute. You designate any Number attribute as the TTL attribute; DynamoDB compares its value (Unix epoch seconds) to the current time and deletes the item within approximately 48 hours after expiry (typically within a few minutes for recent expirations, but the 48-hour SLA is what's guaranteed).

TTL deletions:
- Are **free** — they consume no WCUs.
- Are **propagated to GSIs and LSIs** automatically.
- **Appear in DynamoDB Streams** as `REMOVE` events, allowing downstream systems to react to expirations (e.g., invalidate a downstream cache, log the deletion, trigger cleanup).
- Do **not** guarantee exact deletion at the TTL timestamp — items may be visible for up to 48 hours after expiry. If your application needs to treat expired items as invalid before deletion, filter them in your application logic.

Use TTL for session tokens, temporary authorization codes, cached data with a natural expiration, soft-delete audit records, and any item that should clean itself up without manual intervention.

## Configuration Reference

### Enable DynamoDB Streams on a Table

```bash
aws dynamodb update-table \
  --table-name Orders \
  --stream-specification \
      StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region us-east-1
```

`StreamViewType` options: `KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, `NEW_AND_OLD_IMAGES`.

To check the stream ARN (needed to configure Lambda event source):

```bash
aws dynamodb describe-table \
  --table-name Orders \
  --query "Table.LatestStreamArn" \
  --region us-east-1
```

### Configure Lambda as a Stream Consumer

```bash
aws lambda create-event-source-mapping \
  --function-name OrderStreamProcessor \
  --event-source-arn arn:aws:dynamodb:us-east-1:123456789012:table/Orders/stream/2025-03-14T00:00:00.000 \
  --batch-size 100 \              # process up to 100 stream records per invocation
  --starting-position LATEST \    # LATEST = new records only; TRIM_HORIZON = from oldest retained
  --bisect-batch-on-function-error \  # split batch in half on failure to isolate bad records
  --region us-east-1
```

### TransactWriteItems (JavaScript SDK v3)

The most common transaction exam scenario: atomically debit one account and credit another, with a condition check to prevent overdraft.

```javascript
import { DynamoDBClient, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });

const command = new TransactWriteItemsCommand({
  TransactItems: [
    {
      // Condition check: source account must have sufficient balance
      ConditionCheck: {
        TableName: "Accounts",
        Key: { account_id: { S: "acct-source-001" } },
        ConditionExpression: "balance >= :amount",
        ExpressionAttributeValues: { ":amount": { N: "150.00" } },
      },
    },
    {
      // Debit the source account
      Update: {
        TableName: "Accounts",
        Key: { account_id: { S: "acct-source-001" } },
        UpdateExpression: "SET balance = balance - :amount",
        ExpressionAttributeValues: { ":amount": { N: "150.00" } },
      },
    },
    {
      // Credit the destination account
      Update: {
        TableName: "Accounts",
        Key: { account_id: { S: "acct-dest-002" } },
        UpdateExpression: "SET balance = balance + :amount",
        ExpressionAttributeValues: { ":amount": { N: "150.00" } },
      },
    },
    {
      // Write an audit log entry atomically with the transfer
      Put: {
        TableName: "AuditLog",
        Item: {
          transfer_id:  { S: "txn-20250314-001" },
          event_time:   { S: new Date().toISOString() },
          source_acct:  { S: "acct-source-001" },
          dest_acct:    { S: "acct-dest-002" },
          amount:       { N: "150.00" },
        },
      },
    },
  ],
});

try {
  await client.send(command);
  console.log("Transfer complete");
} catch (err) {
  if (err.name === "TransactionCanceledException") {
    // At least one condition failed or conflict detected — no changes applied
    console.error("Transaction cancelled:", err.CancellationReasons);
  }
  throw err;
}
```

This single API call spans two tables (`Accounts` and `AuditLog`), includes a condition check, and is atomic. All-or-nothing. WCU cost: `(debit write + credit write + audit put) × 2` for the transaction multiplier, plus the condition check.

### Create a DAX Cluster

```bash
aws dax create-cluster \
  --cluster-name prod-dax-cluster \
  --node-type dax.r5.large \        # memory-optimized; t3.small for dev/test
  --replication-factor 3 \          # 3 nodes across 3 AZs — high availability
  --iam-role-arn arn:aws:iam::123456789012:role/DAXRole \  # must have DynamoDB permissions
  --subnet-group-name dax-subnet-group \  # VPC subnet group
  --security-group-ids sg-0abc123def456789 \
  --region us-east-1
```

The DAX cluster endpoint returned by this command (`prod-dax-cluster.abc123.dax.us-east-1.amazonaws.com:8111`) replaces your DynamoDB endpoint in the SDK configuration. No application code changes beyond the endpoint swap.

### Enable TTL on a Table

```bash
aws dynamodb update-time-to-live \
  --table-name Sessions \
  --time-to-live-specification "Enabled=true,AttributeName=expires_at"
  --region us-east-1
```

`expires_at` must be a Number attribute containing a Unix epoch timestamp (seconds since January 1, 1970). Items with `expires_at` values in the past will be deleted within 48 hours. To verify TTL is active:

```bash
aws dynamodb describe-time-to-live \
  --table-name Sessions \
  --region us-east-1
```

### Console Path

**Streams**: DynamoDB → Tables → select table → **Exports and streams** tab → **DynamoDB stream details** → **Enable** → choose stream view type.

**DAX**: DAX (separate console section) → **Clusters** → **Create cluster** → configure node type, replication factor, VPC, IAM role.

**TTL**: DynamoDB → Tables → select table → **Additional settings** tab → **Time to Live (TTL)** → **Enable** → enter TTL attribute name.

## How to Decide

| Scenario | Recommendation |
|---|---|
| React to DynamoDB writes in near real-time | Enable Streams + Lambda event source mapping |
| Need before and after item images for change tracking | `NEW_AND_OLD_IMAGES` stream view type |
| Only need to know which item changed, not its data | `KEYS_ONLY` stream view type |
| Transfer funds atomically between two accounts | `TransactWriteItems` with ConditionCheck + two Updates |
| High-read workload, same items read many times per second | DAX — microsecond cache hits |
| Application requires strongly consistent reads | Do NOT use DAX; query DynamoDB directly with `ConsistentRead=true` |
| Write-heavy workload, low read repetition | DAX adds cost without benefit; skip it |
| Session data or tokens that expire after a fixed time | TTL on the expiration timestamp attribute |
| Single-item conditional write (e.g., only insert if not exists) | `ConditionExpression` on PutItem — cheaper than a transaction |
| Need to capture expired item deletions downstream | TTL + Streams — expirations appear as REMOVE events |

## How This Connects

- **Streams retention is 24 hours** — if your Lambda consumer falls behind (error, deployment, throttle), you have a window before records are gone. Design for failure: use DLQs (Dead Letter Queues), bisect-on-error, and monitoring on `IteratorAge` CloudWatch metric (how old the oldest unprocessed record is).
- **Transactions are scoped to a single region** — `TransactWriteItems` cannot span regions. If you need cross-region atomic operations, you need application-level coordination or a different data model.
- **DAX and Streams interact**: writes go to DynamoDB first (write-through), so Streams captures the write correctly regardless of DAX. DAX does not buffer or delay writes.
- **TTL deletions appear in Streams** as `REMOVE` events with a `userIdentity` field indicating `"principalId": "dynamodb.amazonaws.com"` — you can distinguish TTL-driven deletes from application-driven deletes in your Lambda handler.
- **RCU/WCU math from Lesson 1 compounds here**: a transactional write of a 3 KB item costs `ceil(3/1) × 2 = 6 WCUs`. Knowing the base unit math is prerequisite to correctly sizing tables that use transactions heavily.

## Exam Traps

**"DynamoDB Transactions support up to 25 items."** The limit was 25 in earlier versions and many study materials still cite it. The current limit is **100 items per transaction**. Verify this is current at exam time — AWS updates service limits, and the exam may test the current number.

**"DAX works transparently and supports all DynamoDB features."** DAX does not support strongly consistent reads. If your application calls `GetItem` with `ConsistentRead=true` through the DAX client, the DAX client bypasses the cache and goes directly to DynamoDB. This is correct behavior, not a bug — but it means DAX provides zero benefit for strongly consistent workloads, while you still pay for the cluster.

**"Streams guarantee global ordering of all item changes."** Streams provide ordering guarantees per shard, and items with the same partition key always land on the same shard. But different partition keys may be on different shards, and cross-shard ordering is not guaranteed. If you need strict global ordering across all items, DynamoDB Streams is not sufficient on its own.

**"TTL deletes happen exactly at the expiration time."** TTL deletion is best-effort and can lag up to 48 hours after the expiry timestamp. Items past their TTL timestamp may still be returned by reads and queries until DynamoDB deletes them. If your application must treat expired items as invalid immediately, you must check the TTL attribute in your application logic and filter expired items yourself.

**"A failed transaction means a partial write occurred."** A cancelled `TransactWriteItems` means no writes were applied — it is fully atomic. However, a transaction can fail for two distinct reasons: a `TransactionCanceledException` (a condition check failed or there was a conflict — no writes occurred) vs. a transient error like throttling (which you should retry). Confusing the two leads to incorrect error-handling logic.

## Summary

- **DynamoDB Streams** captures every item-level change as an ordered log with 24-hour retention; stream view types (`KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, `NEW_AND_OLD_IMAGES`) control what item data is captured with each record.
- **Streams + Lambda** is the standard DynamoDB event-driven pattern — Lambda polls shards, processes batches, and reacts to inserts, updates, and deletes in near real-time.
- **TransactWriteItems** and **TransactGetItems** provide ACID guarantees across up to 100 items and multiple tables in the same region, at 2x the WCU/RCU cost of equivalent non-transactional operations.
- **DAX** is an in-memory write-through cache that reduces read latency to microseconds for repeated item reads — it is incompatible with strongly consistent reads and adds no value for write-heavy or low-repetition read workloads.
- **TTL** automatically expires items within 48 hours of a timestamp attribute value passing the current time, at no WCU cost; deletions surface in Streams as REMOVE events.
- Together these features position DynamoDB as a complete platform for event-driven, transactional, and performance-critical architectures — not just a fast key-value store.

## Examples

A food delivery platform uses DynamoDB Streams with Lambda to drive a real-time order-status dashboard. When a driver marks an order as "delivered," the `PutItem` call writes the new status to DynamoDB. The stream captures the change as a `MODIFY` event with `NEW_IMAGE` view type, which includes the complete updated item. A Lambda function processes the record and pushes a WebSocket notification to the customer's browser within seconds. The team configured `bisect-batch-on-function-error` so that if one record in a batch fails to process (e.g., malformed data), Lambda splits the batch and retries each half separately — isolating the bad record rather than blocking the entire shard for the full retry window.

A digital bank needed to guarantee that a funds transfer between two accounts was atomic: either both the debit and the credit occur, or neither does. They implemented this with `TransactWriteItems` containing a `ConditionCheck` (source balance >= transfer amount), an `Update` (debit source), an `Update` (credit destination), and a `Put` (write an immutable audit record). When the source balance condition fails, DynamoDB returns a `TransactionCanceledException` with cancellation reasons identifying which item caused the failure — the application catches this and returns a clean "Insufficient funds" error to the client without any partial state being written. The bank accepted the 2x WCU cost because the correctness guarantee eliminates the need for application-level compensation logic, which would have been far more complex to build and operate.

A real-time auction platform ran DynamoDB reads for active auction items at 50,000 requests per second during peak windows, with the same 200 popular items being read thousands of times per second each. DynamoDB alone was delivering 4–8ms reads — too slow for their sub-millisecond SLA. After deploying a 3-node DAX cluster in front of DynamoDB, the cache hit rate for active auction items reached 98%, reducing DynamoDB read requests from 50,000/sec to under 1,000/sec (cache misses only) and dropping p99 read latency to 180 microseconds. The key architectural insight: DAX's value is proportional to read repetition — if the same item is being read thousands of times per second, one DynamoDB read per cache TTL window serves all of them. If every read is for a unique item, DAX provides no benefit.

## Think About It

1. Your Lambda Streams consumer has a bug that causes it to error on every record for 26 hours before you fix it. What happens to the stream records that arrived during that window? How would you design the system to detect this situation before records are lost?
2. A `TransactWriteItems` request touching 4 items (each 1 KB) fails with `TransactionCanceledException`. How many WCUs were consumed by this failed transaction? Why?
3. DAX is a write-through cache. After a write, the item cache is updated. But what happens to Query cache entries that would include the updated item — are they invalidated immediately?
4. You use TTL to expire session tokens. A session token's `expires_at` timestamp passed 30 hours ago but the item is still returned by a `GetItem` call. Is this a bug? What should your application code do?
5. You're comparing DynamoDB Streams + Lambda (custom cross-region replication) versus DynamoDB Global Tables (managed active-active multi-region). What are two scenarios where you'd choose Streams + Lambda over Global Tables despite the higher implementation complexity?

## Quick Check

**Q1.** Which DynamoDB Streams view type captures both the item state before and after a modification?

- A) `KEYS_ONLY`
- B) `NEW_IMAGE`
- C) `OLD_IMAGE`
- D) `NEW_AND_OLD_IMAGES`

**Answer: D** — `NEW_AND_OLD_IMAGES` includes a complete snapshot of the item both before and after the change, enabling change-delta computation. The other types capture only a subset.

**Q2.** A `TransactWriteItems` call writes 5 items, each 2 KB. How many WCUs does this transaction consume?

- A) 5 WCUs (1 WCU per item)
- B) 10 WCUs (2 WCU per item based on size)
- C) 20 WCUs (2x transaction multiplier applied to each item's WCU cost)
- D) 4 WCUs (transactions are billed as a flat rate)

**Answer: C** — Each 2 KB item costs `ceil(2/1) = 2 WCUs` for a standard write. The transaction multiplier doubles this: `2 × 2 = 4 WCUs per item`. Five items: `5 × 4 = 20 WCUs`.

**Q3.** Which of the following workloads would benefit LEAST from adding DAX?

- A) A news feed where the top 50 stories are read 100,000 times per minute.
- B) A financial dashboard requiring strongly consistent balance reads.
- C) A gaming leaderboard where the top 10 scores are read every 200ms per user.
- D) An e-commerce site reading the same 500 popular product detail pages continuously.

**Answer: B** — DAX does not support `ConsistentRead=true`. The DAX client bypasses the cache for consistent read requests, routing them directly to DynamoDB. A financial dashboard requiring strong consistency gets no latency or throughput benefit from DAX, while still paying for the cluster.

## What's Next

Next up: DynamoDB Global Tables and Advanced Design Patterns — multi-region active-active replication and single-table design for complex access patterns.
