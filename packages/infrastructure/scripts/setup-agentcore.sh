#!/bin/bash

set -e

REGION="us-east-1"
ACCOUNT_ID="011528259648"
GATEWAY_NAME="architecture-review-gateway"
LAMBDA_ARN="arn:aws:lambda:us-east-1:011528259648:function:ArchitectureReviewStack-McpServerHandler89A0C9C0-qqJwYOe88Yxw"

echo "🚀 Setting up AgentCore Gateway..."
echo ""

# Step 1: Create IAM Role for Gateway
echo "📝 Step 1: Creating IAM Role..."

ROLE_NAME="AgentCoreGatewayRole-ArchReview"

# Trust policy
cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
ROLE_ARN=$(aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "Role for AgentCore Gateway to invoke Lambda" \
  --query 'Role.Arn' \
  --output text 2>&1 || aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

echo "✅ Role ARN: $ROLE_ARN"

# Attach Lambda invoke policy
echo "📝 Attaching Lambda invoke policy..."

cat > /tmp/lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "$LAMBDA_ARN"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "LambdaInvokePolicy" \
  --policy-document file:///tmp/lambda-policy.json 2>&1 || true

echo "✅ Policy attached"
echo ""

# Wait for role to propagate
echo "⏳ Waiting for IAM role to propagate (10 seconds)..."
sleep 10

# Step 2: Create Gateway
echo "📝 Step 2: Creating AgentCore Gateway..."

GATEWAY_ID=$(aws bedrock-agentcore-control create-gateway \
  --name "$GATEWAY_NAME" \
  --description "Architecture Review System MCP Gateway" \
  --role-arn "$ROLE_ARN" \
  --protocol-type MCP \
  --protocol-configuration '{
    "mcp": {
      "supportedVersions": ["2025-03-26"],
      "instructions": "Architecture Review System tools for document management",
      "searchType": "SEMANTIC"
    }
  }' \
  --authorizer-type NO_AUTH \
  --region "$REGION" \
  --query 'gatewayId' \
  --output text 2>&1)

if [ $? -eq 0 ]; then
  echo "✅ Gateway created: $GATEWAY_ID"
else
  echo "❌ Gateway creation failed: $GATEWAY_ID"
  exit 1
fi

echo ""

# Step 3: Wait for Gateway to be active
echo "⏳ Waiting for Gateway to be active..."
sleep 5

# Get Gateway URL
GATEWAY_URL=$(aws bedrock-agentcore-control get-gateway \
  --gateway-identifier "$GATEWAY_ID" \
  --region "$REGION" \
  --query 'gateway.gatewayResourceUrl' \
  --output text 2>&1)

echo "✅ Gateway URL: $GATEWAY_URL"
echo ""

# Step 4: Create Gateway Target (Lambda)
echo "📝 Step 3: Creating Gateway Target..."

# MCP Schema
cat > /tmp/mcp-schema.json <<'EOF'
[
  {
    "name": "get_document",
    "description": "DynamoDB에서 문서 정보를 조회합니다",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {"type": "string", "description": "조회할 문서의 ID"}
      },
      "required": ["documentId"]
    }
  },
  {
    "name": "list_documents",
    "description": "DynamoDB에서 모든 문서 목록을 조회합니다",
    "inputSchema": {
      "type": "object",
      "properties": {
        "limit": {"type": "number", "description": "조회할 문서 수"}
      }
    }
  },
  {
    "name": "update_review",
    "description": "문서의 검토 정보를 업데이트합니다",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {"type": "string"},
        "reviewer": {"type": "string"},
        "architectureOverview": {"type": "string"},
        "reviewDate": {"type": "string"},
        "reviewCompleted": {"type": "boolean"}
      },
      "required": ["documentId"]
    }
  },
  {
    "name": "save_review_to_s3",
    "description": "검토 결과를 S3에 저장합니다",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {"type": "string"},
        "reviewContent": {"type": "string"},
        "filename": {"type": "string"}
      },
      "required": ["documentId", "reviewContent"]
    }
  }
]
EOF

TARGET_ID=$(aws bedrock-agentcore-control create-gateway-target \
  --gateway-identifier "$GATEWAY_ID" \
  --target-name "architecture-review-tools" \
  --target-type LAMBDA \
  --target-configuration '{
    "lambda": {
      "lambdaArn": "'"$LAMBDA_ARN"'",
      "inlineSchema": '"$(cat /tmp/mcp-schema.json | jq -c .)"'
    }
  }' \
  --region "$REGION" \
  --query 'targetId' \
  --output text 2>&1)

if [ $? -eq 0 ]; then
  echo "✅ Target created: $TARGET_ID"
else
  echo "❌ Target creation failed: $TARGET_ID"
  exit 1
fi

echo ""
echo "🎉 AgentCore Gateway setup complete!"
echo ""
echo "📋 Summary:"
echo "  Gateway ID: $GATEWAY_ID"
echo "  Gateway URL: $GATEWAY_URL"
echo "  Target ID: $TARGET_ID"
echo ""
echo "🔗 Next steps:"
echo "  1. Copy Gateway URL: $GATEWAY_URL"
echo "  2. Go to QuickSight Console → Integrations → Actions"
echo "  3. Add MCP integration with this URL"
echo ""
