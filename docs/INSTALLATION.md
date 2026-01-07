# 설치 가이드

이 문서는 Architecture Review System을 로컬 환경에 설치하는 방법을 안내합니다.

## 📋 사전 요구사항

### 필수 소프트웨어
- **Node.js**: 18.x 이상
- **npm**: 9.x 이상
- **AWS CLI**: 2.x 이상
- **AWS CDK**: 2.x 이상
- **Git**: 최신 버전

### AWS 계정 요구사항
- AWS 계정 (관리자 권한 권장)
- AWS CLI 자격 증명 설정 완료
- 다음 AWS 서비스 사용 권한:
  - Lambda
  - API Gateway
  - S3
  - DynamoDB
  - Cognito
  - QuickSight
  - Bedrock AgentCore

## 🔧 설치 단계

### 1. 리포지토리 클론

```bash
git clone https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding.git
cd architecture-review-using-quicksuite-chatagent-embeding
```

### 2. 의존성 설치

```bash
# 루트 레벨 의존성 설치
npm install

# 모든 패키지 의존성 설치 (workspaces)
npm install --workspaces
```

또는 각 패키지별로 설치:

```bash
# 프론트엔드
cd packages/frontend
npm install

# 백엔드
cd ../backend
npm install

# 인프라
cd ../infrastructure
npm install

# MCP 서버
cd ../mcp-server
npm install
```

### 3. AWS CLI 설정

AWS CLI가 설정되어 있지 않다면:

```bash
aws configure
```

다음 정보를 입력:
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (예: us-east-1)
- Default output format (json)

### 4. AWS CDK 부트스트랩

CDK를 처음 사용하는 경우:

```bash
cd packages/infrastructure
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION
```

### 5. 환경 변수 설정

#### 프론트엔드 환경 변수

```bash
cd packages/frontend
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값을 설정:
- `VITE_API_BASE_URL`: API Gateway URL (배포 후 설정)
- `VITE_USER_POOL_ID`: Cognito User Pool ID (배포 후 설정)
- `VITE_USER_POOL_WEB_CLIENT_ID`: Cognito Client ID (배포 후 설정)
- `VITE_COGNITO_DOMAIN`: Cognito Domain (배포 후 설정)

#### 백엔드 환경 변수

```bash
cd packages/backend
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값을 설정:
- `AWS_ACCOUNT_ID`: 본인의 AWS 계정 ID
- `QUICKSIGHT_AGENT_ARN`: QuickSight Agent ARN (배포 후 설정)
- `QUICKSIGHT_USER_NAME`: QuickSight 사용자 이름
- `BUCKET_NAME`: S3 버킷 이름 (배포 후 설정)

#### MCP 서버 환경 변수

```bash
cd packages/mcp-server
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값을 설정:
- `AWS_ACCOUNT_ID`: 본인의 AWS 계정 ID
- `TABLE_NAME`: DynamoDB 테이블 이름 (배포 후 설정)
- `BUCKET_NAME`: S3 버킷 이름 (배포 후 설정)

## ✅ 설치 확인

### Node.js 버전 확인
```bash
node --version  # v18.x 이상
npm --version   # v9.x 이상
```

### AWS CLI 확인
```bash
aws --version
aws sts get-caller-identity  # AWS 자격 증명 확인
```

### CDK 확인
```bash
cdk --version  # 2.x 이상
```

### 의존성 설치 확인
```bash
# 루트에서
npm run build  # 모든 패키지 빌드 테스트
```

## 🚀 다음 단계

설치가 완료되었다면 [배포 가이드](DEPLOYMENT.md)를 참고하여 AWS 리소스를 배포하세요.

## 🐛 문제 해결

### Node.js 버전 문제
```bash
# nvm 사용 시
nvm install 18
nvm use 18
```

### AWS CLI 자격 증명 문제
```bash
# 자격 증명 재설정
aws configure

# 프로파일 사용 시
export AWS_PROFILE=your-profile-name
```

### npm 설치 오류
```bash
# 캐시 정리
npm cache clean --force

# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### CDK 부트스트랩 오류
```bash
# 권한 확인
aws sts get-caller-identity

# 리전 확인
aws configure get region
```

## 📞 추가 지원

문제가 계속되면 [GitHub Issues](https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/issues)에 문의하세요.
