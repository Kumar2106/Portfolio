#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PortfolioStack } from '../lib/portfolio-stack';

const app = new cdk.App();

// Context values can be supplied via cdk.json or CLI flags:
// -c domainName=aditya.weinventify.com -c certificateArn=arn:aws:acm:... -c hostedZoneId=Z...
const domainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME;
const certificateArn = app.node.tryGetContext('certificateArn') || process.env.CERTIFICATE_ARN;
const hostedZoneId = app.node.tryGetContext('hostedZoneId') || process.env.HOSTED_ZONE_ID;

new PortfolioStack(app, 'PortfolioStack', {
  domainName,
  certificateArn,
  hostedZoneId,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Production AWS infrastructure for Kumar Aditya Portfolio (S3, CloudFront OAC, SPA Routing)',
});
