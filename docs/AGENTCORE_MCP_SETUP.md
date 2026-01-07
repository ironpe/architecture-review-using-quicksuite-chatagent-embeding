# AgentCore Gateway & MCP 설정 가이드

## 📋 개요

Amazon Bedrock AgentCore Gateway를 통해 QuickSight Chat Agent가 Lambda 함수를 MCP(Model Context Protocol) 도구로 사용할 수 있습니다.

## ✅ 구현 완료 사항

### AgentCore Gateway
- **Gateway ID**: `architecture-review-gateway-kpbft8efvb`
- **URL**: `https://architecture-review-gateway-kpbft8efvb.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp`
- **인증**: Cognito JWT (2LO)
- **리전**: us-east-1

### MCP 도구 (5개)
1. `get_document` - 문서 정보 조회
2. `list_documents` - 문서 목록 조회
3. `update_review` - 검토 정보 업데이트
4. `save_review_to_s3` - 검토 결과 마크다운 저장
5. `generate_diagram` - Mermaid 다이어그램 생성

## 🔐 Cognito 인증 설정

### Cognito User Pool
- **User Pool ID**: `us-east-1_NBuxDH6cg`
- **Domain**: `arch-review-1767661637.auth.us-east-1.amazoncognito.com`

### MCP Client (Machine-to-Machine)
- **Client ID**: `4vggdif6mbjps9gj3kj5equriv`
- **OAuth Flow**: `client_credentials`
- **Scopes**: `architecture-review/read`, `architecture-review/write`
- **Token URL**: `https://arch-review-1767661637.auth.us-east-1.amazoncognito.com/oauth2/token`

## 🚀 QuickSight에서 MCP 연결

### 1. QuickSight 콘솔 접속
```
https://us-east-1.quicksight.aws.amazon.com/sn/start
```

### 2. MCP 통합 추가
1. 좌측 메뉴에서 **Integrations** 클릭
2. **Actions** → **Model Context Protocol** (+) 클릭
3. 다음 정보 입력:

**Connection Details:**
- **Name**: Architecture Review MCP
- **URL**: `https://architecture-review-gateway-kpbft8efvb.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp`

**Authentication:**
- **Auth Type**: Service authentication (2LO)
- **Client ID**: `4vggdif6mbjps9gj3kj5equriv`
- **Client Secret**: (Cognito에서 확인)
- **Token URL**: `https://arch-review-1767661637.auth.us-east-1.amazoncognito.com/oauth2/token`

### 3. 도구 확인
연결 후 다음 5개 도구가 표시되어야 합니다:
- ✅ get_document
- ✅ list_documents
- ✅ update_review
- ✅ save_review_to_s3
- ✅ generate_diagram

### 4. Chat Agent에 연결
1. **Chat agents** 메뉴로 이동
2. Agent 선택 (ef4cec92-6280-4c25-8e9a-c49814b73283)
3. **Edit** → **Actions & Integrations**
4. MCP 통합 활성화

## 🔧 AgentCore Gateway 생성 (참고용)

이미 생성되어 있지만, 새로 생성해야 하는 경우:

### 1. Gateway 생성
```bash
aws bedrock-agentcore-control create-gateway \
  --gateway-name "architecture-review-gateway" \
  --authentication-configuration '{
    "type": "COGNITO_USER_POOL",
    "cognitoUserPoolConfiguration": {
      "userPoolArn": "arn:aws:cognito-idp:YOUR_REGION:YOUR_ACCOUNT_ID:userpool/YOUR_POOL_ID",
      "clientId": "YOUR_CLIENT_ID"
    }
  }' \
  --region us-east-1
```

### 2. Lambda Target 추가
```bash
aws bedrock-agentcore-control create-gateway-target \
  --gateway-identifier "architecture-review-gateway-kpbft8efvb" \
  --target-name "mcp-server" \
  --target-configuration '{
    "type": "LAMBDA",
    "lambdaConfiguration": {
      "lambdaArn": "arn:aws:lambda:YOUR_REGION:YOUR_ACCOUNT_ID:function:McpServerHandler"
    }
  }' \
  --region us-east-1
```

