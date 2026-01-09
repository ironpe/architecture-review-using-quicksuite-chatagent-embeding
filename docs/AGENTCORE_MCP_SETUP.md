# AgentCore Gateway & MCP 설정 가이드

## 📋 개요

Amazon Bedrock AgentCore Gateway를 통해 QuickSuite Chat Agent가 Lambda 함수를 MCP(Model Context Protocol) 도구로 사용할 수 있습니다.

> **중요**: 현재 AWS CDK에서 AgentCore Gateway의 안정적인 L2 construct가 제공되지 않습니다. 이 가이드는 AWS CLI와 콘솔을 사용한 수동 설정 방법을 안내합니다.

## 🔧 사전 준비

배포 가이드의 1단계(CDK 인프라 배포)를 완료하고 다음 정보를 준비하세요:
- **MCP Lambda ARN**: `arn:aws:lambda:us-east-1:920779847645:function:ArchitectureReviewStack-McpServerHandler...`
- **MCP Endpoint**: `https://pzrmjiduu7.execute-api.us-east-1.amazonaws.com/prod/mcp`
- **AWS Account ID**: `920779847645`
- **AWS Region**: `us-east-1`

## 🚀 설정 단계

### 빠른 설정 (스크립트 사용 - 권장)

자동화 스크립트를 사용하여 Cognito User Pool, AgentCore Gateway, Lambda Target을 생성할 수 있습니다:

```bash
cd packages/infrastructure
./scripts/setup-agentcore.sh
```

스크립트는 다음 작업을 자동으로 수행합니다:
1. ✅ Cognito User Pool 생성
2. ✅ User Pool Domain 생성
3. ✅ Resource Server 및 OAuth Scopes 생성
4. ✅ M2M App Client 생성 (Client ID, Secret 포함)
5. ✅ AgentCore Gateway 생성 (CLI 시도, 실패 시 수동 안내)
6. ✅ Lambda Target 추가 (CLI 시도, 실패 시 수동 안내)
7. ✅ Gateway 권한 설정

**스크립트 실행 후:**
- 모든 설정 정보가 `agentcore-setup-output.txt` 파일에 저장됩니다
- 파일 내용을 확인하여 환경 변수를 업데이트하세요
- QuickSuite MCP 연결 시 필요한 정보가 모두 포함되어 있습니다

> **참고**: AWS CLI의 `bedrock-agentcore` 명령어가 작동하지 않으면 스크립트가 콘솔 사용 방법을 안내합니다. 이 경우 아래 "수동 설정" 섹션을 참고하세요.

---

### 수동 설정 (단계별)

스크립트를 사용하지 않고 수동으로 설정하려면 아래 단계를 따르세요.

### 1단계: Cognito User Pool 생성

AgentCore Gateway의 인증을 위한 Cognito User Pool을 생성합니다.

#### 1.1 User Pool 생성

```bash
# User Pool 생성
aws cognito-idp create-user-pool \
  --pool-name "agentcore-gateway-pool" \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --region us-east-1
```

출력에서 **UserPool.Id** (예: `us-east-1_XXXXXXXXX`)를 메모하세요.

#### 1.2 User Pool Domain 생성

```bash
# User Pool Domain 생성 (고유한 도메인 이름 사용)
aws cognito-idp create-user-pool-domain \
  --domain "arch-review-$(date +%s)" \
  --user-pool-id us-east-1_XXXXXXXXX \
  --region us-east-1
```

출력에서 **Domain** 이름을 메모하세요.

#### 1.3 Resource Server 생성 (OAuth Scopes)

```bash
# Resource Server 생성
aws cognito-idp create-resource-server \
  --user-pool-id us-east-1_XXXXXXXXX \
  --identifier "architecture-review" \
  --name "Architecture Review API" \
  --scopes \
    Scope={ScopeName=read,ScopeDescription="Read access"} \
    Scope={ScopeName=write,ScopeDescription="Write access"} \
  --region us-east-1
```

#### 1.4 App Client 생성 (Machine-to-Machine)

```bash
# M2M App Client 생성
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_XXXXXXXXX \
  --client-name "agentcore-m2m-client" \
  --generate-secret \
  --allowed-o-auth-flows client_credentials \
  --allowed-o-auth-scopes "architecture-review/read" "architecture-review/write" \
  --allowed-o-auth-flows-user-pool-client \
  --region us-east-1
```

출력에서 다음 정보를 메모하세요:
- **ClientId**
- **ClientSecret**

#### 1.5 Token URL 확인

Token URL 형식:
```
https://YOUR_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/token
```

### 2단계: AgentCore Gateway 생성

#### 2.1 AWS 콘솔에서 Gateway 생성

1. AWS 콘솔에서 **Amazon Bedrock** 서비스로 이동
2. 좌측 메뉴에서 **AgentCore** → **Gateways** 선택
3. **Create gateway** 클릭
4. Gateway 설정:
   - **Name**: `architecture-review-gateway`
   - **Description**: `Gateway for Architecture Review MCP tools`
   - **Protocol**: `Model Context Protocol (MCP)`

