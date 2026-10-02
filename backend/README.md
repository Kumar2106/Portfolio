# Portfolio Contact Service (AWS SAM)

This package contains the **AWS Serverless Application Model (AWS SAM)** backend service for the Kumar Aditya Portfolio contact form.

It exposes a RESTful API via **Amazon API Gateway** backed by an **AWS Lambda function** (Node.js 22) that validates incoming messages and dispatches notifications via **Amazon Simple Email Service (SES)**.

---

## 🏗️ Architecture

```mermaid
graph LR
    Client[Portfolio Frontend] -- POST /contact --> APIGW[API Gateway (HTTP/REST)]
    APIGW -- Event Payload --> Lambda[AWS Lambda (Node.js 22)]
    Lambda -- SendEmailCommand --> SES[Amazon SES]
    SES -- Delivery --> Inbox[ka09934147002@gmail.com]
```

### Key Highlights
- **Input Validation**: Requires name, email, and message; validates email syntax; enforces length limits (name 100, email 254, message 5000 characters); strips line breaks from header fields.
- **Abuse Protection**: a stage-wide API Gateway throttle (2 req/s, burst 5, shared by all callers) caps SES volume and cost, and CORS is restricted to the portfolio origin (`AllowedOrigin` parameter). Per-client limiting would require an AWS WAF rate-based rule.
- **Amazon SES**: Dual HTML and plain-text email delivery with `Reply-To` automatically set to the sender's email.
- **ARM64 Architecture**: Low-latency, cost-efficient execution on AWS Graviton.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `^22.12.0` or `^24.0.0` (required by Vitest 5)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS CLI configured with active credentials (`aws sts get-caller-identity`)

---

### Installation & Build

```bash
cd backend

# Install dependencies
npm install

# Compile TypeScript to dist/
npm run build

# Run unit tests
npm test
```

---

### Local Testing with SAM CLI

Build and start the local API Gateway emulator:
```bash
npm run build
sam build
npm run sam:local   # sam local start-api --port 3000
```

Send a test request:
```bash
curl -X POST http://localhost:3000/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Hello from local SAM test!"
  }'
```

---

### Deployment to AWS

#### 1. Verify SES Email Identity (One-Time Setup)
Amazon SES requires the sender (and recipient in sandbox mode) to be verified:
```bash
aws ses verify-email-identity --email-address ka09934147002@gmail.com
```

#### 2. Deploy SAM Application
```bash
sam build
sam deploy --guided
```
Or deploy using the pre-configured parameters in `samconfig.toml`:
```bash
sam deploy
```

#### 3. Automated CI/CD Deployment via GitHub Actions
The backend has a dedicated deployment pipeline (`.github/workflows/deploy-backend.yml`) that automatically builds, tests, validates, and deploys changes on push to `main`:
- **Trigger**: Changes in `backend/**` or `.github/workflows/deploy-backend.yml` (path-filtered to run independently from the frontend).
- **Validation**: Runs Vitest unit tests, compiles TypeScript, and validates the SAM template (`sam validate --lint`).
- **OIDC Deployment**: Uses keyless GitHub Actions OIDC (`AWS_BACKEND_ROLE_ARN`) to assume the deployment role, build the SAM package, and execute `sam deploy`.
- **Manual Trigger**: Can be manually triggered via `workflow_dispatch` with custom stage inputs.

#### Required GitHub Secrets & Variables
- `AWS_BACKEND_ROLE_ARN`: IAM Role ARN for OIDC authentication (`GitHubActionsPortfolioBackendDeployRole`, output `BackendRoleArn` of `PortfolioOidcStack`).
- `AWS_REGION`: Target AWS region (defaults to `ap-south-1`).
- `CONTACT_RECIPIENT_EMAIL`: (Optional) Recipient email address (defaults to `ka09934147002@gmail.com`).
- `CONTACT_SENDER_EMAIL`: (Optional) Verified SES sender email address (defaults to `ka09934147002@gmail.com`).

#### CloudFormation Outputs
Upon successful deployment, SAM outputs:
- `ContactApiEndpoint`: The public URL (e.g. `https://abc123xyz.execute-api.ap-south-1.amazonaws.com/prod/contact`).
- `HealthApiEndpoint`: The `GET /health` URL.
- `ContactFunctionArn`: The Lambda function ARN.
- `ContactFunctionIamRole`: The IAM role generated for the contact Lambda.
