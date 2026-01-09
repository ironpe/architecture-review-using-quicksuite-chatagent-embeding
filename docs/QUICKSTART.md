# 빠른 시작 가이드

5분 안에 Architecture Review System을 시작하는 방법을 안내합니다.

## 🎯 목표

이 가이드를 완료하면:
- ✅ 로컬 개발 환경 실행
- ✅ 첫 문서 업로드
- ✅ Chat Agent와 대화 (QuickSuite 설정 시)

## 📋 사전 요구사항

- Node.js 18+ 설치
- AWS 계정 및 CLI 설정
- AWS CDK 2.x 설치

## 🚀 빠른 시작 (자동화 스크립트 사용)

### 1단계: 리포지토리 클론 및 초기 설정 (1분)

```bash
# 리포지토리 클론
git clone https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding.git
cd architecture-review-using-quicksuite-chatagent-embeding

# 의존성 설치
npm install
npm install --workspaces

# 환경 변수 파일 생성
cd packages/frontend && cp .env.example .env && cd ../..
cd packages/backend && cp .env.example .env && cd ../..
cd packages/mcp-server && cp .env.example .env && cd ../..
```

### 2단계: 백엔드 빌드 및 CDK 부트스트랩 (2분)

```bash
# 백엔드 빌드
cd packages/backend && npm run build && cd ../..

# MCP 서버 빌드
cd packages/mcp-server && npm run build && cd ../..

# CDK 부트스트랩
cd packages/infrastructure
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
```

### 3단계: AWS 리소스 배포 (2-3분)

```bash
# CDK 배포
npx cdk deploy --all --require-approval never
cd ../..
```

### 4단계: AgentCore Gateway 설정 (2-3분)

```bash
cd packages/infrastructure
./scripts/setup-agentcore.sh
```

스크립트가 자동으로 생성:
- Cognito User Pool
- AgentCore Gateway
- Lambda Target (5개 MCP 도구)

### 5단계: 환경 변수 자동 업데이트 (30초)

```bash
./scripts/update-env.sh
```

### 6단계: Cognito 사용자 생성 (30초)

```bash
./scripts/create-cognito-user.sh
```

이메일과 비밀번호를 입력하세요.

### 7단계: 프론트엔드 실행 (30초)

```bash
cd ../../packages/frontend
npm run dev
```

브라우저에서 http://localhost:5173 접속

## ✅ 첫 사용

### 로그인

1. Email: (6단계에서 입력한 이메일)
2. Password: (6단계에서 입력한 비밀번호)
3. "로그인" 클릭

### 문서 업로드

1. 좌측 메뉴에서 "업로드" 클릭
2. PDF 또는 이미지 파일 선택
3. 요청자, 검토자 정보 입력 (선택)
4. "업로드" 클릭

### 문서 확인

1. "문서 목록" 메뉴 클릭
2. 업로드한 문서 확인
3. "미리보기" 버튼으로 문서 내용 확인

## 🤖 Chat Agent 사용 (QuickSuite 설정 필요)

Chat Agent를 사용하려면 추가 설정이 필요합니다:

1. **QuickSuite 구독**: Enterprise Edition 필요
2. **Chat Agent 생성**: QuickSuite 콘솔에서 생성
3. **MCP 연결**: QuickSuite에 AgentCore Gateway 연결
4. **Space 등록**: S3 버킷 및 Knowledge Base 설정

자세한 내용은 [배포 가이드](DEPLOYMENT.md)의 5-7단계를 참고하세요.

## 🐛 문제 해결

### 로그인 실패
```bash
# 사용자 상태 확인
aws cognito-idp admin-get-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username YOUR_EMAIL \
  --region us-east-1
```

### API 연결 오류
- `.env` 파일의 `VITE_API_BASE_URL` 확인
- API Gateway 배포 상태 확인
- 브라우저 콘솔에서 에러 메시지 확인

### 파일 업로드 실패
- S3 버킷 권한 확인
- 파일 크기 확인 (최대 50MB)
- 지원 형식 확인 (PDF, PNG, JPG, JPEG)

## 📚 더 알아보기

- [전체 설치 가이드](INSTALLATION.md) - 상세한 설치 방법
- [배포 가이드](DEPLOYMENT.md) - AWS 리소스 배포
- [AgentCore MCP 설정](AGENTCORE_MCP_SETUP.md) - MCP 통합
- [아키텍처 문서](ARCHITECTURE.md) - 시스템 구조
- [문제 해결 가이드](TROUBLESHOOTING.md) - 일반적인 문제

## 💡 팁

- **자동화 스크립트**: `scripts/` 폴더의 스크립트 활용
- **개발 모드**: 핫 리로드로 빠른 개발
- **로그 확인**: 브라우저 개발자 도구 활용

---

**축하합니다!** 🎉 Architecture Review System을 성공적으로 시작했습니다.

