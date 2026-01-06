# S3 + CloudFront Lab

## Overview

This hands-on lab demonstrates how to build a global content delivery network (CDN) using Amazon S3 and Amazon CloudFront. You'll learn essential concepts for the AWS Solutions Architect Professional exam including cache optimization, origin access control, custom error responses, and edge location performance tuning.

**Difficulty:** Intermediate
**Estimated Time:** 60-75 minutes
**Estimated Cost:** ~$0.05/hour (~$0.40 for full lab)

## Learning Objectives

By completing this lab, you will:

1. Configure an S3 bucket for static website hosting with CloudFront
2. Implement Origin Access Control (OAC) for secure S3 access
3. Design and apply cache behaviors for different content types
4. Perform cache invalidations and understand edge location behavior
5. Configure custom error responses for improved user experience
6. Apply security best practices for content delivery architectures

## Architecture

This lab creates the following architecture:

```
                           ┌─────────────────────────────────────┐
                           │         CloudFront Edge             │
                           │      (Global Distribution)          │
                           │                                     │
    Users ──HTTPS──>       │  ┌──────────────────────────────┐  │
    (Global)               │  │   Cache Behaviors:            │  │
                           │  │   • /         → 24h TTL       │  │
                           │  │   • /images/* → 30d TTL       │  │
                           │  │   • /api/*    → No cache      │  │
                           │  └──────────────────────────────┘  │
                           │                                     │
                           │  Custom Error Responses:            │
                           │   • 404 → /error.html               │
                           │   • 403 → /error.html               │
                           │   • 500 → /error.html               │
                           └─────────────────┬───────────────────┘
                                             │
                                             │ Origin Access Control (OAC)
                                             │ (Signed requests only)
                                             ↓
                           ┌─────────────────────────────────────┐
                           │        S3 Bucket (Origin)           │
                           │                                     │
                           │  ┌──────────────────────────────┐  │
                           │  │  Static Website Content:      │  │
                           │  │  • index.html                 │  │
                           │  │  • error.html                 │  │
                           │  │  • test.html                  │  │
                           │  │  • /images/* (if added)       │  │
                           │  └──────────────────────────────┘  │
                           │                                     │
                           │  Security:                          │
                           │  • Block all public access          │
                           │  • CloudFront-only access via OAC   │
                           │  • Versioning enabled               │
                           │  • Encryption at rest               │
                           │                                     │
                           │  Logging:                           │
                           │  • Server access logs               │
                           │  • CloudFront access logs           │
                           └─────────────────────────────────────┘
```

## Prerequisites

- AWS Account with administrative access
- AWS CLI configured
- Node.js and pnpm installed
- Understanding of S3 and basic CDN concepts
- Web browser for testing

## Cost Breakdown

| Resource | Cost (approx.) |
|----------|---------------|
| S3 Storage (1GB) | $0.023/month ($0.00003/hour) |
| S3 Requests (PUT/GET) | $0.005/1,000 requests |
| CloudFront Data Transfer (first 10TB) | $0.085/GB |
| CloudFront Requests | $0.01/10,000 HTTPS requests |
| **Total** | **~$0.05/hour** |

**Note:** Costs are minimal for testing with small files and low traffic. The majority of costs come from data transfer, which is only charged when content is delivered.

**Important:** Remember to destroy resources after completing the lab to avoid ongoing charges!

## Deployment

### Step 1: Deploy the Infrastructure

Click the **Deploy Lab** button above, or run:

```bash
pnpm cdk:deploy lab-s3-cloudfront
```

Deployment takes approximately 8-12 minutes (CloudFront distribution creation is the longest step).

### Step 2: Verify Deployment

Once deployment completes, you'll see CloudFormation outputs including:

- S3 bucket name and console URL
- CloudFront distribution ID and domain name
- Website URL (HTTPS)
- Cache policy IDs
- Console URLs for quick access

### Step 3: Access the Website

Open the `WebsiteUrl` from the CloudFormation outputs in your browser:

```
https://d1234567890abc.cloudfront.net
```

You should see the sample website confirming CloudFront is serving content from S3.

## Lab Exercises

### Exercise 1: Explore S3 Bucket Configuration

**Objective:** Understand S3 bucket security and configuration for CloudFront origins

