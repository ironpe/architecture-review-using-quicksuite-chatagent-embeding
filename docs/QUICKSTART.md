# 빠른 시작 가이드

5분 안에 Architecture Review System을 시작하는 방법을 안내합니다.

## 🎯 목표

이 가이드를 완료하면:
- ✅ 로컬 개발 환경 실행
- ✅ 첫 문서 업로드
- ✅ Chat Agent와 대화

## 📋 사전 요구사항

- Node.js 18+ 설치
- AWS 계정 및 CLI 설정
- 프로젝트 클론 완료

## 🚀 5분 시작하기

### 1단계: 프로젝트 설정 (1분)

```bash
# 프로젝트 디렉토리로 이동
cd architecture-review-using-quicksuite-chatagent-embeding

# 의존성 설치
npm install

# 환경 변수 복사
cp packages/frontend/.env.example packages/frontend/.env
cp packages/backend/.env.example packages/backend/.env
```

### 2단계: AWS 리소스 배포 (2분)

```bash
# 백엔드 빌드
cd packages/backend
npm run build

# 인프라 배포
cd ../infrastructure
npx cdk deploy --all --require-approval never
```

배포 완료 후 출력되는 정보를 메모하세요:
- API Gateway URL
- Cognito User Pool ID
- Cognito Client ID

### 3단계: 환경 변수 업데이트 (30초)

`packages/frontend/.env` 파일을 열고 배포 결과로 업데이트:

```bash
VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_WEB_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 4단계: 사용자 생성 (30초)

```bash
# Cognito 사용자 생성
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --user-attributes Name=email,Value=your-email@example.com \
  --region us-east-1

# 비밀번호 설정
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --password "Welcome123!" \
  --permanent \
  --region us-east-1
```

### 5단계: 프론트엔드 실행 (1분)

```bash
cd packages/frontend
npm run dev
```

브라우저가 자동으로 http://localhost:5173 을 엽니다.

## ✅ 첫 사용

### 로그인

1. Username: `your-username`
2. Password: `your-password`
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

## 🤖 Chat Agent 사용 (선택사항)

Chat Agent를 사용하려면 QuickSuite 설정이 필요합니다.

### QuickSuite 빠른 설정

1. AWS 콘솔에서 QuickSuite 구독
2. Chat Agent 생성
3. AgentCore Gateway 설정
4. Space 및 Knowledge Base 생성

자세한 내용은 [QuickSuite 설정 가이드](QUICKSIGHT_SETUP.md)를 참고하세요.

## 🎨 주요 기능 둘러보기

### 문서 관리
- **업로드**: PDF, PNG, JPG, JPEG 지원 (최대 50MB)
- **검색**: 파일명 또는 파일 ID로 문서 검색
- **미리보기**: 브라우저에서 문서 확인
- **삭제**: 불필요한 문서 삭제

### 검토 관리
- **검토 정보**: 검토자, 아키텍처 개요 입력
- **검토 상태**: 검토 필요/완료 상태 관리
- **검토 결과**: 마크다운 형식으로 결과 저장

### Chat Agent (QuickSuite 설정 후)
- **문서 조회**: "문서 목록을 보여줘"
- **검토 수행**: "문서 XXX의 검토를 시작해줘"
- **결과 저장**: "검토 결과를 저장해줘"

## 🐛 문제 해결

### 로그인 실패
```bash
# 사용자 상태 확인
aws cognito-idp admin-get-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --region us-east-1

# 비밀번호 재설정
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --password "NewPassword123!" \
  --permanent \
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

- [전체 설치 가이드](INSTALLATION.md)
- [배포 가이드](DEPLOYMENT.md)
- [아키텍처 문서](ARCHITECTURE.md)
- [문제 해결 가이드](TROUBLESHOOTING.md)

## 🎯 다음 단계

기본 기능을 확인했다면:

1. **QuickSuite 설정**: AI 기반 검토 기능 활성화
2. **보안 강화**: Cognito Authorizer 추가
3. **커스터마이징**: UI 테마 변경, 추가 기능 개발

## 💡 팁

- **개발 모드**: `npm run dev`로 핫 리로드 활성화
- **빌드 테스트**: `npm run build`로 프로덕션 빌드 확인
- **로그 확인**: 브라우저 개발자 도구 콘솔 활용

## 📞 도움이 필요하신가요?

- [GitHub Issues](https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/issues)
- [문제 해결 가이드](TROUBLESHOOTING.md)

---

**축하합니다!** 🎉 Architecture Review System을 성공적으로 시작했습니다.
