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

---

## 🚀 Getting Started

### Prerequisites
- Node.js `^20.0.0` or `^22.0.0`
- AWS CLI configured with valid credentials (`aws sts get-caller-identity`)
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

### Preview Changes (Diff)
```bash
npm run diff
```

### Deploy to AWS

> [!IMPORTANT]
> Always compile the Angular production bundle **before** deploying the CDK stack so that `PortfolioStack`'s `BucketDeployment` detects and deploys the static assets:
> ```bash
> # 1. Build frontend assets first
> cd ../frontend && npm install && npm run build && cd ../iac
> 
> # 2. Deploy infrastructure & sync assets
> npm run deploy
> ```
> Alternatively, execute the root automated deployment script which builds the frontend and deploys the CDK stack in a single step:
> ```bash
> ./deploy-aws.sh
> ```

```bash
# Deployment with custom domain and ACM certificate
npx cdk deploy -c domainName="aditya.weinventify.com" \
               -c certificateArn="arn:aws:acm:us-east-1:123456789012:certificate/..." \
               -c hostedZoneId="Z1234567890ABC"
```

### Destroy Infrastructure
```bash
npx cdk destroy
```
