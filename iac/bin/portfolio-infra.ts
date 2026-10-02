#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PortfolioStack } from '../lib/portfolio-stack';
import { PortfolioOidcStack } from '../lib/portfolio-oidc-stack';

const app = new cdk.App();

// Configuration values loaded from environment variables or cdk.json context
const domainName =
  process.env.DOMAIN_NAME || app.node.tryGetContext('domainName');
const certificateArn =
  process.env.CERTIFICATE_ARN || app.node.tryGetContext('certificateArn');
const hostedZoneId =
  process.env.HOSTED_ZONE_ID || app.node.tryGetContext('hostedZoneId');

// Reusing existing live CloudFront distribution and S3 origin bucket
const existingDistributionId =
  process.env.DISTRIBUTION_ID || app.node.tryGetContext('distributionId');
const existingBucketName =
  process.env.BUCKET_NAME || app.node.tryGetContext('bucketName');
const existingDistributionDomainName =
  process.env.DISTRIBUTION_DOMAIN_NAME || app.node.tryGetContext('distributionDomainName');

if (
  (existingDistributionId && !existingBucketName) ||
  (!existingDistributionId && existingBucketName)
) {
  throw new Error(
    'Both distributionId and bucketName must be specified together to reuse existing infrastructure.'
  );
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-south-1',
};

const existingOidcProviderContext = app.node.tryGetContext('existingOidcProvider');

// 1. OIDC Stack: Provisions GitHub Actions Identity Provider and Deployer Role
new PortfolioOidcStack(app, 'PortfolioOidcStack', {
  githubRepo:
    app.node.tryGetContext('githubRepo') || process.env.GITHUB_REPOSITORY || 'Kumar2106/Portfolio',
  existingOidcProvider:
    existingOidcProviderContext === true ||
    existingOidcProviderContext === 'true' ||
    process.env.EXISTING_OIDC_PROVIDER === 'true',
  env,
  description: 'GitHub Actions OIDC Provider and IAM Role for automated portfolio deployment',
});

// 2. Hosting Stack: Private S3 origin, CloudFront CDN, SPA routing & asset deployment
new PortfolioStack(app, 'PortfolioStack', {
  domainName,
  certificateArn,
  hostedZoneId,
  existingBucketName,
  existingDistributionId,
  existingDistributionDomainName,
  env,
  description: 'Production AWS infrastructure for Kumar Aditya Portfolio (S3, CloudFront OAC, SPA Routing)',
});
