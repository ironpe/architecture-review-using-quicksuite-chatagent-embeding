#!/bin/bash

# AgentCore Gateway 자동 설정 스크립트
# 이 스크립트는 Cognito User Pool, AgentCore Gateway, Lambda Target을 생성합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 환경 변수 확인
if [ -z "$AWS_REGION" ]; then
    export AWS_REGION="us-east-1"
    log_warning "AWS_REGION not set, using default: us-east-1"
fi

if [ -z "$AWS_ACCOUNT_ID" ]; then
    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "AWS Account ID: $AWS_ACCOUNT_ID"
fi

# MCP Lambda ARN 확인
MCP_LAMBDA_ARN=$(aws lambda list-functions --query "Functions[?contains(FunctionName, 'McpServerHandler')].FunctionArn" --output text --region $AWS_REGION)
if [ -z "$MCP_LAMBDA_ARN" ]; then
    log_error "MCP Lambda function not found. Please deploy the infrastructure first."
    exit 1
fi
log_info "MCP Lambda ARN: $MCP_LAMBDA_ARN"

# 출력 파일
OUTPUT_FILE="agentcore-setup-output.txt"
echo "AgentCore Gateway Setup Output" > $OUTPUT_FILE
echo "Generated at: $(date)" >> $OUTPUT_FILE
echo "================================" >> $OUTPUT_FILE

log_info "Starting AgentCore Gateway setup..."

# ============================================
# 1단계: Cognito User Pool 생성
# ============================================
log_info "Step 1: Creating Cognito User Pool..."

USER_POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name "agentcore-gateway-pool" \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --region $AWS_REGION \
  --query 'UserPool.Id' \
  --output text)

log_info "User Pool created: $USER_POOL_ID"
echo "USER_POOL_ID=$USER_POOL_ID" >> $OUTPUT_FILE

USER_POOL_ARN="arn:aws:cognito-idp:${AWS_REGION}:${AWS_ACCOUNT_ID}:userpool/${USER_POOL_ID}"
echo "USER_POOL_ARN=$USER_POOL_ARN" >> $OUTPUT_FILE

# User Pool Domain 생성
DOMAIN_NAME="arch-review-$(date +%s)"
aws cognito-idp create-user-pool-domain \
  --domain "$DOMAIN_NAME" \
  --user-pool-id $USER_POOL_ID \
  --region $AWS_REGION > /dev/null

log_info "User Pool Domain created: $DOMAIN_NAME"
echo "COGNITO_DOMAIN=$DOMAIN_NAME" >> $OUTPUT_FILE

TOKEN_URL="https://${DOMAIN_NAME}.auth.${AWS_REGION}.amazoncognito.com/oauth2/token"
echo "TOKEN_URL=$TOKEN_URL" >> $OUTPUT_FILE

# Resource Server 생성
aws cognito-idp create-resource-server \
  --user-pool-id $USER_POOL_ID \
  --identifier "architecture-review" \
  --name "Architecture Review API" \
  --scopes \
    ScopeName=read,ScopeDescription="Read access" \
    ScopeName=write,ScopeDescription="Write access" \
  --region $AWS_REGION > /dev/null

log_info "Resource Server created with scopes: read, write"

# App Client 생성 (M2M - QuickSuite용)
M2M_CLIENT_OUTPUT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-name "agentcore-m2m-client" \
  --generate-secret \
  --allowed-o-auth-flows client_credentials \
  --allowed-o-auth-scopes "architecture-review/read" "architecture-review/write" \
  --allowed-o-auth-flows-user-pool-client \
  --region $AWS_REGION)

M2M_CLIENT_ID=$(echo $M2M_CLIENT_OUTPUT | jq -r '.UserPoolClient.ClientId')
M2M_CLIENT_SECRET=$(echo $M2M_CLIENT_OUTPUT | jq -r '.UserPoolClient.ClientSecret')

log_info "M2M App Client created: $M2M_CLIENT_ID"
echo "M2M_CLIENT_ID=$M2M_CLIENT_ID" >> $OUTPUT_FILE
echo "M2M_CLIENT_SECRET=$M2M_CLIENT_SECRET" >> $OUTPUT_FILE

# App Client 생성 (Public - 프론트엔드용, Secret 없음)
WEB_CLIENT_OUTPUT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-name "agentcore-web-client" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_PASSWORD_AUTH \
  --region $AWS_REGION)

WEB_CLIENT_ID=$(echo $WEB_CLIENT_OUTPUT | jq -r '.UserPoolClient.ClientId')

log_info "Web App Client created: $WEB_CLIENT_ID"
echo "WEB_CLIENT_ID=$WEB_CLIENT_ID" >> $OUTPUT_FILE

