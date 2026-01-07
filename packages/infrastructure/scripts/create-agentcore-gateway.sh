#!/bin/bash

# Architecture Review AgentCore Gateway 생성 스크립트

set -e

REGION="us-east-1"
GATEWAY_NAME="architecture-review-gateway"
LAMBDA_ARN="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:YOUR_MCP_LAMBDA_FUNCTION_NAME"

echo "Creating AgentCore Gateway..."

# MCP Schema
SCHEMA='[
  {
    "name": "get_document",
    "description": "DynamoDB에서 문서 정보를 조회합니다",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string",
          "description": "조회할 문서의 ID"
        }
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
        "limit": {
          "type": "number",
          "description": "조회할 문서 수"
        }
      }
    }
  },
  {
    "name": "update_review",
    "description": "문서의 검토 정보를 업데이트합니다",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {"type": "string", "description": "문서 ID"},
        "reviewer": {"type": "string", "description": "검토자"},
        "architectureOverview": {"type": "string", "description": "아키텍처 개요"},
        "reviewDate": {"type": "string", "description": "검토 일자"},
        "reviewCompleted": {"type": "boolean", "description": "완료 여부"}
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
        "documentId": {"type": "string", "description": "문서 ID"},
        "reviewContent": {"type": "string", "description": "검토 내용"},
        "filename": {"type": "string", "description": "파일명"}
      },
      "required": ["documentId", "reviewContent"]
    }
  }
]'

# Create Gateway with Lambda target
aws bedrock-agent create-gateway \
  --gateway-name "$GATEWAY_NAME" \
  --inbound-flow-config '{
    "identityProviderConfig": {
      "noAuthConfig": {}
    }
  }' \
  --targets "[
    {
      \"targetName\": \"architecture-review-tools\",
      \"targetType\": \"LAMBDA\",
      \"lambdaTargetConfig\": {
        \"lambdaArn\": \"$LAMBDA_ARN\",
        \"inlineSchema\": $SCHEMA
      }
    }
  ]" \
  --region "$REGION" \
  2>&1

echo ""
echo "Gateway created successfully!"
echo ""
echo "To get the Gateway URL, run:"
echo "aws bedrock-agent get-gateway --gateway-identifier <gateway-id> --region $REGION"
