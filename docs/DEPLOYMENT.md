# 배포 가이드

이 문서는 Architecture Review System을 AWS에 배포하는 방법을 안내합니다.

> **참고**: 이 가이드는 백엔드(Lambda, API Gateway, DynamoDB, S3, AgentCore Gateway, Cognito) 배포만 다룹니다. 프론트엔드는 로컬 개발 서버로 실행하며, AWS에 배포하지 않습니다. 필요한 경우, 프론트엔드를 AWS에 배포하는 것은 별도로 진행해야 합니다.

## 📋 사전 준비

- [설치 가이드](INSTALLATION.md)를 완료했는지 확인
- AWS CLI 자격 증명 설정 완료
- AWS CDK 부트스트랩 완료

## 🚀 배포 단계

### 1단계: 백엔드 빌드

```bash
cd packages/backend
npm run build
```

빌드가 성공하면 `dist/` 폴더에 Lambda 함수 코드가 생성됩니다.

### 2단계: MCP 서버 빌드

```bash
cd packages/mcp-server
npm run build
```

### 3단계: CDK 인프라 배포

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
- API Gateway URL
- S3 버킷 이름
- DynamoDB 테이블 이름
- Cognito User Pool ID
- Cognito Client ID

**중요**: 이 정보들을 메모해두세요. 환경 변수 설정에 필요합니다.

### 4단계: Cognito 사용자 생성

```bash
# User Pool ID를 환경 변수로 설정
export USER_POOL_ID=YOUR_USER_POOL_ID

# 사용자 생성
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin \
  --user-attributes Name=email,Value=your-email@example.com \
  --temporary-password "TempPassword123!" \
  --region us-east-1

# 비밀번호 영구 설정
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin \
  --password "YourSecurePassword123!" \
  --permanent \
  --region us-east-1
```

### 5단계: QuickSuite 설정

#### QuickSuite 구독 활성화

1. AWS 콘솔에서 QuickSuite 서비스로 이동
2. QuickSuite 구독이 없다면 구독 시작
3. Enterprise Edition 선택 (Chat Agent 기능 필요)

#### Chat Agent 생성

1. QuickSuite 콘솔에서 "Agents" 메뉴로 이동
2. "Create agent" 클릭
3. Agent 이름 입력 (예: "Architecture Review Agent")
4. Agent 생성 완료 후 Agent ARN 복사

#### QuickSuite 사용자 생성

```bash
# QuickSuite 사용자 생성 (IAM 사용자 기반)
aws quicksight register-user \
  --aws-account-id YOUR_ACCOUNT_ID \
  --namespace default \
  --identity-type IAM \
  --iam-arn arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_IAM_USER \
  --user-role ADMIN \
  --region us-east-1
```

### 6단계: AgentCore Gateway 설정

```bash
cd packages/infrastructure

# Gateway 설정 스크립트 실행
./scripts/setup-agentcore.sh
```

스크립트가 다음 작업을 수행합니다:
1. AgentCore Gateway 생성
2. Cognito OAuth 클라이언트 생성
3. Lambda를 MCP Target으로 등록
4. MCP 도구 등록

### 7단계: 환경 변수 업데이트

배포 결과를 바탕으로 환경 변수 파일을 업데이트합니다.

#### 프론트엔드 (.env)

```bash
cd packages/frontend
```

`.env` 파일 수정:
```bash
VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_WEB_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
```

#### 백엔드 (.env)

```bash
cd packages/backend
```

`.env` 파일 수정:
```bash
AWS_ACCOUNT_ID=YOUR_ACCOUNT_ID
QUICKSIGHT_AGENT_ARN=arn:aws:quicksight:us-east-1:YOUR_ACCOUNT_ID:agent/YOUR_AGENT_ID
QUICKSIGHT_USER_NAME=YOUR_QUICKSIGHT_USER
BUCKET_NAME=YOUR_BUCKET_NAME
```

#### MCP 서버 (.env)

```bash
cd packages/mcp-server
```

`.env` 파일 수정:
```bash
AWS_ACCOUNT_ID=YOUR_ACCOUNT_ID
TABLE_NAME=YOUR_TABLE_NAME
BUCKET_NAME=YOUR_BUCKET_NAME
```

### 8단계: QuickSuite에 MCP 연결

1. QuickSuite 콘솔 접속
2. "Integrations" → "Actions" → "Model Context Protocol" 클릭
3. 다음 정보 입력:
   - **Name**: Architecture Review MCP
   - **URL**: AgentCore Gateway URL
   - **Auth Type**: Service authentication (2LO)
   - **Client ID**: Cognito OAuth Client ID
   - **Token URL**: Cognito Token Endpoint
4. "Connect" 클릭
5. 5개의 MCP 도구가 표시되는지 확인

### 9단계: QuickSuite Space 등록

#### 9.1 S3 접근 권한 등록

QuickSuite가 S3 버킷에 접근할 수 있도록 권한을 설정합니다:

```bash
# QuickSuite 서비스 역할에 S3 읽기 권한 추가
aws iam attach-role-policy \
  --role-name YOUR_QUICKSUITE_SERVICE_ROLE \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
  --region us-east-1
```

또는 특정 버킷에만 권한 부여:

```bash
# 인라인 정책 생성
aws iam put-role-policy \
  --role-name YOUR_QUICKSUITE_SERVICE_ROLE \
  --policy-name QuickSuiteS3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::YOUR_BUCKET_NAME",
          "arn:aws:s3:::YOUR_BUCKET_NAME/*"
        ]
      }
    ]
  }'
```

#### 9.2 S3 Knowledge Base 생성

1. QuickSuite 콘솔에서 "Knowledge bases" 메뉴로 이동
2. "Create knowledge base" 클릭
3. 다음 정보 입력:
   - **Name**: Architecture Review Documents
   - **Description**: 아키텍처 검토 문서 저장소
   - **Data source type**: Amazon S3
   - **S3 URI**: `s3://YOUR_BUCKET_NAME/documents/`
4. "Create" 클릭

#### 9.3 Space 생성 및 Knowledge Base 연결

1. QuickSuite 콘솔에서 "Spaces" 메뉴로 이동
2. "Create space" 클릭
3. 다음 정보 입력:
   - **Space name**: Architecture Review Space
   - **Description**: 아키텍처 검토를 위한 작업 공간
4. "Knowledge bases" 섹션에서:
   - "Add knowledge base" 클릭
   - 앞서 생성한 "Architecture Review Documents" 선택
5. "Create space" 클릭

#### 9.4 Chat Agent에 Space 연결

1. QuickSuite 콘솔에서 생성한 Chat Agent로 이동
2. "Settings" → "Spaces" 클릭
3. "Add space" 클릭
4. 생성한 "Architecture Review Space" 선택
5. "Save" 클릭

### 10단계: 프론트엔드 실행

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

모든 AWS 리소스를 삭제하려면:

```bash
cd packages/infrastructure
npx cdk destroy --all
```

**주의**: 이 명령은 다음을 삭제합니다:
- Lambda 함수
- API Gateway
- DynamoDB 테이블 (데이터 포함)
- S3 버킷 (파일 포함)
- Cognito User Pool

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