# Gateway에는 M2M Client 사용
CLIENT_ID=$M2M_CLIENT_ID
CLIENT_SECRET=$M2M_CLIENT_SECRET

# ============================================
# 2단계: Gateway IAM Role 생성
# ============================================
log_info "Step 2: Creating Gateway IAM Role..."

# Trust policy for Gateway
TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock-agentcore.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Gateway Role 생성
GATEWAY_ROLE_NAME="AgentCoreGatewayRole-$(date +%s)"
GATEWAY_ROLE_ARN=$(aws iam create-role \
  --role-name "$GATEWAY_ROLE_NAME" \
  --assume-role-policy-document "$TRUST_POLICY" \
  --description "Role for AgentCore Gateway to invoke Lambda" \
  --query 'Role.Arn' \
  --output text)

log_info "Gateway Role created: $GATEWAY_ROLE_ARN"
echo "GATEWAY_ROLE_ARN=$GATEWAY_ROLE_ARN" >> $OUTPUT_FILE
echo "GATEWAY_ROLE_NAME=$GATEWAY_ROLE_NAME" >> $OUTPUT_FILE

# Lambda 호출 권한 추가
aws iam put-role-policy \
  --role-name "$GATEWAY_ROLE_NAME" \
  --policy-name LambdaInvokePolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "lambda:InvokeFunction",
        "Resource": "'$MCP_LAMBDA_ARN'"
      }
    ]
  }'

log_info "Lambda invoke permissions added to Gateway role"

# Role이 전파될 때까지 대기
log_info "Waiting for IAM role to propagate..."
sleep 10

# ============================================
# 3단계: AgentCore Gateway 생성
# ============================================
log_info "Step 3: Creating AgentCore Gateway..."

# Cognito OIDC Discovery URL (올바른 형식)
DISCOVERY_URL="https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/openid-configuration"

GATEWAY_OUTPUT=$(aws bedrock-agentcore-control create-gateway \
  --name "architecture-review-gateway" \
  --role-arn "$GATEWAY_ROLE_ARN" \
  --protocol-type MCP \
  --authorizer-type CUSTOM_JWT \
  --authorizer-configuration customJWTAuthorizer="{discoveryUrl=$DISCOVERY_URL,allowedClients=[$CLIENT_ID]}" \
  --region $AWS_REGION 2>&1)

if [ $? -eq 0 ]; then
    GATEWAY_ID=$(echo $GATEWAY_OUTPUT | jq -r '.gatewayId')
    GATEWAY_URL=$(echo $GATEWAY_OUTPUT | jq -r '.gatewayUrl')
    log_info "Gateway created: $GATEWAY_ID"
    echo "GATEWAY_ID=$GATEWAY_ID" >> $OUTPUT_FILE
    echo "GATEWAY_URL=$GATEWAY_URL" >> $OUTPUT_FILE
    log_info "Gateway URL: $GATEWAY_URL"
    
    # Gateway가 READY 상태가 될 때까지 대기
    log_info "Waiting for Gateway to be ready..."
    for i in {1..12}; do
        GATEWAY_STATUS=$(aws bedrock-agentcore-control get-gateway --gateway-identifier "$GATEWAY_ID" --region $AWS_REGION --query 'status' --output text 2>/dev/null)
        if [ "$GATEWAY_STATUS" = "READY" ]; then
            log_info "Gateway is ready"
            break
        elif [ "$GATEWAY_STATUS" = "FAILED" ]; then
            log_error "Gateway creation failed"
            aws bedrock-agentcore-control get-gateway --gateway-identifier "$GATEWAY_ID" --region $AWS_REGION --query 'statusReasons' --output text
            exit 1
        fi
        sleep 5
    done
else
    log_error "Failed to create Gateway via CLI."
    log_error "Error: $GATEWAY_OUTPUT"
    log_warning "Please create Gateway manually in AWS Console."
    log_info "Gateway 설정 정보:"
    echo "  - Name: architecture-review-gateway"
    echo "  - Role ARN: $GATEWAY_ROLE_ARN"
    echo "  - Protocol: Model Context Protocol (MCP)"
    echo "  - Authorization: Custom JWT"
    echo "  - Discovery URL: $DISCOVERY_URL"
    echo "  - Client ID: $CLIENT_ID"
    echo ""
    read -p "Gateway를 생성한 후 Gateway ID를 입력하세요: " GATEWAY_ID
    echo "GATEWAY_ID=$GATEWAY_ID" >> $OUTPUT_FILE
    
    GATEWAY_URL="https://${GATEWAY_ID}.gateway.bedrock-agentcore.${AWS_REGION}.amazonaws.com"
    echo "GATEWAY_URL=$GATEWAY_URL" >> $OUTPUT_FILE
    log_info "Gateway URL: $GATEWAY_URL"
fi

