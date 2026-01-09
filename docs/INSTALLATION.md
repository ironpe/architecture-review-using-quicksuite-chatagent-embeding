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

> **참고**: 위 명령어로 모든 패키지의 의존성이 자동으로 설치됩니다. 개별 패키지별로 설치할 필요는 없습니다.

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

CDK를 처음 사용하는 경우, 먼저 필요한 패키지들을 빌드한 후 부트스트랩을 진행합니다:

```bash
# 백엔드 빌드
cd packages/backend
npm run build

# MCP 서버 빌드
cd ../mcp-server
npm run build

# 계정 ID 확인
cd ../..
aws sts get-caller-identity --query Account --output text

# CDK 부트스트랩 (YOUR_ACCOUNT_ID와 YOUR_REGION을 실제 값으로 변경)
cd packages/infrastructure
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION
```

예시:
```bash
npx cdk bootstrap aws://123456789012/us-east-1
```

### 5. 환경 변수 설정

#### 프론트엔드 환경 변수

```bash
cd packages/frontend
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값을 설정:
- `VITE_AWS_REGION`: AWS 리전 (예: us-east-1)

**배포 후 업데이트 필요:**
- `VITE_API_BASE_URL`: API Gateway URL
- `VITE_USER_POOL_ID`: Cognito User Pool ID
- `VITE_USER_POOL_WEB_CLIENT_ID`: Cognito Client ID

#### 백엔드 환경 변수

```bash
cd packages/backend
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값을 설정:
- `AWS_REGION`: AWS 리전 (예: us-east-1)
- `AWS_ACCOUNT_ID`: 본인의 AWS 계정 ID
- `QUICKSIGHT_ACCOUNT_ID`: AWS 계정 ID (AWS_ACCOUNT_ID와 동일)

**배포 후 업데이트 필요:**
- `QUICKSIGHT_AGENT_ARN`: QuickSight Agent ARN
- `QUICKSIGHT_USER_NAME`: QuickSight 사용자 이름
- `QUICKSIGHT_EMBED_URL`: QuickSight Embed URL
- `BUCKET_NAME`: S3 버킷 이름(아키텍처 검토 문서를 업로드할 버킷명)

#### MCP 서버 환경 변수

```bash
cd packages/mcp-server
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값을 설정:
- `AWS_REGION`: AWS 리전 (예: us-east-1)
- `AWS_ACCOUNT_ID`: 본인의 AWS 계정 ID

**배포 후 업데이트 필요:**
- `TABLE_NAME`: DynamoDB 테이블 이름
- `BUCKET_NAME`: S3 버킷 이름(아키텍처 검토 결과를 저장할 버킷명)

> **참고**: 배포 후 업데이트가 필요한 값들은 [배포 가이드](DEPLOYMENT.md)를 완료한 후 CDK 출력 결과를 참고하여 설정하세요.

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

