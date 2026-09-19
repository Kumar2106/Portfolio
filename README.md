# Kumar Aditya — Senior Backend & DevOps Portfolio

[![Deploy Portfolio to AWS](https://github.com/Kumar2106/Portfolio/actions/workflows/deploy.yml/badge.svg)](https://github.com/Kumar2106/Portfolio/actions/workflows/deploy.yml)
[![Live Site](https://img.shields.io/badge/Live-aditya.weinventify.com-00e5ff?style=flat&logo=amazon-aws)](https://aditya.weinventify.com)

A modern, cloud-native developer portfolio application built with **Angular (Signals & Standalone Components)** and hosted on **AWS S3 + CloudFront CDN**, deployed via a secure, keyless **GitHub Actions OIDC** pipeline.

---

## 🌟 Key Features

* **Interactive DevOps Playground:**
  * **System Architecture:** Cloud-native microservices flow (Spring Boot, Apache Kafka, PostgreSQL Aurora, Iceberg Lakehouse).
  * **AWS Cost Calculator:** Real-time infrastructure cost estimator with dynamic savings calculation.
  * **API Client Simulator:** Interactive HTTP request/response inspector with simulated payloads.
  * **CI/CD Pipeline Simulator:** Real-time build, test, Docker containerization, and ECS deployment terminal emulator.
* **Portfolio AWS Hosting Section:**
  * Standalone interactive architecture diagram visualizing how this very portfolio is deployed globally using Route 53, CloudFront CDN, ACM SSL, and a private S3 origin bucket with Origin Access Control (OAC).
* **Responsive & Adaptive UI:**
  * Fully responsive mobile layout with an animated slide-in drawer menu and touch-optimized diagram exploration.
  * Adaptive container layout designed for ultra-wide monitors, MacBooks, and laptop viewports.
* **Theme System:**
  * Dark & Light modes with persistent `localStorage` preference and an eye-friendly initial theme selection modal.

---

## 🛠️ Tech Stack

* **Frontend:** Angular 22, TypeScript, Reactive Signals, CSS3 Custom Properties
* **Testing:** Vitest, Angular TestBed
* **Cloud & Infrastructure:** AWS S3, CloudFront, Route 53, ACM (SSL/TLS)
* **CI/CD & Automation:** GitHub Actions (OIDC keyless authentication), CodeRabbit AI PR Reviews
* **Containerization:** Docker

---

## 🚀 Local Development

### Prerequisites
* Node.js `^20.0.0` or higher
* npm `^10.0.0` or higher

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/Kumar2106/Portfolio.git
   cd Portfolio/portfolio-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   Open `http://localhost:4200` in your browser.

4. Run unit tests:
   ```bash
   npm test
   ```

5. Build for production:
   ```bash
   npm run build
   ```
   The compiled static files are output to `portfolio-app/dist/portfolio-app/browser`.

---

## ☁️ Deployment Pipeline (CI/CD)

The portfolio is deployed to AWS via GitHub Actions using **AWS OpenID Connect (OIDC)** authentication (zero long-lived credentials stored in GitHub):

1. Pushes to `main` branch trigger `.github/workflows/deploy.yml`.
2. Angular compiles the production bundle.
3. GitHub Actions assumes the AWS IAM OIDC Role.
4. Assets are synchronized to the private S3 bucket with `--delete`.
5. A CloudFront cache invalidation (`/*`) is created to immediately serve the latest version globally.

For complete setup instructions, see the [AWS Deployment Guide](deployment_guide.md).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
