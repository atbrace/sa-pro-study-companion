# ECS Fargate with Application Load Balancer Lab

## Overview

This hands-on lab demonstrates container orchestration using Amazon ECS with Fargate launch type and Application Load Balancer integration. You'll deploy a containerized web application, configure auto-scaling, implement health checks, and practice deployment strategies essential for the AWS Solutions Architect Professional exam.

**Difficulty:** Intermediate to Advanced
**Estimated Time:** 60-75 minutes
**Estimated Cost:** ~$0.20/hour (~$1.25 for full lab)

## Learning Objectives

By completing this lab, you will:

1. Deploy and manage an ECS cluster with Fargate serverless compute
2. Configure task definitions with container specifications and resource allocation
3. Implement service auto-scaling based on multiple CloudWatch metrics
4. Configure Application Load Balancer with target groups and health checks
5. Monitor container logs and metrics using CloudWatch
6. Practice rolling deployment strategies with zero-downtime updates

## Architecture

This lab creates the following architecture:

```
                             Internet
                                │
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Application Load     │
                    │     Balancer (ALB)    │
                    │   (Public Subnets)    │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
            ┌───────────────┐      ┌───────────────┐
            │  Fargate Task │      │  Fargate Task │
            │   (nginx)     │      │   (nginx)     │
            │  AZ-1         │      │  AZ-2         │
            │ Private Subnet│      │ Private Subnet│
            └───────────────┘      └───────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   CloudWatch Logs     │
                    │   /ecs/nginx-service  │
                    └───────────────────────┘

VPC: 10.0.0.0/16
├── Public Subnets (2 AZs)
│   └── ALB + NAT Gateway
└── Private Subnets (2 AZs)
    └── ECS Fargate Tasks (2-6 tasks with auto-scaling)

Auto-scaling triggers:
- CPU utilization > 70%
- Memory utilization > 80%
- Request count > 1000 per target

Deployment strategy:
- Rolling updates
- Min healthy: 50% (1 task can be stopped)
- Max healthy: 200% (2 extra tasks during deployment)
```

## Prerequisites

- AWS Account with administrative access
- AWS CLI configured
- Node.js and pnpm installed
- Basic understanding of Docker containers
- Familiarity with load balancer concepts

## Cost Breakdown

| Resource | Cost (approx.) |
|----------|---------------|
| Fargate tasks (2 x 0.25 vCPU, 0.5 GB) | $0.012/hour |
| Application Load Balancer | $0.0225/hour |
| ALB data processing | $0.008/GB |
| NAT Gateway (1) | $0.045/hour |
| CloudWatch Logs | $0.50/GB ingested |
| CloudWatch Container Insights | $0.30/hour |
| **Total** | **~$0.20/hour** |

**Important:** Remember to destroy resources after completing the lab to avoid ongoing charges!

## Deployment

### Step 1: Deploy the Infrastructure

Click the **Deploy Lab** button above, or run:

```bash
pnpm cdk:deploy lab-ecs-fargate
```

Deployment takes approximately 8-10 minutes.

### Step 2: Verify Deployment

Once deployment completes, you'll see CloudFormation outputs including:

- ECS Cluster name and console URL
- ECS Service name and console URL
- Task Definition ARN and console URL
- Application Load Balancer DNS name and URL
- CloudWatch Log Group name and console URL
- Security Group IDs

### Step 3: Test the Application

Open the **LoadBalancerUrl** in your browser. You should see the nginx welcome page, indicating the Fargate tasks are running and the ALB is routing traffic correctly.

## Lab Exercises

### Exercise 1: Explore ECS Cluster Configuration

**Objective:** Understand ECS cluster components and settings

1. Navigate to the **ECS Console** using the provided console URL
2. Examine the cluster dashboard:
   - How many services are running?
   - How many tasks are running?
   - What is the cluster capacity provider?
   - Is Container Insights enabled?

3. Review Container Insights metrics:
   - Navigate to the **CloudWatch** tab
   - View CPU and memory utilization graphs
   - Observe network traffic metrics

4. Explore cluster settings:
   - What VPC is the cluster using?
   - Are there any capacity providers configured?
   - What monitoring is enabled?

**Key Concept:** ECS clusters with Fargate use serverless compute - no EC2 instances to manage. Container Insights provides detailed metrics for performance monitoring.

### Exercise 2: Analyze Task Definitions and Containers

**Objective:** Understand task definition configuration and container specifications

1. Navigate to **Task Definitions** in ECS Console
2. Find the `sap-study-nginx-task` definition:
   - What is the task CPU allocation? (should be 256 = 0.25 vCPU)
   - What is the task memory allocation? (should be 512 MB)
   - What launch type compatibility is configured?

