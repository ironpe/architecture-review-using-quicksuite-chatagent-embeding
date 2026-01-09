# Cognito 인증 통합 가이드

## 📋 개요

프론트엔드에 AWS Cognito 인증이 완전히 통합되어 있습니다. AWS Amplify를 사용하여 사용자 인증, 세션 관리, 자동 토큰 갱신을 처리합니다.

## ✅ 구현된 기능

### 1. 사용자 인증
- ✅ Username/Password 로그인
- ✅ 이메일 자동완성 (Remember Email)
- ✅ 로그인 상태 유지 (Remember Me - 30일)
- ✅ 실제 Cognito username 표시
- ✅ 자동 세션 복원

### 2. 보안
- ✅ 자동 JWT 토큰 관리
- ✅ API 요청에 토큰 자동 포함
- ✅ 토큰 자동 갱신 (Amplify 처리)
- ✅ 401 에러 시 자동 로그인 페이지 이동
- ✅ 보호된 라우트

### 3. 사용자 경험
- ✅ 브라우저 패스워드 관리자 지원
- ✅ 패스워드 표시/숨김 토글
- ✅ 상세한 에러 메시지
- ✅ 로딩 상태 표시

## 🔧 환경 변수 설정

### packages/frontend/.env
```bash
# API Gateway endpoint
VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod

# Cognito Configuration
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=YOUR_REGION_YOUR_USER_POOL_ID
VITE_USER_POOL_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID
```

## 🚀 사용 방법

### 로그인
```
1. http://localhost:5173/login 접속
2. Username: your-username
3. Password: your-password
4. ☑ "로그인 상태 유지" 체크 (선택)
5. "로그인" 버튼 클릭
```

### 로그아웃
```
우측 상단 "로그아웃" 버튼 클릭
```

## 🔑 Cognito 사용자 관리

### 사용자 생성 (자동화)

```bash
cd packages/infrastructure
./scripts/create-cognito-user.sh
```

스크립트가 대화형으로 이메일과 비밀번호를 입력받아 사용자를 생성합니다.

### 비밀번호 변경
```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username YOUR_EMAIL \
  --password "NewPassword123!" \
  --permanent \
  --region us-east-1
```

### 새 사용자 생성 (수동)
```bash
# 사용자 생성
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username user@example.com \
  --user-attributes Name=email,Value=user@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS \
  --region us-east-1

# 비밀번호 설정
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username user@example.com \
  --password "UserPassword123!" \
  --permanent \
  --region us-east-1
```

> **참고**: 이 User Pool은 이메일을 username으로 사용합니다.

## 💻 기술 구현

### 1. Amplify 설정
```typescript
// packages/frontend/src/config/cognito.ts
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'YOUR_USER_POOL_ID',
      userPoolClientId: 'YOUR_CLIENT_ID',
    },
  },
});
```

### 2. 인증 Context
```typescript
// packages/frontend/src/contexts/AuthContext.tsx
const login = async (email: string, password: string, rememberMe: boolean) => {
  const { isSignedIn } = await signIn({ username: email, password });
  if (isSignedIn) {
    await checkUser();
  }
};
```

### 3. API 토큰 인터셉터
```typescript
// packages/frontend/src/services/api.ts
apiClient.interceptors.request.use(async (config) => {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});
```

### 4. 보호된 라우트
```typescript
// packages/frontend/src/components/ProtectedRoute.tsx
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <CircularProgress />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
}
```

## 🔐 토큰 관리

### 토큰 종류
- **Access Token**: 1시간 (API 요청용)
- **ID Token**: 1시간 (사용자 정보)
- **Refresh Token**: 30일 (자동 갱신용)

### 자동 갱신
Amplify가 자동으로 처리:
```
Access Token 만료 → Refresh Token으로 자동 갱신 → 사용자 경험 중단 없음
```

### Remember Me 동작
```
Remember Me 체크:
  → Refresh Token 저장
  → 30일간 자동 로그인
  → 브라우저 닫아도 유지

Remember Me 미체크:
  → 세션 기반 로그인
  → 브라우저 닫으면 로그아웃
```

## 🐛 문제 해결

### "User does not exist" 에러
비밀번호가 설정되지 않았을 수 있습니다:
```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username your-username \
  --password "Welcome123!" \
  --permanent \
  --region us-east-1
```

### 토큰이 API 요청에 포함되지 않음
브라우저 콘솔에서 확인:
```javascript
import { fetchAuthSession } from 'aws-amplify/auth';
const session = await fetchAuthSession();
console.log('Access Token:', session.tokens?.accessToken?.toString());
```

### 로그인 후 자동 로그아웃됨
Remember Me를 체크하지 않으면 브라우저를 닫을 때 세션이 종료됩니다.

## 📝 주요 파일

### 인증 관련
- `packages/frontend/src/contexts/AuthContext.tsx` - 인증 Context
- `packages/frontend/src/config/cognito.ts` - Cognito 설정
- `packages/frontend/src/pages/LoginPage.tsx` - 로그인 페이지
- `packages/frontend/src/components/ProtectedRoute.tsx` - 보호된 라우트

### API 관련
- `packages/frontend/src/services/api.ts` - API 클라이언트 (토큰 인터셉터)
- `packages/frontend/src/services/quicksight.ts` - QuickSight API

## 🔄 다음 단계 (선택사항)

### 백엔드 통합
- [ ] API Gateway에 Cognito Authorizer 추가
- [ ] Lambda 함수에서 토큰 검증
- [ ] 사용자별 권한 관리

### 추가 기능
- [ ] 회원가입 페이지
- [ ] 비밀번호 재설정
- [ ] 이메일 인증
- [ ] MFA (Multi-Factor Authentication)
- [ ] 프로필 수정

## 📚 참고 자료

- [AWS Amplify Auth Documentation](https://docs.amplify.aws/react/build-a-backend/auth/)
- [Amazon Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [API Gateway Cognito Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html)

---

**마지막 업데이트**: 2026-01-06  
**상태**: ✅ 완료
