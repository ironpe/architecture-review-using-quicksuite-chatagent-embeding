# Architecture Review System - 기술 아키텍처

## 📐 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph "사용자"
        User[👤 사용자<br/>브라우저]
    end

    subgraph "프론트엔드 - React + Vite"
        Frontend[React Application<br/>localhost:5173]
        AuthContext[Auth Context<br/>Amplify]
        ChatWidget[Chat Widget<br/>QuickSuite SDK]
    end

    subgraph "AWS 인증"
        Cognito[Amazon Cognito<br/>User Pool]
        CognitoClient[App Client<br/>Web + MCP]
    end

    subgraph "AWS API Layer"
        APIGateway[API Gateway<br/>REST API]
        CORS[CORS 설정]
    end

    subgraph "AWS Lambda Functions"
        UploadHandler[Upload URL<br/>Handler]
        MetadataHandler[Metadata<br/>Handler]
        ListHandler[List Documents<br/>Handler]
        SearchHandler[Search<br/>Handler]
        GetHandler[Get Document<br/>Handler]
        DeleteHandler[Delete<br/>Handler]
        ReviewHandler[Update Review<br/>Handler]
        GetReviewHandler[Get Review<br/>Handler]
        QSHandler[QuickSuite<br/>Embed Handler]
        MCPHandler[MCP Server<br/>Handler]
    end

    subgraph "AWS Storage & Database"
        S3[Amazon S3<br/>문서 저장]
        DynamoDB[DynamoDB<br/>메타데이터]
    end

    subgraph "AWS AI/BI Services"
        QuickSuite[Amazon QuickSuite<br/>Chat Agent]
        AgentCore[Bedrock AgentCore<br/>Gateway]
    end

    User -->|HTTPS| Frontend
    Frontend -->|Cognito Auth| AuthContext
    AuthContext -->|signIn/signOut| Cognito
    Frontend -->|API Calls + JWT| APIGateway
    Frontend -->|Embed Request| ChatWidget
    
    ChatWidget -->|Get Embed URL| QSHandler
    QSHandler -->|Generate URL| QuickSuite
    ChatWidget -->|Chat Interface| QuickSuite
    
    APIGateway --> CORS
    APIGateway --> UploadHandler
    APIGateway --> MetadataHandler
    APIGateway --> ListHandler
    APIGateway --> SearchHandler
    APIGateway --> GetHandler
    APIGateway --> DeleteHandler
    APIGateway --> ReviewHandler
    APIGateway --> GetReviewHandler
    APIGateway --> QSHandler
    APIGateway --> MCPHandler
    
    UploadHandler -->|Pre-signed URL| S3
    MetadataHandler -->|Write| DynamoDB
    ListHandler -->|Query| DynamoDB
    SearchHandler -->|Scan| DynamoDB
    GetHandler -->|Get Item| DynamoDB
    DeleteHandler -->|Delete| S3
    DeleteHandler -->|Delete| DynamoDB
    ReviewHandler -->|Update| DynamoDB
    GetReviewHandler -->|Get| S3
    
    QuickSuite -->|MCP Actions| AgentCore
    AgentCore -->|Cognito JWT| CognitoClient
    AgentCore -->|Invoke| MCPHandler
    MCPHandler -->|CRUD| DynamoDB
    MCPHandler -->|Read/Write| S3

    style User fill:#e1f5ff
    style Frontend fill:#fff4e6
    style Cognito fill:#ffe6e6
    style APIGateway fill:#e6f3ff
    style S3 fill:#e6ffe6
    style DynamoDB fill:#e6ffe6
    style QuickSuite fill:#f3e6ff
    style AgentCore fill:#f3e6ff
```

## 🔐 인증 흐름

```mermaid
sequenceDiagram
    participant User as 👤 사용자
    participant Frontend as React App
    participant Cognito as Cognito User Pool
    participant API as API Gateway
    participant Lambda as Lambda Function

    User->>Frontend: 로그인 (username/password)
    Frontend->>Cognito: signIn()
    Cognito-->>Frontend: Access Token + ID Token + Refresh Token
    Frontend->>Frontend: 토큰 저장 (Amplify)
    
    User->>Frontend: API 요청 (문서 조회)
    Frontend->>Frontend: fetchAuthSession()
    Frontend->>API: GET /documents<br/>[Authorization: Bearer token]
    API->>Lambda: Invoke
    Lambda->>Lambda: 비즈니스 로직 실행
    Lambda-->>API: 응답
    API-->>Frontend: JSON 응답
    Frontend-->>User: 화면 표시

    Note over Frontend,Cognito: 토큰 만료 시 자동 갱신
    Frontend->>Cognito: Refresh Token으로 갱신
    Cognito-->>Frontend: 새 Access Token
