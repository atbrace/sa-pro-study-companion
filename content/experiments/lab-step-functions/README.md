# Step Functions Workflow Lab

## Overview

This hands-on lab demonstrates AWS Step Functions for orchestrating complex, serverless workflows. You'll build a complete order processing system that showcases state machine design patterns, error handling, parallel execution, and integration with Lambda, DynamoDB, and SNS.

**Difficulty:** Advanced
**Estimated Time:** 60-90 minutes
**Estimated Cost:** ~$0.05/hour (~$0.10 for full lab)

## Learning Objectives

By completing this lab, you will:

1. Design state machines using Amazon States Language (ASL)
2. Implement Task states with Lambda function integration
3. Configure Choice states for conditional branching logic
4. Build error handling with retry strategies and catch blocks
5. Execute Parallel states for concurrent task processing
6. Compare Step Functions Express vs Standard execution models

## Architecture

This lab creates the following workflow architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Step Functions State Machine                     │
│                                                                      │
│  ┌──────────────┐        ┌─────────────┐                           │
│  │   Validate   │───────>│  Is Valid?  │                           │
│  │    Input     │        │   (Choice)  │                           │
│  │   (Lambda)   │        └─────┬───┬───┘                           │
│  └──────────────┘              │   │                               │
│                          Valid │   │ Invalid                        │
│                         ┌──────┘   └──────┐                        │
│                         │                  │                        │
│              ┌──────────▼──────────┐   ┌──▼──────────┐            │
│              │  Parallel Processing │   │   Send      │            │
│              │                      │   │  Failure    │            │
│              │  ┌────────────────┐ │   │ Notification│            │
│              │  │ Check Inventory│ │   └─────────────┘            │
│              │  │    (Lambda)    │ │                               │
│              │  └────────────────┘ │                               │
│              │                      │                               │
│              │  ┌────────────────┐ │                               │
│              │  │   Calculate    │ │                               │
│              │  │    Shipping    │ │                               │
│              │  │    (Lambda)    │ │                               │
│              │  └────────────────┘ │                               │
│              └──────────┬───────────┘                               │
│                         │                                           │
│                  ┌──────▼──────┐                                   │
│                  │    Merge    │                                   │
│                  │   Results   │                                   │
│                  └──────┬──────┘                                   │
│                         │                                           │
│                  ┌──────▼──────┐                                   │
│                  │ Is In Stock?│                                   │
│                  │   (Choice)  │                                   │
│                  └──┬───────┬──┘                                   │
│              Yes   │       │  No                                    │
│          ┌─────────┘       └────────┐                             │
│          │                           │                              │
│   ┌──────▼───────┐          ┌───────▼────────┐                   │
│   │   Process    │          │  Send Failure  │                   │
│   │    Order     │          │  Notification  │                   │
│   │  (Lambda)    │          └────────────────┘                   │
│   └──────┬───────┘                                                 │
│          │                                                          │
│   ┌──────▼───────┐                                                 │
│   │Send Success  │                                                 │
│   │ Notification │                                                 │
│   │  (Lambda)    │                                                 │
│   └──────┬───────┘                                                 │
│          │                                                          │
│   ┌──────▼───────┐                                                 │
│   │   Success    │                                                 │
│   └──────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │ Lambda   │────────>│ DynamoDB │        │   SNS    │
    │Functions │         │  Table   │        │  Topic   │
    │  (5)     │         │ (State)  │        │(Notify)  │
    └──────────┘         └──────────┘        └──────────┘
