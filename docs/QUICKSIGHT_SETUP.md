# QuickSuite 설정 가이드

## 📋 개요

이 가이드는 Architecture Review System에서 QuickSuite Chat Agent를 설정하는 방법을 안내합니다. QuickSuite Chat Agent는 AgentCore Gateway를 통해 MCP 도구를 사용하여 아키텍처 문서를 검토합니다.

> **사전 요구사항**: [배포 가이드](DEPLOYMENT.md)의 1-4단계를 완료해야 합니다.

## 🚀 설정 단계

### 1단계: QuickSuite 구독 활성화

> **중요**: QuickSuite Enterprise Edition 구독이 필요합니다.

1. AWS 콘솔에서 QuickSuite 서비스로 이동
2. QuickSuite 구독이 없다면 구독 시작
3. **Enterprise Edition** 선택 (Chat Agent 기능 필수)

### 2단계: QuickSuite 사용자 생성 (필요한 경우)

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

### 3단계: QuickSuite에 MCP 연결

1. QuickSuite 콘솔 접속
2. "Integrations" → "Actions" → "Model Context Protocol" → (+) 클릭
3. 다음 정보 입력 (`agentcore-setup-output.txt` 파일 참고):
   - **Name**: Architecture Review MCP
   - **Description**: `This is to store docs, query documents, and save review results of docs to S3 and DynamoDB.`
   - **URL**: GATEWAY_URL (예: `https://architecture-review-gateway-xxxxxx.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp`)
   - **Authentication method**: Service authentication
   - **Authentication type**: Service-to-service OAuth
   - **Client ID**: M2M_CLIENT_ID 값
   - **Client secret**: M2M_CLIENT_SECRET 값
   - **Token URL**: TOKEN_URL 값
4. "Connect" 클릭
5. 5개의 MCP 도구가 표시되는지 확인:
   - architecture-review-tools__get_document
   - architecture-review-tools__get_review
   - architecture-review-tools__list_documents
   - architecture-review-tools__save_review_to_s3
   - architecture-review-tools__update_review
6. "Done" 클릭

> **참고**: 도구 이름 앞에 타겟 이름(`architecture-review-tools__`)이 자동으로 붙습니다.

### 4단계: QuickSuite Space 등록

#### 4.1 S3 접근 권한 등록

QuickSuite가 S3 버킷에 접근할 수 있도록 권한을 설정합니다:

1. QuickSuite 콘솔 접속
2. 오른쪽 상단의 "Manage account" → "AWS resources" 클릭
3. "Select S3 buckets" 클릭 → 배포 출력의 FilesBucketName 선택
4. "Finish" 버튼 클릭 → "Save" 선택

#### 4.2 S3 Knowledge Base 생성

1. QuickSuite 콘솔 접속
2. "Integrations" → "Knowledge bases" 메뉴로 이동
3. "Amazon S3"에서 (+) 버튼 클릭
4. 다음 정보 입력:
   - **Name**: Architecture Review Documents
   - **AWS account**: 현재 계정 유지
   - **S3 bucket URL**: 배포 출력의 FilesBucketName (예: `s3://architecture-review-files-123456789012-us-east-1`)
   - **Metadata files folder location**: 빈칸 유지
5. "Create and continue" 클릭
6. Knowledge base details에 정보 입력:
   - **Name**: Architecture Review Documents
   - **Description**: 아키텍처 문서 저장소
   - **Content**: Add all content
7. "Create" 버튼 클릭

> **중요**: Knowledge base의 문서를 Indexing하는데 시간이 걸립니다. 상태가 "Available"로 변경될 때까지 기다리세요.

#### 4.3 Space 생성 및 Knowledge Base 연결

1. QuickSuite 콘솔에서 "Spaces" 메뉴로 이동
2. "Create space" 클릭
3. 다음 정보 입력:
   - **Space name**: Architecture Review Space
   - **Description**: 아키텍처 검토를 위한 작업 공간
4. "Knowledge bases" 섹션에서:
   - "Add knowledge bases" 클릭
   - 앞서 생성한 "Architecture Review Documents" 선택
5. "Add" 클릭
6. 기업의 자체 거버넌스 정책 문서가 있는 경우:
   - **File uploads** 섹션으로 이동
   - **Upload files** 클릭
   - 기업 거버넌스 파일 선택하여 Space에 파일 추가

#### 4.4 Chat Agent 생성