### 3. MCP 도구 스키마 등록
```bash
# target-config.json 파일 사용
aws bedrock-agentcore-control update-gateway-target \
  --gateway-identifier "architecture-review-gateway-kpbft8efvb" \
  --target-identifier "target-id" \
  --target-configuration file://packages/infrastructure/target-config.json \
  --region us-east-1
```

## 📝 MCP 도구 스키마

### target-config.json 예시
```json
{
  "type": "LAMBDA",
  "lambdaConfiguration": {
    "lambdaArn": "arn:aws:lambda:YOUR_REGION:YOUR_ACCOUNT_ID:function:McpServerHandler"
  },
  "mcpConfiguration": {
    "tools": [
      {
        "name": "get_document",
        "description": "문서 정보를 조회합니다",
        "inputSchema": {
          "type": "object",
          "properties": {
            "documentId": {
              "type": "string",
              "description": "문서 ID"
            }
          },
          "required": ["documentId"]
        }
      },
      {
        "name": "list_documents",
        "description": "문서 목록을 조회합니다",
        "inputSchema": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "number",
              "description": "조회할 문서 수"
            }
          }
        }
      }
    ]
  }
}
```

## 🔍 Gateway 상태 확인

### Gateway 정보 조회
```bash
aws bedrock-agentcore-control get-gateway \
  --gateway-identifier "architecture-review-gateway-kpbft8efvb" \
  --region us-east-1
```

### Target 목록 조회
```bash
aws bedrock-agentcore-control list-gateway-targets \
  --gateway-identifier "architecture-review-gateway-kpbft8efvb" \
  --region us-east-1
```

### 헬스 체크
```bash
curl https://l52aq7f18l.execute-api.us-east-1.amazonaws.com/prod/mcp/health
```

## 🧪 MCP 도구 테스트

### 1. 토큰 획득
```bash
curl -X POST https://arch-review-1767661637.auth.us-east-1.amazoncognito.com/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=4vggdif6mbjps9gj3kj5equriv" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "scope=architecture-review/read architecture-review/write"
```

### 2. 도구 목록 조회
```bash
curl -X POST https://architecture-review-gateway-kpbft8efvb.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

### 3. 도구 호출
```bash
curl -X POST https://architecture-review-gateway-kpbft8efvb.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_documents",
      "arguments": {
        "limit": 10
      }
    },
    "id": 2
  }'
```

## 🐛 문제 해결

### Gateway 연결 실패
1. Gateway ID 확인
2. URL 형식 확인
3. 리전 확인 (us-east-1)

### 인증 실패
1. Client ID 확인
2. Client Secret 확인
3. Token URL 확인
4. Scopes 확인

### MCP 도구가 표시되지 않음
1. Lambda 함수 배포 확인
2. Target 연결 상태 확인
3. 도구 스키마 등록 확인

### 도구 호출 실패
1. Lambda 함수 로그 확인
2. IAM 권한 확인
3. 입력 파라미터 확인

## 💻 Lambda 함수 구현

### MCP 서버 핸들러
```typescript
// packages/mcp-server/src/lambda.ts
export const handler = async (event: any) => {
  const { method, params } = JSON.parse(event.body);
  
  if (method === 'tools/list') {
    return {
      tools: [
        {
          name: 'get_document',
          description: '문서 정보를 조회합니다',
          inputSchema: { /* ... */ }
        },
        // ... 다른 도구들
      ]
    };
  }
  
  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    
    switch (name) {
      case 'get_document':
        return await getDocument(args.documentId);
      case 'list_documents':
        return await listDocuments(args.limit);
      // ... 다른 도구들
    }
  }
};
```

## 📊 비용

- **AgentCore Gateway**: 사용량 기반
  - API 호출당 과금
  - 무료 티어 제공
- **Lambda 실행**: 호출당 과금
- **Cognito 인증**: 월 50,000 MAU까지 무료

## 📚 참고 자료

- [AgentCore Gateway 공식 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [MCP 프로토콜 사양](https://modelcontextprotocol.io/)
- [Cognito OAuth 2.0](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html)

---

**마지막 업데이트**: 2026-01-06  
**상태**: ✅ 완료
