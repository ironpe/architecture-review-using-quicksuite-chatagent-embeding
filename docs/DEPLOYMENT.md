# 배포 가이드

이 문서는 Architecture Review System을 AWS에 배포하는 방법을 안내합니다.

> **참고**: 이 가이드는 백엔드(Lambda, API Gateway, DynamoDB, S3, AgentCore Gateway, Cognito) 배포만 다룹니다. 프론트엔드는 로컬 개발 서버로 실행하며, AWS에 배포하지 않습니다. 필요한 경우, 프론트엔드를 AWS에 배포하는 것은 별도로 진행해야 합니다.

## 📋 사전 준비

- [설치 가이드](INSTALLATION.md)를 완료했는지 확인
- AWS CLI 자격 증명 설정 완료
- AWS CDK 부트스트랩 완료

## 🚀 배포 단계

### 1단계: CDK 인프라 배포

```bash
cd packages/infrastructure

# CDK 스택 확인
npx cdk list

# 변경 사항 미리보기
npx cdk diff

# 배포 실행
npx cdk deploy --all --require-approval never
```

배포가 완료되면 다음 정보가 출력됩니다:
- **ApiEndpoint**: API Gateway URL
- **FilesBucketName**: S3 버킷 이름
- **DocumentsTableName**: DynamoDB 테이블 이름
- **LambdaExecutionRoleArn**: Lambda 실행 역할 ARN
- **McpServerEndpoint**: MCP 서버 기본 엔드포인트 (QuickSuite MCP Action 등록 시 사용)

**중요**: 이 정보들을 메모해두세요. 환경 변수 설정 및 QuickSuite MCP 연동에 필요합니다.

> **참고**: Cognito User Pool과 Client는 별도의 AgentCore Gateway 스택에서 생성됩니다. 현재 CDK 버전에서는 AgentCore Gateway의 CfnGateway 리소스를 사용할 수 없어 수동으로 설정해야 합니다.

### 2단계: AgentCore Gateway 설정

> **중요**: 이 프로젝트는 QuickSuite Chat Agent와 AgentCore Gateway를 통한 MCP 통합이 핵심 기능입니다. AgentCore Gateway 설정을 먼저 완료해야 모든 환경 변수를 한 번에 업데이트할 수 있습니다.

#### 자동 설정 (권장)

자동화 스크립트를 사용하여 Cognito, AgentCore Gateway, Lambda Target을 설정합니다:

```bash
cd packages/infrastructure
./scripts/setup-agentcore.sh
```

스크립트는 다음을 자동으로 수행합니다:
1. ✅ Cognito User Pool 생성
2. ✅ User Pool Domain 생성
3. ✅ Resource Server 및 OAuth Scopes 생성
4. ✅ M2M App Client 생성
5. ✅ AgentCore Gateway 생성 (CLI 시도, 실패 시 수동 안내)
6. ✅ Lambda Target 추가 (CLI 시도, 실패 시 수동 안내)
7. ✅ Gateway 권한 설정

스크립트 실행 후 `agentcore-setup-output.txt` 파일에 모든 설정 정보가 저장됩니다.

> **참고**: AWS CLI의 `bedrock-agentcore` 명령어가 작동하지 않으면 스크립트가 콘솔 사용 방법을 안내합니다.

#### 수동 설정

스크립트를 사용하지 않고 수동으로 설정하려면 [AgentCore MCP 설정 가이드](AGENTCORE_MCP_SETUP.md)의 "수동 설정 (단계별)" 섹션을 참고하세요.

**설정 시 필요한 정보:**
- **MCP Lambda ARN**: 1단계 배포 출력의 McpServerHandler 함수 ARN
- **MCP Endpoint**: 1단계 배포 출력의 McpServerEndpoint 값

### 3단계: 환경 변수 업데이트

1단계 CDK 배포와 2단계 AgentCore Gateway 설정이 완료되면, 자동화 스크립트로 모든 환경 변수를 한 번에 업데이트합니다.

#### 자동 업데이트 (권장)

```bash
cd packages/infrastructure
./scripts/update-env.sh
```

스크립트는 다음을 자동으로 수행합니다:
- ✅ CDK 배포 출력 정보 가져오기 (API Endpoint, Bucket, Table 등)
- ✅ AgentCore Gateway 설정 정보 가져오기 (`agentcore-setup-output.txt`)
- ✅ 프론트엔드 `.env` 파일 업데이트
- ✅ 백엔드 `.env` 파일 업데이트
- ✅ MCP 서버 `.env` 파일 업데이트
- ✅ 기존 파일 백업 (`.env.backup`)

