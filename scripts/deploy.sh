#!/bin/bash

# Architecture Review System - Deployment Script
# This script builds and deploys the backend infrastructure

set -e

echo "🚀 Architecture Review System - Deployment"
echo "=========================================="
echo ""

# Check if AWS credentials are configured
echo "🔑 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS credentials not configured"
    echo "   Run: aws configure"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

echo "✅ AWS Account: $AWS_ACCOUNT_ID"
echo "✅ AWS Region: $AWS_REGION"
echo ""

# Build backend
echo "🔨 Building backend..."
cd packages/backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi
echo "✅ Backend built successfully"
cd ../..
echo ""

# Build MCP server
echo "🔨 Building MCP server..."
cd packages/mcp-server
npm run build
if [ $? -ne 0 ]; then
    echo "❌ MCP server build failed"
    exit 1
fi
echo "✅ MCP server built successfully"
cd ../..
echo ""

# Check if CDK is bootstrapped
echo "🔍 Checking CDK bootstrap..."
cd packages/infrastructure

if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $AWS_REGION &> /dev/null; then
    echo "⚠️  CDK not bootstrapped in this region"
    echo "🔧 Bootstrapping CDK..."
    npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
    echo "✅ CDK bootstrapped"
else
    echo "✅ CDK already bootstrapped"
fi
echo ""

# Deploy infrastructure
echo "🚀 Deploying infrastructure..."
echo "   This may take 5-10 minutes..."
echo ""

npx cdk deploy --all --require-approval never

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📝 Important: Update your environment files with the deployment outputs"
echo ""
echo "📚 Next steps:"
echo "   1. Update packages/frontend/.env with:"
echo "      - VITE_API_BASE_URL"
echo "      - VITE_USER_POOL_ID"
echo "      - VITE_USER_POOL_WEB_CLIENT_ID"
echo "      - VITE_COGNITO_DOMAIN"
echo ""
echo "   2. Create a Cognito user:"
echo "      aws cognito-idp admin-create-user \\"
echo "        --user-pool-id YOUR_USER_POOL_ID \\"
echo "        --username admin \\"
echo "        --user-attributes Name=email,Value=your-email@example.com \\"
echo "        --region $AWS_REGION"
echo ""
echo "   3. Set user password:"
echo "      aws cognito-idp admin-set-user-password \\"
echo "        --user-pool-id YOUR_USER_POOL_ID \\"
echo "        --username admin \\"
echo "        --password 'Welcome123!' \\"
echo "        --permanent \\"
echo "        --region $AWS_REGION"
echo ""
echo "   4. Start the frontend:"
echo "      cd packages/frontend && npm run dev"
echo ""
echo "📖 For more information, see docs/DEPLOYMENT.md"
echo ""

cd ../..
