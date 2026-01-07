# Architecture Review System - 프로젝트 요약

## 📋 프로젝트 개요

AWS 기반 아키텍처 검토 시스템으로, 문서 업로드, QuickSuite Chat Agent 통합, AgentCore Gateway를 통한 자동화된 검토 프로세스를 제공합니다.

## 🏗️ 아키텍처

### 프론트엔드
- **기술 스택**: React + TypeScript + Vite + Material-UI
- **호스팅**: 로컬 개발 (http://localhost:5173)
- **주요 기능**:
  - 문서 업로드 (PDF, 이미지)
  - 문서 목록 및 검색
  - 문서 미리보기
  - 검토 결과 보기 (마크다운 렌더링)
  - QuickSuite Chat Agent 임베딩

### 백엔드
- **기술 스택**: Node.js + TypeScript + AWS Lambda
- **API**: API Gateway REST API
- **데이터베이스**: DynamoDB
- **스토리지**: S3
- **API 엔드포인트**: `https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod`

### AWS 리소스
- **S3 버킷**: `architecture-review-files-YOUR_ACCOUNT_ID-YOUR_REGION`
- **DynamoDB 테이블**: `architecture-review-documents`
- **AgentCore Gateway**: `architecture-review-gateway-YOUR_GATEWAY_ID`
- **Cognito User Pool**: `YOUR_REGION_YOUR_POOL_ID`

## 🎯 구현된 주요 기능

### 1. 문서 관리
- ✅ PDF, PNG, JPG, JPEG 파일 업로드 (최대 50MB)
- ✅ S3에 파일 저장
- ✅ DynamoDB에 메타데이터 저장
- ✅ 문서 목록 조회 (페이지네이션)
- ✅ 문서 검색 (파일명 기반)
- ✅ 문서 미리보기 (PDF iframe, 이미지 표시)
- ✅ 문서 삭제 (S3 + DynamoDB)

### 2. 검토 관리
- ✅ 검토 상태 관리 (검토 필요/검토 완료)
- ✅ 검토자, 아키텍처 개요, 검토 일자 저장
- ✅ 검토 완료 시 자동으로 완료 일시 기록 (KST)
- ✅ 검토 결과 S3 저장 (마크다운 형식)
- ✅ 검토 결과 보기 (마크다운 렌더링)

### 3. QuickSuite Chat Agent 통합
- ✅ Registered User Embedding 방식 구현
- ✅ QuickSuite Embedding SDK 사용
- ✅ 우측 패널에 채팅 창 임베딩
- ✅ 크기 조절 가능 (300px-800px)
- ✅ 한국어 로케일 설정
- ✅ Space 및 Knowledge Base 연동

### 4. 인증 시스템 (Cognito)
- ✅ AWS Amplify 통합
- ✅ Username/Password 직접 로그인
- ✅ 이메일 자동완성 (Remember Email)
- ✅ 로그인 상태 유지 (Remember Me - 30일)
- ✅ 자동 토큰 관리 및 갱신
- ✅ 세션 자동 복원
- ✅ 실제 username 표시
- ✅ 보호된 라우트

### 5. AgentCore Gateway + MCP 도구
- ✅ Amazon Bedrock AgentCore Gateway 생성
- ✅ Cognito JWT 인증 설정
- ✅ Lambda 함수를 MCP 도구로 노출

**제공하는 MCP 도구:**
1. `get_document` - 문서 정보 조회
2. `list_documents` - 문서 목록 조회
3. `update_review` - 검토 정보 업데이트
4. `save_review_to_s3` - 검토 결과 마크다운 저장
5. `generate_diagram` - Mermaid 다이어그램 생성

### 6. QuickSuite Space 및 Knowledge Base
- ✅ S3 기반 Knowledge Base 생성
- ✅ Space 생성 및 Knowledge Base 연결
- ✅ Chat Agent에 Space 연동
- ✅ 문서 검색 및 컨텍스트 제공

### 7. UI/UX
- ✅ 상태 컬럼 (검토 완료/검토 필요) - 사각형 칩
- ✅ 검토 완료일 컬럼 (YYYY-MM-DD HH:mm)
- ✅ 작업 버튼 (미리보기/검토 결과/삭제)
- ✅ 삭제 확인 다이얼로그
- ✅ 검토 결과 다이얼로그 (마크다운 렌더링)
- ✅ 반응형 레이아웃
- ✅ 사용자 아바타 및 이름 표시

## 🔧 기술 스택

### 프론트엔드
```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.28.0",
  "@mui/material": "^6.1.9",
  "axios": "^1.7.9",
  "react-markdown": "^9.0.1",
  "amazon-quicksight-embedding-sdk": "^2.11.1"
}
```

### 백엔드
```json
{
  "@aws-sdk/client-s3": "^3.709.0",
  "@aws-sdk/client-dynamodb": "^3.709.0",
  "@aws-sdk/client-quicksight": "^3.709.0",
  "aws-lambda": "^1.0.7"
}
```

### 인프라
```json
{
  "aws-cdk-lib": "^2.172.0",
  "constructs": "^10.4.2"
}
```

## 📊 DynamoDB 스키마

```typescript
interface DocumentMetadata {
  documentId: string;              // Partition Key
  filename: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  uploadTimestamp: number;
  uploadDate: string;
  requester?: string;              // 요청자
  reviewer?: string;               // 검토자
  architectureOverview?: string;   // 아키텍처 개요
  reviewDate?: string;             // 검토 일자 (사용자 지정)
  completeDate?: string;           // 검토 완료 일시 (자동, KST)
  reviewCompleted: boolean;        // 검토 완료 여부
  reviewResultLocation?: string;   // 검토 결과 S3 경로
}
```

## 🔐 보안 설정

### Cognito User Pool
- **User Pool ID**: `YOUR_USER_POOL_ID`
- **Domain**: `YOUR_COGNITO_DOMAIN`
- **Region**: `us-east-1`

### App Clients
1. **QuickSuite MCP Client** (Machine-to-Machine):
   - Client ID: `YOUR_MCP_CLIENT_ID`
   - OAuth Flow: `client_credentials`
   - Scopes: `architecture-review/read`, `architecture-review/write`

2. **Web Application Client**:
   - Client ID: `YOUR_WEB_CLIENT_ID`
   - OAuth Flows: `code`
   - Scopes: `openid`, `email`, `profile`
   - Callback URLs: `http://localhost:5173`

### 사용자
- **Username**: `your-username`
- **Email**: `your-email@example.com`
- **Password**: `YourSecurePassword123!`
- **Status**: ✅ CONFIRMED

## 🌐 API 엔드포인트

### REST API
- **Base URL**: `https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod`

**문서 관리:**
- `POST /documents/upload-url` - 업로드 URL 생성
- `POST /documents/metadata` - 메타데이터 저장
- `GET /documents` - 문서 목록 (페이지네이션)
- `GET /documents/search?query=` - 문서 검색
- `GET /documents/{documentId}` - 문서 조회
- `DELETE /documents/{documentId}` - 문서 삭제

**검토 관리:**
- `PUT /documents/review` - 검토 정보 업데이트
- `GET /documents/review/{documentId}` - 검토 결과 조회

**QuickSuite:**
- `GET /quicksuite/embed-url` - Chat Agent 임베드 URL 생성

**MCP:**
- `POST /mcp/v1/tools/list` - MCP 도구 목록
- `POST /mcp/v1/tools/call` - MCP 도구 호출
- `GET /mcp/health` - 헬스 체크

### AgentCore Gateway
- **URL**: `https://YOUR_GATEWAY_ID.gateway.bedrock-agentcore.YOUR_REGION.amazonaws.com/mcp`
- **Auth**: Cognito JWT
- **Token URL**: `https://YOUR_COGNITO_DOMAIN.auth.YOUR_REGION.amazoncognito.com/oauth2/token`

## 🤖 QuickSuite Chat Agent

### Agent 정보
- **Agent ID**: `YOUR_AGENT_ID`
- **Agent ARN**: `arn:aws:quicksight:YOUR_REGION:YOUR_ACCOUNT_ID:agent/YOUR_AGENT_ID`
- **User**: `YOUR_QUICKSUITE_USER` (IAM 사용자)

### 임베딩 방식
- **방법**: Registered User Embedding
- **SDK**: amazon-quicksight-embedding-sdk v2.11.1
- **Experience**: QuickChat
- **Locale**: ko-KR

### MCP Actions 통합
QuickSuite Chat Agent가 AgentCore Gateway를 통해 다음 작업 수행:
- 문서 조회 및 목록
- 검토 정보 업데이트
- 검토 결과 S3 저장
- Mermaid 다이어그램 생성

### Space 및 Knowledge Base
- S3 기반 Knowledge Base로 문서 검색
- Space를 통한 컨텍스트 관리
- Chat Agent와 Knowledge Base 연동

## 📁 프로젝트 구조

```
packages/
├── frontend/                    # React 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWidget.tsx   # QuickSuite Chat 위젯
│   │   │   ├── ChatButton.tsx   # 채팅 버튼
│   │   │   └── Layout.tsx       # 레이아웃
│   │   ├── pages/
│   │   │   ├── DocumentListPage.tsx  # 문서 목록
│   │   │   ├── UploadPage.tsx        # 업로드
│   │   │   ├── PreviewPage.tsx       # 미리보기
│   │   │   └── LoginPage.tsx         # 로그인
│   │   ├── services/
│   │   │   ├── api.ts            # API 클라이언트
│   │   │   ├── quicksight.ts     # QuickSuite API
│   │   ├── config/
│   │   │   ├── api.ts            # API 설정
│   │   │   └── cognito.ts        # Cognito 설정
│   │   └── types/                # TypeScript 타입
│   └── .env                      # 환경 변수
│
├── backend/                     # Lambda 함수
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── upload-url.ts         # 업로드 URL 생성
│   │   │   ├── metadata.ts           # 메타데이터 저장
│   │   │   ├── list-documents.ts     # 문서 목록
│   │   │   ├── search-documents.ts   # 문서 검색
│   │   │   ├── get-document.ts       # 문서 조회
│   │   │   ├── delete-document.ts    # 문서 삭제
│   │   │   ├── update-review.ts      # 검토 업데이트
│   │   │   ├── get-review.ts         # 검토 결과 조회
│   │   │   ├── quicksight-embed.ts   # QuickSuite 임베드 URL
│   │   │   └── generate-diagram.ts   # 다이어그램 생성
│   │   ├── types/                # TypeScript 타입
│   │   └── utils/                # 유틸리티
│   └── .env                      # 환경 변수
│
├── mcp-server/                  # MCP 서버 (AgentCore Gateway용)
│   ├── src/
│   │   ├── lambda.ts             # MCP Lambda 핸들러
│   │   ├── http-server.ts        # 로컬 HTTP 서버
│   │   └── index.ts              # Stdio MCP 서버
│   └── .env                      # 환경 변수
│
├── infrastructure/              # CDK 인프라
│   ├── lib/
│   │   ├── architecture-review-stack.ts  # 메인 스택
│   │   └── agentcore-gateway-stack.ts    # Gateway 스택
│   ├── scripts/
│   │   └── setup-agentcore.sh   # Gateway 설정 스크립트
│   └── target-config.json       # MCP 도구 스키마
│
└── diagram-generator/           # 다이어그램 생성 (Python)
    ├── lambda_function.py       # Python Lambda
    ├── Dockerfile               # 컨테이너 이미지
    └── requirements.txt         # Python 의존성
```

## 🚀 배포 상태

### Lambda 함수
- ✅ UploadUrlHandler
- ✅ MetadataHandler
- ✅ ListDocumentsHandler
- ✅ SearchDocumentsHandler
- ✅ GetDocumentHandler
- ✅ DeleteDocumentHandler
- ✅ UpdateReviewHandler
- ✅ GetReviewHandler
- ✅ QuickSuiteEmbedHandler
- ✅ McpServerHandler

### API Gateway
- ✅ REST API 배포
- ✅ CORS 설정
- ✅ 모든 엔드포인트 연결

### AgentCore Gateway
- ✅ Gateway 생성 (Cognito 인증)
- ✅ Lambda Target 연결
- ✅ 5개 MCP 도구 등록

## 🔑 환경 변수

### 프론트엔드 (.env)
```bash
# API Gateway endpoint
VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod

# Cognito Configuration
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=YOUR_USER_POOL_ID
VITE_USER_POOL_WEB_CLIENT_ID=YOUR_CLIENT_ID
```

### 백엔드 (.env)
```bash
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=YOUR_AWS_ACCOUNT_ID

# QuickSight
QUICKSIGHT_ACCOUNT_ID=YOUR_AWS_ACCOUNT_ID
QUICKSIGHT_AGENT_ARN=arn:aws:quicksight:YOUR_REGION:YOUR_ACCOUNT_ID:agent/YOUR_AGENT_ID
QUICKSIGHT_NAMESPACE=default
QUICKSIGHT_USER_NAME=YOUR_QUICKSIGHT_USER

# S3
BUCKET_NAME=YOUR_BUCKET_NAME
```

### MCP 서버 (.env)
```bash
AWS_REGION=us-east-1
TABLE_NAME=architecture-review-documents
BUCKET_NAME=YOUR_BUCKET_NAME
PORT=3002
```

## 📝 QuickSuite MCP 연결 정보

### AgentCore Gateway
- **URL**: `https://YOUR_GATEWAY_ID.gateway.bedrock-agentcore.YOUR_REGION.amazonaws.com/mcp`
- **Auth Type**: Service authentication (2LO)
- **Client ID**: `YOUR_MCP_CLIENT_ID`
- **Token URL**: `https://YOUR_COGNITO_DOMAIN.auth.YOUR_REGION.amazoncognito.com/oauth2/token`

### QuickSuite 콘솔 연결 방법
1. https://YOUR_REGION.quicksight.aws.amazon.com/sn/start
2. Integrations → Actions → Model Context Protocol (+)
3. 위 정보 입력
4. 5개 도구 확인 후 완료

## 🎨 Chat Agent 사용 예시

### 문서 조회
```
"문서 목록을 보여줘"
"문서 YOUR_DOCUMENT_ID의 정보를 조회해줘"
```

### 검토 수행
```
"문서 YOUR_DOCUMENT_ID의 검토를 시작해줘. 검토자는 김철수로 설정해줘"

"아키텍처 개요를 '마이크로서비스 기반 BI 시스템'으로 업데이트해줘"

"검토를 완료해줘"
```

### 검토 결과 저장
```
"검토 결과를 다음 내용으로 저장해줘:

# 아키텍처 검토 결과

## 개요
...

## 권장 사항
...
"
```

### 다이어그램 생성
```
"문서 YOUR_DOCUMENT_ID의 QuickSuite BI 아키텍처 다이어그램을 생성해줘"
```

## 🎨 Chat Agent 사용 예시

### AWS 공식 문서
- [QuickSuite Embedded Chat](https://aws.amazon.com/blogs/business-intelligence/announcing-embedded-chat-in-amazon-quick-suite/)
- [QuickSuite Embedding SDK](https://github.com/awslabs/amazon-quicksight-embedding-sdk)
- [AgentCore Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [MCP 프로토콜](https://modelcontextprotocol.io/)
- [AWS Diagram MCP](https://aws.amazon.com/blogs/machine-learning/build-aws-architecture-diagrams-using-amazon-q-cli-and-mcp/)

### 프로젝트 문서
- `README.md` - 빠른 시작 가이드
- `COGNITO_INTEGRATION.md` - Cognito 통합 가이드
- `QUICKSIGHT_SETUP.md` - QuickSuite 설정 가이드
- `AGENTCORE_MCP_SETUP.md` - AgentCore Gateway 및 MCP 설정 가이드

## 🔄 다음 단계

### 1. 백엔드 Cognito Authorizer 추가
- [ ] API Gateway에 Cognito User Pool Authorizer 추가
- [ ] Lambda 함수에서 토큰 검증
- [ ] 사용자 정보 추출 및 활용

### 2. 다이어그램 생성 완료
- [ ] Docker 이미지 빌드 및 ECR 푸시
- [ ] Lambda 함수 배포
- [ ] AgentCore Gateway Target 업데이트
- [ ] 프론트엔드에서 다이어그램 표시

### 3. 추가 기능
- [ ] 회원가입 및 비밀번호 재설정
- [ ] 문서 다운로드
- [ ] 검토 히스토리
- [ ] 알림 기능
- [ ] 대시보드

## 💡 개발 팁

### 로컬 개발
```bash
# 프론트엔드
cd packages/frontend
npm run dev

# 백엔드 (로컬 서버)
cd packages/backend
npm run dev

# MCP 서버 (로컬 테스트)
cd packages/mcp-server
npm run dev
```

### 배포
```bash
# 백엔드 빌드
cd packages/backend
npm run build

# MCP 서버 빌드
cd packages/mcp-server
npm run build

# CDK 배포
cd packages/infrastructure
export QUICKSIGHT_AGENT_ARN="arn:aws:quicksight:YOUR_REGION:YOUR_ACCOUNT_ID:agent/YOUR_AGENT_ID"
export QUICKSIGHT_USER_NAME="YOUR_QUICKSIGHT_USER"
cdk deploy --require-approval never
```

### AgentCore Gateway 관리
```bash
# Gateway 조회
aws bedrock-agentcore-control get-gateway \
  --gateway-identifier "YOUR_GATEWAY_ID" \
  --region us-east-1

# Target 목록
aws bedrock-agentcore-control list-gateway-targets \
  --gateway-identifier "YOUR_GATEWAY_ID" \
  --region us-east-1
```

## 🎯 성과

1. **완전한 서버리스 아키텍처**: Lambda + API Gateway + DynamoDB + S3
2. **Agentic AI 기반 아키텍처 검토**: QuickSuite Chat Agent 통합
3. **자동화된 워크플로우**: MCP 도구를 통한 검토 프로세스 자동화
4. **보안 인증**: Cognito 기반 사용자 인증 및 세션 관리
5. **확장 가능**: 새로운 MCP 도구 추가 용이
6. **Knowledge Base 연동**: S3 기반 문서 검색 및 컨텍스트 제공

## 📞 문의 및 지원

- **리전**: us-east-1 (권장)
- **프로젝트**: Architecture Review System

---

**마지막 업데이트**: 2026-01-06
**버전**: 1.1.0
**상태**: ✅ 프로덕션 준비 완료
