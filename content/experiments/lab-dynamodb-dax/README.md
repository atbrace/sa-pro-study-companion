# DynamoDB + DAX Lab

## Overview

This hands-on lab demonstrates advanced DynamoDB concepts and caching with DynamoDB Accelerator (DAX). You'll create a production-ready table with indexes, configure a DAX cluster for microsecond read latency, and explore key DynamoDB features essential for the AWS Solutions Architect Professional exam.

**Difficulty:** Intermediate to Advanced
**Estimated Time:** 60-75 minutes
**Estimated Cost:** ~$0.30/hour (~$1.50 for full lab)

## Learning Objectives

By completing this lab, you will:

1. Design DynamoDB tables with Global Secondary Indexes (GSI) and Local Secondary Indexes (LSI)
2. Configure and deploy a DynamoDB Accelerator (DAX) cluster for read caching
3. Understand cache hit/miss ratios and DAX performance characteristics
4. Explore DynamoDB capacity modes (on-demand vs provisioned) and auto-scaling
5. Implement Time To Live (TTL) for automatic item expiration
6. Practice DynamoDB query patterns and understand Query vs Scan operations

## Architecture

This lab creates the following architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                        │
│                      (EC2 or Lambda - not deployed)             │
│                                                                  │
│                    DAX Client SDK (Python/Node.js/Java)         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Port 8111
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      VPC (10.2.0.0/16)                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              DAX Cluster (2 nodes)                       │  │
│  │                                                            │  │
│  │  ┌──────────────┐            ┌──────────────┐            │  │
│  │  │ DAX Primary  │            │ DAX Replica  │            │  │
│  │  │ (t3.small)   │◄──────────►│ (t3.small)   │            │  │
│  │  │  AZ-1        │ Replication│  AZ-2        │            │  │
│  │  └──────┬───────┘            └──────┬───────┘            │  │
│  │         │                           │                     │  │
│  │         │         Cache Misses      │                     │  │
│  │         └───────────┬───────────────┘                     │  │
│  │                     │                                      │  │
│  │            Private Subnets (2 AZs)                        │  │
│  │                   Security Group                          │  │
│  └─────────────────────┼────────────────────────────────────┘  │
│                        │                                        │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         │ AWS PrivateLink
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DynamoDB Service                             │
│                                                                  │
│  Table: sap-study-orders                                        │
│  ├─ Partition Key: customerId                                   │
│  ├─ Sort Key: orderId                                           │
│  ├─ GSI: OrderStatusIndex (orderStatus, orderTimestamp)         │
│  ├─ LSI: ProductCategoryIndex (customerId, productCategory)     │
│  ├─ TTL: expirationTime                                         │
│  ├─ Point-in-time Recovery: Enabled                             │
│  └─ DynamoDB Streams: Enabled                                   │
│                                                                  │
│  Billing: On-Demand (Pay per request)                           │
│  Encryption: AWS Managed (SSE)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- AWS Account with administrative access
- AWS CLI configured
- Node.js and pnpm installed
- Understanding of DynamoDB basics (tables, items, partition keys)
- Familiarity with NoSQL design patterns

## Cost Breakdown

| Resource | Quantity | Cost (approx.) | Notes |
|----------|----------|---------------|-------|
| DAX Cluster (t3.small) | 2 nodes | $0.058/hour each | 1 primary + 1 replica |
| DynamoDB Table | 1 | On-demand pricing | Minimal cost for testing |
| VPC & Subnets | 1 VPC, 2 subnets | Free | No NAT Gateway needed |
| Data Transfer | Minimal | ~$0.01/hour | Within same region |
| **Total** | - | **~$0.30/hour** | **~$1.50 for full lab** |

**Cost Notes:**
- DAX charges apply while cluster is running (~$0.116/hour for 2 nodes)
- DynamoDB on-demand: $1.25 per million write requests, $0.25 per million read requests
- No charges for VPC, subnets, or security groups
- Point-in-time recovery: No additional charge for on-demand tables

**💰 Important:** Remember to destroy resources after completing the lab to avoid ongoing charges!

## Deployment