```

## 📄 문서 업로드 흐름

```mermaid
sequenceDiagram
    participant User as 👤 사용자
    participant Frontend as React App
    participant API as API Gateway
    participant UploadLambda as Upload URL Lambda
    participant MetadataLambda as Metadata Lambda
    participant S3 as Amazon S3
    participant DynamoDB as DynamoDB

    User->>Frontend: 파일 선택 + 정보 입력
    Frontend->>API: POST /documents/upload-url<br/>{filename, fileType, fileSize}
    API->>UploadLambda: Invoke
    UploadLambda->>S3: Generate Pre-signed URL
    S3-->>UploadLambda: Pre-signed URL
    UploadLambda-->>API: {uploadUrl, s3Key, documentId}
    API-->>Frontend: Upload URL 응답
    
    Frontend->>S3: PUT (Pre-signed URL)<br/>파일 업로드
    S3-->>Frontend: 200 OK
    
    Frontend->>API: POST /documents/metadata<br/>{documentId, metadata}
    API->>MetadataLambda: Invoke
    MetadataLambda->>DynamoDB: PutItem
    DynamoDB-->>MetadataLambda: Success
    MetadataLambda-->>API: Success
    API-->>Frontend: 200 OK
    Frontend-->>User: 업로드 완료 메시지
```

## 💬 QuickSuite Chat Agent 통합

```mermaid
sequenceDiagram
    participant User as 👤 사용자
    participant ChatWidget as Chat Widget
    participant QSLambda as QuickSuite Lambda
    participant QuickSuite as QuickSuite Agent
    participant AgentCore as AgentCore Gateway
    participant Cognito as Cognito (MCP Client)
    participant MCPLambda as MCP Lambda
    participant DynamoDB as DynamoDB

    User->>ChatWidget: 채팅 버튼 클릭
    ChatWidget->>QSLambda: GET /quicksight/embed-url
    QSLambda->>QuickSuite: GenerateEmbedUrlForRegisteredUser
    QuickSuite-->>QSLambda: Embed URL
    QSLambda-->>ChatWidget: {embedUrl}
    ChatWidget->>ChatWidget: embedQuickChat(url)
    ChatWidget-->>User: 채팅 창 표시
    
    User->>QuickSuite: "문서 목록을 보여줘"
    QuickSuite->>AgentCore: MCP Action: list_documents
    AgentCore->>Cognito: Get OAuth Token
    Cognito-->>AgentCore: Access Token
    AgentCore->>MCPLambda: Invoke with token
    MCPLambda->>DynamoDB: Query documents
    DynamoDB-->>MCPLambda: Document list
    MCPLambda-->>AgentCore: MCP Response
    AgentCore-->>QuickSuite: Action Result
    QuickSuite-->>User: "다음 문서들이 있습니다..."
```

## 🔧 MCP 도구 아키텍처

```mermaid
graph LR
    subgraph "QuickSuite Chat Agent"
        Agent[Chat Agent]
    end

    subgraph "AgentCore Gateway"
        Gateway[Gateway]
        Auth[Cognito JWT<br/>Authentication]
    end

    subgraph "MCP Lambda Handler"
        MCPServer[MCP Server<br/>Handler]
        Tools[MCP Tools]
    end

    subgraph "MCP Tools"
        Tool1[get_document]
        Tool2[list_documents]
        Tool3[update_review]
        Tool4[save_review_to_s3]
        Tool5[generate_diagram]
    end

    subgraph "AWS Resources"
        DDB[(DynamoDB)]
        S3B[S3 Bucket]
    end

    Agent -->|MCP Protocol| Gateway
    Gateway -->|Authenticate| Auth
    Gateway -->|Invoke| MCPServer
    MCPServer --> Tools
    Tool1 --> DDB
    Tool2 --> DDB
    Tool3 --> DDB
    Tool4 --> S3B
    Tool5 --> S3B

    style Agent fill:#f3e6ff
    style Gateway fill:#ffe6f0
    style MCPServer fill:#e6f3ff
    style Tools fill:#fff4e6
