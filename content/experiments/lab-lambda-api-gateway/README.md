# Lambda + API Gateway Lab

## Overview

This hands-on lab demonstrates serverless application patterns using AWS Lambda and API Gateway, essential for the AWS Solutions Architect Professional exam. You'll build a complete REST API with CRUD operations, DynamoDB persistence, and learn about Lambda configuration, API throttling, error handling, and CloudWatch monitoring.

**Difficulty:** Intermediate
**Estimated Time:** 60-75 minutes
**Estimated Cost:** ~$0.01/hour (~$0.05 for full lab)

## Learning Objectives

By completing this lab, you will:

1. Build a complete REST API using API Gateway and Lambda
2. Configure Lambda functions with environment variables and layers
3. Implement DynamoDB integration with Global Secondary Indexes
4. Configure API Gateway throttling, quotas, and usage plans
5. Analyze Lambda execution logs in CloudWatch
6. Practice serverless error handling and validation patterns

## Architecture

This lab creates the following serverless architecture:

```
                          ┌──────────────────────────────────┐
                          │         API Client               │
                          │    (curl/Postman/Browser)        │
                          └──────────────┬───────────────────┘
                                         │
                                         │ HTTPS Requests
                                         ↓
                          ┌──────────────────────────────────┐
                          │       API Gateway (REST)         │
                          │                                   │
                          │  Endpoints:                       │
                          │  • POST   /items                  │
                          │  • GET    /items                  │
                          │  • GET    /items/{id}             │
                          │  • PUT    /items/{id}             │
                          │  • DELETE /items/{id}             │
                          │                                   │
                          │  Features:                        │
                          │  • Throttling: 100 req/sec        │
                          │  • Usage Plan: 10K req/day        │
                          │  • Request Validation             │
                          │  • CORS Enabled                   │
                          └──────────────┬───────────────────┘
                                         │
                          ┌──────────────┴───────────────────┐
                          │                                   │
         ┌────────────────▼───┐  ┌────────────────▼─────┐   │
         │  Lambda Functions  │  │   Lambda Functions   │   │
         │                    │  │                      │   │
         │ • CreateItem       │  │ • GetItems           │  ...
         │ • GetItem          │  │ • UpdateItem         │
         │ • DeleteItem       │  │                      │
         │                    │  │                      │
         │ Runtime: Node 20.x │  │ Runtime: Node 20.x   │
         │ Memory: 256 MB     │  │ Memory: 256 MB       │
         │ Timeout: 10s       │  │ Timeout: 10s         │
         └────────────────┬───┘  └────────────────┬─────┘
                          │                       │
                          │    ┌──────────────────┘
                          │    │
                          │    │ Uses Shared Layer
                          │    │
                          ↓    ↓
         ┌────────────────────────────────────────┐
         │      Lambda Layer (Shared Code)        │
         │  • validateItem()                      │
         │  • createResponse()                    │
         └────────────────────────────────────────┘
                          │
                          │ SDK Calls
                          ↓
         ┌────────────────────────────────────────┐
         │         DynamoDB Table                 │
         │         "sap-study-lab-items"          │
         │                                         │
         │  Partition Key: id (String)            │
         │  Attributes:                           │
         │  • name, description, status           │
         │  • createdAt, updatedAt, ttl           │
         │                                         │
         │  GSI: status-index                     │
         │  • Partition: status                   │
         │  • Sort: createdAt                     │
         │                                         │
         │  Billing: On-Demand                    │
         │  TTL: Enabled (30 days)                │
         └────────────────┬───────────────────────┘
                          │
                          │ Logs/Metrics
                          ↓
         ┌────────────────────────────────────────┐
         │          CloudWatch                    │
         │  • Lambda execution logs               │
         │  • API Gateway access logs             │
         │  • X-Ray traces                        │
         │  • Custom metrics                      │
         └────────────────────────────────────────┘
```

## Prerequisites

- AWS Account with administrative access
- AWS CLI configured
- Node.js and pnpm installed
- Basic understanding of REST APIs and HTTP methods
- Familiarity with Lambda and DynamoDB concepts

## Cost Breakdown

| Resource | Cost (approx.) | Notes |
|----------|---------------|-------|
| Lambda invocations | Free tier | First 1M requests/month free |
| Lambda compute time | Free tier | First 400,000 GB-seconds/month free |
| API Gateway | Free tier | First 1M requests/month free |
| DynamoDB (on-demand) | ~$0.00 | Pay per request, minimal for testing |
| CloudWatch Logs | ~$0.01/hour | Minimal ingestion for short lab |
| **Total** | **~$0.01/hour** | |

