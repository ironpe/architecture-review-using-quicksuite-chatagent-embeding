# Architecture Review MCP Server

QuickSight Chat Agent와 통합하여 DynamoDB 조회/업데이트 및 S3 저장 기능을 제공하는 MCP 서버입니다.

## 기능

### 제공하는 도구(Tools)

1. **get_document** - 문서 정보 조회
   - 입력: `documentId`
   - 출력: 문서 메타데이터

2. **list_documents** - 문서 목록 조회
   - 입력: `limit` (선택)
   - 출력: 문서 목록

3. **update_review** - 검토 정보 업데이트
   - 입력: `documentId`, `reviewer`, `architectureOverview`, `reviewDate`, `reviewCompleted`
   - 출력: 업데이트된 문서

4. **save_review_to_s3** - 검토 결과 S3 저장
   - 입력: `documentId`, `reviewContent`, `filename`
   - 출력: S3 키

## 설치

```bash
cd packages/mcp-server
npm install
```

## 환경 변수 설정

`.env` 파일 생성:
```bash
cp .env.example .env
```

## 로컬 실행

```bash
npm run dev
```

서버가 http://localhost:3002 에서 실행됩니다.

## QuickSight Chat Agent 연결

### 1. MCP 서버 배포

**옵션 A: 로컬 개발 (ngrok 사용)**
```bash
npm run dev
ngrok http 3002
```

**옵션 B: Lambda + API Gateway 배포**
- CDK 스택에 추가
- API Gateway 엔드포인트 사용

### 2. QuickSight 콘솔 설정

1. QuickSight 콘솔 → **Integrations** → **Actions** 탭
2. **Model Context Protocol** 타일에서 **+** 클릭
3. 정보 입력:
   - **Name**: Architecture Review MCP
   - **MCP server endpoint**: `http://your-server-url/sse`
   - **Authentication**: No Auth (또는 OAuth 설정)
4. **Next** → 도구 목록 확인 → **Done**

### 3. Chat Agent에서 사용

Chat Agent에서 자연어로 명령:

```
"문서 704fd949-ff43-40ac-87bb-f593e963dd99의 정보를 조회해줘"

"모든 문서 목록을 보여줘"

"문서 704fd949-ff43-40ac-87bb-f593e963dd99의 검토를 완료하고, 
검토자는 김철수, 아키텍처 개요는 '마이크로서비스 기반 BI 시스템'으로 업데이트해줘"

"검토 결과를 S3에 저장해줘"
```

## API 엔드포인트

- `GET /health` - 헬스 체크
- `GET /sse` - Server-Sent Events 엔드포인트
- `POST /v1/tools/list` - 도구 목록
- `POST /v1/tools/call` - 도구 실행

## 테스트

```bash
# 도구 목록 조회
curl -X POST http://localhost:3002/v1/tools/list

# 문서 조회
curl -X POST http://localhost:3002/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_document",
    "arguments": {
      "documentId": "704fd949-ff43-40ac-87bb-f593e963dd99"
    }
  }'

# 검토 업데이트
curl -X POST http://localhost:3002/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "update_review",
    "arguments": {
      "documentId": "704fd949-ff43-40ac-87bb-f593e963dd99",
      "reviewer": "김철수",
      "architectureOverview": "마이크로서비스 아키텍처",
      "reviewCompleted": true
    }
  }'
```

## 배포

### Lambda 배포 (권장)

CDK 스택에 추가하여 API Gateway와 함께 배포합니다.

### EC2/ECS 배포

Docker 컨테이너로 패키징하여 배포할 수 있습니다.

## 보안

- AWS IAM 권한 필요 (DynamoDB, S3)
- QuickSight 도메인 허용 목록 설정
- 프로덕션에서는 OAuth 인증 권장

## 문제 해결

### MCP 서버 연결 실패
- 엔드포인트 URL 확인
- CORS 설정 확인
- AWS 자격 증명 확인

### 도구 실행 실패
- CloudWatch Logs 확인
- IAM 권한 확인
- 환경 변수 확인