### Step 1: Deploy the Infrastructure

Click the **Deploy Lab** button above, or run:

```bash
pnpm cdk:deploy lab-dynamodb-dax
```

Deployment takes approximately 8-12 minutes (DAX cluster creation is the longest step).

### Step 2: Verify Deployment

Once deployment completes, you'll see CloudFormation outputs including:

- DynamoDB table name and ARN
- DAX cluster name and endpoint
- VPC ID and security group ID
- Index configurations (GSI and LSI)
- Console URLs for quick access

## Lab Exercises

### Exercise 1: DynamoDB Table Design with Indexes

**Objective:** Understand table schema and index design patterns

1. Navigate to **DynamoDB Console** using the provided console URL
2. Click on the **sap-study-orders** table
3. Examine the table structure:
   - What is the partition key? What is the sort key?
   - Why would you choose `customerId` as the partition key?
   - How does the sort key `orderId` help with queries?

4. Review the **Indexes** tab:
   - **Global Secondary Index (GSI):** OrderStatusIndex
     - Partition key: `orderStatus`
     - Sort key: `orderTimestamp`
     - Use case: Query all orders with status "PENDING" sorted by timestamp
   - **Local Secondary Index (LSI):** ProductCategoryIndex
     - Partition key: `customerId` (same as base table)
     - Sort key: `productCategory`
     - Use case: Query all orders for a customer in "Electronics" category

5. Add sample data via the **Explore items** section:
   ```json
   {
     "customerId": "CUST-001",
     "orderId": "ORD-2026-001",
     "orderStatus": "PENDING",
     "orderTimestamp": 1735689600,
     "productCategory": "Electronics",
     "orderTotal": 299.99,
     "expirationTime": 1738368000
   }
   ```

   Create 5-10 items with varying attributes to test queries.

**Key Concept:** GSIs provide an alternative partition key for access patterns. LSIs share the same partition key as the base table but provide a different sort key.

### Exercise 2: DAX Cluster Configuration

**Objective:** Understand DAX architecture and configuration

1. Navigate to **DynamoDB Console → DAX**
2. Click on **sap-study-dax-cluster**
3. Review cluster details:
   - Node type: `dax.t3.small`
   - Replication factor: 2 (1 primary + 1 replica)
   - Subnet group: Private subnets in 2 AZs
   - Security group: Allows port 8111

4. Check the **Nodes** tab:
   - Verify nodes are in different Availability Zones
   - Note the node status (should be "available")
   - Check the endpoint URL

5. Review **Parameter Group**:
   - TTL for cached data (default: 5 minutes for item cache)
   - Query cache TTL (default: 5 minutes)

6. Check **Cluster Settings**:
   - Encryption at rest: Enabled
   - Encryption in transit: Configurable (NONE for this lab)

**Key Concept:** DAX is a write-through cache. All writes go to DynamoDB first, then DAX updates its cache. Reads check the cache first, falling back to DynamoDB on cache misses.

### Exercise 3: Cache Hit/Miss Ratios

**Objective:** Understand DAX caching behavior and performance

1. To test DAX, you would need to:
   - Launch an EC2 instance in the same VPC
   - Install DAX client SDK (e.g., `amazon-dax-client` for Python)
   - Configure the application to use DAX endpoint

2. Understand DAX cache types:
   - **Item Cache:** Stores results of GetItem and BatchGetItem
   - **Query Cache:** Stores results of Query and Scan operations

3. Cache behavior patterns:
   ```
   First Read (Cache Miss):
   App → DAX → DynamoDB → DAX Cache → App
   Latency: ~10ms (DynamoDB round trip)

   Subsequent Reads (Cache Hit):
   App → DAX (cached) → App
   Latency: <1ms (microseconds)

   Writes (Write-Through):
   App → DAX → DynamoDB → DAX Cache Update → App
   Latency: ~10ms (DynamoDB write)
   ```

4. Monitor DAX metrics in **CloudWatch**:
   - `ItemCacheHits` and `ItemCacheMisses`
   - `QueryCacheHits` and `QueryCacheMisses`
   - `CacheMissRate` (should decrease over time)