**Important:** Remember to destroy resources after completing the lab to avoid ongoing charges!

## Deployment

### Step 1: Deploy the Infrastructure

Click the **Deploy Lab** button above, or run:

```bash
pnpm cdk:deploy lab-lambda-api-gateway
```

Deployment takes approximately 3-5 minutes.

### Step 2: Verify Deployment

Once deployment completes, you'll see CloudFormation outputs including:

- API Gateway endpoint URL
- DynamoDB table name
- Lambda function names
- Console URLs for quick access
- Sample curl commands for testing

**Save the API URL** - you'll need it for the exercises!

## Lab Exercises

### Exercise 1: Test API Gateway Endpoints

**Objective:** Understand REST API operations and Lambda integration

1. **Create an item** using the POST endpoint:

```bash
# Replace {API_URL} with your actual API Gateway URL from outputs
curl -X POST {API_URL}/items \
  -H "Content-Type: application/json" \
  -d '{"name":"My First Item","description":"Testing Lambda API","status":"active"}'
```

Expected response:
```json
{
  "message": "Item created",
  "item": {
    "id": "1704585600000-abc123def",
    "name": "My First Item",
    "description": "Testing Lambda API",
    "status": "active",
    "createdAt": 1704585600000,
    "updatedAt": 1704585600000,
    "ttl": 1707177600
  }
}
```

2. **List all items** using the GET endpoint:

```bash
curl {API_URL}/items
```

3. **Get a specific item** (use the ID from step 1):

```bash
curl {API_URL}/items/{id}
```

4. **Update an item**:

```bash
curl -X PUT {API_URL}/items/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Item","description":"Modified description","status":"completed"}'
```

5. **Delete an item**:

```bash
curl -X DELETE {API_URL}/items/{id}
```

**Key Concepts:**
- API Gateway routes HTTP methods to different Lambda functions
- Lambda proxy integration passes the entire request to your function
- Response format must include statusCode, headers, and body

**Questions to Consider:**
- What HTTP status codes are returned for each operation?
- How does API Gateway know which Lambda function to invoke?
- What happens if you send invalid JSON?

### Exercise 2: Explore Lambda Function Configuration

**Objective:** Understand Lambda runtime configuration and environment variables

1. Navigate to the **Lambda Console** using the provided console URLs in outputs

2. Open the **CreateItem** function and examine:
   - **Runtime:** Node.js 20.x (latest LTS version)
   - **Memory:** 256 MB (balance of cost and performance)
   - **Timeout:** 10 seconds (sufficient for DynamoDB operations)
   - **Environment variables:** TABLE_NAME, LOG_LEVEL

3. Check the **Configuration** tab:
   - Review IAM role permissions (DynamoDB access)
   - Examine VPC configuration (none - public Lambda)
   - Check concurrency settings (unreserved)

4. Review the **Layers** section:
   - One layer attached with shared utilities
   - Layer provides validateItem() and createResponse() functions

5. Test the function directly from the console:
   - Click **Test** tab
   - Create a test event with API Gateway proxy format:
   ```json
   {
     "body": "{\"name\":\"Test from Console\",\"status\":\"pending\"}",
     "httpMethod": "POST"
   }
   ```
   - Execute and examine the response

**Key Concepts:**
- Environment variables decouple configuration from code
- Lambda layers enable code reuse across functions
- IAM roles grant least-privilege access to AWS services

**Questions to Consider:**
- Why use 256 MB memory instead of the minimum 128 MB?
- What happens if the function exceeds 10-second timeout?
- How does the shared layer reduce code duplication?

### Exercise 3: Analyze CloudWatch Logs

**Objective:** Debug Lambda functions using CloudWatch Logs

1. Navigate to **CloudWatch Logs** using the console URL from outputs

2. Find the log group for the CreateItem function:
   - Log group name: `/aws/lambda/sap-study-lab-create-item`

3. Open the most recent log stream and examine:
   - **INIT logs:** Cold start initialization
   - **Event logs:** Full API Gateway request object
   - **Application logs:** console.log() output
   - **REPORT line:** Duration, billed duration, memory used

4. Create several items via API calls, then analyze:
   - Compare cold start vs warm invocation durations
   - Check memory usage (should be well under 256 MB)
   - Look for any errors or warnings

5. Use **CloudWatch Logs Insights** for advanced querying:

```
# Query to find slowest invocations
fields @timestamp, @duration
| filter @type = "REPORT"
| sort @duration desc
| limit 10
```