3. Examine the container definition:
   - What Docker image is being used?
   - What port mappings are configured?
   - What environment variables are set?
   - How is logging configured?

4. Review the IAM roles:
   - What is the Task Execution Role used for?
   - What is the Task Role used for?
   - What permissions does each role have?

5. Check the health check configuration:
   - What command is used for container health checks?
   - What is the health check interval and timeout?
   - How many retries before marking unhealthy?

**Key Concept:** Task definitions are immutable blueprints for your containers. Task Execution Role is used by ECS to pull images and send logs. Task Role is used by the container application itself.

### Exercise 3: Service Auto-Scaling Configuration

**Objective:** Implement and test auto-scaling policies

1. Navigate to the **ECS Service** console
2. Click on the **Auto Scaling** tab:
   - How many auto-scaling policies are configured?
   - What is the minimum task count?
   - What is the maximum task count?

3. Examine each scaling policy:
   - **CPU-based scaling:** Target 70% CPU utilization
   - **Memory-based scaling:** Target 80% memory utilization
   - **Request count scaling:** Target 1000 requests per target
   - What are the scale-in and scale-out cooldown periods?

4. Test scaling behavior:
   - Use a load testing tool (e.g., Apache Bench or curl in a loop) to generate traffic
   - Monitor the service metrics in CloudWatch
   - Observe when new tasks are launched

   ```bash
   # Generate load (run from your terminal)
   for i in {1..1000}; do
     curl http://[ALB-DNS-NAME] > /dev/null 2>&1 &
   done
   ```

5. Monitor scaling events:
   - Navigate to **CloudWatch → Alarms**
   - Check which alarms triggered
   - View the scaling activity in ECS service events

**Key Concept:** ECS auto-scaling uses target tracking to maintain desired metric values. Multiple scaling policies work together, with ECS choosing the policy that provides the most capacity.

### Exercise 4: Load Balancer and Health Checks

**Objective:** Configure and validate ALB health checks and routing

1. Navigate to **EC2 Console → Load Balancers**
2. Select the Application Load Balancer:
   - What scheme is configured? (should be internet-facing)
   - What subnets is it using?
   - What security groups are attached?

3. Examine the listener configuration:
   - What port is the listener on?
   - What protocol is configured?
   - What is the default action?

4. Review the target group:
   - Click on the **Target Group**
   - What target type is configured? (should be IP for Fargate)
   - How many targets are registered?
   - What is the health check configuration?
   - What is the deregistration delay?

5. Check target health:
   - View the **Targets** tab
   - Are all targets healthy?
   - What health checks are passing?
   - What happens if you stop a task manually?

6. Test health check behavior:
   - Note the current healthy target count
   - Use ECS Console to stop one task
   - Watch the target group deregister the unhealthy target
   - Observe ECS automatically launch a replacement task
   - Monitor the new target becoming healthy

**Key Concept:** ALB performs health checks at two levels - target group health checks determine if targets receive traffic, and ECS container health checks determine if tasks should be replaced.

### Exercise 5: Container Logs in CloudWatch

**Objective:** Monitor and troubleshoot using CloudWatch Logs

1. Navigate to **CloudWatch Console → Log Groups**
2. Find the `/ecs/sap-study-nginx-service` log group:
   - How is log retention configured?
   - Are there log streams for each task?

3. Examine log streams:
   - Click on a log stream (one per Fargate task)
   - View the nginx access logs
   - Search for specific HTTP status codes
   - Filter logs by timestamp

4. Use CloudWatch Logs Insights:
   - Click **Logs Insights** in the left menu
   - Select the ECS log group
   - Run a query to analyze access patterns:

   ```
   fields @timestamp, @message
   | filter @message like /GET/
   | stats count() by bin(5m)
   ```

5. Create a metric filter:
   - Navigate to **Metric filters** tab
   - Create a filter for HTTP 5xx errors
   - Set up an alarm for error rate threshold

6. Enable streaming logs:
   - Try using `aws ecs execute-command` to connect to a running task
   - Verify ECS Exec is enabled on the service
   - Stream live logs from a container

**Key Concept:** CloudWatch Logs Insights allows SQL-like queries for log analysis. Container logs should be centralized for troubleshooting across distributed tasks.

### Exercise 6: Service Deployment Strategies

**Objective:** Understand and implement rolling deployments

1. Review the current deployment configuration:
   - Navigate to **ECS Service → Deployments** tab
   - Note the deployment controller type (should be ECS rolling)
   - Check minimum healthy percent (50%)
   - Check maximum healthy percent (200%)

