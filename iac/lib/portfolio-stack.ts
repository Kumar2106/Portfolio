import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import {
  aws_s3 as s3,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_s3_deployment as s3deploy,
  aws_certificatemanager as acm,
  aws_route53 as route53,
  aws_route53_targets as targets,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface PortfolioStackProps extends cdk.StackProps {
  /** Optional custom domain name (e.g. aditya.weinventify.com) */
  readonly domainName?: string;
  /** Optional ACM certificate ARN in us-east-1 for custom domain */
  readonly certificateArn?: string;
  /** Optional Route 53 Hosted Zone ID to create DNS alias records */
  readonly hostedZoneId?: string;
}

export class PortfolioStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: PortfolioStackProps) {
    super(scope, id, props);

    // 1. Private S3 Origin Bucket (Blocked public access, SSL enforced)
    this.bucket = new s3.Bucket(this, 'PortfolioFrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. Custom Domain & Certificate Setup (Optional)
    let certificate: acm.ICertificate | undefined;
    let domainNames: string[] | undefined;

    if (props?.domainName && props?.certificateArn) {
      domainNames = [props.domainName];
      certificate = acm.Certificate.fromCertificateArn(
        this,
        'SiteCertificate',
        props.certificateArn
      );
    }

    // 3. CloudFront CDN Distribution with Origin Access Control (OAC) & SPA Error Routing
    this.distribution = new cloudfront.Distribution(this, 'PortfolioDistribution', {
      comment: 'CloudFront CDN distribution for Kumar Aditya Portfolio',
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      errorResponses: [
        // SPA Routing: Redirect 403 / 404 to /index.html with HTTP 200
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(10),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(10),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      certificate,
      domainNames,
    });

    // 4. Route 53 DNS Alias Records (Optional)
    if (props?.domainName && props?.hostedZoneId) {
      // Extract root apex zone name from subdomain (e.g. aditya.weinventify.com -> weinventify.com)
      const domainParts = props.domainName.split('.');
      const apexZoneName = domainParts.slice(-2).join('.');

      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'SiteHostedZone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: apexZoneName,
      });

      new route53.ARecord(this, 'SiteAliasRecord', {
        zone: hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      });

      new route53.AaaaRecord(this, 'SiteAaaaAliasRecord', {
        zone: hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      });
    }

    // 5. Automated S3 Asset Deployment (if frontend production bundle is built)
    const frontendDistPath = path.join(__dirname, '../../frontend/dist/portfolio-app/browser');
    if (fs.existsSync(frontendDistPath)) {
      new s3deploy.BucketDeployment(this, 'DeployFrontendAssets', {
        sources: [s3deploy.Source.asset(frontendDistPath)],
        destinationBucket: this.bucket,
        distribution: this.distribution,
        distributionPaths: ['/*'],
        prune: true,
      });
    }

    // 6. CloudFormation Stack Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'Name of the private S3 origin bucket',
      exportName: `${this.stackName}-BucketName`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${this.stackName}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain URL',
      exportName: `${this.stackName}-DistributionDomainName`,
    });

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: props?.domainName
        ? `https://${props.domainName}`
        : `https://${this.distribution.distributionDomainName}`,
      description: 'Portfolio site URL',
    });
  }
}