```

## Prerequisites

- AWS Account with administrative access
- AWS CLI configured
- Node.js and pnpm installed
- Basic understanding of Lambda, DynamoDB, and state machines
- Familiarity with JSON and Amazon States Language

## Cost Breakdown

| Resource | Cost (approx.) |
|----------|---------------|
| Step Functions (Standard) | $0.025 per 1,000 state transitions |
| Step Functions (Express) | $0.000001 per request (minimal) |
| Lambda executions | Free tier eligible (minimal) |
| DynamoDB on-demand | Free tier eligible (minimal) |
| SNS notifications | Free tier eligible (minimal) |
| CloudWatch Logs | Minimal storage/ingestion |
| **Total** | **~$0.05/hour** |

**Note:** Costs are minimal for learning purposes. Step Functions charges are negligible for testing (~100 executions = $0.0025).

## Deployment

### Step 1: Deploy the Infrastructure

Click the **Deploy Lab** button above, or run:

```bash
pnpm cdk:deploy lab-step-functions
```

Deployment takes approximately 3-5 minutes.

### Step 2: Verify Deployment

Once deployment completes, you'll see CloudFormation outputs including:

- State Machine ARNs (Standard and Express)
- DynamoDB table name
- SNS topic ARN
- Lambda function names
- Console URLs for quick access
- Sample execution command

## Lab Exercises

### Exercise 1: Explore State Machine Definition (ASL)

**Objective:** Understand Amazon States Language and state machine structure

1. Navigate to **Step Functions Console** using the provided URL
2. Select the **sap-study-order-workflow-standard** state machine
3. Click the **Definition** tab to view the ASL JSON

4. Examine the state machine structure:
   - How many states are defined?
   - Which state is the `StartAt` state?
   - Identify all state types (Task, Choice, Parallel, Pass, Succeed, Fail)

5. Review the ASL syntax:
   ```json
   {
     "Comment": "Order processing workflow",
     "StartAt": "Validate Input",
     "States": {
       "Validate Input": {
         "Type": "Task",
         "Resource": "arn:aws:states:::lambda:invoke",
         ...
       }
     }
   }
   ```

6. Answer these questions:
   - What does the `Type` field specify for each state?
   - How are state transitions defined?
   - Where is the output of one state passed to the next?

**Key Concept:** Amazon States Language (ASL) is a JSON-based structured language that defines state machines. Each state has a type (Task, Choice, Parallel, etc.) and specifies transitions.

### Exercise 2: Task States and Lambda Integration

**Objective:** Understand how Step Functions invokes Lambda functions

1. In the state machine visual designer, click on the **Validate Input** state
2. Examine the configuration in the right panel:
   - What is the `Resource` ARN?
   - What is the `OutputPath` setting?

3. Navigate to **Lambda Console** (use provided URL)
4. Open the **sap-study-validate-input** function:
   - Review the function code
   - What does it return in the response?
   - How does the function receive input from Step Functions?

5. Test the Lambda function directly:
   - Click **Test** and configure a test event:
   ```json
   {
     "orderId": "TEST-001",
     "amount": 100,
     "customerEmail": "test@example.com"
   }
   ```
   - Observe the output

6. Return to Step Functions and click **Start execution**:
   - Use the same JSON as input
   - Click through the execution steps
   - See how the Lambda output becomes the state output

**Key Concept:** Task states invoke external services (Lambda, ECS, SNS, etc.). The `$.Payload` output path extracts the Lambda function response from the wrapper object.

### Exercise 3: Choice States and Branching

**Objective:** Implement conditional logic in workflows

1. In the state machine graph, locate the **Is Valid?** Choice state
2. View the state definition:
   ```json
   "Is Valid?": {
     "Type": "Choice",
     "Choices": [
       {
         "Variable": "$.validationResult",
         "StringEquals": "VALID",
         "Next": "Parallel Processing"
       }
     ],
     "Default": "Send Failure Notification"
   }
   ```

3. Start a new execution with INVALID data:
   ```json
   {
     "orderId": "INVALID",
     "amount": -50,
     "customerEmail": ""
   }
   ```

4. Observe the execution path:
   - Which branch was taken?
   - Where did the execution end?
   - Check the **Execution event history**

5. Try different scenarios:
   - Valid order (amount > 0, email present)
   - Missing orderId
   - Amount exceeding $10,000

6. Examine the second Choice state **Is In Stock?**:
   - What variable does it evaluate?
   - What are the possible outcomes?
   - Since inventory check is randomized (80% success), run multiple executions

**Key Concept:** Choice states implement if/else logic. They evaluate variables using comparison operators (StringEquals, NumericGreaterThan, BooleanEquals, etc.) and route to different Next states.

### Exercise 4: Error Handling and Retry Logic

**Objective:** Build resilient workflows with error handling

1. Locate the **Process Order** Task state
2. View the **Retry** configuration in ASL:
   ```json
   "Retry": [
     {
       "ErrorEquals": [
         "Lambda.ServiceException",
         "Lambda.TooManyRequestsException"
       ],
       "IntervalSeconds": 2,
       "MaxAttempts": 3,
       "BackoffRate": 2
     }
   ]
   ```

3. Understand retry parameters:
   - `IntervalSeconds`: Wait time before first retry (2 seconds)
   - `BackoffRate`: Multiplier for each retry (2x, 4x, 8x)
   - `MaxAttempts`: Maximum retry attempts (3)

4. View the **Catch** configuration:
   ```json
   "Catch": [
     {
       "ErrorEquals": ["States.ALL"],
       "ResultPath": "$.errorInfo",
       "Next": "Send Failure Notification"
     }
   ]
   ```

5. Simulate an error:
   - Modify the Process Order Lambda to throw an error:
     - Go to Lambda Console
     - Edit `sap-study-process-order` function
     - Add `throw new Error('Simulated error');` at the top
   - Start a new execution
   - Observe retry behavior in execution history
   - See how the Catch block redirects to failure notification

6. Review error types:
   - `States.ALL`: Catches all errors
   - `States.TaskFailed`: Task execution failed
   - `States.Timeout`: Task exceeded timeout
   - Custom error names from Lambda

**Important:** Remove the error simulation code before continuing!

**Key Concept:** Retry and Catch blocks make workflows resilient. Retry handles transient errors automatically. Catch handles errors that can't be retried and routes to error handling paths.

### Exercise 5: Parallel States

**Objective:** Execute multiple tasks concurrently

1. Examine the **Parallel Processing** state in the graph
2. View the ASL definition:
   ```json
   "Parallel Processing": {
     "Type": "Parallel",
     "Branches": [
       {
         "StartAt": "Check Inventory",
         "States": { ... }
       },
       {
         "StartAt": "Calculate Shipping",
         "States": { ... }
       }
     ],
     "Next": "Merge Results"
   }
   ```

3. Start an execution with valid input:
   ```json
   {
     "orderId": "PAR-001",
     "amount": 75,
     "customerEmail": "parallel@example.com"
   }
   ```

4. In the execution graph:
   - Notice both branches execute simultaneously
   - Check the **Execution event history** timestamps
   - Both Lambda invocations happen at nearly the same time

5. View the output of the Parallel state:
   - It's an array with results from each branch: `[branch1Result, branch2Result]`
   - The **Merge Results** Pass state combines them into a single object

6. Consider optimization benefits:
   - How much time is saved by parallel execution?
   - What if you had 5 independent tasks?
   - When should you avoid Parallel states?

7. Modify the workflow (optional):
   - Add a third branch to the Parallel state
   - Update the Merge Results state to handle the third output
   - Redeploy with `pnpm cdk:deploy lab-step-functions`

**Key Concept:** Parallel states reduce workflow duration by executing independent tasks concurrently. Each branch is a mini-state machine that can have its own error handling.

### Exercise 6: Step Functions Express vs Standard

**Objective:** Understand execution model differences

1. Navigate to Step Functions Console
2. You'll see two state machines:
   - **sap-study-order-workflow-standard**
   - **sap-study-order-workflow-express**

3. Compare Standard workflow characteristics:
   - Execution history persisted up to 90 days
   - Exactly-once execution semantics
   - Full CloudWatch Logs integration
   - Execution can be inspected and re-run
   - Charged per state transition ($0.025/1K transitions)
   - Max duration: 1 year
   - Best for: Long-running, auditable workflows

4. Compare Express workflow characteristics:
   - Execution history available only during execution
   - At-least-once execution semantics
   - Logs only errors to CloudWatch
   - Cannot inspect past executions
   - Charged per request ($0.000001/request)
   - Max duration: 5 minutes
   - Best for: High-volume, short-duration, event-driven workflows

5. Test the Express workflow:
   ```bash
   aws stepfunctions start-sync-execution \
     --state-machine-arn <EXPRESS_STATE_MACHINE_ARN> \
     --input '{"orderId":"EXP-001","amount":50,"customerEmail":"express@example.com"}'
   ```
   Note: Express workflows support synchronous execution (waits for result)

6. Compare costs:
   - Standard: 10 state transitions = $0.00025
   - Express: 10 executions = $0.00001
   - Express is 25x cheaper for high-volume workloads

7. Decide which to use:
   - Use Standard for: Order processing, data pipelines, ETL, human approval workflows
   - Use Express for: API backends, streaming data processing, IoT, real-time transformations

**Key Concept:** Standard workflows provide durability and auditability for mission-critical processes. Express workflows provide cost-effective, high-throughput orchestration for event-driven architectures.

## Validation

Verify your understanding by answering these questions:

- [ ] Can you explain the difference between Task, Choice, and Parallel state types?
- [ ] How does ResultPath differ from OutputPath in state configuration?
- [ ] What happens if a Retry exhausts all MaxAttempts?
- [ ] Why does the Parallel state output an array?
- [ ] When would you use Express workflows instead of Standard?
- [ ] How do you pass data between states in a workflow?

## Cleanup

**Important:** Destroy resources to avoid charges!

Click the **Cleanup Lab** button above, or run:

```bash
pnpm cdk:destroy lab-step-functions
```

Verify in CloudFormation console that the stack is fully deleted.

## Additional Challenges

If you want to extend this lab:

1. **Add a Wait state** - Insert a delay before sending notifications
2. **Implement Map state** - Process an array of orders in parallel
3. **Add human approval** - Use Task tokens and callbacks for manual approval steps
4. **Integrate SQS** - Queue orders for batch processing
5. **Add EventBridge integration** - Trigger workflows from events
6. **Implement saga pattern** - Add compensating transactions for rollback
7. **Use Step Functions Local** - Test workflows locally before deployment

## Related Exam Topics

This lab covers SAP-C02 exam topics:

- **Domain 2:** Design serverless architectures with Step Functions orchestration
- **Domain 3:** Implement error handling and recovery strategies
- **Exam Task 2.2:** Design serverless and microservices architectures
- **Exam Task 3.3:** Implement improvements in reliability and operational excellence

## Related Study Content

- [Serverless Architecture Patterns](/study/domain-2-new-workloads/serverless-patterns)
- [Application Integration Services](/study/domain-2-new-workloads/application-integration)
- [Operational Excellence Design](/study/domain-3-continuous-improvement/operational-excellence)

## Troubleshooting

**Issue:** State machine execution fails immediately
**Solution:** Check IAM roles. The state machine role needs permissions to invoke Lambda, publish to SNS, and write to CloudWatch Logs.

**Issue:** Lambda functions timeout
**Solution:** Increase function timeout in Lambda console. Step Functions has a 1-year max duration for Standard workflows, but Lambda is limited to 15 minutes.

**Issue:** Cannot see execution history
**Solution:** Ensure you're viewing a Standard workflow. Express workflows don't persist execution history.

**Issue:** Parallel state produces unexpected output
**Solution:** Remember Parallel state outputs an array. Use a Pass state or Lambda to merge/transform results.

**Issue:** Choice state always takes Default path
**Solution:** Verify the Variable path (e.g., `$.validationResult`) matches exactly. Use InputPath/OutputPath to transform state data if needed.

**Issue:** Retry not triggering
**Solution:** Check ErrorEquals array. Use `States.ALL` to catch all errors during testing, then narrow to specific error types.

## Learn More

- [AWS Step Functions Documentation](https://docs.aws.amazon.com/step-functions/latest/dg/)
- [Amazon States Language Specification](https://states-language.net/spec.html)
- [Step Functions Best Practices](https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html)
- [Error Handling in Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
- [Express vs Standard Workflows](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-standard-vs-express.html)
- [Step Functions Service Integrations](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-service-integrations.html)

---

**Lab ID:** lab-step-functions
**Version:** 1.0.0
**Last Updated:** 2026-01-05
