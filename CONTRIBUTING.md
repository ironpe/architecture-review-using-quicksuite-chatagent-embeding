# 기여 가이드

Architecture Review System에 기여해 주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 📋 목차

- [행동 강령](#행동-강령)
- [시작하기](#시작하기)
- [개발 프로세스](#개발-프로세스)
- [코드 스타일](#코드-스타일)
- [커밋 메시지](#커밋-메시지)
- [Pull Request](#pull-request)
- [이슈 보고](#이슈-보고)

## 행동 강령

이 프로젝트는 모든 기여자가 존중받는 환경을 유지하기 위해 행동 강령을 따릅니다.

### 우리의 약속

- 모든 사람을 환영하고 존중합니다
- 건설적인 피드백을 제공합니다
- 다른 관점을 존중합니다
- 커뮤니티의 이익을 우선시합니다

## 시작하기

### 1. 리포지토리 포크

```bash
# GitHub에서 Fork 버튼 클릭
# 본인의 계정으로 리포지토리 복사
```

### 2. 로컬에 클론

```bash
git clone https://github.com/YOUR_USERNAME/architecture-review-using-quicksuite-chatagent-embeding.git
cd architecture-review-using-quicksuite-chatagent-embeding
```

### 3. 업스트림 리모트 추가

```bash
git remote add upstream https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding.git
```

### 4. 개발 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
./scripts/setup.sh
```

## 개발 프로세스

### 1. 브랜치 생성

```bash
# 최신 main 브랜치로 업데이트
git checkout main
git pull upstream main

# 새 브랜치 생성
git checkout -b feature/your-feature-name
# 또는
git checkout -b fix/your-bug-fix
```

브랜치 명명 규칙:
- `feature/`: 새로운 기능
- `fix/`: 버그 수정
- `docs/`: 문서 업데이트
- `refactor/`: 코드 리팩토링
- `test/`: 테스트 추가/수정
- `chore/`: 빌드, 설정 등

### 2. 코드 작성

```bash
# 변경 사항 작성
# ...

# 빌드 테스트
npm run build

# 테스트 실행
npm test
```

### 3. 커밋

```bash
git add .
git commit -m "feat: add new feature"
```

### 4. 푸시

```bash
git push origin feature/your-feature-name
```

### 5. Pull Request 생성

GitHub에서 Pull Request를 생성합니다.

## 코드 스타일

### TypeScript/JavaScript

- **포맷터**: Prettier 사용
- **린터**: ESLint 사용
- **들여쓰기**: 2 spaces
- **세미콜론**: 사용
- **따옴표**: 작은따옴표 (')

```typescript
// Good
const greeting = 'Hello, World!';

function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Bad
const greeting = "Hello, World!"

function greet(name: string): string 
{
    return `Hello, ${name}!`
}
```

### 파일 구조

```
packages/
├── frontend/
│   ├── src/
│   │   ├── components/    # 재사용 가능한 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── services/      # API 서비스
│   │   ├── contexts/      # React Context
│   │   ├── hooks/         # Custom Hooks
│   │   ├── types/         # TypeScript 타입
│   │   └── utils/         # 유틸리티 함수
│   └── ...
├── backend/
│   ├── src/
│   │   ├── handlers/      # Lambda 핸들러
│   │   ├── types/         # TypeScript 타입
│   │   └── utils/         # 유틸리티 함수
│   └── ...
└── ...
```

### 명명 규칙

- **파일명**: kebab-case (예: `user-service.ts`)
- **컴포넌트**: PascalCase (예: `UserProfile.tsx`)
- **함수/변수**: camelCase (예: `getUserData`)
- **상수**: UPPER_SNAKE_CASE (예: `MAX_FILE_SIZE`)
- **타입/인터페이스**: PascalCase (예: `UserData`)

## 커밋 메시지

### 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 등

### 예시

```bash
feat(frontend): add document search functionality

- Add search input component
- Implement search API integration
- Add search results display

Closes #123
```

```bash
fix(backend): resolve S3 upload timeout issue

- Increase Lambda timeout to 30 seconds
- Add retry logic for S3 operations

Fixes #456
```

## Pull Request

### PR 체크리스트

PR을 생성하기 전에 다음을 확인하세요:

- [ ] 코드가 빌드됩니다 (`npm run build`)
- [ ] 모든 테스트가 통과합니다 (`npm test`)
- [ ] 새로운 기능에 대한 테스트를 추가했습니다
- [ ] 문서를 업데이트했습니다 (필요한 경우)
- [ ] 커밋 메시지가 규칙을 따릅니다
- [ ] 변경 사항이 하나의 목적을 가집니다

### PR 템플릿

```markdown
## 변경 사항

<!-- 무엇을 변경했는지 설명 -->

## 변경 이유

<!-- 왜 이 변경이 필요한지 설명 -->

## 테스트 방법

<!-- 어떻게 테스트했는지 설명 -->

## 스크린샷 (선택사항)

<!-- UI 변경이 있다면 스크린샷 추가 -->

## 관련 이슈

Closes #이슈번호
```

### 리뷰 프로세스

1. PR 생성 후 자동 CI/CD 실행
2. 코드 리뷰어 배정
3. 리뷰어의 피드백 반영
4. 승인 후 main 브랜치에 병합

## 이슈 보고

### 버그 리포트

버그를 발견하면 다음 정보를 포함하여 이슈를 생성하세요:

```markdown
## 버그 설명

<!-- 버그에 대한 명확한 설명 -->

## 재현 방법

1. '...'로 이동
2. '...'를 클릭
3. '...'까지 스크롤
4. 에러 발생

## 예상 동작

<!-- 어떻게 동작해야 하는지 설명 -->

## 실제 동작

<!-- 실제로 어떻게 동작하는지 설명 -->

## 스크린샷

<!-- 가능하다면 스크린샷 추가 -->

## 환경

- OS: [예: macOS 13.0]
- Browser: [예: Chrome 120]
- Node.js: [예: 18.17.0]
- 버전: [예: 1.0.0]

## 추가 정보

<!-- 기타 관련 정보 -->
```

### 기능 제안

새로운 기능을 제안하려면:

```markdown
## 기능 설명

<!-- 제안하는 기능에 대한 명확한 설명 -->

## 동기

<!-- 왜 이 기능이 필요한지 설명 -->

## 제안하는 해결책

<!-- 어떻게 구현할 수 있는지 설명 -->

## 대안

<!-- 고려한 다른 방법들 -->

## 추가 정보

<!-- 기타 관련 정보 -->
```

## 개발 팁

### 로컬 테스트

```bash
# 프론트엔드 개발 서버
cd packages/frontend
npm run dev

# 백엔드 로컬 테스트
cd packages/backend
npm run dev

# 전체 빌드 테스트
npm run build --workspaces

# 테스트 실행
npm test --workspaces
```

### 디버깅

```bash
# Lambda 로그 확인
aws logs tail /aws/lambda/YOUR_FUNCTION_NAME --follow

# API Gateway 테스트
curl -X GET https://YOUR_API_URL/health

# DynamoDB 데이터 확인
aws dynamodb scan --table-name YOUR_TABLE_NAME --max-items 10
```

## 질문이 있으신가요?

- [GitHub Discussions](https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/discussions)에서 질문하세요
- [GitHub Issues](https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/issues)에서 버그를 보고하세요

## 감사합니다!

여러분의 기여가 이 프로젝트를 더 좋게 만듭니다. 🎉