#### 수동 업데이트

스크립트를 사용하지 않고 수동으로 업데이트하려면:

**프론트엔드 (`packages/frontend/.env`):**
```bash
# API Gateway (1단계 CDK 배포 출력)
VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
VITE_AWS_REGION=us-east-1

# Cognito (2단계 agentcore-setup-output.txt 참고)
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_WEB_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

**백엔드 (`packages/backend/.env`):**
```bash
# AWS 설정 (1단계 CDK 배포 출력)
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=YOUR_ACCOUNT_ID
QUICKSIGHT_ACCOUNT_ID=YOUR_ACCOUNT_ID
BUCKET_NAME=architecture-review-files-YOUR_ACCOUNT_ID-us-east-1

# QuickSuite 정보 (5단계 QuickSuite 설정 후 업데이트)
QUICKSIGHT_AGENT_ARN=arn:aws:quicksight:us-east-1:YOUR_ACCOUNT_ID:agent/YOUR_AGENT_ID
QUICKSIGHT_USER_NAME=YOUR_QUICKSIGHT_USER
QUICKSIGHT_EMBED_URL=https://us-east-1.quicksight.aws.amazon.com/sn/embed/share/accounts/YOUR_ACCOUNT_ID/chatagents/YOUR_AGENT_ID?directory_alias=YOUR_ALIAS
```

**MCP 서버 (`packages/mcp-server/.env`):**
```bash
# 1단계 CDK 배포 출력 정보
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=YOUR_ACCOUNT_ID
TABLE_NAME=architecture-review-documents
BUCKET_NAME=architecture-review-files-YOUR_ACCOUNT_ID-us-east-1
```

> **참고**: 백엔드의 QuickSuite 관련 정보는 5단계 QuickSuite 설정 후 수동으로 추가해야 합니다.

### 4단계: Cognito 사용자 생성

AgentCore Gateway 설정으로 생성된 Cognito User Pool에 로그인할 사용자를 추가합니다.

#### 자동 생성 (권장)

```bash
cd packages/infrastructure
./scripts/create-cognito-user.sh
```

스크립트는 다음을 수행합니다:
- ✅ 사용자 이름 입력 받기
- ✅ 이메일 주소 입력 받기 (이메일 형식 검증)
- ✅ 비밀번호 입력 받기 (보안 입력, 복잡도 검증)
- ✅ Cognito 사용자 생성
- ✅ 비밀번호 영구 설정

> **참고**: 프론트엔드 로그인 시 입력한 이메일과 비밀번호를 사용합니다.

#### 수동 생성

스크립트를 사용하지 않고 수동으로 생성하려면:

```bash
# User Pool ID는 agentcore-setup-output.txt 파일에서 확인
export USER_POOL_ID=us-east-1_XXXXXXXXX

# 사용자 생성
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin \
  --user-attributes Name=email,Value=your-email@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS \
  --region us-east-1

# 비밀번호 영구 설정
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin \
  --password "YourSecurePassword123!" \
  --permanent \
  --region us-east-1
```


### 5단계: QuickSuite 설정 (선택 사항)

> **참고**: QuickSuite Chat Agent 기능이 필요한 경우에만 진행하세요. 기본 문서 업로드/관리 기능은 1-4단계만으로 사용 가능합니다.

QuickSuite Chat Agent, Space, Knowledge Base, MCP 연결 설정은 **[QuickSuite 설정 가이드](QUICKSIGHT_SETUP.md)**를 참고하세요.

설정 내용:
- QuickSuite 구독 활성화
- QuickSuite 사용자 생성
- QuickSuite에 MCP 연결
- S3 Knowledge Base 생성
- Space 생성 및 연결
- Chat Agent 생성
- 백엔드 환경 변수 업데이트
- Lambda 환경 변수 업데이트

### 6단계: 프론트엔드 실행

```bash
cd packages/frontend
npm run dev
```

브라우저에서 http://localhost:5173 접속

## ✅ 배포 확인

### 1. API Gateway 테스트

```bash
# Health check
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/health

# 예상 응답: {"status":"ok"}
```

### 2. 로그인 테스트

1. http://localhost:5173/login 접속
2. 생성한 사용자 계정으로 로그인
3. 대시보드 접근 확인

### 3. 문서 업로드 테스트

1. "업로드" 메뉴 클릭
2. PDF 또는 이미지 파일 선택
3. 업로드 성공 확인
4. 문서 목록에서 확인

### 4. Chat Agent 테스트

1. 우측 하단 채팅 버튼 클릭
2. "문서 목록을 보여줘" 입력
3. Agent 응답 확인
4. 채팅 창에 "[문서]에 대해 아키텍처 리뷰 진행해줘" 입력
5. 채팅 창에 "리뷰 결과를 저장하고, 검토 완료로 상태 변경해줘" 입력

## 🔄 업데이트 배포

코드 변경 후 재배포:

```bash
# 백엔드 재빌드
cd packages/backend
npm run build

