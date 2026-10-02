# Portfolio Infrastructure (AWS CDK)

This package contains the **AWS Cloud Development Kit (AWS CDK v2)** TypeScript code for deploying the Kumar Aditya Portfolio to AWS.

---

## 🏗️ Architecture

The infrastructure provisions a production-grade, highly available, and secure serverless web hosting setup:

1. **Private S3 Origin Bucket**:
   - `BlockPublicAccess`: All 4 public access blocks enabled.
   - Server-side encryption: S3-Managed (`AES-256`).
   - Strict SSL enforcement (`aws:SecureTransport: true`).
   - Clean lifecycle deletion for ephemeral environments.
   - **Reuse mode**: when `distributionId` and `bucketName` are supplied (via `cdk.json` context or the `DISTRIBUTION_ID` / `BUCKET_NAME` environment variables), the stack imports the existing live bucket and distribution instead of creating new ones, and deploys assets without pruning existing objects.
2. **CloudFront CDN Distribution**:
   - Origin configured with **Origin Access Control (OAC)** (zero direct public S3 access).
   - HTTPS redirect with TLSv1.2_2021 minimum protocol security.
   - Caching optimized with automatic Brotli and Gzip compression.
   - **Single Page Application (SPA) Error Responses**: Rewrites 403 & 404 status codes to `/index.html` with HTTP 200, enabling Angular client-side router navigation across deep links.
3. **Automated Deployment (`BucketDeployment`)**:
   - When the frontend production bundle is compiled (`frontend/dist/portfolio-app/browser`), CDK automatically synchronizes the files to S3 and triggers a CloudFront invalidation (`/*`).
4. **Custom Domain & SSL (Optional)**:
   - Route 53 A and AAAA alias records.
   - AWS Certificate Manager (ACM) SSL/TLS certificate in `us-east-1`.
5. **GitHub Actions OIDC Authentication (`PortfolioOidcStack`)**:
   - Provisions the OpenID Connect (OIDC) Identity Provider for `token.actions.githubusercontent.com`.
   - Creates two isolated, least-privilege IAM roles:
     - `GitHubActionsPortfolioFrontendDeployRole`: Scoped to AWS CDK, S3 origin bucket, and CloudFront CDN.
     - `GitHubActionsPortfolioBackendDeployRole`: Scoped to AWS SAM, CloudFormation, Lambda, and API Gateway.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `^20.0.0` or `^22.0.0`
- AWS CLI configured with valid credentials (`aws sts get-caller-identity --profile personal`)
- AWS CDK CLI: `npm install -g aws-cdk` (or use local `npx cdk`)

### Installation
```bash
npm install
```

### Build & Synthesize CloudFormation Template
```bash
npm run build
npm run synth
```

### 1. Provision GitHub Actions OIDC Roles (One-Time Setup)
```bash
# Deploys OIDC provider and both frontend & backend IAM deploy roles using personal profile
npx cdk deploy PortfolioOidcStack --profile personal

# If the GitHub OIDC provider already exists in your AWS account:
npx cdk deploy PortfolioOidcStack -c existingOidcProvider=true --profile personal
```
Copy the stack outputs into your GitHub repository secrets:
- `AWS_FRONTEND_ROLE_ARN`: Value of `FrontendRoleArn`
- `AWS_BACKEND_ROLE_ARN`: Value of `BackendRoleArn`
- `AWS_REGION`: `ap-south-1` (or your target region)

---

### 2. Deploy Portfolio Hosting Infrastructure

> [!IMPORTANT]
> The CDK stack deploys static assets via `BucketDeployment` only when `frontend/dist/portfolio-app/browser` exists. Always build the frontend application **before** deploying the stack on a clean checkout.

#### Recommended: One-Command Automated Deployment
Use the root deployment script which compiles the frontend and deploys the CDK infrastructure sequentially:
```bash
./deploy-aws.sh
```

#### Manual Deployment

1. **Build frontend assets**:
   ```bash
   cd ../frontend && npm install && npm run build && cd ../iac
   ```

2. **Deploy infrastructure via CDK**:
   ```bash
   # Standard deployment (CloudFront generated domain)
   npx cdk deploy PortfolioStack

   # Custom domain deployment with Route 53 and ACM certificate
   npx cdk deploy PortfolioStack -c domainName="aditya.weinventify.com" \
                                 -c certificateArn="arn:aws:acm:us-east-1:123456789012:certificate/..." \
                                 -c hostedZoneId="Z1234567890ABC"
   ```

### Destroy Infrastructure
To tear down the portfolio hosting infrastructure without removing CI/CD authentication:
```bash
npx cdk destroy PortfolioStack
```

> [!WARNING]
> Running `npx cdk destroy --all` will also tear down `PortfolioOidcStack`, destroying the GitHub Actions deploy role and OIDC provider. Only use `--all` if you intend to completely dismantle all infrastructure including CI/CD access.