1. QuickSuite 콘솔에서 **Chat agents** 메뉴로 이동
2. **Create chat agent** 클릭
3. **Skip** 클릭
4. 다음 정보 입력:
   - **Name**: Architecture Review Agent
   - **Description**: 아키텍처 리뷰 에이전트
   - **Agent identity**: 당신은 AWS Well-Architected Framework의 6개 영역(운영 우수성, 보안, 안정성, 성능 효율성, 비용 최적화, 지속가능성)을 기반으로 아키텍처를 검토하는 전문 에이전트입니다.
   - **Persona instructions**: 
    ```
    ## 역할
    - 제출된 아키텍처 문서를 AWS Well-Architected 원칙에 따라 체계적으로 분석
    - https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html의 각 하위 영역 문서 참조
    - https://aws.amazon.com/ko/architecture/well-architected/의 모범사례 참조
    - 기업 거버넌스 정책 문서를 참조하여 준수 여부 검토
    - 개선 권고사항 및 우선순위 제시

    ## 검토 프로세스
    1. 아키텍처 개요 파악
    2. 각 영역별 상세 분석
    3. 거버넌스 정책 준수성 검토
    4. 위험도 평가 및 개선안 도출

    ## 출력 형식
    ### 📋 아키텍처 요약
    - 시스템 개요
    - 주요 구성요소
    - 아키텍처 다이어그램/구성도에 대한 요약 설명글

    ### 🔍 Well-Architected 영역별 분석
    각 영역마다:
    - ✅ 준수 항목
    - ⚠️ 개선 필요 항목  
    - 🚨 위험 항목
    - 권고사항

    ### 🏛️ 거버넌스 준수성
    - 정책 준수 현황
    - 위반 사항 및 영향도
    - 필수 조치사항

    ### 📊 종합 평가
    - 전체 점수 (A-F)
    - 비용 관점 주요 고려사항/우려 사항

    ### 추가 확인 필요 사항
    - 제시된 아키텍처 문서에서 모호한 부분에 대한 질문 리스트를 제공

    거버넌스 정책이 제공되지 않은 경우, 일반적인 엔터프라이즈 정책을 가정하여 검토합니다.
    ```
   - **Link spaces** 클릭하여, 생성한 **Architecture Review Space** 선택하고, **Link** 버튼 클릭
   - **Link actions** 클릭하여, 생성한 **Architecture Review MCP** 선택하고, **Link** 버튼 클릭
   - **Welcome message** 입력: 안녕하세요! 아키텍처 리뷰 에이전트입니다. Well-Architected Framework 기반의 아키텍처 분석을 도와드리겠습니다.
   - **Suggested prompts** 입력: 
     - 리뷰할 문서 목록 보여줘
     - 최근 업로드된 문서에 대해 리뷰해줘
5. **Launch chat agent** 버튼 클릭
6. Chat agent 생성 완료 후 **Agent ID 복사**

> **참고**: Agent ID는 Agent를 선택했을 때 브라우저 URL에 표시됩니다. 예를 들어, URL이 `https://us-east-1.quicksight.aws.amazon.com/sn/account/123456789012/agents/234934de-88b1-4b09-9229-16336cc55704/` 일 때, Agent ID는 `234934de-88b1-4b09-9229-16336cc55704` 입니다.

#### 4.5 Chat Agent 임베딩 URL 복사

1. QuickSuite 콘솔에서 **Chat agents** 메뉴로 이동
2. **action**의 **점 세개** 클릭하여 **Embed** 선택
3. **Share via embed** 탭에서 `src=` 뒤의 값 복사
   - 예: `https://us-east-1.quicksight.aws.amazon.com/sn/embed/share/accounts/YOUR_ACCOUNT_ID/chatagents/234934de-88b1-4b09-9229-16336cc55704?directory_alias=YOUR_QUICKSUITE_ACCOUNT_NAME`

### 5단계: 백엔드 환경 변수에 QuickSuite 정보 추가

위에서 복사해둔 값으로 `packages/backend/.env` 파일을 편집:

```bash
QUICKSIGHT_AGENT_ARN=arn:aws:quicksight:us-east-1:YOUR_ACCOUNT_ID:agent/YOUR_AGENT_ID
QUICKSIGHT_USER_NAME=YOUR_QUICKSIGHT_USER
QUICKSIGHT_EMBED_URL=https://us-east-1.quicksight.aws.amazon.com/sn/embed/share/accounts/YOUR_ACCOUNT_ID/chatagents/YOUR_AGENT_ID?directory_alias=YOUR_QUICKSUITE_ACCOUNT_NAME
```

예시:
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# QuickSight Configuration
QUICKSIGHT_ACCOUNT_ID=123456789012
QUICKSIGHT_AGENT_ARN=arn:aws:quicksight:us-east-1:123456789012:agent/234934de-88b1-4b09-9229-16336cc55704
QUICKSIGHT_NAMESPACE=default
QUICKSIGHT_USER_NAME=WSParticipantRole/Participant

# QuickSight Embed URL (optional - for direct sharing)
QUICKSIGHT_EMBED_URL=https://us-east-1.quicksight.aws.amazon.com/sn/embed/share/accounts/123456789012/chatagents/234934de-88b1-4b09-9229-16336cc55704?directory_alias=123456789012

