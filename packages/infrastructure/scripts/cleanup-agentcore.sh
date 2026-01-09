#!/bin/bash

# AgentCore Gateway 리소스 삭제 스크립트
# setup-agentcore.sh로 생성된 모든 리소스를 삭제합니다.

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
    log_error "Cannot proceed with cleanup without setup information."
    exit 1
fi

log_info "Loading setup information from $OUTPUT_FILE..."

# 설정 정보 로드
USER_POOL_ID=$(grep "USER_POOL_ID=" $OUTPUT_FILE | tail -1 | cut -d'=' -f2)
COGNITO_DOMAIN=$(grep "COGNITO_DOMAIN=" $OUTPUT_FILE | tail -1 | cut -d'=' -f2)
GATEWAY_ID=$(grep "GATEWAY_ID=" $OUTPUT_FILE | tail -1 | cut -d'=' -f2)
TARGET_ID=$(grep "TARGET_ID=" $OUTPUT_FILE | tail -1 | cut -d'=' -f2)
GATEWAY_ROLE_NAME=$(grep "GATEWAY_ROLE_NAME=" $OUTPUT_FILE | tail -1 | cut -d'=' -f2)

log_info "Resources to delete:"
echo "  - User Pool: $USER_POOL_ID"
echo "  - Domain: $COGNITO_DOMAIN"
echo "  - Gateway: $GATEWAY_ID"
echo "  - Target: $TARGET_ID"
echo "  - IAM Role: $GATEWAY_ROLE_NAME"
echo ""

read -p "Are you sure you want to delete all these resources? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Cleanup cancelled."
    exit 0
fi

log_info "Starting cleanup..."

# ============================================
# 1. Gateway Target 삭제
# ============================================
if [ -n "$TARGET_ID" ] && [ -n "$GATEWAY_ID" ]; then
    log_info "Step 1: Deleting Gateway Target..."
    aws bedrock-agentcore-control delete-gateway-target \
      --gateway-identifier "$GATEWAY_ID" \
      --target-id "$TARGET_ID" \
      --region $AWS_REGION 2>/dev/null && log_info "Target deleted: $TARGET_ID" || log_warning "Failed to delete target or already deleted"
    
    # Target 삭제 대기
    sleep 5
else
    log_warning "Target ID or Gateway ID not found, skipping target deletion"
fi

# ============================================
# 2. Gateway 삭제
# ============================================
if [ -n "$GATEWAY_ID" ]; then
    log_info "Step 2: Deleting Gateway..."
    aws bedrock-agentcore-control delete-gateway \
      --gateway-identifier "$GATEWAY_ID" \
      --region $AWS_REGION 2>/dev/null && log_info "Gateway deleted: $GATEWAY_ID" || log_warning "Failed to delete gateway or already deleted"
    
    # Gateway 삭제 대기
    sleep 5
else
    log_warning "Gateway ID not found, skipping gateway deletion"
fi

# ============================================
# 3. IAM Role 삭제
# ============================================
if [ -n "$GATEWAY_ROLE_NAME" ]; then
    log_info "Step 3: Deleting IAM Role..."
    
    # 인라인 정책 삭제
    aws iam delete-role-policy \
      --role-name "$GATEWAY_ROLE_NAME" \
      --policy-name "LambdaInvokePolicy" \
      --region $AWS_REGION 2>/dev/null && log_info "Role policy deleted" || log_warning "Failed to delete role policy or already deleted"
    
    # Role 삭제
    aws iam delete-role \
      --role-name "$GATEWAY_ROLE_NAME" \
      --region $AWS_REGION 2>/dev/null && log_info "Role deleted: $GATEWAY_ROLE_NAME" || log_warning "Failed to delete role or already deleted"
else
    log_warning "Gateway Role name not found, skipping role deletion"
fi

# ============================================
# 4. Cognito App Client 삭제
# ============================================
if [ -n "$USER_POOL_ID" ]; then
    log_info "Step 4: Deleting Cognito App Client..."
    
    # App Client ID 가져오기
    CLIENT_ID=$(grep "CLIENT_ID=" $OUTPUT_FILE | tail -1 | cut -d'=' -f2)
    
    if [ -n "$CLIENT_ID" ]; then
        aws cognito-idp delete-user-pool-client \
          --user-pool-id "$USER_POOL_ID" \
          --client-id "$CLIENT_ID" \
          --region $AWS_REGION 2>/dev/null && log_info "App Client deleted" || log_warning "Failed to delete app client or already deleted"
    fi
else
    log_warning "User Pool ID not found, skipping app client deletion"
fi

# ============================================
# 5. Cognito Resource Server 삭제
# ============================================
if [ -n "$USER_POOL_ID" ]; then
    log_info "Step 5: Deleting Cognito Resource Server..."
    aws cognito-idp delete-resource-server \
      --user-pool-id "$USER_POOL_ID" \
      --identifier "architecture-review" \
      --region $AWS_REGION 2>/dev/null && log_info "Resource Server deleted" || log_warning "Failed to delete resource server or already deleted"
else
    log_warning "User Pool ID not found, skipping resource server deletion"
fi

# ============================================
# 6. Cognito Domain 삭제
# ============================================
if [ -n "$USER_POOL_ID" ] && [ -n "$COGNITO_DOMAIN" ]; then
    log_info "Step 6: Deleting Cognito Domain..."
    aws cognito-idp delete-user-pool-domain \
      --domain "$COGNITO_DOMAIN" \
      --user-pool-id "$USER_POOL_ID" \
      --region $AWS_REGION 2>/dev/null && log_info "Domain deleted: $COGNITO_DOMAIN" || log_warning "Failed to delete domain or already deleted"
    
    # Domain 삭제 대기
    sleep 5
else
    log_warning "User Pool ID or Domain not found, skipping domain deletion"
fi

# ============================================
# 7. Cognito User Pool 삭제
# ============================================
if [ -n "$USER_POOL_ID" ]; then
    log_info "Step 7: Deleting Cognito User Pool..."
    aws cognito-idp delete-user-pool \
      --user-pool-id "$USER_POOL_ID" \
      --region $AWS_REGION 2>/dev/null && log_info "User Pool deleted: $USER_POOL_ID" || log_warning "Failed to delete user pool or already deleted"
else
    log_warning "User Pool ID not found, skipping user pool deletion"
fi

# ============================================
# 8. 출력 파일 삭제
# ============================================
log_info "Step 8: Cleaning up output files..."
rm -f agentcore-setup-output.txt target-config.json credential-providers.json
log_info "Output files deleted"

# ============================================
# 완료
# ============================================
echo ""
echo "================================"
log_info "Cleanup completed!"
echo "================================"
echo ""
log_info "All AgentCore Gateway resources have been deleted."
echo ""