```
# Query to find errors
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
```

**Key Concepts:**
- CloudWatch Logs automatically capture Lambda output
- Cold starts have higher latency due to initialization
- Structured logging improves searchability

**Questions to Consider:**
- What's the difference between Duration and Billed Duration?
- How much memory is actually used vs allocated?
- What causes cold starts and how can you minimize them?

### Exercise 4: Configure API Throttling and Quotas

**Objective:** Implement rate limiting to protect backend services

1. Navigate to **API Gateway Console** using the provided URL

2. Go to **Stages** → **prod** → **Settings**:
   - Review throttling settings:
     - Rate: 100 requests/second
     - Burst: 200 requests
   - These protect Lambda from excessive invocations

3. Examine the **Usage Plan**:
   - Navigate to **Usage Plans** in left menu
   - Find "SAP Study Lab Usage Plan"
   - Review quota: 10,000 requests/day
   - Check associated API stages

4. Test throttling behavior:

```bash
# Install Apache Bench for load testing (if not installed)
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Send 500 requests with 50 concurrent connections
ab -n 500 -c 50 {API_URL}/items
```

Examine results:
- Successful requests (200 status)
- Throttled requests (429 Too Many Requests)
- Average response time

5. Check CloudWatch metrics:
   - Navigate to **Monitoring** tab in API Gateway
   - View graphs for:
     - 4XXError (throttling errors)
     - Count (total requests)
     - Latency

**Key Concepts:**
- Throttling protects backends from traffic spikes
- Burst capacity handles temporary load increases
- Usage plans enforce quotas over longer periods

**Questions to Consider:**
- What's the difference between rate limit and burst limit?
- How does API Gateway return errors when throttled?
- When would you use method-level throttling vs stage-level?

### Exercise 5: Test DynamoDB Integration and GSI

**Objective:** Understand DynamoDB query patterns and Global Secondary Indexes

1. Navigate to **DynamoDB Console** using the provided URL

2. Explore the **Items** tab:
   - View items created through the API
   - Examine the schema (id, name, description, status, timestamps)
   - Check TTL attribute (30 days from creation)

3. Test the **Global Secondary Index**:
   - Click on **Indexes** tab
   - View "status-index" (partition: status, sort: createdAt)

4. Query by status using the API:

```bash
# Create items with different statuses
curl -X POST {API_URL}/items -H "Content-Type: application/json" \
  -d '{"name":"Active Item","status":"active"}'

curl -X POST {API_URL}/items -H "Content-Type: application/json" \
  -d '{"name":"Pending Item","status":"pending"}'

curl -X POST {API_URL}/items -H "Content-Type: application/json" \
  -d '{"name":"Completed Item","status":"completed"}'

# Query items by status (uses GSI)
curl "{API_URL}/items?status=active"
curl "{API_URL}/items?status=pending"
```

5. Compare query vs scan performance:
   - Review the GetItems Lambda function code
   - When status parameter is provided, it uses Query (efficient)
   - Without status, it uses Scan (reads entire table)

6. Check DynamoDB metrics in CloudWatch:
   - Navigate to **Monitoring** tab
   - View consumed read/write capacity units
   - Check throttling events (should be none with on-demand)

**Key Concepts:**
- GSIs enable queries on non-primary-key attributes
- Query is more efficient than Scan for filtered data
- On-demand billing scales automatically with usage

**Questions to Consider:**
- Why use a GSI instead of scanning the table?
- How does TTL help manage table size and costs?
- What's the cost difference between on-demand and provisioned capacity?

### Exercise 6: Implement Error Handling and Validation

**Objective:** Practice robust error handling patterns

1. **Test input validation** by sending invalid requests:

```bash
# Missing required field (name)
curl -X POST {API_URL}/items -H "Content-Type: application/json" \
  -d '{"description":"No name field"}'

# Expected: 400 Bad Request with error message
```

```bash
# Name too long (> 100 characters)
curl -X POST {API_URL}/items -H "Content-Type: application/json" \
  -d '{"name":"'$(python3 -c 'print("A"*101)')'","status":"active"}'

# Expected: 400 Bad Request
```

```bash
# Invalid JSON syntax
curl -X POST {API_URL}/items -H "Content-Type: application/json" \
  -d '{"name":"Test", invalid json}'

# Expected: 400 Bad Request
```

2. **Test error responses** in CloudWatch:
   - Navigate to Lambda logs
   - Find error entries with stack traces
   - Examine how errors are caught and formatted

