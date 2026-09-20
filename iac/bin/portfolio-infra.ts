#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PortfolioStack } from '../lib/portfolio-stack';
import { PortfolioOidcStack } from '../lib/portfolio-oidc-stack';

const app = new cdk.App();

// Context values can be supplied via cdk.json or CLI flags:
// -c domainName=aditya.weinventify.com -c certificateArn=arn:aws:acm:... -c hostedZoneId=Z...
const domainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME;
const certificateArn = app.node.tryGetContext('certificateArn') || process.env.CERTIFICATE_ARN;
const hostedZoneId = app.node.tryGetContext('hostedZoneId') || process.env.HOSTED_ZONE_ID;

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
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
  env,
  description: 'Production AWS infrastructure for Kumar Aditya Portfolio (S3, CloudFront OAC, SPA Routing)',
});