1. Navigate to the **S3 Console** using the provided console URL
2. Examine the bucket configuration:
   - Is public access blocked? Why is this important?
   - What encryption is enabled?
   - Is versioning enabled? What's the benefit?

3. Review the **Bucket Policy**:
   - Who has permission to access objects?
   - What is the condition for access?
   - Why is the policy limited to a specific CloudFront distribution ARN?

4. Check the **Properties** tab:
   - Where are access logs stored?
   - Are there any lifecycle rules? What do they do?

5. Try accessing the S3 bucket directly:
   - Construct the S3 URL: `https://[bucket-name].s3.[region].amazonaws.com/index.html`
   - What happens? Why?

**Key Concept:** S3 buckets used as CloudFront origins should NEVER be publicly accessible. Origin Access Control (OAC) ensures only CloudFront can access the bucket using signed requests.

### Exercise 2: Analyze CloudFront Distribution Setup

**Objective:** Understand CloudFront configuration and cache behaviors

1. Open the **CloudFront Console** using the provided console URL
2. Navigate to the **General** tab:
   - What is the price class? Why might you choose different price classes?
   - What is the default root object?
   - Is logging enabled? Where are logs stored?

3. Examine the **Origins** tab:
   - What is the origin type?
   - What is the origin access setting?
   - How does OAC differ from the older OAI (Origin Access Identity)?

4. Review the **Behaviors** tab:
   - How many cache behaviors are defined?
   - What path patterns are configured?
   - Compare the TTL settings for different behaviors

5. Check the **Error Pages** tab:
   - What HTTP status codes have custom responses?
   - What is the TTL for error responses?
   - Why might you want different TTLs for different errors?

**Key Concept:** Cache behaviors allow you to apply different caching strategies to different URL patterns. This optimizes both performance and cost.

### Exercise 3: Test Cache Behavior and Invalidation

**Objective:** Understand edge caching and cache invalidation

1. **Test Initial Cache Hit:**
   - Visit the website homepage
   - Open browser DevTools (F12) and go to Network tab
   - Refresh the page
   - Look for the `X-Cache` header in the response (may show `Hit from cloudfront`)

2. **Modify Content in S3:**
   - Go to S3 Console and navigate to your bucket
   - Edit `index.html` (click the file, then **Edit**)
   - Change the title or add text (e.g., "Updated Content - Version 2")
   - Save the changes

3. **Test Cached Content:**
   - Refresh your browser on the CloudFront URL
   - Does the content update? Why or why not?
   - What is the `Age` header value in the response?

4. **Perform Cache Invalidation:**
   - In CloudFront Console, go to **Invalidations** tab
   - Click **Create invalidation**
   - Enter object path: `/index.html` or `/*` for all objects
   - Submit and wait for completion (usually 30-60 seconds)

5. **Verify Invalidation:**
   - Refresh the CloudFront URL again
   - Does the updated content appear now?
   - Check the `X-Cache` header (should show `Miss from cloudfront` for first request)

6. **Test Different Cache Behaviors:**
   - Upload an image to S3 in an `/images/` folder
   - Access it via CloudFront: `https://[distribution].cloudfront.net/images/test.jpg`
   - Note the cache headers - what is the TTL for images?

**Key Concept:** CloudFront caches content at edge locations based on TTL settings. Invalidations force CloudFront to fetch fresh content from the origin, but they cost $0.005 per path (first 1,000 paths/month are free).

### Exercise 4: Explore Edge Locations and Performance

**Objective:** Understand global content delivery and latency reduction

1. **Check Distribution Status:**
   - In CloudFront Console, verify the distribution status is "Deployed"
   - Note the deployment takes time because content is replicated to edge locations