# CDK 재배포
cd ../infrastructure
npx cdk deploy --all
```

## 🗑️ 리소스 삭제

### AgentCore Gateway 리소스 삭제

AgentCore Gateway 관련 리소스만 삭제하려면:

```bash
cd packages/infrastructure
./scripts/cleanup-agentcore.sh
```

스크립트는 다음 리소스를 삭제합니다:
- ✅ Gateway Target (Lambda Target)
- ✅ AgentCore Gateway
- ✅ Gateway IAM Role
- ✅ Cognito App Client
- ✅ Cognito Resource Server
- ✅ Cognito Domain
- ✅ Cognito User Pool
- ✅ 설정 출력 파일

> **참고**: 삭제 전 확인 프롬프트가 표시됩니다. `yes`를 입력하여 진행하세요.

### 전체 인프라 삭제

모든 AWS 리소스를 삭제하려면:

```bash
# 1. AgentCore Gateway 리소스 삭제
cd packages/infrastructure
./scripts/cleanup-agentcore.sh

# 2. CDK 스택 삭제
npx cdk destroy --all
```

**주의**: CDK destroy 명령은 다음을 삭제합니다:
- Lambda 함수 (10개)
- API Gateway
- DynamoDB 테이블 (데이터 포함)
- S3 버킷 (파일 포함)

> **중요**: S3 버킷에 파일이 있으면 삭제가 실패할 수 있습니다. 먼저 버킷을 비워야 합니다.

### S3 버킷 비우기

```bash
# S3 버킷 내용 삭제
aws s3 rm s3://YOUR_BUCKET_NAME --recursive --region us-east-1

# 그 다음 CDK destroy 실행
npx cdk destroy --all
```

## 🐛 배포 문제 해결

### CDK 배포 실패

```bash
# 스택 상태 확인
aws cloudformation describe-stacks --region us-east-1

# 실패한 스택 삭제
aws cloudformation delete-stack --stack-name YOUR_STACK_NAME --region us-east-1

# 재배포
npx cdk deploy --all
```

### Lambda 함수 오류

```bash
# Lambda 로그 확인
aws logs tail /aws/lambda/YOUR_FUNCTION_NAME --follow --region us-east-1
```

### API Gateway CORS 오류

프론트엔드에서 API 호출 시 CORS 오류가 발생하면:

1. `packages/infrastructure/lib/architecture-review-stack.ts` 확인
2. CORS 설정에 프론트엔드 URL 추가
3. 재배포

### Cognito 인증 오류

```bash
# User Pool 상태 확인
aws cognito-idp describe-user-pool \
  --user-pool-id YOUR_USER_POOL_ID \
  --region us-east-1

# 사용자 상태 확인
aws cognito-idp admin-get-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --region us-east-1
```

### QuickSuite Agent 연결 오류

1. QuickSuite 콘솔에서 Agent 상태 확인
2. AgentCore Gateway URL 확인
3. Cognito OAuth 설정 확인
4. MCP 도구 목록 확인

## 💰 비용 예상

이 시스템을 운영하는 데 드는 AWS 비용 (월 기준):

- **Lambda**: 프리 티어 내 무료 (100만 요청/월)
- **API Gateway**: $3.50 (100만 요청 기준)
- **DynamoDB**: 프리 티어 내 무료 (25GB)
- **S3**: $0.023/GB (스토리지) + 요청 비용
- **Cognito**: 프리 티어 내 무료 (50,000 MAU)
- **QuickSuite**: $24/사용자/월 (Enterprise Edition)

**예상 총 비용**: 약 $30-50/월 (QuickSuite 포함)

## 📞 추가 지원

배포 중 문제가 발생하면:
- [문제 해결 가이드](TROUBLESHOOTING.md) 참고
- [GitHub Issues](https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/issues) 문의

## 🎯 다음 단계

배포가 완료되었다면:
- [QuickSuite 설정 가이드](QUICKSIGHT_SETUP.md) 참고
- [AgentCore MCP 설정 가이드](AGENTCORE_MCP_SETUP.md) 참고
- 프로덕션 환경 보안 강화 고려
