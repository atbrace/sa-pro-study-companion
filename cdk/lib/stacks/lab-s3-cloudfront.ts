import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * S3 + CloudFront Lab
 *
 * Demonstrates:
 * - S3 bucket configuration for static website hosting
 * - CloudFront distribution with origin access control
 * - Cache behaviors and policies
 * - Custom error responses
 * - Edge location performance optimization
 * - Security best practices (OAC, bucket policies)
 *
 * Cost Estimate: ~$0.05/hour
 * - S3 storage: ~$0.023/GB/month (~$0.00003/hour for 1GB)
 * - CloudFront: $0.085/GB for first 10TB + $0.01/10,000 requests
 * - Minimal charges for basic testing
 */
export class S3CloudFrontLabStack extends BaseLabStack {
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly originAccessControl: cloudfront.CfnOriginAccessControl;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.05,
    });

    // ======================
    // S3 Bucket for Website Content
    // ======================
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `sap-study-cf-${this.account}-${this.region}`,
      // Block all public access - CloudFront will access via OAC
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // Enable versioning for content management
      versioned: true,
      // Enable encryption at rest
      encryption: s3.BucketEncryption.S3_MANAGED,
      // Auto-delete objects on stack deletion (for lab cleanup)
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // Lifecycle rules for cost optimization
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      // Enable server access logging
      serverAccessLogsPrefix: 'access-logs/',
    });

    cdk.Tags.of(this.websiteBucket).add('Name', 'SAP Study - CloudFront Origin Bucket');
    cdk.Tags.of(this.websiteBucket).add('Purpose', 'Static website content delivery');

    // ======================
    // CloudFront Origin Access Control (OAC)
    // ======================
    // OAC is the modern replacement for Origin Access Identity (OAI)
    this.originAccessControl = new cloudfront.CfnOriginAccessControl(
      this,
      'OriginAccessControl',
      {
        originAccessControlConfig: {
          name: 'sap-study-oac',
          originAccessControlOriginType: 's3',
          signingBehavior: 'always',
          signingProtocol: 'sigv4',
          description: 'OAC for SAP Study S3 origin',
        },
      }
    );

    // ======================
    // CloudFront Distribution
    // ======================

    // Create cache policies
    const defaultCachePolicy = new cloudfront.CachePolicy(this, 'DefaultCachePolicy', {
      cachePolicyName: 'sap-study-default-cache',
      comment: 'Default caching for static content',
      defaultTtl: cdk.Duration.hours(24),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    const imagesCachePolicy = new cloudfront.CachePolicy(this, 'ImagesCachePolicy', {
      cachePolicyName: 'sap-study-images-cache',
      comment: 'Long-term caching for images',
      defaultTtl: cdk.Duration.days(30),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(1),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Accept'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // Create the distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'SAP Study - S3 Static Website Distribution',
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe edge locations for cost savings
      enableLogging: true,
      logBucket: this.websiteBucket,
      logFilePrefix: 'cloudfront-logs/',
      // Default behavior for HTML/CSS/JS
      defaultBehavior: {
        origin: new origins.S3Origin(this.websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: defaultCachePolicy,
      },
      // Additional behaviors for different content types
      additionalBehaviors: {
        // Images - long-term caching
        '/images/*': {
          origin: new origins.S3Origin(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          compress: true,
          cachePolicy: imagesCachePolicy,
        },
        // API endpoints - no caching
        '/api/*': {
          origin: new origins.S3Origin(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
      },
      // Custom error responses
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/error.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/error.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 500,
          responseHttpStatus: 500,
          responsePagePath: '/error.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      // Geo restriction (optional - disabled for lab)
      geoRestriction: cloudfront.GeoRestriction.allowlist('US', 'CA', 'GB', 'DE', 'FR', 'AU'),
    });

    // ======================
    // S3 Bucket Policy for CloudFront
    // ======================
    // Allow CloudFront to read from the bucket
    const bucketPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      actions: ['s3:GetObject'],
      resources: [`${this.websiteBucket.bucketArn}/*`],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`,
        },
      },
    });

    this.websiteBucket.addToResourcePolicy(bucketPolicyStatement);

    // ======================
    // Sample Content Deployment
    // ======================
    // Deploy sample HTML files
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SAP-C02 Study - S3 + CloudFront Lab</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #232F3E; }
        .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .success { color: #2e7d32; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Welcome to S3 + CloudFront Lab!</h1>
    <p class="success">✓ If you're seeing this, CloudFront is successfully serving content from S3!</p>
    <div class="info">
        <h2>Lab Status</h2>
        <p><strong>Distribution:</strong> Active</p>
        <p><strong>Origin:</strong> S3 Bucket (via OAC)</p>
        <p><strong>Protocol:</strong> HTTPS (Redirected)</p>
        <p><strong>Compression:</strong> Enabled (Gzip/Brotli)</p>
    </div>
    <h2>Test Resources</h2>
    <ul>
        <li><a href="/test.html">Test Page</a> - Additional test content</li>
        <li><a href="/nonexistent.html">404 Error Test</a> - Trigger custom error page</li>
    </ul>
</body>
</html>`;

    const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - SAP-C02 Study Lab</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center; }
        h1 { color: #d32f2f; }
        .error-code { font-size: 72px; font-weight: bold; color: #666; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="error-code">404</div>
    <h1>Page Not Found</h1>
    <p>The requested page could not be found.</p>
    <p>This is a custom error page served by CloudFront.</p>
    <p><a href="/">Return to Home</a></p>
</body>
</html>`;

    const testHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page - S3 + CloudFront Lab</title>
</head>
<body>
    <h1>Test Page</h1>
    <p>This is a test page to verify CloudFront caching behavior.</p>
    <p>Timestamp: ${new Date().toISOString()}</p>
    <p><a href="/">Back to Home</a></p>
</body>
</html>`;

    // Deploy using BucketDeployment
    new s3.BucketDeployment(this, 'DeployWebsite', {
      sources: [
        s3.Source.data('index.html', indexHtml),
        s3.Source.data('error.html', errorHtml),
        s3.Source.data('test.html', testHtml),
      ],
      destinationBucket: this.websiteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    // ======================
    // CloudFormation Outputs
    // ======================

    // S3 Bucket Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.websiteBucket.bucketName,
      description: 'S3 bucket name',
      exportName: `${id}-BucketName`,
    });

    new cdk.CfnOutput(this, 'BucketArn', {
      value: this.websiteBucket.bucketArn,
      description: 'S3 bucket ARN',
    });

    this.addConsoleUrlOutput(
      'BucketConsoleUrl',
      `https://s3.console.aws.amazon.com/s3/buckets/${this.websiteBucket.bucketName}?region=${this.region}`,
      'Console URL for S3 bucket'
    );

    // CloudFront Distribution Outputs
    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${id}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Website URL (via CloudFront)',
    });

    this.addConsoleUrlOutput(
      'DistributionConsoleUrl',
      `https://console.aws.amazon.com/cloudfront/v3/home#/distributions/${this.distribution.distributionId}`,
      'Console URL for CloudFront distribution'
    );

    // Cache Policy Outputs
    new cdk.CfnOutput(this, 'DefaultCachePolicyId', {
      value: defaultCachePolicy.cachePolicyId,
      description: 'Default cache policy ID',
    });

    new cdk.CfnOutput(this, 'ImagesCachePolicyId', {
      value: imagesCachePolicy.cachePolicyId,
      description: 'Images cache policy ID',
    });

    // Architecture summary output
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'S3 + CloudFront Architecture:',
        `- S3 Bucket: ${this.websiteBucket.bucketName}`,
        `- CloudFront Distribution: ${this.distribution.distributionId}`,
        '- Access Control: Origin Access Control (OAC)',
        '- Security: Block all public S3 access, CloudFront-only access',
        '- Caching: Multiple cache behaviors (default, images, API)',
        '- HTTPS: Enforced via redirect',
        '- Compression: Gzip + Brotli enabled',
        '- Error Pages: Custom 404/500 error responses',
      ].join('\n'),
      description: 'Lab architecture summary',
    });

    // Instructions output
    new cdk.CfnOutput(this, 'NextSteps', {
      value: [
        'Next Steps:',
        `1. Visit: https://${this.distribution.distributionDomainName}`,
        '2. Test cache invalidation from CloudFront console',
        '3. Upload new files to S3 and observe caching behavior',
        '4. Review CloudFront access logs in S3',
        '5. Test custom error pages by accessing non-existent URLs',
      ].join('\n'),
      description: 'Getting started instructions',
    });
  }
}