2. Understand the deployment math:
   - With 2 desired tasks, 50% min, 200% max:
   - During deployment: Can run 1-4 tasks
   - ECS first starts new tasks (up to 4 total)
   - Then stops old tasks (down to 1 minimum)
   - This provides zero-downtime deployments

3. Trigger a new deployment:
   - Update the task definition (e.g., add an environment variable)
   - Create a new task definition revision
   - Update the service to use the new revision

   ```bash
   # Via AWS CLI
   aws ecs update-service \
     --cluster sap-study-ecs-cluster \
     --service sap-study-nginx-service \
     --force-new-deployment
   ```

4. Monitor the deployment:
   - Watch the **Deployments** tab in real-time
   - Observe the PRIMARY deployment status
   - Note how many tasks are running during deployment
   - Check the deployment events timeline

5. Verify zero-downtime:
   - Continuously send requests to the ALB during deployment
   - Confirm all requests succeed
   - Monitor response times during task transitions

6. Explore deployment circuit breaker:
   - Note if circuit breaker is enabled
   - How would it help with failed deployments?
   - What happens if new tasks fail health checks?

**Key Concept:** Rolling deployments with proper min/max percentages ensure zero downtime. The deployment circuit breaker automatically rolls back failed deployments to maintain service availability.

## Validation

Verify your understanding by answering these questions:

- [ ] Can you explain the difference between Task Execution Role and Task Role?
- [ ] Why is the target type set to "IP" instead of "instance" for Fargate?
- [ ] What happens when a task fails its health check?
- [ ] How does ECS decide which auto-scaling policy to use when multiple policies trigger?
- [ ] What is the benefit of running tasks in private subnets vs public subnets?
- [ ] Why is deregistration delay important for rolling deployments?

## Cleanup

**Important:** Destroy resources to avoid charges!

Click the **Cleanup Lab** button above, or run:

```bash
pnpm cdk:destroy lab-ecs-fargate
```

Verify in CloudFormation console that the stack is fully deleted. Note: The NAT Gateway and ALB may take a few minutes to delete.

## Additional Challenges

If you want to extend this lab:

1. **Add HTTPS support** with ACM certificate and ALB HTTPS listener
2. **Implement ECS Service Discovery** using AWS Cloud Map for service-to-service communication
3. **Configure blue/green deployments** using CodeDeploy integration
4. **Add Application Auto Scaling** based on custom CloudWatch metrics
5. **Implement ECS Exec** to debug running containers interactively
6. **Set up X-Ray tracing** for distributed request tracing
7. **Deploy a multi-container task** with sidecar pattern (e.g., nginx + app container)
8. **Configure capacity provider strategy** with Fargate and Fargate Spot mix

## Troubleshooting

**Issue:** Tasks are failing to start
**Solution:** Check CloudWatch Logs for container errors. Verify task execution role has permissions to pull the Docker image. Ensure task definition has sufficient CPU and memory allocated.

**Issue:** ALB health checks are failing
**Solution:** Verify security groups allow ALB to reach tasks on port 80. Check that container health check command is correct. Ensure tasks are running in subnets with internet access (for pulling images).

**Issue:** Service won't scale up
**Solution:** Check auto-scaling policies are enabled. Verify CloudWatch alarms are in ALARM state. Ensure max capacity isn't already reached. Check service events for scaling throttling.

**Issue:** Tasks are pending or stuck in provisioning
**Solution:** Verify VPC has private subnets with NAT Gateway for internet access (Fargate tasks need to pull images from ECR). Check task definition resource requirements don't exceed Fargate limits.

**Issue:** High data transfer costs
**Solution:** Review VPC endpoints for ECR and CloudWatch to avoid NAT Gateway charges for AWS service traffic. Consider using Fargate Spot for cost savings on non-critical workloads.

## Related Exam Topics

This lab covers SAP-C02 exam topics:

- **Domain 2:** Designing solutions for high availability and business continuity
- **Domain 2:** Container orchestration and serverless compute
- **Domain 3:** Implementing auto-scaling and performance optimization
- **Exam Task 2.1:** Design highly available application architectures
- **Exam Task 3.2:** Continuously improve existing solutions

## Related Study Content

- [Containerization and ECS](/study/domain-2-new-workloads/container-orchestration)
- [Load Balancing Strategies](/study/domain-2-new-workloads/load-balancing)
- [Auto-Scaling Best Practices](/study/domain-3-continuous-improvement/performance-optimization)

## Learn More

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/latest/developerguide/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Application Load Balancer Guide](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [ECS Service Auto Scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [ECS Deployment Types](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-types.html)
- [ECS Best Practices Guide](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Container Insights for ECS](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html)

---

**Lab ID:** lab-ecs-fargate
**Version:** 1.0.0
**Last Updated:** 2026-01-05
