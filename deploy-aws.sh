#!/bin/bash
set -e

# Colors for formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Kumar Aditya Portfolio - AWS CDK Deployment ===${NC}\n"

# Verify AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Verify AWS credentials
echo -e "${BLUE}Checking AWS CLI credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: Invalid or missing AWS credentials. Run 'aws configure' first.${NC}"
    exit 1
fi
echo -e "${GREEN}✔ Credentials verified.${NC}\n"

# Step 1: Build Frontend Application
echo -e "${BLUE}Step 1: Building Angular frontend production bundle...${NC}"
cd frontend
npm ci
npm run build
cd ..
echo -e "${GREEN}✔ Frontend built successfully in frontend/dist/portfolio-app/browser.${NC}\n"

# Step 2: Deploy Infrastructure via AWS CDK
echo -e "${BLUE}Step 2: Deploying infrastructure via AWS CDK...${NC}"
cd iac
npm ci
npm run build
npx cdk deploy --require-approval never "$@"
cd ..

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}====================================================${NC}"
