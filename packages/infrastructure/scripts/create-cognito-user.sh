#!/bin/bash

# Cognito 사용자 생성 스크립트
# AgentCore Gateway 설정 후 생성된 Cognito User Pool에 사용자를 추가합니다.

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

# 출력 파일 확인
OUTPUT_FILE="agentcore-setup-output.txt"

if [ ! -f "$OUTPUT_FILE" ]; then
    log_error "Setup output file not found: $OUTPUT_FILE"
    log_error "Please run ./scripts/setup-agentcore.sh first."
    exit 1
fi

# User Pool ID 로드
USER_POOL_ID=$(grep "USER_POOL_ID=" $OUTPUT_FILE | tail -1 | cut -d'=' -f2)

if [ -z "$USER_POOL_ID" ]; then
    log_error "User Pool ID not found in $OUTPUT_FILE"
    exit 1
fi

log_info "User Pool ID: $USER_POOL_ID"
echo ""

# ============================================
# 사용자 정보 입력
# ============================================
echo "================================"
echo "Cognito 사용자 생성"
echo "================================"
echo ""
echo "이 User Pool은 이메일을 사용자 이름으로 사용합니다."
echo ""

# 이메일 입력
read -p "이메일 주소 (로그인 시 사용): " EMAIL
if [ -z "$EMAIL" ]; then
    log_error "Email is required"
    exit 1
fi

# 이메일 형식 검증
if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    log_error "Invalid email format"
    exit 1
fi

# 비밀번호 입력 (보이지 않게)
echo ""
echo "비밀번호 요구사항:"
echo "  - 최소 8자 이상"
echo "  - 대문자 포함"
echo "  - 소문자 포함"
echo "  - 숫자 포함"
echo ""
read -s -p "비밀번호 (password): " PASSWORD
echo ""
read -s -p "비밀번호 확인 (confirm): " PASSWORD_CONFIRM
echo ""

if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
    log_error "Passwords do not match"
    exit 1
fi

if [ ${#PASSWORD} -lt 8 ]; then
    log_error "Password must be at least 8 characters long"
    exit 1
fi

# 비밀번호 복잡도 검증
if [[ ! "$PASSWORD" =~ [A-Z] ]] || [[ ! "$PASSWORD" =~ [a-z] ]] || [[ ! "$PASSWORD" =~ [0-9] ]]; then
    log_error "Password must contain uppercase, lowercase, and numbers"
    exit 1
fi

echo ""
log_info "Creating Cognito user..."

# ============================================
# 사용자 생성
# ============================================

CREATE_OUTPUT=$(aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
  --message-action SUPPRESS \
  --region $AWS_REGION 2>&1)

if [ $? -ne 0 ]; then
    log_error "Failed to create user"
    log_error "$CREATE_OUTPUT"
    exit 1
fi

log_info "User created: $EMAIL"

# 비밀번호 영구 설정
SET_PASSWORD_OUTPUT=$(aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --password "$PASSWORD" \
  --permanent \
  --region $AWS_REGION 2>&1)

if [ $? -ne 0 ]; then
    log_error "Failed to set password"
    log_error "$SET_PASSWORD_OUTPUT"
    exit 1
fi

log_info "Password set successfully"

# ============================================
# 완료
# ============================================
echo ""
echo "================================"
log_info "Cognito user created successfully!"
echo "================================"
echo ""
echo "로그인 정보:"
echo "  - Email: $EMAIL"
echo "  - Password: (입력한 비밀번호)"
echo ""
echo "프론트엔드 로그인 페이지에서 위 정보로 로그인하세요."
echo ""
echo "다음 단계:"
echo "  1. QuickSuite 설정 (배포 가이드 5단계)"
echo "  2. QuickSuite에 MCP 연결 (배포 가이드 6단계)"
echo "  3. 프론트엔드 실행 (배포 가이드 8단계)"
echo ""