2. **Test from Multiple Locations:**
   - Use online tools like [CloudFlare Speed Test](https://speed.cloudflare.com/) or [Pingdom](https://tools.pingdom.com/)
   - Test your CloudFront URL from different geographic regions
   - Compare response times from different continents

3. **Analyze Response Headers:**
   - Access the website and check response headers:
     - `X-Cache`: Shows cache status (Hit/Miss/RefreshHit)
     - `X-Amz-Cf-Pop`: Shows the edge location code (e.g., `IAD89-C2` for Virginia)
     - `X-Amz-Cf-Id`: Unique request identifier
     - `Age`: How long the object has been cached (in seconds)

4. **Understand Edge Location Behavior:**
   - First request from a region: Cache Miss (fetches from S3)
   - Subsequent requests: Cache Hit (served from edge)
   - After TTL expires: Conditional request (304 if not modified)

5. **Review Performance Metrics:**
   - In CloudFront Console, go to **Monitoring** tab
   - View metrics like:
     - Total Requests
     - Data Transfer
     - Cache Hit Rate (higher is better!)
     - Error Rate

**Key Concept:** CloudFront has 400+ edge locations worldwide. Content is cached at the edge location nearest to your users, reducing latency from hundreds of milliseconds to tens of milliseconds.

### Exercise 5: Implement and Test Access Control

**Objective:** Apply security best practices for content delivery

1. **Verify Origin Access Control:**
   - In CloudFront Console, go to **Security** section
   - Review the Origin Access Control (OAC) configuration
   - Note that requests are signed with AWS Signature Version 4

2. **Test Direct S3 Access (Should Fail):**
   - Try to access S3 bucket directly via object URL:
     ```
     https://[bucket-name].s3.[region].amazonaws.com/index.html
     ```
   - You should get `AccessDenied` error
   - This confirms public access is blocked

3. **Review Bucket Policy:**
   - Navigate to S3 Console → Bucket → Permissions → Bucket Policy
   - Note the policy only allows `s3:GetObject` from CloudFront service principal
   - The condition restricts access to your specific distribution ARN

4. **Test HTTPS Enforcement:**
   - Try accessing via HTTP:
     ```
     http://[distribution].cloudfront.net
     ```
   - You should be automatically redirected to HTTPS
   - Check the response status (should be 301 or 307 redirect)

5. **Review Geo Restrictions (Optional):**
   - In CloudFront Console, go to **Geographic Restrictions**
   - Note the current settings (this lab allows US, CA, GB, DE, FR, AU)
   - Consider use cases: content licensing, compliance, security

6. **Enable Additional Security (Optional Enhancement):**
   - Consider adding AWS WAF to protect against common web exploits
   - Implement custom headers for origin verification
   - Enable AWS Shield for DDoS protection

**Key Concept:** Origin Access Control (OAC) is more secure than the legacy Origin Access Identity (OAI) because it supports all S3 buckets, server-side encryption, and dynamic requests.

### Exercise 6: Configure Custom Error Pages

**Objective:** Improve user experience with custom error handling

1. **Test 404 Error Response:**
   - Access a non-existent page:
     ```
     https://[distribution].cloudfront.net/nonexistent.html
     ```
   - You should see the custom error page (not the default CloudFront error)

2. **Review Error Page Configuration:**
   - In CloudFront Console, go to **Error Pages** tab
   - Note the custom responses for 403, 404, and 500 errors
   - All redirect to `/error.html` with appropriate status codes

3. **Test Error Page Caching:**
   - Access the 404 page multiple times
   - Check the `Age` header - error pages are cached for 5 minutes
   - Why is this TTL shorter than regular content?

4. **Customize Error Pages:**
   - Create a new error page in S3: `500.html`
   - Update the CloudFront error response to use `/500.html` for 500 errors
   - Upload the file to S3 and test by simulating a server error

5. **Understand Error Response Flow:**
   ```
   User Request → CloudFront → S3 Origin
                           ↓
                   (If S3 returns error)
                           ↓
              CloudFront Error Response Configuration
                           ↓
              Serve /error.html with mapped status code
   ```

6. **Best Practices for Error Pages:**
   - Keep error pages lightweight (no external dependencies)
   - Use consistent branding
   - Provide helpful navigation (link back to home)
   - Different TTLs for different errors (5xx: short, 4xx: longer)

**Key Concept:** Custom error pages improve user experience and SEO. CloudFront can serve custom content for any HTTP error status while preserving the original status code for proper SEO handling.

## Validation

Verify your understanding by answering these questions:

- [ ] What's the difference between Origin Access Control (OAC) and Origin Access Identity (OAI)?
- [ ] Why should S3 buckets used with CloudFront have public access blocked?
- [ ] What happens to cached content when you update a file in S3?
- [ ] What's the cost impact of frequent cache invalidations?
- [ ] How do different cache behaviors optimize performance and cost?
- [ ] What HTTP headers indicate a CloudFront cache hit vs. miss?
- [ ] Why are there different TTLs for different content types?

## Cleanup

**Important:** Destroy resources to avoid charges!

Click the **Cleanup Lab** button above, or run:

```bash
pnpm cdk:destroy lab-s3-cloudfront
```

The cleanup process will:
1. Delete all objects from the S3 bucket (including logs)
2. Delete the CloudFront distribution (this can take 15-20 minutes)
3. Remove all associated resources

Verify in CloudFormation console that the stack is fully deleted.

**Note:** CloudFront distributions take longer to delete than most resources because they must be disabled first, then deleted after propagation to all edge locations.

## Additional Challenges

If you want to extend this lab:

1. **Add a Custom Domain:**
   - Register a domain in Route 53
   - Request an ACM certificate in us-east-1
   - Configure CloudFront to use the custom domain and certificate

2. **Implement Signed URLs:**
   - Create a CloudFront key pair
   - Generate signed URLs with expiration times
   - Test access control for premium content

3. **Add Lambda@Edge:**
   - Create a Lambda function to modify request/response headers
   - Add security headers (CSP, HSTS, X-Frame-Options)
   - Implement A/B testing by routing to different origins

4. **Set Up Real-Time Logs:**
   - Enable CloudFront real-time logs
   - Send logs to Kinesis Data Streams
   - Analyze traffic patterns with CloudWatch Insights

5. **Multi-Origin Configuration:**
   - Add a second origin (EC2 or ALB)
   - Route /api/* requests to the dynamic origin
   - Configure origin failover for high availability

6. **Optimize Costs:**
   - Analyze cache hit rates and adjust TTLs
   - Use S3 Intelligent-Tiering for less frequently accessed content
   - Implement origin request policies to reduce origin load

## Related Exam Topics

This lab covers SAP-C02 exam topics:

- **Domain 2:** Design solutions for new workloads (content delivery, caching strategies)
- **Domain 3:** Continuous improvement for existing solutions (performance optimization)
- **Exam Task 2.2:** Design reliable and resilient architectures
- **Exam Task 3.1:** Determine strategies to improve performance

## Related Study Content

- [Content Delivery Solutions](/study/domain-2-new-workloads/content-delivery)
- [Performance Optimization](/study/domain-3-continuous-improvement/performance)
- [Security Best Practices](/study/domain-1-organizational-complexity/security-controls)

## Troubleshooting

**Issue:** CloudFront returns 403 AccessDenied when accessing content
**Solution:** Verify the S3 bucket policy allows CloudFront service principal with correct distribution ARN. Ensure OAC is properly configured.

**Issue:** Updated content in S3 doesn't appear on CloudFront
**Solution:** Content is cached based on TTL. Either wait for cache to expire or create an invalidation for the affected paths.

**Issue:** Distribution stuck in "In Progress" status
**Solution:** CloudFront distributions take 10-15 minutes to deploy initially as changes propagate to all edge locations. This is normal.

**Issue:** Cache invalidation not working immediately
**Solution:** Invalidations typically take 30-60 seconds to complete. Check the invalidation status in the console. Clear browser cache if testing locally.

**Issue:** High costs from data transfer
**Solution:** Ensure you're not repeatedly downloading large files. Use smaller test files and leverage browser caching. Remember to destroy the lab when complete.

**Issue:** Error pages not displaying
**Solution:** Verify `/error.html` exists in S3 bucket and CloudFront has permission to access it. Check error response configuration matches actual file paths.

## Learn More

### AWS Documentation
- [Amazon CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Using Amazon S3 Origins with CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html)
- [Origin Access Control (OAC)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CloudFront Cache Behaviors](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesCacheBehavior)
- [Cache Invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)

### AWS Whitepapers
- [Amazon CloudFront Best Practices](https://docs.aws.amazon.com/whitepapers/latest/best-practices-for-deploying-amazon-cloudfront/welcome.html)
- [AWS Well-Architected Framework - Performance Efficiency Pillar](https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html)

### Additional Resources
- [CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [CloudFront vs. S3 Transfer Acceleration](https://aws.amazon.com/blogs/networking-and-content-delivery/amazon-s3-amazon-cloudfront-a-match-made-in-the-cloud/)

---

**Lab ID:** lab-s3-cloudfront
**Version:** 1.0.0
**Last Updated:** 2026-01-05
