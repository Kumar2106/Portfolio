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
  public readonly frontendDeployRole: iam.Role;
  public readonly backendDeployRole: iam.Role;
  /** Alias pointing to frontendDeployRole for backward compatibility */
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

    // =========================================================================
    // 3. FRONTEND DEPLOYMENT ROLE (AWS CDK, S3 Origin, CloudFront CDN)
    // =========================================================================
    this.frontendDeployRole = new iam.Role(this, 'GitHubActionsFrontendDeployRole', {
      roleName: 'GitHubActionsPortfolioFrontendDeployRole',
      description: `Role assumed by GitHub Actions (${githubRepo}) for frontend AWS CDK deployments`,
      assumedBy: oidcPrincipal,
      maxSessionDuration: cdk.Duration.hours(1),
    });
    this.deployRole = this.frontendDeployRole;

    // Permissions to assume CDK bootstrap roles
    this.frontendDeployRole.addToPolicy(
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

    // SSM bootstrap version lookup
    this.frontendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SSMBootstrapLookup',
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          `arn:aws:ssm:*:${this.account}:parameter/cdk-bootstrap/*`,
        ],
      })
    );

    // CloudFormation permissions for Frontend stack
    this.frontendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFormationFrontendDeployStatus',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:DescribeStackResources',
          'cloudformation:DescribeStackResource',
          'cloudformation:GetTemplate',
          'cloudformation:GetTemplateSummary',
          'cloudformation:ListStackResources',
          'cloudformation:CreateStack',
          'cloudformation:UpdateStack',
          'cloudformation:DeleteStack',
          'cloudformation:CreateChangeSet',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:DeleteChangeSet',
        ],
        resources: [
          `arn:aws:cloudformation:*:${this.account}:stack/Portfolio*/*`,
          `arn:aws:cloudformation:*:${this.account}:changeSet/*/*`,
        ],
      })
    );

    // S3 bucket creation (kept separate: aws:ResourceAccount cannot be relied on before the bucket exists)
    this.frontendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3FrontendBucketCreation',
        effect: iam.Effect.ALLOW,
        actions: ['s3:CreateBucket'],
        resources: [`arn:aws:s3:::*portfolio*`],
      })
    );

    // S3 asset deployment and bucket sync (scoped strictly to own AWS account)
    this.frontendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3FrontendAssetDeployment',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:GetObject',
          's3:ListBucket',
          's3:DeleteObject',
          's3:GetBucketLocation',
          's3:PutBucketVersioning',
          's3:PutEncryptionConfiguration',
          's3:PutBucketPolicy',
          's3:PutBucketPublicAccessBlock',
        ],
        resources: [
          `arn:aws:s3:::cdk-*-assets-${this.account}-*`,
          `arn:aws:s3:::cdk-*-assets-${this.account}-*/*`,
          `arn:aws:s3:::*portfolio*`,
          `arn:aws:s3:::*portfolio*/*`,
        ],
        conditions: {
          StringEquals: {
            'aws:ResourceAccount': this.account,
          },
        },
      })
    );

    // CloudFront cache invalidation
    this.frontendDeployRole.addToPolicy(
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

    // =========================================================================
    // 4. BACKEND DEPLOYMENT ROLE (AWS SAM, Lambda, API Gateway, Amazon SES)
    // =========================================================================
    this.backendDeployRole = new iam.Role(this, 'GitHubActionsBackendDeployRole', {
      roleName: 'GitHubActionsPortfolioBackendDeployRole',
      description: `Role assumed by GitHub Actions (${githubRepo}) for backend AWS SAM deployments`,
      assumedBy: oidcPrincipal,
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // CloudFormation permissions for Backend SAM stack
    this.backendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFormationBackendDeployStatus',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:DescribeStackResources',
          'cloudformation:DescribeStackResource',
          'cloudformation:GetTemplate',
          'cloudformation:GetTemplateSummary',
          'cloudformation:ListStackResources',
          'cloudformation:CreateStack',
          'cloudformation:UpdateStack',
          'cloudformation:DeleteStack',
          'cloudformation:CreateChangeSet',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:DeleteChangeSet',
        ],
        resources: [
          `arn:aws:cloudformation:*:${this.account}:stack/portfolio-*/*`,
          `arn:aws:cloudformation:*:${this.account}:stack/Portfolio*/*`,
          `arn:aws:cloudformation:*:${this.account}:stack/aws-sam-cli-managed-default/*`,
          `arn:aws:cloudformation:*:${this.account}:changeSet/*/*`,
          'arn:aws:cloudformation:*:aws:transform/*',
        ],
      })
    );

    // Global CloudFormation template inspection permissions
    this.backendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFormationTemplateInspection',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:GetTemplateSummary',
          'cloudformation:ValidateTemplate',
        ],
        resources: ['*'],
      })
    );

    // S3 SAM packaging bucket creation and cleanup
    this.backendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SAMManagedS3BucketLifecycle',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:CreateBucket',
          's3:DeleteBucket',
        ],
        resources: [
          'arn:aws:s3:::aws-sam-cli-managed-*',
        ],
      })
    );

    // S3 SAM packaging bucket management (scoped strictly to own AWS account)
    this.backendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SAMManagedS3Packaging',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetBucketLocation',
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
          's3:PutBucketPolicy',
          's3:GetBucketPolicy',
          's3:PutBucketPublicAccessBlock',
          's3:GetBucketPublicAccessBlock',
          's3:PutBucketVersioning',
          's3:GetBucketVersioning',
          's3:PutEncryptionConfiguration',
          's3:GetEncryptionConfiguration',
          's3:PutBucketTagging',
          's3:GetBucketTagging',
        ],
        resources: [
          'arn:aws:s3:::aws-sam-cli-managed-*',
          'arn:aws:s3:::aws-sam-cli-managed-*/*',
          `arn:aws:s3:::*portfolio*`,
          `arn:aws:s3:::*portfolio*/*`,
        ],
        conditions: {
          StringEquals: {
            'aws:ResourceAccount': this.account,
          },
        },
      })
    );

    // Lambda deployment permissions
    this.backendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'LambdaSAMDeployment',
        effect: iam.Effect.ALLOW,
        actions: [
          'lambda:CreateFunction',
          'lambda:UpdateFunctionCode',
          'lambda:UpdateFunctionConfiguration',
          'lambda:DeleteFunction',
          'lambda:GetFunction',
          'lambda:GetFunctionConfiguration',
          'lambda:AddPermission',
          'lambda:RemovePermission',
          'lambda:TagResource',
          'lambda:UntagResource',
          'lambda:ListTags',
          'lambda:PublishVersion',
        ],
        resources: [
          `arn:aws:lambda:*:${this.account}:function:portfolio-*`,
          `arn:aws:lambda:*:${this.account}:function:Portfolio*`,
        ],
      })
    );

    // API Gateway deployment permissions
    this.backendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ApiGatewaySAMDeployment',
        effect: iam.Effect.ALLOW,
        actions: [
          'apigateway:POST',
          'apigateway:GET',
          'apigateway:PUT',
          'apigateway:PATCH',
          'apigateway:DELETE',
        ],
        resources: [
          `arn:aws:apigateway:*::/restapis`,
          `arn:aws:apigateway:*::/restapis/*`,
          `arn:aws:apigateway:*::/tags/*`,
        ],
      })
    );

    // IAM pass role and execution role management for Lambda
    this.backendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'IAMRoleSAMDeployment',
        effect: iam.Effect.ALLOW,
        actions: [
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:GetRole',
          'iam:GetRolePolicy',
          'iam:PassRole',
          'iam:PutRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:TagRole',
          'iam:UntagRole',
          'iam:ListRolePolicies',
          'iam:ListAttachedRolePolicies',
        ],
        resources: [
          `arn:aws:iam::${this.account}:role/portfolio-*`,
          `arn:aws:iam::${this.account}:role/Portfolio*`,
        ],
      })
    );

    this.backendDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'IAMAttachRolePolicySAMDeployment',
        effect: iam.Effect.ALLOW,
        actions: [
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
        ],
        resources: [
          `arn:aws:iam::${this.account}:role/portfolio-*`,
          `arn:aws:iam::${this.account}:role/Portfolio*`,
        ],
        conditions: {
          ArnEquals: {
            'iam:PolicyARN': [
              iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole').managedPolicyArn,
              iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole').managedPolicyArn,
            ],
          },
        },
      })
    );

    // =========================================================================
    // 5. STACK OUTPUTS
    // =========================================================================
    new cdk.CfnOutput(this, 'FrontendRoleArn', {
      value: this.frontendDeployRole.roleArn,
      description: 'ARN of the IAM Role for Frontend GitHub Actions deployment (AWS_FRONTEND_ROLE_ARN)',
      exportName: `${this.stackName}-FrontendRoleArn`,
    });

    new cdk.CfnOutput(this, 'FrontendRoleName', {
      value: this.frontendDeployRole.roleName,
      description: 'Name of the IAM Role for Frontend GitHub Actions deployment',
      exportName: `${this.stackName}-FrontendRoleName`,
    });

    new cdk.CfnOutput(this, 'BackendRoleArn', {
      value: this.backendDeployRole.roleArn,
      description: 'ARN of the IAM Role for Backend GitHub Actions deployment (AWS_BACKEND_ROLE_ARN)',
      exportName: `${this.stackName}-BackendRoleArn`,
    });

    new cdk.CfnOutput(this, 'BackendRoleName', {
      value: this.backendDeployRole.roleName,
      description: 'Name of the IAM Role for Backend GitHub Actions deployment',
      exportName: `${this.stackName}-BackendRoleName`,
    });

    new cdk.CfnOutput(this, 'RoleArn', {
      value: this.frontendDeployRole.roleArn,
      description: 'Default role ARN (alias to Frontend role for backward compatibility)',
      exportName: `${this.stackName}-RoleArn`,
    });

    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: this.oidcProvider.openIdConnectProviderArn,
      description: 'ARN of the GitHub OIDC Identity Provider',
      exportName: `${this.stackName}-OidcProviderArn`,
    });
  }
}
