# Kumar Aditya — Senior Backend & DevOps Portfolio

[![Deploy Portfolio to AWS](https://github.com/Kumar2106/Portfolio/actions/workflows/deploy.yml/badge.svg)](https://github.com/Kumar2106/Portfolio/actions/workflows/deploy.yml)
[![Live Site](https://img.shields.io/badge/Live-aditya.weinventify.com-00e5ff?style=flat&logo=amazon-aws)](https://aditya.weinventify.com)

A modern, cloud-native developer portfolio application built with **Angular (Signals & Standalone Components)** and provisioned on AWS using **AWS CDK v2 (TypeScript)** with a private S3 origin, CloudFront CDN (Origin Access Control), Route 53, and ACM SSL, deployed via a secure, keyless **GitHub Actions OIDC** pipeline.

---

## 📁 Repository Structure

The repository is modularized into two distinct packages:

```
Portfolio/
├── frontend/               # Angular 22 Single Page Application
│   ├── src/                # Application components, signals & styling
│   ├── public/             # Static assets (favicons, etc.)
│   ├── angular.json        # Angular workspace configuration
│   └── package.json        # Frontend dependencies & scripts
├── iac/                    # AWS Cloud Development Kit (CDK v2) Package
│   ├── bin/                # CDK application entry point
│   ├── lib/                # Infrastructure stack (S3, CloudFront OAC, Route53, SPA routing)
│   ├── cdk.json            # CDK configuration & context
│   └── package.json        # CDK dependencies & scripts
├── .github/workflows/      # Automated CI/CD deployment pipelines
├── .coderabbit.yaml        # Automated AI Code Review configuration
└── README.md
```

---

## 🌟 Key Features

* **Interactive DevOps Playground:**
  * **System Architecture:** Cloud-native microservices flow (Spring Boot, Apache Kafka, PostgreSQL Aurora, Iceberg Lakehouse).
  * **AWS Cost Calculator:** Real-time infrastructure cost estimator with dynamic savings calculation.
  * **API Client Simulator:** Interactive HTTP request/response inspector with simulated payloads.
  * **CI/CD Pipeline Simulator:** Real-time build, test, Docker containerization, and ECS deployment terminal emulator.
* **Portfolio AWS Hosting Section:**
  * Standalone interactive architecture diagram visualizing how this portfolio is deployed globally using Route 53, CloudFront CDN, ACM SSL, and a private S3 origin bucket with Origin Access Control (OAC).
* **Responsive & Adaptive UI:**
  * Fully responsive mobile layout with an animated slide-in drawer menu and touch-optimized diagram exploration.
  * Adaptive container layout designed for ultra-wide monitors, MacBooks, and laptop viewports.
* **Theme System:**
  * Dark & Light modes with persistent `localStorage` preference and an eye-friendly initial theme selection modal.

---

## 🛠️ Tech Stack

* **Frontend:** Angular 22, TypeScript, Reactive Signals, CSS3 Custom Properties
* **Infrastructure as Code (IaC):** AWS CDK v2 (TypeScript), CloudFormation
* **AWS Services:** Amazon S3 (Private), CloudFront CDN (Origin Access Control), Route 53, ACM (SSL/TLS)
* **Testing:** Vitest, Angular TestBed
* **CI/CD & Automation:** GitHub Actions (OIDC keyless authentication), CodeRabbit AI PR Reviews

---

## 🚀 Getting Started

### Prerequisites
* Node.js `^20.0.0` or `^22.0.0`
* npm `^10.0.0` or higher
* AWS CLI configured (`aws configure` or SSO)

---

### 1. Frontend Development (`frontend/`)

```bash
cd frontend

# Install dependencies
npm install

# Start local dev server (http://localhost:4200)
npm start

# Run unit tests
npm test

# Build production bundle
npm run build
```

Compiled static artifacts are generated in `frontend/dist/portfolio-app/browser`.

---

### 2. Infrastructure as Code (`iac/`)

The infrastructure provisions a private S3 origin, CloudFront distribution with Origin Access Control (OAC), SPA 403/404 client-side routing rewrites, and optional Route 53 / ACM SSL mapping.

```bash
cd iac

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Synthesize CloudFormation template
npm run synth

# Preview infrastructure changes
npm run diff

# Deploy stack to AWS
npm run deploy

# Deploy with custom domain and certificate
npx cdk deploy -c domainName="aditya.weinventify.com" \
               -c certificateArn="arn:aws:acm:us-east-1:123456789012:certificate/..." \
               -c hostedZoneId="Z1234567890ABC"
```

For more details, see the [IaC Documentation](iac/README.md).

---

## ☁️ Deployment Pipeline (CI/CD)

The portfolio is deployed to AWS via GitHub Actions using **AWS OpenID Connect (OIDC)** authentication (zero long-lived credentials stored in GitHub):

1. Pushes to the `main` branch trigger `.github/workflows/deploy.yml`.
2. Angular compiles the production bundle in `frontend/`.
3. GitHub Actions assumes the AWS IAM OIDC Role.
4. Static assets are synchronized to the private S3 origin bucket with `--delete`.
5. A CloudFront cache invalidation (`/*`) is created to immediately propagate the latest version worldwide.

For complete setup instructions, see the [AWS Deployment Guide](deployment_guide.md).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