# S3 Configuration
BUCKET_NAME=architecture-review-files-123456789012-us-east-1
```

### 6단계: Lambda 환경 변수 업데이트

백엔드 .env 파일을 업데이트한 후, Lambda 함수의 환경 변수도 업데이트해야 합니다.

**자동 업데이트 (권장):**

```bash
cd packages/infrastructure
./scripts/update-lambda-env.sh
```

**수동 업데이트:**

```bash
# QuickSight Embed Handler Lambda 함수 이름 확인
QUICKSIGHT_LAMBDA=$(aws lambda list-functions \
  --query "Functions[?contains(FunctionName, 'QuickSightEmbedHandler')].FunctionName" \
  --output text \
  --region us-east-1)

# Lambda 환경 변수 업데이트
aws lambda update-function-configuration \
  --function-name "$QUICKSIGHT_LAMBDA" \
  --environment "Variables={
    QUICKSIGHT_ACCOUNT_ID=YOUR_ACCOUNT_ID,
    QUICKSIGHT_AGENT_ARN=arn:aws:quicksight:us-east-1:YOUR_ACCOUNT_ID:agent/YOUR_AGENT_ID,
    QUICKSIGHT_NAMESPACE=default,
    QUICKSIGHT_USER_NAME=YOUR_QUICKSIGHT_USER
  }" \
  --region us-east-1
```

## ✅ 설정 완료 확인

### MCP 도구 확인

QuickSuite 콘솔에서 "Integrations" → "Actions" → "Model Context Protocol"로 이동하여 다음 5개 도구가 표시되는지 확인:

- ✅ architecture-review-tools__get_document
- ✅ architecture-review-tools__get_review
- ✅ architecture-review-tools__list_documents
- ✅ architecture-review-tools__save_review_to_s3
- ✅ architecture-review-tools__update_review

### Chat Agent 테스트

1. QuickSuite 콘솔에서 생성한 Chat Agent 선택
2. 테스트 메시지 입력:
   - "문서 목록을 보여줘"
   - "안녕하세요"
3. Agent가 응답하는지 확인

## 🎨 Chat Agent 사용 예시

### 문서 조회
```
"문서 목록을 보여줘"
"문서 b3ab4319...의 정보를 조회해줘"
```

### 검토 수행
```
"문서 b3ab4319...의 검토를 시작해줘. 검토자는 김철수로 설정해줘"
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

## 🐛 문제 해결

### MCP 도구가 표시되지 않음

1. AgentCore Gateway 상태 확인:
```bash
aws bedrock-agentcore-control get-gateway \
  --gateway-identifier YOUR_GATEWAY_ID \
  --region us-east-1
```

2. Lambda Target 상태 확인:
```bash
aws bedrock-agentcore-control list-gateway-targets \
  --gateway-identifier YOUR_GATEWAY_ID \
  --region us-east-1
```

3. MCP 연결 정보 재확인 (Client ID, Secret, Token URL)

### Chat Agent가 응답하지 않음

1. Lambda 로그 확인:
```bash
aws logs tail /aws/lambda/YOUR_LAMBDA_FUNCTION_NAME \
  --since 10m \
  --region us-east-1
```

2. Lambda 환경 변수 확인:
```bash
aws lambda get-function-configuration \
  --function-name YOUR_LAMBDA_FUNCTION_NAME \
  --region us-east-1 \
  --query 'Environment.Variables'
```

### Knowledge Base Indexing 실패

1. S3 버킷 권한 확인
2. QuickSuite가 S3 버킷에 접근할 수 있는지 확인
3. 버킷에 파일이 있는지 확인

## 💻 프론트엔드 통합

### Chat Widget 구현

프론트엔드에서 QuickSuite Chat Agent가 임베딩되어 있습니다:

```typescript
// packages/frontend/src/components/ChatWidget.tsx
const embedQuickChat = async (url: string, agentId?: string) => {
  const embeddingContext = await createEmbeddingContext();
  
  await embeddingContext.embedQuickChat(
    {
      url,
      container: containerRef.current,
      height: '100%',
      width: '100%',
    },
    {
      locale: 'ko-KR',
      agentOptions: {
        fixedAgentId: agentId,  // 백엔드에서 받은 Agent ID 사용
      },
    }
  );
};
```

### UI 특징

- ✅ 우측 패널에 채팅 창 임베딩
- ✅ 크기 조절 가능 (300px-800px)
- ✅ 채팅 버튼으로 열기/닫기
- ✅ 반응형 레이아웃

## 📊 비용

- **QuickSuite Enterprise Edition**: 사용자당 월 $18-24
- **임베드 세션**: 추가 비용 없음
- **API 호출**: 무료
- **AgentCore Gateway**: 사용량 기반

## 📚 참고 자료

- [QuickSuite Embedded Chat](https://aws.amazon.com/blogs/business-intelligence/announcing-embedded-chat-in-amazon-quick-suite/)
- [QuickSuite Embedding SDK](https://github.com/awslabs/amazon-quicksight-embedding-sdk)
- [MCP 프로토콜](https://modelcontextprotocol.io/)
- [AgentCore MCP 설정 가이드](AGENTCORE_MCP_SETUP.md) - MCP 통합 상세 가이드

---

**마지막 업데이트**: 2026-01-09  
**상태**: ✅ 완료