```

## 🗄️ 데이터 모델

```mermaid
erDiagram
    DOCUMENT {
        string documentId PK
        string filename
        string fileType
        number fileSize
        string s3Key
        number uploadTimestamp
        string uploadDate
        string requester
        string reviewer
        string architectureOverview
        string reviewDate
        string completeDate
        boolean reviewCompleted
        string reviewResultLocation
    }

    S3_BUCKET {
        string key
        binary fileContent
        string reviewMarkdown
    }

    DOCUMENT ||--o{ S3_BUCKET : "stores files and reviews in"
```

**실제 구현:**
- **DynamoDB 테이블**: `architecture-review-documents` (문서 메타데이터 저장)
- **S3 버킷**: `architecture-review-files-*` (파일 및 검토 결과 저장)
  - 업로드된 파일: `documents/{documentId}/{filename}`
  - 검토 결과: `reviews/{documentId}/review.md`

## 🌐 네트워크 아키텍처

```mermaid
graph TB
    subgraph "Public Internet"
        Browser[사용자 브라우저]
    end

    subgraph "AWS Cloud - us-east-1"
        subgraph "Edge Services"
            CloudFront[CloudFront<br/>선택사항]
        end

        subgraph "Application Layer"
            ALB[Application Load Balancer<br/>선택사항]
            APIGW[API Gateway<br/>REST API]
        end

        subgraph "Compute Layer"
            Lambda1[Lambda Functions<br/>Node.js 18.x]
            Lambda2[MCP Server<br/>Node.js 18.x]
        end

        subgraph "Storage Layer"
            S3[S3 Bucket<br/>문서 저장]
            DDB[DynamoDB<br/>메타데이터]
        end

        subgraph "Security & Auth"
            Cognito[Cognito User Pool<br/>인증]
            IAM[IAM Roles<br/>권한]
        end

        subgraph "AI/BI Services"
            QS[QuickSuite<br/>Chat Agent]
            AC[AgentCore<br/>Gateway]
        end
    end

    Browser -->|HTTPS| CloudFront
    CloudFront -->|HTTPS| APIGW
    Browser -->|Direct HTTPS| APIGW
    
    APIGW --> Lambda1
    APIGW --> Lambda2
    
    Lambda1 --> S3
    Lambda1 --> DDB
    Lambda2 --> S3
    Lambda2 --> DDB
    
    Lambda1 -.->|Assume Role| IAM
    Lambda2 -.->|Assume Role| IAM
    
    Browser -->|Auth| Cognito
    QS -->|MCP| AC
    AC -->|JWT| Cognito
    AC --> Lambda2

    style Browser fill:#e1f5ff
    style APIGW fill:#e6f3ff
    style Lambda1 fill:#fff4e6
    style Lambda2 fill:#fff4e6
    style S3 fill:#e6ffe6
    style DDB fill:#e6ffe6
    style Cognito fill:#ffe6e6
    style QS fill:#f3e6ff
    style AC fill:#f3e6ff
```

## 🔄 CI/CD 파이프라인 (권장)

```mermaid
graph LR
    subgraph "개발"
        Dev[개발자]
        Git[Git Repository]
    end

    subgraph "빌드"
        Build[npm run build]
        Test[npm test]
        CDK[cdk synth]
    end

    subgraph "배포"
        Deploy[cdk deploy]
        Lambda[Lambda 업데이트]
        S3Deploy[S3 업로드]
    end

    subgraph "AWS 환경"
        Prod[프로덕션]
    end

    Dev -->|git push| Git
    Git -->|trigger| Build
    Build --> Test
    Test --> CDK
    CDK --> Deploy
    Deploy --> Lambda
    Deploy --> S3Deploy
    Lambda --> Prod
    S3Deploy --> Prod

    style Dev fill:#e1f5ff
    style Build fill:#fff4e6
    style Deploy fill:#e6ffe6
    style Prod fill:#f3e6ff
```

## 📊 기술 스택 요약

### 프론트엔드
- **프레임워크**: React 18.2 + TypeScript
- **빌드 도구**: Vite 5.0
- **UI 라이브러리**: Material-UI 7.3
- **상태 관리**: React Context
- **인증**: AWS Amplify 6.0
- **HTTP 클라이언트**: Axios 1.6
- **마크다운**: react-markdown 10.1
- **QuickSuite**: amazon-quicksight-embedding-sdk 2.11

### 백엔드
- **런타임**: Node.js 18.x
- **언어**: TypeScript
- **AWS SDK**: @aws-sdk v3
- **빌드**: esbuild
- **테스트**: Vitest

### 인프라
- **IaC**: AWS CDK 2.172
- **언어**: TypeScript
- **배포**: CloudFormation

### AWS 서비스
- **컴퓨트**: Lambda
- **API**: API Gateway (REST)
- **스토리지**: S3
- **데이터베이스**: DynamoDB
- **인증**: Cognito
- **AI/BI**: QuickSuite, Bedrock AgentCore
- **모니터링**: CloudWatch (기본)

## 🔒 보안 아키텍처

```mermaid
graph TB
    subgraph "인증 계층"
        User[사용자]
        Cognito[Cognito User Pool]
        JWT[JWT Token]
    end

    subgraph "API 계층"
        APIGW[API Gateway]
        CORS[CORS Policy]
        Throttle[Rate Limiting]
    end

    subgraph "애플리케이션 계층"
        Lambda[Lambda Functions]
        IAM[IAM Roles]
    end

    subgraph "데이터 계층"
        S3[S3 Bucket]
        DDB[DynamoDB]
        Encryption[암호화]
    end

    User -->|Login| Cognito
    Cognito -->|Issue| JWT
    User -->|API Call + JWT| APIGW
    APIGW -->|Validate| CORS
    APIGW -->|Check| Throttle
    APIGW -->|Invoke| Lambda
    Lambda -->|Assume| IAM
    Lambda -->|Access| S3
    Lambda -->|Access| DDB
    S3 -.->|At Rest| Encryption
    DDB -.->|At Rest| Encryption

    style Cognito fill:#ffe6e6
    style JWT fill:#ffe6e6
    style IAM fill:#ffe6e6
    style Encryption fill:#ffe6e6
```

---

**작성일**: 2026-01-06  
**버전**: 1.1.0  
**상태**: ✅ 완료
