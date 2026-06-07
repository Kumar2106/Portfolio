#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Default bucket name (can be overridden by environment variable or argument)
BUCKET_NAME=${1:-""}
AWS_REGION=${2:-"us-east-1"}

# Colors for formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Kumar Aditya Portfolio - AWS S3 Deployment Script ===${NC}\n"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Verify AWS Caller Identity
echo -e "${BLUE}Checking AWS CLI credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: Invalid or missing AWS credentials. Run 'aws configure' first.${NC}"
    exit 1
fi
echo -e "${GREEN}✔ Credentials verified.${NC}\n"

# Prompt for bucket name if not provided
while [ -z "$BUCKET_NAME" ]; do
    read -p "Enter a unique AWS S3 bucket name (e.g., aditya-portfolio-2026): " BUCKET_NAME
done

# Step 1: Build the production bundle
echo -e "${BLUE}Step 1: Building Angular production bundle...${NC}"
cd portfolio-app
npm install
npm run build
cd ..
echo -e "${GREEN}✔ Build completed successfully.${NC}\n"

# Step 2: Create S3 bucket if it doesn't exist
echo -e "${BLUE}Step 2: Checking if S3 bucket '$BUCKET_NAME' exists...${NC}"
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo -e "${GREEN}✔ Bucket exists.${NC}"
else
    echo -e "${YELLOW}Bucket does not exist. Creating bucket '$BUCKET_NAME' in region '$AWS_REGION'...${NC}"
    if [ "$AWS_REGION" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION"
    else
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi
    echo -e "${GREEN}✔ Bucket created successfully.${NC}"
fi
echo ""

# Step 3: Remove Public Access Block
echo -e "${BLUE}Step 3: Disabling Public Access Block on S3 bucket...${NC}"
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
echo -e "${GREEN}✔ Public Access Block removed.${NC}\n"

# Step 4: Configure Bucket Policy for Public Access
echo -e "${BLUE}Step 4: Applying S3 Bucket Policy for public read access...${NC}"
POLICY_JSON=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
)
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy "$POLICY_JSON"
echo -e "${GREEN}✔ Bucket policy applied.${NC}\n"

# Step 5: Enable Static Website Hosting
echo -e "${BLUE}Step 5: Enabling Static Website Hosting configuration...${NC}"
aws s3api put-bucket-website --bucket "$BUCKET_NAME" --website-configuration '{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}'
echo -e "${GREEN}✔ Static website hosting enabled.${NC}\n"

# Step 6: Sync Files to S3 Bucket
echo -e "${BLUE}Step 6: Syncing production files to S3...${NC}"
aws s3 sync portfolio-app/dist/portfolio-app/browser/ "s3://$BUCKET_NAME/" --delete
echo -e "${GREEN}✔ File upload synchronized.${NC}\n"

# Output deployment details
HOSTING_URL="http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "Your portfolio website is now live at:"
echo -e "${BLUE}${HOSTING_URL}${NC}\n"
echo -e "${YELLOW}Note: If using custom domain, configure Route 53 or CloudFront pointing to this S3 hosting endpoint.${NC}"
