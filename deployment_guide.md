# Complete AWS S3 & CloudFront Deployment Guide

This guide walks you through the step-by-step process of building your portfolio application and hosting it securely under your custom domain **`aditya.weinventify.com`** using **AWS S3** and **AWS CloudFront (CDN)** with **SSL/HTTPS**.

---

## Architecture Overview
```mermaid
graph LR
    User[Browser Client] -- HTTPS --> CF[AWS CloudFront CDN]
    CF -- S3 Origin Access (OAC) --> S3[Private S3 Bucket]
    ACM[AWS Certificate Manager] -- SSL Cert --> CF
    DNS[DNS Provider / Route 53] -- Alias/CNAME --> CF
```

---

## Part 1: Build the Application
Before uploading anything to AWS, compile the Angular application for production.

1. Open your terminal in the project directory (`portfolio-app`).
2. Run the following command:
   ```bash
   npm run build
   ```
3. Once completed, your static files will be generated in:
   `portfolio-app/dist/portfolio-app/browser`
   
   > [!IMPORTANT]
   > Do **not** upload the entire project directory. Only upload the files inside the `browser` folder (`index.html`, `main-*.js`, `styles-*.css`, `favicon.ico`).

---

## Part 2: Choose Your Hosting Option

You can host your portfolio in two ways:
* **Option A: S3 Direct Static Website Hosting (Quickest, HTTP only)**
* **Option B: S3 + CloudFront CDN + ACM Certificate (Recommended, HTTPS, Secure, Custom Domain)**

---

### Option A: S3 Direct Static Website Hosting (HTTP Only)

#### 1. Create S3 Bucket
1. Open the **[AWS Management Console](https://aws.amazon.com/console/)** and go to **S3**.
2. Click **Create bucket**.
3. Configure settings:
   - **Bucket name**: Enter a unique name (e.g., `kumar-aditya-portfolio`).
   - **AWS Region**: Select your preferred region (e.g., `us-east-1`).
4. **Block Public Access settings**:
   - **UNCHECK** the box **Block all public access**.
   - Check the acknowledgement box: *"I acknowledge that the current settings might result in this bucket and the objects within becoming public."*
5. Click **Create bucket**.

#### 2. Upload Static Files
1. Click on your newly created bucket name.
2. Click **Upload** -> Drag and drop all the contents of the `portfolio-app/dist/portfolio-app/browser/` folder.
3. Click **Upload** at the bottom.

#### 3. Configure Bucket Policy
1. Go to the **Permissions** tab of your bucket -> scroll to **Bucket policy** -> click **Edit**.
2. Paste the following policy JSON (replace `YOUR_BUCKET_NAME` with your actual bucket name):
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Sid": "PublicReadGetObject",
               "Effect": "Allow",
               "Principal": "*",
               "Action": "s3:GetObject",
               "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
           }
       ]
   }
   ```
3. Click **Save changes**.

#### 4. Enable Static Hosting
1. Go to the **Properties** tab of your bucket -> scroll to the bottom to **Static website hosting** -> click **Edit**.
2. Select **Enable** and configure:
   - **Index document**: Enter `index.html`.
   - **Error document**: Enter `index.html` (required to support Angular single-page routing on refreshes).
3. Click **Save changes**.
4. Access the site via the generated **Bucket website endpoint** URL.

---

### Option B: S3 + CloudFront CDN (HTTPS + Custom Domain `aditya.weinventify.com`)

To host using your custom domain securely with SSL, follow these steps.

#### 1. Create S3 Bucket (Private)
1. Go to **S3** -> click **Create bucket** -> enter bucket name (e.g., `kumar-aditya-portfolio`).
2. Leave **Block all public access** **CHECKED** (we keep the bucket private; only CloudFront will be allowed to read from it).
3. Click **Create bucket** and upload your files (from `portfolio-app/dist/portfolio-app/browser/`) directly into it.

#### 2. Request SSL Certificate in ACM
> [!IMPORTANT]
> **Region Lock**: CloudFront requires SSL certificates to be created in the **`us-east-1` (N. Virginia)** region. Switch your AWS Console region to `us-east-1` before requesting the certificate.

1. Go to **AWS Certificate Manager (ACM)** in `us-east-1`.
2. Click **Request certificate** -> choose **Request a public certificate** -> click **Next**.
3. Domain name: `aditya.weinventify.com`.
4. Validation method: **DNS validation**.
5. Click **Request**.
6. Create the CNAME validation record in your DNS provider's dashboard using the generated CNAME Name and CNAME Value. Once validated, status turns to **Issued**.

#### 3. Create CloudFront Distribution
1. Search for **CloudFront** -> click **Create distribution**.
2. **Origin Settings**:
   - **Origin domain**: Select your S3 bucket.
   - **Origin access**: Select **Origin access control settings (recommended)**.
   - Click **Create control setting** -> click **Create** (creates OAC configs to authenticate CloudFront).
3. **Default Cache Behavior**:
   - **Viewer protocol policy**: Select **Redirect HTTP to HTTPS**.
   - **Allowed HTTP methods**: Select `GET, HEAD`.
4. **Settings**:
   - **Alternate domain name (CNAME)**: Click **Add item** and enter: `aditya.weinventify.com`.
   - **Custom SSL certificate**: Select your ACM certificate for `aditya.weinventify.com`.
   - **Default root object**: Enter `index.html`.
5. Click **Create distribution**.

#### 4. Sync S3 Bucket Policy
1. Once created, select your distribution -> go to **Origins** -> select the S3 origin -> click **Edit**.
2. Click the **Copy policy** button under S3 bucket access.
3. Navigate back to your **S3 Bucket** -> **Permissions** tab -> **Bucket policy** -> click **Edit**.
4. Paste the copied policy (allows CloudFront read access to the private bucket) and save changes.

#### 5. Configure CloudFront Error Pages (Angular Routing Fix)
Because Angular is a single-page application (SPA), refreshing sub-paths will return `403 Forbidden` from S3. We must configure CloudFront to handle this:
1. In the CloudFront console, select your distribution -> click the **Error pages** tab.
2. Click **Create custom error response**.
3. Set:
   - **HTTP error code**: **403: Forbidden** (and repeat for **404: Not Found**).
   - **Customize error response**: Select **Yes**.
   - **Response page path**: `/index.html`.
   - **HTTP response code**: **200: OK**.
4. Click **Create**.

#### 6. Configure DNS (Point Domain to CloudFront)

##### Option A: If using AWS Route 53
1. Go to **Route 53** -> **Hosted Zones** -> select `weinventify.com`.
2. Click **Create record**.
3. Set Record name: `aditya`.
4. Select Record type: **A - Alias**.
5. Toggle the **Alias** switch to **ON**.
6. Under **Route traffic to**, choose **Alias to CloudFront distribution** and select your distribution URL (e.g., `d12345.cloudfront.net`).
7. Click **Create records**.

##### Option B: If using another DNS provider
1. Go to your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.).
2. Add a new **CNAME record**:
   - **Host/Name**: `aditya`
   - **Target/Value**: Copy your CloudFront distribution domain (e.g., `d12345.cloudfront.net`).
3. Save the record and wait for propagation (usually 5–10 minutes).

---

## Part 3: Automated CLI Deployment
If you have AWS CLI configured locally (`aws configure`), you can automate the Option A deployment by using the helper script located in the project root:

```bash
./deploy-aws.sh <your-s3-bucket-name>
```
This script will build the bundle, create the bucket, disable blocks, apply bucket policies, configure hosting parameters, and upload files.

---

## Part 4: Automated CI/CD Deployment with GitHub Actions (OIDC)

For secure, production-grade deployments, you should automate your build and deploy pipeline using **GitHub Actions** and **AWS OpenID Connect (OIDC)**. This removes the need to store long-lived AWS access keys (Access Key ID and Secret Access Key) in GitHub.

### Step 1: Create IAM OIDC Identity Provider in AWS

First, configure AWS to trust GitHub's OIDC Identity Provider (IdP):
1. Open the **AWS IAM Console** -> go to **Identity Providers** -> click **Add provider**.
2. Select **OpenID Connect**.
3. Configure settings:
   - **Provider URL**: `https://token.actions.githubusercontent.com` (click **Get thumbprint** to validate).
   - **Audience**: `sts.amazonaws.com`.