#### 2.2 Inbound Authorization 설정

1. **Authorization type**: `JSON Web Token (JWT)`
2. **Identity provider**: `Cognito User Pool`
3. Cognito 설정:
   - **User Pool ARN**: `arn:aws:cognito-idp:us-east-1:920779847645:userpool/us-east-1_XXXXXXXXX`
   - **Client IDs**: 1.4단계에서 생성한 Client ID 입력
4. **Create gateway** 클릭

Gateway 생성 후 **Gateway ID**와 **Gateway URL**을 메모하세요.

Gateway URL 형식:
```
https://GATEWAY_ID.gateway.bedrock-agentcore.us-east-1.amazonaws.com
```

### 3단계: Lambda Target 추가

#### 3.1 콘솔에서 Target 추가

1. 생성된 Gateway 상세 페이지에서 **Targets** 탭 선택
2. **Add target** 클릭
3. Target 설정:
   - **Target name**: `architecture-review-tools`
   - **Target type**: `AWS Lambda`
   - **Lambda function ARN**: 배포 출력의 McpServerHandler ARN 입력

#### 3.2 MCP Tools Schema 등록

Lambda Target에 MCP 도구 스키마를 등록합니다. 다음 5개 도구를 등록하세요:

**1. get_document**
```json
{
  "name": "get_document",
  "description": "DynamoDB에서 문서 정보를 조회합니다",
  "inputSchema": {
    "type": "object",
    "properties": {
      "documentId": {
        "type": "string",
        "description": "조회할 문서의 ID"
      }
    },
    "required": ["documentId"]
  }
}
```

**2. list_documents**
```json
{
  "name": "list_documents",
  "description": "DynamoDB에서 모든 문서 목록을 조회합니다",
  "inputSchema": {
    "type": "object",
    "properties": {
      "limit": {
        "type": "number",
        "description": "조회할 문서 수 (기본값: 20)"
      }
    }
  }
}
```

**3. update_review**
```json
{
  "name": "update_review",
  "description": "문서의 검토 정보를 업데이트합니다",
  "inputSchema": {
    "type": "object",
    "properties": {
      "documentId": {
        "type": "string",
        "description": "업데이트할 문서의 ID"
      },
      "reviewer": {
        "type": "string",
        "description": "검토자 이름"
      },
      "architectureOverview": {
        "type": "string",
        "description": "아키텍처 개요"
      },
      "reviewDate": {
        "type": "string",
        "description": "검토 일자 (YYYY-MM-DD)"
      },
      "reviewCompleted": {
        "type": "boolean",
        "description": "검토 완료 여부"
      }
    },
    "required": ["documentId"]
  }
}
```

**4. save_review_to_s3**
```json
{
  "name": "save_review_to_s3",
  "description": "검토 결과를 마크다운 파일로 S3에 저장합니다",
  "inputSchema": {
    "type": "object",
    "properties": {
      "documentId": {
        "type": "string",
        "description": "문서 ID"
      },
      "reviewContent": {
        "type": "string",
        "description": "검토 내용 (마크다운 형식)"
      },
      "filename": {
        "type": "string",
        "description": "저장할 파일명 (기본값: review.md)"
      }
    },
    "required": ["documentId", "reviewContent"]
  }
}
```

**5. get_review**
```json
{
  "name": "get_review",
  "description": "S3에서 저장된 검토 결과를 조회합니다",
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
}
```

#### 3.3 Outbound Authorization 설정

1. **Authorization type**: `IAM`
2. **IAM Role**: Gateway의 실행 역할이 Lambda를 호출할 수 있도록 자동 설정됨
3. **Save target** 클릭

### 4단계: Gateway 권한 설정

Gateway의 실행 역할에 Lambda 호출 권한을 추가합니다:

```bash
# Gateway 역할 이름 확인 (콘솔에서 확인 또는 아래 명령어 사용)
aws iam list-roles --query "Roles[?contains(RoleName, 'AgentCore')].RoleName" --output table

# Lambda 호출 권한 추가
aws iam attach-role-policy \
  --role-name YOUR_GATEWAY_ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaRole \
  --region us-east-1
```

또는 인라인 정책 추가:

```bash
aws iam put-role-policy \
  --role-name YOUR_GATEWAY_ROLE_NAME \
  --policy-name LambdaInvokePolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "lambda:InvokeFunction",
        "Resource": "arn:aws:lambda:us-east-1:920779847645:function:ArchitectureReviewStack-McpServerHandler*"
      }
    ]
  }'
```

## ✅ 설정 완료 후 확인 사항

위 단계를 완료하면 다음 정보를 확보하게 됩니다:

### AgentCore Gateway
- **Gateway ID**: 콘솔에서 확인
- **Gateway URL**: `https://GATEWAY_ID.gateway.bedrock-agentcore.us-east-1.amazonaws.com`
- **MCP Endpoint**: Gateway URL (QuickSuite가 자동으로 `/v1/tools/list`, `/v1/tools/call` 추가)
- **인증**: Cognito JWT (OAuth 2.0 Client Credentials)
- **리전**: us-east-1

