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
- **Input Validation**: Sanitizes name and message; validates email syntax.
- **CORS Support**: Pre-configured headers for browser origins (`POST, OPTIONS`).
- **Amazon SES**: Dual HTML and plain-text email delivery with `Reply-To` automatically set to the sender's email.
- **ARM64 Architecture**: Low-latency, cost-efficient execution on AWS Graviton.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `^20.0.0` or `^22.0.0`
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

Start the local API Gateway emulator:
```bash
sam local start-api --port 3000
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

#### CloudFormation Outputs
Upon successful deployment, SAM outputs:
- `ContactApiEndpoint`: The public URL (e.g. `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/contact`).
- `ContactFunctionArn`: The Lambda function ARN.
