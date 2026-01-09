#!/bin/bash

# 환경 변수 자동 업데이트 스크립트
# CDK 배포와 AgentCore Gateway 설정 결과를 환경 변수 파일에 반영합니다.

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

# 프로젝트 루트로 이동
cd "$(dirname "$0")/../../.."

log_info "Starting environment variables update..."

# ============================================
# CDK 배포 출력 정보 가져오기
# ============================================
log_info "Fetching CDK deployment outputs..."

if [ -z "$AWS_REGION" ]; then
    export AWS_REGION="us-east-1"
fi

# CDK 출력 가져오기
CDK_OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name ArchitectureReviewStack \
  --query 'Stacks[0].Outputs' \
  --region $AWS_REGION 2>/dev/null)

if [ $? -ne 0 ]; then
    log_error "Failed to fetch CDK outputs. Please ensure the stack is deployed."
    exit 1
fi

# 출력 값 추출
API_ENDPOINT=$(echo $CDK_OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue')
BUCKET_NAME=$(echo $CDK_OUTPUTS | jq -r '.[] | select(.OutputKey=="FilesBucketName") | .OutputValue')
TABLE_NAME=$(echo $CDK_OUTPUTS | jq -r '.[] | select(.OutputKey=="DocumentsTableName") | .OutputValue')
MCP_ENDPOINT=$(echo $CDK_OUTPUTS | jq -r '.[] | select(.OutputKey=="McpServerEndpoint") | .OutputValue')

log_info "CDK Outputs:"
log_info "  API Endpoint: $API_ENDPOINT"
log_info "  Bucket Name: $BUCKET_NAME"
log_info "  Table Name: $TABLE_NAME"
log_info "  MCP Endpoint: $MCP_ENDPOINT"

# AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ============================================
# AgentCore Gateway 설정 정보 가져오기
# ============================================
AGENTCORE_OUTPUT_FILE="packages/infrastructure/agentcore-setup-output.txt"

if [ -f "$AGENTCORE_OUTPUT_FILE" ]; then
    log_info "Loading AgentCore Gateway setup information..."
    
    USER_POOL_ID=$(grep "USER_POOL_ID=" $AGENTCORE_OUTPUT_FILE | tail -1 | cut -d'=' -f2)
    WEB_CLIENT_ID=$(grep "WEB_CLIENT_ID=" $AGENTCORE_OUTPUT_FILE | tail -1 | cut -d'=' -f2)
    GATEWAY_URL=$(grep "GATEWAY_URL=" $AGENTCORE_OUTPUT_FILE | tail -1 | cut -d'=' -f2)
    
    log_info "AgentCore Outputs:"
    log_info "  User Pool ID: $USER_POOL_ID"
    log_info "  Web Client ID: $WEB_CLIENT_ID"
    log_info "  Gateway URL: $GATEWAY_URL"
else
    log_warning "AgentCore setup output file not found: $AGENTCORE_OUTPUT_FILE"
    log_warning "Cognito and Gateway information will not be updated."
    USER_POOL_ID="YOUR_USER_POOL_ID"
    WEB_CLIENT_ID="YOUR_WEB_CLIENT_ID"
    GATEWAY_URL="YOUR_GATEWAY_URL"
fi

# ============================================
# 프론트엔드 환경 변수 업데이트
# ============================================
log_info "Updating frontend environment variables..."

FRONTEND_ENV="packages/frontend/.env"

if [ ! -f "$FRONTEND_ENV" ]; then
    log_error "Frontend .env file not found: $FRONTEND_ENV"
    exit 1
fi

# 백업 생성
cp $FRONTEND_ENV "${FRONTEND_ENV}.backup"

# 환경 변수 업데이트
sed -i.tmp "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=${API_ENDPOINT}|g" $FRONTEND_ENV
sed -i.tmp "s|VITE_AWS_REGION=.*|VITE_AWS_REGION=${AWS_REGION}|g" $FRONTEND_ENV
sed -i.tmp "s|VITE_USER_POOL_ID=.*|VITE_USER_POOL_ID=${USER_POOL_ID}|g" $FRONTEND_ENV
sed -i.tmp "s|VITE_USER_POOL_WEB_CLIENT_ID=.*|VITE_USER_POOL_WEB_CLIENT_ID=${WEB_CLIENT_ID}|g" $FRONTEND_ENV
rm -f "${FRONTEND_ENV}.tmp"

log_info "Frontend .env updated"

# ============================================
# 백엔드 환경 변수 업데이트
# ============================================
log_info "Updating backend environment variables..."

BACKEND_ENV="packages/backend/.env"

if [ ! -f "$BACKEND_ENV" ]; then
    log_error "Backend .env file not found: $BACKEND_ENV"
    exit 1
fi

# 백업 생성
cp $BACKEND_ENV "${BACKEND_ENV}.backup"

# 환경 변수 업데이트
sed -i.tmp "s|AWS_REGION=.*|AWS_REGION=${AWS_REGION}|g" $BACKEND_ENV
sed -i.tmp "s|AWS_ACCOUNT_ID=.*|AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}|g" $BACKEND_ENV
sed -i.tmp "s|QUICKSIGHT_ACCOUNT_ID=.*|QUICKSIGHT_ACCOUNT_ID=${AWS_ACCOUNT_ID}|g" $BACKEND_ENV
sed -i.tmp "s|BUCKET_NAME=.*|BUCKET_NAME=${BUCKET_NAME}|g" $BACKEND_ENV
rm -f "${BACKEND_ENV}.tmp"

log_info "Backend .env updated"

# ============================================
# MCP 서버 환경 변수 업데이트
# ============================================
log_info "Updating MCP server environment variables..."

MCP_ENV="packages/mcp-server/.env"

if [ ! -f "$MCP_ENV" ]; then
    log_error "MCP server .env file not found: $MCP_ENV"
    exit 1
fi

# 백업 생성
cp $MCP_ENV "${MCP_ENV}.backup"

# 환경 변수 업데이트
sed -i.tmp "s|AWS_REGION=.*|AWS_REGION=${AWS_REGION}|g" $MCP_ENV
sed -i.tmp "s|AWS_ACCOUNT_ID=.*|AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}|g" $MCP_ENV
sed -i.tmp "s|TABLE_NAME=.*|TABLE_NAME=${TABLE_NAME}|g" $MCP_ENV
sed -i.tmp "s|BUCKET_NAME=.*|BUCKET_NAME=${BUCKET_NAME}|g" $MCP_ENV
rm -f "${MCP_ENV}.tmp"

log_info "MCP server .env updated"

# ============================================
# 완료 및 요약
# ============================================
echo ""
echo "================================"
log_info "Environment variables updated successfully!"
echo "================================"
echo ""
echo "업데이트된 파일:"
echo "  - $FRONTEND_ENV"
echo "  - $BACKEND_ENV"
echo "  - $MCP_ENV"
echo ""
echo "백업 파일:"
echo "  - ${FRONTEND_ENV}.backup"
echo "  - ${BACKEND_ENV}.backup"
echo "  - ${MCP_ENV}.backup"
echo ""

if [ "$USER_POOL_ID" = "YOUR_USER_POOL_ID" ]; then
    log_warning "Cognito 정보가 업데이트되지 않았습니다."
    log_info "AgentCore Gateway 설정 후 다시 실행하거나 수동으로 업데이트하세요:"
    echo "  - VITE_USER_POOL_ID"
    echo "  - VITE_USER_POOL_WEB_CLIENT_ID"
    echo ""
fi

log_info "다음 단계:"
echo "  1. QuickSuite 설정 (배포 가이드 5단계)"
echo "  2. 백엔드 .env에 QuickSuite 정보 추가"
echo "  3. QuickSuite에 MCP 연결 (배포 가이드 6단계)"
echo ""