5. Calculate cache effectiveness:
   ```
   Cache Hit Rate = CacheHits / (CacheHits + CacheMisses)
   Target: >80% for read-heavy workloads
   ```

**Key Concept:** DAX is most effective for read-heavy workloads with frequently accessed items. It reduces DynamoDB read costs and improves performance for hot keys.

### Exercise 4: Read/Write Capacity Modes

**Objective:** Understand on-demand vs provisioned capacity

1. In DynamoDB Console, view the **Capacity** tab for your table
2. Current mode: **On-Demand**
   - Automatically scales to handle traffic
   - Pay per request ($1.25 per million writes, $0.25 per million reads)
   - No capacity planning required

3. Understand **Provisioned Mode** (not configured in this lab):
   - Specify RCUs (Read Capacity Units) and WCUs (Write Capacity Units)
   - 1 RCU = 1 strongly consistent read/sec for items up to 4KB
   - 1 WCU = 1 write/sec for items up to 1KB
   - Lower cost for predictable workloads
   - Can configure auto-scaling

4. When to use each mode:
   - **On-Demand:**
     - Unpredictable traffic patterns
     - New tables with unknown workload
     - Infrequent access
   - **Provisioned:**
     - Predictable traffic
     - Sustained traffic patterns
     - Cost optimization for high-volume apps

5. View **CloudWatch metrics**:
   - `ConsumedReadCapacityUnits`
   - `ConsumedWriteCapacityUnits`
   - `ThrottledRequests` (should be 0)

**Key Concept:** On-demand is simpler but can be more expensive at scale. Provisioned requires capacity planning but offers cost savings for predictable workloads.

### Exercise 5: TTL and Auto-Expiration

**Objective:** Implement automatic item deletion using Time To Live

1. In the DynamoDB table, go to **Additional settings** → **Time to Live**
2. Verify TTL is enabled on the `expirationTime` attribute
3. Understand TTL behavior:
   - Items are deleted automatically when `expirationTime` < current Unix timestamp
   - Deletion happens within 48 hours of expiration
   - No additional cost for TTL deletions
   - Expired items still count toward read capacity until deleted

4. Test TTL with sample data:
   ```json
   {
     "customerId": "CUST-002",
     "orderId": "ORD-EXPIRED-001",
     "orderStatus": "COMPLETED",
     "expirationTime": 1609459200
   }
   ```
   This item expired on Jan 1, 2021 and will be deleted by DynamoDB's TTL process.

5. Use cases for TTL:
   - Session data (expire after inactivity)
   - Temporary orders (expire after 30 days)
   - Event logs (retain for 90 days)
   - Cache data (expire after 24 hours)

**Key Concept:** TTL reduces storage costs and eliminates the need for manual cleanup processes. It's eventually consistent, so expired items may still appear in scans for up to 48 hours.

### Exercise 6: Query vs Scan Operations

**Objective:** Understand efficient DynamoDB access patterns

1. Navigate to **Explore items** in the DynamoDB console
2. Test a **Query** operation:
   - Select the base table
   - Query by partition key: `customerId = "CUST-001"`
   - Optional: Filter by sort key condition (e.g., `orderId` begins with "ORD-2026")
   - Note: Query is efficient because it uses the index

3. Test a **Query with GSI**:
   - Select **OrderStatusIndex**
   - Query by `orderStatus = "PENDING"`
   - Sort by `orderTimestamp` (newest first)
   - This query doesn't require accessing the base table

4. Test a **Scan** operation:
   - Select the base table
   - Choose "Scan" instead of "Query"
   - Add filter: `orderTotal > 100`
   - Note: Scan reads ALL items, then filters (inefficient!)

5. Compare performance:
   ```
   Query (Efficient):
   - Reads only items matching partition key
   - Uses index to locate data quickly
   - Cost: Based on items returned
   - Use for: Known partition key

   Scan (Inefficient):
   - Reads ALL items in table
   - Applies filter after reading
   - Cost: Based on ALL items scanned
   - Use for: Export/backup operations only
   ```