4. Click **Add provider**.

### Step 2: Create IAM Role with OIDC Trust Policy

Create an IAM Role that GitHub Actions will assume to deploy your files:
1. Go to **IAM** -> **Roles** -> click **Create role**.
2. Select **Custom trust policy** and paste the following policy JSON. 
   
   > [!IMPORTANT]
   > Replace `ACCOUNT_ID` with your actual 12-digit AWS Account ID, and ensure the repository is matched to `Kumar2106/Portfolio`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:Kumar2106/Portfolio:ref:refs/heads/main"
           }
         }
       }
     ]
   }
   ```
3. Click **Next**.

### Step 3: Attach IAM Permissions Policy

Attach a policy to the role allowing it to upload to S3 and invalidate the CloudFront CDN cache:
1. Under **Permissions policies**, click **Create policy**.
2. Choose **JSON** editor and paste the following permissions policy (replace `YOUR_S3_BUCKET_NAME`, `ACCOUNT_ID`, and `YOUR_CLOUDFRONT_DISTRIBUTION_ID` with your details):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:ListBucket",
           "s3:DeleteObject"
         ],
         "Resource": [
           "arn:aws:s3:::YOUR_S3_BUCKET_NAME",
           "arn:aws:s3:::YOUR_S3_BUCKET_NAME/*"
         ]
       },
       {
         "Effect": "Allow",
         "Action": [
           "cloudfront:CreateInvalidation",
           "cloudfront:GetInvalidation"
         ],
         "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/YOUR_CLOUDFRONT_DISTRIBUTION_ID"
       }
     ]
   }
   ```
3. Save the policy as `GitHubActionsPortfolioDeployPolicy`.
4. Go back to the Role creation window, select your new policy, click **Next**, name the role (e.g., `GitHubActionsPortfolioDeployRole`), and click **Create role**.
5. Copy the **Role ARN** (e.g., `arn:aws:iam::ACCOUNT_ID:role/GitHubActionsPortfolioDeployRole`).

### Step 4: Configure GitHub Secrets

Add the AWS deployment parameters as secrets in your GitHub repository:
1. Go to your repository on GitHub (`Kumar2106/Portfolio`).
2. Go to **Settings** -> **Secrets and variables** -> **Actions** -> click **New repository secret**.
3. Add the following secrets:
   - `AWS_ROLE_ARN`: The ARN of your newly created IAM Role (from Step 2).
   - `AWS_REGION`: The AWS region of your resources (e.g., `us-east-1`).
   - `S3_BUCKET_NAME`: The name of your static hosting S3 bucket.
   - `CLOUDFRONT_DISTRIBUTION_ID`: The ID of your CloudFront distribution.

### Step 5: Run the Pipeline

The automated deployment pipeline is defined in `.github/workflows/deploy.yml`. 
Every time you push or merge code to the `main` branch, the workflow will automatically:
1. Build your Angular bundle for production.
2. Securely authenticate with AWS using OIDC.
3. Sync files to the private S3 bucket.
4. Trigger a cache invalidation on CloudFront to immediately serve the updated site version to visitors.
