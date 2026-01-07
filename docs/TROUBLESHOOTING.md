# 문제 해결 가이드

Architecture Review System 사용 중 발생할 수 있는 일반적인 문제와 해결 방법을 안내합니다.

## 📋 목차

- [설치 문제](#설치-문제)
- [배포 문제](#배포-문제)
- [인증 문제](#인증-문제)
- [API 문제](#api-문제)
- [파일 업로드 문제](#파일-업로드-문제)
- [QuickSight 문제](#quicksight-문제)
- [성능 문제](#성능-문제)

## 설치 문제

### Node.js 버전 불일치

**증상**: `npm install` 실행 시 버전 경고

**해결**:
```bash
# nvm 사용 시
nvm install 18
nvm use 18

# 버전 확인
node --version  # v18.x 이상이어야 함
```

### npm 설치 오류

**증상**: 의존성 설치 실패

**해결**:
```bash
# 캐시 정리
npm cache clean --force

# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# 특정 패키지 문제 시
cd packages/frontend  # 또는 backend, infrastructure
rm -rf node_modules package-lock.json
npm install
```

### AWS CLI 설정 문제

**증상**: `aws` 명령어 실행 시 자격 증명 오류

**해결**:
```bash
# AWS CLI 설치 확인
aws --version

# 자격 증명 설정
aws configure

# 자격 증명 확인
aws sts get-caller-identity

# 프로파일 사용 시
export AWS_PROFILE=your-profile-name
```

## 배포 문제

### CDK 부트스트랩 실패

**증상**: `cdk bootstrap` 실행 시 권한 오류

**해결**:
```bash
# 현재 자격 증명 확인
aws sts get-caller-identity

# 관리자 권한이 있는 자격 증명으로 재시도
aws configure

# 특정 리전에 부트스트랩
cdk bootstrap aws://ACCOUNT_ID/REGION
```

### CDK 배포 실패

**증상**: `cdk deploy` 실행 시 스택 생성 실패

**해결**:
```bash
# 스택 상태 확인
aws cloudformation describe-stacks --region us-east-1

# 실패한 스택 이벤트 확인
aws cloudformation describe-stack-events \
  --stack-name YOUR_STACK_NAME \
  --region us-east-1 \
  --max-items 20

# 스택 삭제 후 재배포
aws cloudformation delete-stack \
  --stack-name YOUR_STACK_NAME \
  --region us-east-1

# 삭제 완료 대기
aws cloudformation wait stack-delete-complete \
  --stack-name YOUR_STACK_NAME \
  --region us-east-1

# 재배포
cdk deploy --all
```

### Lambda 함수 배포 오류

**증상**: Lambda 함수 업데이트 실패

**해결**:
```bash
# 백엔드 재빌드
cd packages/backend
npm run build

# dist 폴더 확인
ls -la dist/

# CDK 재배포
cd ../infrastructure
cdk deploy --all --force
```

## 인증 문제

### 로그인 실패 - "User does not exist"

**증상**: 로그인 시 사용자가 존재하지 않는다는 오류

**해결**:
```bash
# 사용자 목록 확인
aws cognito-idp list-users \
  --user-pool-id YOUR_USER_POOL_ID \
  --region us-east-1

# 사용자 생성
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --user-attributes Name=email,Value=your-email@example.com \
  --region us-east-1

# 비밀번호 설정
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --password "Welcome123!" \
  --permanent \
  --region us-east-1
```

### 로그인 실패 - "Incorrect username or password"

**증상**: 비밀번호가 틀렸다는 오류

**해결**:
```bash
# 사용자 상태 확인
aws cognito-idp admin-get-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --region us-east-1

# 비밀번호 재설정
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --password "NewPassword123!" \
  --permanent \
  --region us-east-1
```

### 토큰 만료 오류

**증상**: API 호출 시 401 Unauthorized

**해결**:
1. 브라우저에서 로그아웃
2. 다시 로그인
3. 문제가 계속되면 브라우저 캐시 삭제

```bash
# 또는 Cognito 토큰 유효 기간 확인
aws cognito-idp describe-user-pool \
  --user-pool-id YOUR_USER_POOL_ID \
  --region us-east-1 \
  --query 'UserPool.UserPoolAddOns'
```

## API 문제

### CORS 오류

**증상**: 브라우저 콘솔에 CORS 에러

**해결**:

1. API Gateway CORS 설정 확인:
```typescript
// packages/infrastructure/lib/architecture-review-stack.ts
api.root.addCorsPreflight({
  allowOrigins: ['http://localhost:5173', 'https://your-domain.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowCredentials: true,
});
```

2. 재배포:
```bash
cd packages/infrastructure
cdk deploy
```

### API Gateway 404 오류

**증상**: API 호출 시 404 Not Found

**해결**:
```bash
# API Gateway 엔드포인트 확인
aws apigateway get-rest-apis --region us-east-1

# 배포 상태 확인
aws apigateway get-deployments \
  --rest-api-id YOUR_API_ID \
  --region us-east-1

# .env 파일의 API URL 확인
cat packages/frontend/.env | grep VITE_API_BASE_URL
```

### Lambda 함수 타임아웃

**증상**: API 응답이 느리거나 타임아웃

**해결**:
```bash
# Lambda 로그 확인
aws logs tail /aws/lambda/YOUR_FUNCTION_NAME --follow --region us-east-1

# Lambda 타임아웃 설정 증가 (CDK)
# packages/infrastructure/lib/architecture-review-stack.ts
const handler = new lambda.Function(this, 'Handler', {
  timeout: cdk.Duration.seconds(30), // 기본 3초에서 증가
});
```

## 파일 업로드 문제

### 업로드 실패 - "Access Denied"

**증상**: S3 업로드 시 권한 오류

**해결**:
```bash
# S3 버킷 정책 확인
aws s3api get-bucket-policy \
  --bucket YOUR_BUCKET_NAME \
  --region us-east-1

# Lambda 실행 역할 확인
aws iam get-role \
  --role-name YOUR_LAMBDA_ROLE_NAME

# S3 버킷 CORS 설정 확인
aws s3api get-bucket-cors \
  --bucket YOUR_BUCKET_NAME \
  --region us-east-1
```

### 업로드 실패 - 파일 크기 제한

**증상**: 큰 파일 업로드 시 실패

**해결**:
- 현재 최대 파일 크기: 50MB
- 더 큰 파일이 필요한 경우:

```typescript
// packages/frontend/src/pages/UploadPage.tsx
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB로 증가

// packages/backend/src/handlers/upload-url.ts
// Pre-signed URL 만료 시간 증가
const uploadUrl = await getSignedUrl(s3Client, command, {
  expiresIn: 3600, // 1시간
});
```

### 업로드 후 문서 목록에 표시 안 됨

**증상**: 업로드는 성공했지만 목록에 없음

**해결**:
```bash
# DynamoDB 테이블 확인
aws dynamodb scan \
  --table-name YOUR_TABLE_NAME \
  --region us-east-1 \
  --max-items 10

# S3 버킷 확인
aws s3 ls s3://YOUR_BUCKET_NAME/ --recursive

# Lambda 로그 확인 (metadata handler)
aws logs tail /aws/lambda/MetadataHandler --follow --region us-east-1
```

## QuickSight 문제

### Chat Widget이 표시되지 않음

**증상**: 채팅 버튼 클릭 시 아무 반응 없음

**해결**:
1. 브라우저 콘솔 확인
2. QuickSight Embed URL 확인:
```bash
# Lambda 로그 확인
aws logs tail /aws/lambda/QuickSightEmbedHandler --follow --region us-east-1
```

3. QuickSight 사용자 권한 확인:
```bash
aws quicksight describe-user \
  --aws-account-id YOUR_ACCOUNT_ID \
  --namespace default \
  --user-name YOUR_USER_NAME \
  --region us-east-1
```

### MCP 도구 연결 실패

**증상**: Chat Agent가 MCP 도구를 사용하지 못함

**해결**:
```bash
# AgentCore Gateway 상태 확인
aws bedrock-agentcore-control get-gateway \
  --gateway-identifier YOUR_GATEWAY_ID \
  --region us-east-1

# Gateway Target 확인
aws bedrock-agentcore-control list-gateway-targets \
  --gateway-identifier YOUR_GATEWAY_ID \
  --region us-east-1

# Cognito OAuth 토큰 테스트
curl -X POST https://YOUR_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=YOUR_SCOPE"
```

### Agent 응답이 느림

**증상**: Chat Agent 응답 시간이 길어짐

**해결**:
- Lambda 함수 메모리 증가
- DynamoDB 읽기 용량 확인
- CloudWatch 로그로 병목 지점 확인

## 성능 문제

### 프론트엔드 로딩 느림

**해결**:
```bash
# 프로덕션 빌드 최적화
cd packages/frontend
npm run build

# 빌드 크기 분석
npm run build -- --mode production

# 불필요한 의존성 제거
npm prune --production
```

### API 응답 느림

**해결**:
```bash
# Lambda 메모리 증가 (CDK)
const handler = new lambda.Function(this, 'Handler', {
  memorySize: 512, // 기본 128MB에서 증가
});

# DynamoDB 읽기/쓰기 용량 확인
aws dynamodb describe-table \
  --table-name YOUR_TABLE_NAME \
  --region us-east-1

# CloudWatch 메트릭 확인
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=YOUR_FUNCTION_NAME \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average \
  --region us-east-1
```

## 로그 확인 방법

### Lambda 로그
```bash
# 실시간 로그 확인
aws logs tail /aws/lambda/YOUR_FUNCTION_NAME --follow --region us-east-1

# 최근 로그 확인
aws logs tail /aws/lambda/YOUR_FUNCTION_NAME --since 1h --region us-east-1

# 에러 로그만 필터링
aws logs filter-log-events \
  --log-group-name /aws/lambda/YOUR_FUNCTION_NAME \
  --filter-pattern "ERROR" \
  --region us-east-1
```

### API Gateway 로그
```bash
# API Gateway 로그 활성화 (CDK)
const logGroup = new logs.LogGroup(this, 'ApiLogs');
const api = new apigateway.RestApi(this, 'Api', {
  deployOptions: {
    accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
    accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
  },
});
```

### 브라우저 콘솔
1. F12 또는 Cmd+Option+I (Mac)
2. Console 탭에서 에러 확인
3. Network 탭에서 API 요청/응답 확인

## 추가 도움

### 로그 수집
문제 보고 시 다음 정보를 포함하세요:
- 에러 메시지 (전체)
- 브라우저 콘솔 로그
- Lambda 함수 로그
- 재현 단계

### GitHub Issues
[GitHub Issues](https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/issues)에 문제를 보고하세요.

### AWS Support
AWS 관련 문제는 [AWS Support](https://console.aws.amazon.com/support/)에 문의하세요.

## 유용한 명령어 모음

```bash
# 전체 시스템 상태 확인
./scripts/health-check.sh

# 로그 수집
./scripts/collect-logs.sh

# 리소스 정리
./scripts/cleanup.sh

# 재배포
./scripts/redeploy.sh
```

---

**문제가 해결되지 않았나요?**
[GitHub Issues](https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/issues)에 문의하세요.