6. Best practices:
   - Always prefer Query over Scan
   - Design GSIs for common query patterns
   - Use FilterExpressions sparingly (they don't reduce RCU consumption)
   - Implement pagination for large result sets

**Key Concept:** Queries are O(log n) operations using indexes. Scans are O(n) operations that read the entire table. Always design your schema to support queries.

## Validation

Verify your understanding by answering these questions:

- [ ] Can you explain when to use a GSI vs an LSI?
- [ ] What happens to cache data in DAX when an item is updated in DynamoDB?
- [ ] Why is DAX deployed in a VPC?
- [ ] What's the difference between on-demand and provisioned billing?
- [ ] How does TTL affect read capacity consumption?
- [ ] Why are scans inefficient for large tables?
- [ ] What are the latency differences between direct DynamoDB reads and DAX cached reads?

## Cleanup

**Important:** Destroy resources to avoid charges!

Click the **Cleanup Lab** button above, or run:

```bash
pnpm cdk:destroy lab-dynamodb-dax
```

This will delete:
- DAX cluster (~$0.30/hour if left running)
- DynamoDB table (all data will be permanently deleted)
- VPC and associated networking resources

Verify in CloudFormation console that the stack is fully deleted.

## Additional Challenges

If you want to extend this lab:

1. **Deploy a Lambda function** to write test data to DynamoDB via DAX
2. **Create a DAX client application** (Python/Node.js) to measure cache performance
3. **Switch to provisioned capacity** and configure auto-scaling policies
4. **Add DynamoDB Streams** and process changes with Lambda
5. **Implement Global Tables** for multi-region replication
6. **Add a second GSI** for querying by `productCategory` and `orderTotal`
7. **Configure CloudWatch alarms** for throttled requests and cache hit rates

## Related Exam Topics

This lab covers SAP-C02 exam topics:

- **Domain 2:** Design database solutions for new workloads
- **Domain 3:** Continuous improvement of existing solutions
- **Exam Task 2.2:** Design database solutions
- **Exam Task 3.1:** Determine strategy to improve performance

Key concepts tested:
- DynamoDB partition key and sort key design
- GSI and LSI use cases
- DAX caching strategies
- Capacity modes and auto-scaling
- Query optimization patterns

## Related Study Content

- [Database Solutions for New Workloads](/study/domain-2-new-workloads/database-solutions)
- [Performance Optimization Strategies](/study/domain-3-continuous-improvement/performance-optimization)

## Troubleshooting

**Issue:** DAX cluster stuck in "creating" state
**Solution:** DAX creation can take 8-12 minutes. If it exceeds 15 minutes, check VPC and subnet configuration. Ensure subnets span multiple AZs.

**Issue:** Cannot connect to DAX from EC2 instance
**Solution:** Verify:
1. EC2 instance is in the same VPC
2. Security group allows outbound on port 8111
3. DAX security group allows inbound from VPC CIDR (10.2.0.0/16)
4. Using the correct DAX cluster endpoint URL

**Issue:** Query returns no results
**Solution:** Ensure you're querying the correct index and using the proper partition key. GSIs have different partition keys than the base table.

**Issue:** High costs for on-demand mode
**Solution:** On-demand pricing is $1.25 per million writes. If you're running high-volume tests, consider switching to provisioned mode with auto-scaling.

**Issue:** TTL items not deleting immediately
**Solution:** TTL deletion is eventually consistent and can take up to 48 hours. This is normal behavior. Use a filter to exclude expired items in your application logic.

## Learn More

### AWS Documentation

- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [DAX Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [DynamoDB Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html)
- [Time To Live (TTL)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
- [DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/)

### Whitepapers

- [Amazon DynamoDB: How It Works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.html)
- [Best Practices for DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

### Key Performance Metrics

- **DAX Latency:** Sub-millisecond (microseconds) for cached reads
- **DynamoDB Direct Latency:** Single-digit milliseconds
- **Cache Hit Rate Target:** >80% for read-heavy workloads
- **TTL Deletion Lag:** Up to 48 hours after expiration

---

**Lab ID:** lab-dynamodb-dax
**Version:** 1.0.0
**Last Updated:** 2026-01-05
