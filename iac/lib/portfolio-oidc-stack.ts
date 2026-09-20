import * as cdk from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface PortfolioOidcStackProps extends cdk.StackProps {
  /**
   * GitHub repository in 'owner/repo' format.
   * @default 'Kumar2106/Portfolio'
   */
  readonly githubRepo?: string;

  /**
   * Whether the GitHub OIDC Identity Provider already exists in this AWS account.
   * If true, imports the existing provider; if false, creates a new one.
   * @default false
   */
  readonly existingOidcProvider?: boolean;

  /**
   * Target branch filter for OIDC role assumption.
   * @default 'refs/heads/main'
   */
  readonly branchFilter?: string;
}

export class PortfolioOidcStack extends cdk.Stack {
  public readonly oidcProvider: iam.IOpenIdConnectProvider;
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props?: PortfolioOidcStackProps) {
    super(scope, id, props);

    const githubRepo = props?.githubRepo || 'Kumar2106/Portfolio';
    const branchFilter = props?.branchFilter || 'refs/heads/main';

    // 1. GitHub OpenID Connect (OIDC) Identity Provider
    // AWS accounts can only have ONE OIDC provider for token.actions.githubusercontent.com
    if (props?.existingOidcProvider) {
      this.oidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        this,
        'GitHubOidcProvider',
        `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`
      );
    } else {
      this.oidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
        url: 'https://token.actions.githubusercontent.com',
        clientIds: ['sts.amazonaws.com'],
      });
    }

    // 2. OIDC Federated Principal with repository & branch claim conditions
    const isWildcardBranch = branchFilter.includes('*');
    const subVal = `repo:${githubRepo}:${branchFilter.startsWith('refs/') ? `ref:${branchFilter}` : branchFilter}`;

    const stringEqualsConditions: Record<string, string> = {
      'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    };
    const stringLikeConditions: Record<string, string> = {};

    if (isWildcardBranch) {
      stringLikeConditions['token.actions.githubusercontent.com:sub'] = subVal;
    } else {
      stringEqualsConditions['token.actions.githubusercontent.com:sub'] = subVal;
    }

    const conditions: Record<string, Record<string, string>> = {
      StringEquals: stringEqualsConditions,
    };
    if (Object.keys(stringLikeConditions).length > 0) {
      conditions.StringLike = stringLikeConditions;
    }

    const oidcPrincipal = new iam.OpenIdConnectPrincipal(this.oidcProvider, conditions);

    // 3. IAM Role for GitHub Actions CI/CD Deployment
    this.deployRole = new iam.Role(this, 'GitHubActionsDeployRole', {
      roleName: 'GitHubActionsPortfolioDeployRole',
      description: `Role assumed by GitHub Actions (${githubRepo}) for automated portfolio CDK deployments`,
      assumedBy: oidcPrincipal,
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // 4. Permissions required for AWS CDK v2 deployment via bootstrap roles
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CDKBootstrapRoleAssumption',
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:aws:iam::${this.account}:role/cdk-*-deploy-role-${this.account}-*`,
          `arn:aws:iam::${this.account}:role/cdk-*-file-publishing-role-${this.account}-*`,
          `arn:aws:iam::${this.account}:role/cdk-*-lookup-role-${this.account}-*`,
        ],
      })
    );

    // 5. Direct deployment & lookup permissions (SSM, CloudFormation, S3, CloudFront)
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SSMBootstrapLookup',
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          `arn:aws:ssm:*:${this.account}:parameter/cdk-bootstrap/*`,
        ],
      })
    );

    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFormationDeployStatus',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:GetTemplate',
          'cloudformation:DescribeStackEvents',
          'cloudformation:DescribeStackResources',
        ],
        resources: [
          `arn:aws:cloudformation:*:${this.account}:stack/Portfolio*/*`,
        ],
      })
    );

    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3AssetDeployment',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:GetObject',
          's3:ListBucket',
          's3:DeleteObject',
          's3:GetBucketLocation',
        ],
        resources: [
          `arn:aws:s3:::cdk-*-assets-${this.account}-*`,
          `arn:aws:s3:::cdk-*-assets-${this.account}-*/*`,
          `arn:aws:s3:::*portfolio*`,
          `arn:aws:s3:::*portfolio*/*`,
        ],
      })
    );

    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFrontInvalidation',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
        ],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/*`,
        ],
      })
    );

    // 6. Stack Outputs
    new cdk.CfnOutput(this, 'RoleArn', {
      value: this.deployRole.roleArn,
      description: 'ARN of the IAM Role for GitHub Actions (store in AWS_ROLE_ARN secret)',
      exportName: `${this.stackName}-RoleArn`,
    });

    new cdk.CfnOutput(this, 'RoleName', {
      value: this.deployRole.roleName,
      description: 'Name of the IAM Role for GitHub Actions',
      exportName: `${this.stackName}-RoleName`,
    });

    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: this.oidcProvider.openIdConnectProviderArn,
      description: 'ARN of the GitHub OIDC Identity Provider',
      exportName: `${this.stackName}-OidcProviderArn`,
    });
  }
}
