# Architecture Review System

> Amazon QuickSuite Chat Agent를 이용한 아키텍처 검토 시스템 - QuickSuite Chat Agent와 Bedrock AgentCore Gateway를 활용한 자동화된 아키텍처 문서 검토

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AWS](https://img.shields.io/badge/AWS-Cloud-orange.svg)](https://aws.amazon.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## 📖 소개

이 Architecture Review System은 Amazon Quick Suite의 Space, MCP Action, Knowledge base를 이용한 Agentic AI 기반 아키텍처 검토 시스템입니다. Quick Suite Chat Agent와 Space, Bedrock AgentCore Gateway, Lambda Target(MCP)을 통합하여 아키텍처 문서의 자동화된 검토 프로세스를 제공합니다.

### ✨ 주요 기능

- 📄 **문서 관리**: PDF, 이미지 파일 업로드/프리뷰 및 관리 (최대 50MB)
- 🤖 **Agentic AI 기반 아키텍처 검토**: Quick Suite Chat Agent를 통한 대화형 아키텍처 검토
- � **Quick Suite Chat Agent Embedding**: 채팅 에이전트를 기업의 애플리케이션에 임베딩하여 일관된 UI/UX 제공
- 🔗 **MCP 통합**: Model Context Protocol을 통한 확장 가능한 도구 연동(아키텍처 검토 요청 문서 저장/조회/프리뷰, 아키텍처 검토 상태 변경/검토 결과 저장 등)
- 🔐 **보안 인증**: AWS Cognito 기반 사용자 인증 및 AgentCore Gateway 인증
- 📊 **검토 결과 관리**: 마크다운 형식의 검토 결과 저장 및 보기
- 🎨 **직관적인 UI**: Material-UI 기반의 반응형 웹 인터페이스(프론트엔드)

### 🎬 데모

![Architecture Review System Demo](docs/images/demo.gif)

## 🏗️ 아키텍처

```mermaid
graph TB
    User[👤 사용자] --> Frontend[React Frontend]
    Frontend --> APIGateway[API Gateway]
    Frontend --> Cognito[Cognito Auth]
    Frontend --> QuickSuite[QuickSuite Chat]
    
    APIGateway --> Lambda[Lambda Functions]
    Lambda --> S3[S3 Storage]
    Lambda --> DynamoDB[DynamoDB]
    
    QuickSuite --> AgentCore[AgentCore Gateway]
    AgentCore --> MCPLambda[MCP Lambda]
    MCPLambda --> S3
    MCPLambda --> DynamoDB
```

자세한 아키텍처는 [ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참고하세요.

## 🚀 빠른 시작

> **5분 안에 시작하기**: [빠른 시작 가이드](docs/QUICKSTART.md)를 참고하여 자동화 스크립트로 빠르게 시작할 수 있습니다.

### 사전 요구사항

- Node.js 18 이상
- AWS CLI 2.x 이상
- AWS CDK 2.x 이상
- AWS 계정 (관리자 권한 권장)
- QuickSuite Enterprise Edition 구독

### 전체 설정 프로세스

이 시스템을 완전히 설정하고 아키텍처 문서 리뷰를 수행하려면 다음 단계를 순서대로 진행하세요:

#### 📖 1단계: 기본 설치 및 배포
1. **[설치 가이드](docs/INSTALLATION.md)** - 사전 요구사항 및 환경 설정
2. **[배포 가이드](docs/DEPLOYMENT.md)** - AWS 리소스 배포
   - CDK 인프라 배포 (Lambda, API Gateway, DynamoDB, S3)
   - AgentCore Gateway 설정 (Cognito 포함)
   - 환경 변수 자동 업데이트
   - Cognito 사용자 생성
3. **[빠른 시작 가이드](docs/QUICKSTART.md)** - 자동화 스크립트로 5분 안에 시작

#### 🤖 2단계: QuickSuite 통합 (선택 사항)
4. **[QuickSuite 설정 가이드](docs/QUICKSIGHT_SETUP.md)** - Chat Agent, Space, Knowledge Base 생성
5. **[AgentCore MCP 설정 가이드](docs/AGENTCORE_MCP_SETUP.md)** - MCP 도구 연동 상세 가이드

> **참고**: 1단계만 완료해도 문서 업로드/관리 기능은 사용 가능합니다. QuickSuite Chat Agent 기능이 필요한 경우에만 2단계를 진행하세요.

#### ✅ 3단계: 아키텍처 문서 리뷰 수행
6. 프론트엔드에서 아키텍처 문서 업로드
7. QuickSuite Chat Agent를 통해 문서 검토
8. 검토 결과 확인 및 저장

### 자동화 스크립트를 사용한 빠른 설치

자동화 스크립트를 사용하면 대부분의 설정을 자동으로 완료할 수 있습니다:

```bash
# 1. 리포지토리 클론
git clone https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding.git
cd architecture-review-using-quicksuite-chatagent-embeding

# 2. 의존성 설치
npm install --workspaces

# 3. 백엔드 및 MCP 서버 빌드
cd packages/backend && npm run build && cd ../..
cd packages/mcp-server && npm run build && cd ../..

# 4. CDK 부트스트랩 및 배포
cd packages/infrastructure
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
npx cdk deploy --all --require-approval never

# 5. AgentCore Gateway 자동 설정
./scripts/setup-agentcore.sh

# 6. 환경 변수 자동 업데이트
./scripts/update-env.sh

# 7. Cognito 사용자 생성
./scripts/create-cognito-user.sh

# 8. 프론트엔드 실행
cd ../../packages/frontend
npm run dev
```

브라우저에서 http://localhost:5173 접속

> **참고**: QuickSuite Chat Agent 기능을 사용하려면 5-7단계(QuickSuite 설정, MCP 연결, Space 등록)를 추가로 완료해야 합니다. 자세한 내용은 [배포 가이드](docs/DEPLOYMENT.md)를 참고하세요.

## 📚 문서

### 시작하기
- [설치 가이드](docs/INSTALLATION.md) - 상세한 설치 방법
- [배포 가이드](docs/DEPLOYMENT.md) - AWS 리소스 배포
- [빠른 시작](docs/QUICKSTART.md) - 자동화 스크립트로 5분 안에 시작하기

### 설정 가이드
- [Cognito 통합](docs/COGNITO_INTEGRATION.md) - 인증 설정
- [Quick Suite 설정](docs/QUICKSIGHT_SETUP.md) - Chat Agent 설정
- [AgentCore Gateway+MCP 통합 설정](docs/AGENTCORE_MCP_SETUP.md) - MCP 도구 연동

### 참고 자료
- [아키텍처](docs/ARCHITECTURE.md) - 시스템 아키텍처
- [프로젝트 요약](docs/PROJECT_SUMMARY.md) - 전체 프로젝트 개요
- [문제 해결](docs/TROUBLESHOOTING.md) - 일반적인 문제 해결
- [문제 해결](docs/TROUBLESHOOTING.md) - 일반적인 문제 해결

## 🛠️ 기술 스택

### 프론트엔드
- **프레임워크**: React 18.3 + TypeScript
- **빌드 도구**: Vite 5.0
- **UI 라이브러리**: Material-UI 7.3
- **상태 관리**: React Context
- **인증**: AWS Amplify 6.0
- **QuickSight**: amazon-quicksight-embedding-sdk 2.11

### 백엔드
- **런타임**: Node.js 18.x
- **언어**: TypeScript
- **AWS SDK**: @aws-sdk v3
- **빌드**: esbuild
- **테스트**: Vitest

### 인프라
- **IaC**: AWS CDK 2.172
- **언어**: TypeScript

### AWS 서비스
- **컴퓨트**: Lambda
- **API**: API Gateway (REST)
- **스토리지**: S3
- **데이터베이스**: DynamoDB
- **인증**: Cognito
- **AI/BI**: Quick Suite Chat Agent, Bedrock AgentCore

## 📦 프로젝트 구조

```
.
├── packages/
│   ├── frontend/          # React 프론트엔드
│   ├── backend/           # Lambda 함수
│   ├── infrastructure/    # CDK 인프라 코드
│   ├── mcp-server/        # MCP 서버
│   └── diagram-generator/ # 다이어그램 생성 (Python)
├── docs/                  # 문서
├── scripts/               # 배포 및 유틸리티 스크립트
├── README.md
└── LICENSE
```

## 🎯 주요 기능 상세

### 1. 문서 관리
- PDF, PNG, JPG, JPEG 파일 업로드 (최대 50MB)
- S3 기반 안전한 파일 저장
- DynamoDB를 통한 메타데이터 관리
- 파일명 기반 검색 기능
- 브라우저 내 문서 미리보기

### 2. Agentic AI 기반 아키텍처 검토
- Quick Suite Chat Agent 통합
- 자연어 대화를 통한 아키텍처 검토
- MCP 프로토콜 기반 도구 연동 : 검토 대상/결과 파일 저장, 검토 대상 조회, 검토 결과 상태 저장
- 검토 결과 자동 저장 : DynamoDB

### 3. 검토 관리
- 검토자, 아키텍처 개요 등 메타데이터 관리
- 검토 상태 추적 (검토 필요/완료)
- 마크다운 형식의 검토 결과 저장
- 검토 결과 렌더링 및 표시

### 4. 보안
- AWS Cognito 기반 사용자 인증
- JWT 토큰 기반 API 인증
- S3 Pre-signed URL을 통한 안전한 파일 업로드
- IAM 역할 기반 권한 관리

## � 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 🙏 감사의 말

이 프로젝트는 다음 AWS 서비스와 오픈소스 프로젝트를 활용합니다:

- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon Quick Suite](https://aws.amazon.com/quicksuite/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/)
- [AWS CDK](https://aws.amazon.com/cdk/)
- [React](https://reactjs.org/)
- [Material-UI](https://mui.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## 🔗 관련 링크

- [Amazon Quick Suite Embedded Chat Agent](https://aws.amazon.com/blogs/business-intelligence/announcing-embedded-chat-in-amazon-quick-suite/)
- [Quick Suite with MCP](https://aws.amazon.com/ko/blogs/machine-learning/connect-amazon-quick-suite-to-enterprise-apps-and-agents-with-mcp)
- [QuickSight Embedding SDK](https://github.com/awslabs/amazon-quicksight-embedding-sdk)
- [Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---


⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!
