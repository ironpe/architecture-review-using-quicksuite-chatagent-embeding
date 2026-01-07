# QuickSuite Chat Agent 설정 가이드

## 📋 개요

Architecture Review System에 Amazon QuickSuite Chat Agent가 통합되어 있습니다. 사용자는 우측 패널의 채팅 창을 통해 문서 조회, 검토 관리, 다이어그램 생성 등의 작업을 수행할 수 있습니다.

## ✅ 구현 완료 사항

### 1. QuickSuite Chat Agent
- **Agent ID**: `YOUR_AGENT_ID`
- **Agent ARN**: `arn:aws:quicksight:YOUR_REGION:YOUR_ACCOUNT_ID:agent/YOUR_AGENT_ID`
- **User**: `YOUR_QUICKSIGHT_USER` (IAM 사용자)
- **Namespace**: `default`

### 2. 임베딩 방식
- **방법**: Registered User Embedding
- **SDK**: amazon-quicksight-embedding-sdk v2.11.1
- **Experience**: QuickChat
- **Locale**: ko-KR

### 3. UI 통합
- ✅ 우측 패널에 채팅 창 임베딩
- ✅ 크기 조절 가능 (300px-800px)
- ✅ 채팅 버튼으로 열기/닫기
- ✅ 반응형 레이아웃

### 4. MCP Actions 통합
QuickSuite Chat Agent가 AgentCore Gateway를 통해 다음 작업 수행:
- `get_document` - 문서 정보 조회
- `list_documents` - 문서 목록 조회
- `update_review` - 검토 정보 업데이트
- `save_review_to_s3` - 검토 결과 저장
- `generate_diagram` - Mermaid 다이어그램 생성

## 🔧 환경 변수 설정

### 백엔드 (.env)
```bash
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=YOUR_AWS_ACCOUNT_ID

# QuickSuite
QUICKSIGHT_ACCOUNT_ID=YOUR_AWS_ACCOUNT_ID
QUICKSIGHT_AGENT_ARN=arn:aws:quicksight:YOUR_REGION:YOUR_ACCOUNT_ID:agent/YOUR_AGENT_ID
QUICKSIGHT_NAMESPACE=default
QUICKSIGHT_USER_NAME=YOUR_QUICKSIGHT_USER
```

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

### 다이어그램 생성
```
"문서 b3ab4319...의 QuickSuite BI 아키텍처 다이어그램을 생성해줘"
```

## 🔐 AgentCore Gateway 연결

QuickSuite Chat Agent를 MCP 도구와 연결하는 방법은 `AGENTCORE_MCP_SETUP.md`를 참조하세요.

### 간단 요약
- **Gateway URL**: `https://YOUR_GATEWAY_ID.gateway.bedrock-agentcore.YOUR_REGION.amazonaws.com/mcp`
- **Client ID**: `YOUR_MCP_CLIENT_ID`
- **Token URL**: `https://YOUR_COGNITO_DOMAIN.auth.YOUR_REGION.amazoncognito.com/oauth2/token`

상세한 설정 방법은 `AGENTCORE_MCP_SETUP.md` 문서를 참조하세요.

## 💻 기술 구현

### 1. 백엔드 API
```typescript
// packages/backend/src/handlers/quicksight-embed.ts
export const handler = async (event: APIGatewayProxyEvent) => {
  const embedUrl = await quicksight.generateEmbedUrlForRegisteredUser({
    AwsAccountId: QUICKSIGHT_ACCOUNT_ID,
    ExperienceConfiguration: {
      QuickChat: {
        InitialAgentId: AGENT_ID,
      },
    },
    UserArn: `arn:aws:quicksight:${AWS_REGION}:${QUICKSIGHT_ACCOUNT_ID}:user/${QUICKSIGHT_NAMESPACE}/${QUICKSIGHT_USER_NAME}`,
  });
  
  return { embedUrl: embedUrl.EmbedUrl };
};
```

### 2. 프론트엔드 통합
```typescript
// packages/frontend/src/components/ChatWidget.tsx
import { embedQuickChat } from 'amazon-quicksight-embedding-sdk';

const embedChat = async () => {
  const { embedUrl } = await getQuickSuiteEmbedUrl();
  
  const chat = await embedQuickChat({
    url: embedUrl,
    container: containerRef.current,
    locale: 'ko-KR',
  });
};
```

## 🎯 UI 커스터마이징

### 채팅 창 크기 조절
```typescript
// packages/frontend/src/components/ChatWidget.tsx
const [chatWidth, setChatWidth] = useState(450); // 기본 너비

// 최소: 300px, 최대: 800px
```

### 위치 변경
```typescript
// 우측 패널 (현재)
position: 'fixed',
right: 0,
top: 70,

// 하단으로 변경하려면:
bottom: 0,
```

## 🔐 IAM 권한

Lambda 실행 역할에 필요한 권한:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "quicksight:GenerateEmbedUrlForRegisteredUser",
        "quicksight:DescribeUser"
      ],
      "Resource": [
        "arn:aws:quicksight:YOUR_REGION:YOUR_ACCOUNT_ID:user/*",
        "arn:aws:quicksight:YOUR_REGION:YOUR_ACCOUNT_ID:agent/*"
      ]
    }
  ]
}
```

## 🐛 문제 해결

### Chat Widget이 표시되지 않음
1. 로그인 상태 확인
2. 브라우저 콘솔에서 에러 확인
3. `/quicksight/embed-url` API 응답 확인

### "My Assistant"로 표시됨
Agent ID가 올바르게 설정되지 않았습니다:
- 백엔드 `.env` 파일의 `QUICKSIGHT_AGENT_ARN` 확인
- `InitialAgentId` 설정 확인

### MCP 도구가 작동하지 않음
1. AgentCore Gateway 연결 상태 확인
2. Cognito Client ID 및 Token URL 확인
3. MCP 도구 등록 상태 확인

## 📊 비용

- **QuickSuite Enterprise Edition**: 사용자당 월 $18-24
- **임베드 세션**: 추가 비용 없음
- **API 호출**: 무료
- **AgentCore Gateway**: 사용량 기반

## 🔄 다음 단계 (선택사항)

### 추가 MCP 도구
- [ ] 문서 다운로드
- [ ] 검토 히스토리 조회
- [ ] 알림 전송
- [ ] 대시보드 생성

### 고급 기능
- [ ] 사용자별 권한 관리
- [ ] 다국어 지원 확장
- [ ] 음성 입력
- [ ] 파일 첨부

## 📚 참고 자료

- [QuickSuite Embedded Chat](https://aws.amazon.com/blogs/business-intelligence/announcing-embedded-chat-in-amazon-quick-suite/)
- [QuickSuite Embedding SDK](https://github.com/awslabs/amazon-quicksight-embedding-sdk)
- [MCP 프로토콜](https://modelcontextprotocol.io/)
- `AGENTCORE_MCP_SETUP.md` - AgentCore Gateway 및 MCP 설정 가이드

---

**마지막 업데이트**: 2026-01-06  
**상태**: ✅ 완료
