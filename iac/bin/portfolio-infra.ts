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
// Resolve hosting target resources as an atomic group to prevent mismatched overrides
const hasEnvOverride = Boolean(
  process.env.DISTRIBUTION_ID ||
  process.env.BUCKET_NAME ||
  process.env.DISTRIBUTION_DOMAIN_NAME
);

let existingDistributionId: string | undefined;
let existingBucketName: string | undefined;
let existingDistributionDomainName: string | undefined;

if (hasEnvOverride) {
  if (
    !process.env.DISTRIBUTION_ID ||
    !process.env.BUCKET_NAME ||
    !process.env.DISTRIBUTION_DOMAIN_NAME
  ) {
    throw new Error(
      'When overriding hosting resources via environment variables, DISTRIBUTION_ID, BUCKET_NAME and DISTRIBUTION_DOMAIN_NAME must be specified together.'
    );
  }
  existingDistributionId = process.env.DISTRIBUTION_ID;
  existingBucketName = process.env.BUCKET_NAME;
  existingDistributionDomainName = process.env.DISTRIBUTION_DOMAIN_NAME;
} else {
  // Use paired context defaults from cdk.json
  existingDistributionId = app.node.tryGetContext('distributionId');
  existingBucketName = app.node.tryGetContext('bucketName');
  existingDistributionDomainName = app.node.tryGetContext('distributionDomainName');
}

if (
  (existingDistributionId && !existingBucketName) ||
  (!existingDistributionId && existingBucketName)
) {
  throw new Error(
    'Both distributionId and bucketName must be specified together to reuse existing infrastructure.'
  );
}

if (existingDistributionId && !existingDistributionDomainName) {
  throw new Error(
    'distributionDomainName must be specified when reusing an existing distribution.'
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