# ============================================
# 4단계: Lambda Target 추가
# ============================================
log_info "Step 4: Adding Lambda Target..."

# Target configuration JSON 파일 생성
cat > target-config.json << EOF
{
  "mcp": {
    "lambda": {
      "lambdaArn": "$MCP_LAMBDA_ARN",
      "toolSchema": {
        "inlinePayload": [
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
                "limit": {"type": "number", "description": "조회할 문서 수 (기본값: 20)"}
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
                "reviewer": {"type": "string", "description": "검토자 이름"},
                "architectureOverview": {"type": "string", "description": "아키텍처 개요"},
                "reviewDate": {"type": "string", "description": "검토 일자 (YYYY-MM-DD)"},
                "reviewCompleted": {"type": "boolean", "description": "검토 완료 여부"}
              },
              "required": ["documentId"]
            }
          },
          {
            "name": "save_review_to_s3",
            "description": "검토 결과를 마크다운 파일로 S3에 저장합니다",
            "inputSchema": {
              "type": "object",
              "properties": {
                "documentId": {"type": "string", "description": "문서 ID"},
                "reviewContent": {"type": "string", "description": "검토 내용 (마크다운 형식)"},
                "filename": {"type": "string", "description": "저장할 파일명 (기본값: review.md)"}
              },
              "required": ["documentId", "reviewContent"]
            }
          },
          {
            "name": "get_review",
            "description": "S3에서 저장된 검토 결과를 조회합니다",
            "inputSchema": {
              "type": "object",
              "properties": {
                "documentId": {"type": "string", "description": "문서 ID"}
              },
              "required": ["documentId"]
            }
          }
        ]
      }
    }
  }
}
EOF

# Credential provider configuration 파일 생성
cat > credential-providers.json << 'EOF'
[
  {
    "credentialProviderType": "GATEWAY_IAM_ROLE"
  }
]
EOF

TARGET_OUTPUT=$(aws bedrock-agentcore-control create-gateway-target \
  --gateway-identifier "$GATEWAY_ID" \
  --name "architecture-review-tools" \
  --target-configuration file://target-config.json \
  --credential-provider-configurations file://credential-providers.json \
  --region $AWS_REGION 2>&1)

if [ $? -eq 0 ]; then
    TARGET_ID=$(echo $TARGET_OUTPUT | jq -r '.targetId')
    log_info "Lambda Target created: $TARGET_ID"
    echo "TARGET_ID=$TARGET_ID" >> $OUTPUT_FILE
    
    # 임시 파일 삭제
    rm -f target-config.json credential-providers.json
else
    log_error "Failed to create Lambda Target via CLI."
    log_error "Error: $TARGET_OUTPUT"
    log_warning "Please add Lambda Target manually in AWS Console."
    log_info "Target 설정 정보:"
    echo "  - Gateway ID: $GATEWAY_ID"
    echo "  - Target name: architecture-review-tools"
    echo "  - Target type: AWS Lambda"
    echo "  - Lambda ARN: $MCP_LAMBDA_ARN"
    echo "  - Credential Provider: GATEWAY_IAM_ROLE"
    echo ""
    echo "MCP Tools Schema는 target-config.json 파일을 참고하세요."
    echo ""
    read -p "Lambda Target 추가를 완료했으면 Enter를 누르세요..."
    
    # 임시 파일 삭제
    rm -f target-config.json credential-providers.json
fi

# ============================================
# 완료 및 요약
# ============================================
echo ""
echo "================================"
log_info "AgentCore Gateway setup completed!"
echo "================================"
echo ""
echo "설정 정보가 저장되었습니다: $OUTPUT_FILE"
echo ""
echo "다음 정보를 환경 변수 파일에 업데이트하세요:"
echo ""
echo "프론트엔드 (.env):"
echo "  VITE_USER_POOL_ID=$USER_POOL_ID"
echo "  VITE_USER_POOL_WEB_CLIENT_ID=$WEB_CLIENT_ID"
echo ""
echo "백엔드 (.env):"
echo "  # QuickSuite 설정 후 추가"
echo ""
echo "QuickSuite MCP 연결 정보 (M2M Client):"
echo "  - Gateway URL: $GATEWAY_URL"
echo "  - Client ID: $M2M_CLIENT_ID"
echo "  - Client Secret: $M2M_CLIENT_SECRET"
echo "  - Token URL: $TOKEN_URL"
echo ""
echo "다음 단계:"
echo "  1. 환경 변수 자동 업데이트: ./scripts/update-env.sh"
echo "  2. Cognito 사용자 생성 (배포 가이드 4단계)"
echo "  3. QuickSuite 설정 (배포 가이드 5단계)"
echo "  4. QuickSuite에 MCP 연결 (배포 가이드 6단계)"
echo ""