3. **Review validation logic** in the shared layer:
   - Check the Lambda layer code (visible in CloudFormation template)
   - See how validateItem() enforces business rules
   - Understand createResponse() standardizes responses

4. **Test not found scenarios**:

```bash
# Get non-existent item
curl {API_URL}/items/nonexistent-id

# Expected: 404 Not Found
```

```bash
# Update non-existent item
curl -X PUT {API_URL}/items/nonexistent-id \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","status":"active"}'

# Note: Current implementation updates anyway (DynamoDB upsert behavior)
# In production, you'd check existence first
```

5. **Examine API Gateway request validation**:
   - Navigate to API Gateway Console
   - Go to **Resources** → **POST /items** → **Method Request**
   - Review the request validator and model schema
   - This provides first-line validation before Lambda invocation

**Key Concepts:**
- Input validation prevents invalid data from reaching your database
- Structured error responses help API consumers debug issues
- API Gateway request validators reduce Lambda invocations
- Shared code (layers) ensures consistent validation logic

**Questions to Consider:**
- What's the benefit of validating at API Gateway vs Lambda?
- How do you balance between detailed error messages and security?
- When should you return 400 vs 500 status codes?

## Validation

Verify your understanding by answering these questions:

- [ ] Can you explain the difference between Lambda proxy and custom integration?
- [ ] Why use Lambda layers instead of duplicating code in each function?
- [ ] How does API Gateway throttling differ from usage plan quotas?
- [ ] What's the advantage of DynamoDB on-demand vs provisioned capacity?
- [ ] When would you choose REST API vs HTTP API in API Gateway?
- [ ] How does X-Ray tracing help debug serverless applications?

## Cleanup

**Important:** Destroy resources to avoid charges!

Click the **Cleanup Lab** button above, or run:

```bash
pnpm cdk:destroy lab-lambda-api-gateway
```

Verify in CloudFormation console that the stack is fully deleted.

**Note:** DynamoDB table will be deleted automatically due to `removalPolicy: DESTROY` in the CDK stack.

## Additional Challenges

If you want to extend this lab:

1. **Add authentication** using API Gateway API Keys or Cognito authorizers
2. **Implement pagination** for the GET /items endpoint with limit and lastEvaluatedKey
3. **Add caching** using API Gateway cache to reduce Lambda invocations
4. **Create custom CloudWatch dashboards** with API and Lambda metrics
5. **Implement step functions** to orchestrate multi-step workflows
6. **Add SNS notifications** when items are created or status changes
7. **Deploy multiple stages** (dev, staging, prod) with different configurations
8. **Implement API versioning** (v1, v2) with different Lambda backends

## Troubleshooting

**Issue:** API returns 502 Bad Gateway
**Solution:** Check Lambda function logs for errors. Ensure Lambda returns proper response format with statusCode, headers, and body.

**Issue:** 403 Forbidden when calling API
**Solution:** Verify CORS configuration in API Gateway. Check that OPTIONS method exists for preflight requests.

**Issue:** Lambda timeout errors
**Solution:** Increase timeout in function configuration or optimize DynamoDB queries. Check if VPC configuration is causing NAT gateway delays.

**Issue:** DynamoDB access denied
**Solution:** Verify Lambda execution role has dynamodb:PutItem, dynamodb:GetItem, etc. permissions. Check resource ARN in IAM policy matches table name.

**Issue:** High Lambda costs
**Solution:** Review memory allocation (reduce if usage is low). Check for retry storms from failed invocations. Implement reserved concurrency to cap execution.

## Related Exam Topics

This lab covers SAP-C02 exam topics:

- **Domain 2:** Serverless architecture design, API Gateway patterns
- **Domain 3:** Performance optimization, monitoring, and cost optimization
- **Exam Task 2.1:** Design serverless architectures for new workloads
- **Exam Task 3.2:** Optimize compute and storage solutions
- **Exam Task 3.4:** Improve observability and monitoring

## Related Study Content

- [Serverless Architecture Design](/study/domain-2-new-workloads/serverless-architecture)
- [API Gateway Design Patterns](/study/domain-2-new-workloads/api-gateway-patterns)
- [Lambda Best Practices](/study/domain-3-continuous-improvement/lambda-optimization)
- [DynamoDB Design Patterns](/study/domain-2-new-workloads/dynamodb-design)

## Learn More

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/latest/dg/)
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [API Gateway Throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
- [DynamoDB Global Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
- [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)

---

**Lab ID:** lab-lambda-api-gateway
**Version:** 1.0.0
**Last Updated:** 2026-01-05
