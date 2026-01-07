#!/bin/bash

# Architecture Review System - Setup Script
# This script sets up the development environment

set -e

echo "🚀 Architecture Review System - Setup"
echo "======================================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18 or higher is required"
    echo "   Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Check AWS CLI
echo "🔐 Checking AWS CLI..."
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed"
    echo "   Install from: https://aws.amazon.com/cli/"
    exit 1
fi
echo "✅ AWS CLI version: $(aws --version)"
echo ""

# Check AWS credentials
echo "🔑 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS credentials not configured"
    echo "   Run: aws configure"
    exit 1
fi
echo "✅ AWS Account: $(aws sts get-caller-identity --query Account --output text)"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
npm install
echo "✅ Root dependencies installed"
echo ""

echo "📥 Installing workspace dependencies..."
npm install --workspaces
echo "✅ All dependencies installed"
echo ""

# Copy environment files
echo "📝 Setting up environment files..."

if [ ! -f "packages/frontend/.env" ]; then
    cp packages/frontend/.env.example packages/frontend/.env
    echo "✅ Created packages/frontend/.env"
    echo "   ⚠️  Please update with your AWS resource information"
else
    echo "ℹ️  packages/frontend/.env already exists"
fi

if [ ! -f "packages/backend/.env" ]; then
    cp packages/backend/.env.example packages/backend/.env
    echo "✅ Created packages/backend/.env"
    echo "   ⚠️  Please update with your AWS resource information"
else
    echo "ℹ️  packages/backend/.env already exists"
fi

if [ ! -f "packages/mcp-server/.env" ]; then
    cp packages/mcp-server/.env.example packages/mcp-server/.env
    echo "✅ Created packages/mcp-server/.env"
    echo "   ⚠️  Please update with your AWS resource information"
else
    echo "ℹ️  packages/mcp-server/.env already exists"
fi

echo ""
echo "✅ Setup completed!"
echo ""
echo "📚 Next steps:"
echo "   1. Update environment files with your AWS resource information"
echo "   2. Run: npm run deploy (to deploy AWS resources)"
echo "   3. Run: cd packages/frontend && npm run dev (to start frontend)"
echo ""
echo "📖 For more information, see:"
echo "   - docs/INSTALLATION.md"
echo "   - docs/DEPLOYMENT.md"
echo "   - docs/QUICKSTART.md"
echo ""
