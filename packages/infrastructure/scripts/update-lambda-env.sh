#!/bin/bash

# Lambda 환경 변수 업데이트 스크립트
# 백엔드 .env 파일의 QuickSuite 설정을 Lambda 함수에 반영합니다.

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

# 프로젝트 루트로 이동
cd "$(dirname "$0")/../../.."

log_info "Updating Lambda environment variables from backend .env..."

# 백엔드 .env 파일 확인
BACKEND_ENV="packages/backend/.env"

if [ ! -f "$BACKEND_ENV" ]; then
    log_error "Backend .env file not found: $BACKEND_ENV"
    exit 1
fi

# .env 파일에서 QuickSuite 설정 로드
source $BACKEND_ENV

# 필수 변수 확인
if [ -z "$QUICKSIGHT_AGENT_ARN" ]; then
    log_error "QUICKSIGHT_AGENT_ARN not found in $BACKEND_ENV"
    log_error "Please update backend .env file with QuickSuite information first."
    exit 1
fi

log_info "QuickSuite Configuration:"
log_info "  Account ID: $QUICKSIGHT_ACCOUNT_ID"
log_info "  Agent ARN: $QUICKSIGHT_AGENT_ARN"
log_info "  Namespace: $QUICKSIGHT_NAMESPACE"
log_info "  User Name: $QUICKSIGHT_USER_NAME"

# ============================================
# QuickSight Embed Handler Lambda 업데이트
# ============================================
log_info "Finding QuickSight Embed Handler Lambda..."

QUICKSIGHT_LAMBDA=$(aws lambda list-functions \
  --query "Functions[?contains(FunctionName, 'QuickSightEmbedHandler')].FunctionName" \
  --output text \
  --region $AWS_REGION)

if [ -z "$QUICKSIGHT_LAMBDA" ]; then
    log_error "QuickSight Embed Handler Lambda not found"
    exit 1
fi

log_info "Lambda Function: $QUICKSIGHT_LAMBDA"

# Lambda 환경 변수 업데이트
log_info "Updating Lambda environment variables..."

aws lambda update-function-configuration \
  --function-name "$QUICKSIGHT_LAMBDA" \
  --environment "Variables={
    QUICKSIGHT_ACCOUNT_ID=$QUICKSIGHT_ACCOUNT_ID,
    QUICKSIGHT_AGENT_ARN=$QUICKSIGHT_AGENT_ARN,
    QUICKSIGHT_NAMESPACE=$QUICKSIGHT_NAMESPACE,
    QUICKSIGHT_USER_NAME=$QUICKSIGHT_USER_NAME
  }" \
  --region $AWS_REGION > /dev/null

log_info "Lambda environment variables updated"

# Lambda 업데이트 완료 대기
log_info "Waiting for Lambda to be ready..."
sleep 5

# 업데이트 확인
UPDATED_ENV=$(aws lambda get-function-configuration \
  --function-name "$QUICKSIGHT_LAMBDA" \
  --region $AWS_REGION \
  --query 'Environment.Variables')

echo ""
echo "================================"
log_info "Lambda environment variables updated successfully!"
echo "================================"
echo ""
echo "Updated variables:"
echo "$UPDATED_ENV" | jq .
echo ""
echo "다음 단계:"
echo "  1. 프론트엔드에서 페이지 새로고침"
echo "  2. 로그인 후 채팅 기능 테스트"
echo ""