### Cognito User Pool
- **User Pool ID**: 1.1단계에서 생성
- **User Pool ARN**: `arn:aws:cognito-idp:us-east-1:920779847645:userpool/USER_POOL_ID`
- **Domain**: 1.2단계에서 생성
- **Token URL**: `https://YOUR_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/token`

### MCP Client (Machine-to-Machine)
- **Client ID**: 1.4단계에서 생성
- **Client Secret**: 1.4단계에서 생성 (안전하게 보관)
- **OAuth Flow**: `client_credentials`
- **Scopes**: `architecture-review/read`, `architecture-review/write`

### MCP 도구 (5개)
1. `get_document` - 문서 정보 조회
2. `list_documents` - 문서 목록 조회
3. `update_review` - 검토 정보 업데이트
4. `save_review_to_s3` - 검토 결과 마크다운 저장
5. `get_review` - 검토 결과 조회

## 🚀 QuickSuite에서 MCP 연결

### 1. QuickSuite 콘솔 접속
```
https://us-east-1.quicksight.aws.amazon.com/sn/start
```

### 2. MCP 통합 추가
1. 좌측 메뉴에서 **Integrations** 클릭
2. **Actions** → **Model Context Protocol** (+) 클릭
3. 다음 정보 입력:

**Connection Details:**
- **Name**: Architecture Review MCP
- **URL**: 2단계에서 생성한 Gateway URL (예: `https://abc123.gateway.bedrock-agentcore.us-east-1.amazonaws.com`)

**Authentication:**
- **Auth Type**: Service authentication (2LO)
- **Client ID**: 1.4단계에서 생성한 Client ID
- **Client Secret**: 1.4단계에서 생성한 Client Secret
- **Token URL**: `https://YOUR_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/token`

4. **Connect** 클릭

### 3. 도구 확인
연결 후 다음 5개 도구가 표시되어야 합니다:
- ✅ architecture-review-tools__get_document
- ✅ architecture-review-tools__list_documents
- ✅ architecture-review-tools__update_review
- ✅ architecture-review-tools__save_review_to_s3
- ✅ architecture-review-tools__get_review

> **참고**: 도구 이름 앞에 타겟 이름(`architecture-review-tools__`)이 자동으로 붙습니다.

### 4. Chat Agent에 MCP 연결
1. **Chat agents** 메뉴로 이동
2. 생성한 Agent 선택
3. **Edit** → **Actions & Integrations**
4. MCP 통합 활성화
5. **Save** 클릭

## 🔧 참고: AWS CLI를 사용한 Gateway 생성 (선택 사항)

콘솔 대신 AWS CLI를 사용하여 Gateway를 생성할 수도 있습니다.

> **참고**: AWS CLI의 `bedrock-agentcore` 명령어는 최신 버전에서만 사용 가능합니다. CLI 버전을 확인하세요.

### CLI로 Gateway 생성 예시

```bash
# Gateway 생성
aws bedrock-agentcore create-gateway \
  --name "architecture-review-gateway" \
  --protocol-type MCP \
  --authorizer-type COGNITO_USER_POOL \
  --authorizer-configuration '{
    "cognitoUserPoolConfiguration": {
      "userPoolArn": "arn:aws:cognito-idp:us-east-1:920779847645:userpool/us-east-1_XXXXXXXXX",
      "clientIds": ["YOUR_CLIENT_ID"]
    }
  }' \
  --region us-east-1
```

### CLI로 Lambda Target 추가 예시

```bash
# Lambda Target 추가
aws bedrock-agentcore create-gateway-target \
  --gateway-id "YOUR_GATEWAY_ID" \
  --name "architecture-review-tools" \
  --target-type LAMBDA \
  --lambda-configuration '{
    "lambdaArn": "arn:aws:lambda:us-east-1:920779847645:function:ArchitectureReviewStack-McpServerHandler..."
  }' \
  --region us-east-1
```

> **권장**: AWS 콘솔을 사용하는 것이 더 직관적이고 안정적입니다.

## 📝 MCP 도구 스키마 참고

### target-config.json 예시 (참고용)
```json
{
  "type": "LAMBDA",
  "lambdaConfiguration": {
    "lambdaArn": "arn:aws:lambda:us-east-1:920779847645:function:McpServerHandler"
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
  --gateway-identifier "YOUR_GATEWAY_ID" \
  --region us-east-1
```

### Target 목록 조회
```bash
aws bedrock-agentcore-control list-gateway-targets \
  --gateway-identifier "YOUR_GATEWAY_ID" \
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
  -d "client_id=YOUR_MCP_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "scope=architecture-review/read architecture-review/write"
```

### 2. 도구 목록 조회
```bash
curl -X POST https://YOUR_GATEWAY_ID.gateway.bedrock-agentcore.YOUR_REGION.amazonaws.com/mcp \
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
curl -X POST https://YOUR_GATEWAY_ID.gateway.bedrock-agentcore.YOUR_REGION.amazonaws.com/mcp \
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
