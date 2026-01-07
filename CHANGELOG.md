# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- API Gateway Cognito Authorizer 추가
- 다이어그램 생성 기능 완성
- 회원가입 및 비밀번호 재설정 기능
- 문서 다운로드 기능
- 검토 히스토리 기능
- 알림 기능
- 대시보드 개선

## [1.0.0] - 2025-01-07

### Added
- 초기 릴리스
- React 기반 프론트엔드 애플리케이션
- AWS Lambda 기반 백엔드 API
- AWS CDK 인프라 코드
- 문서 업로드 및 관리 기능
- QuickSight Chat Agent 통합
- Bedrock AgentCore Gateway 연동
- MCP (Model Context Protocol) 서버
- Cognito 기반 사용자 인증
- S3 파일 스토리지
- DynamoDB 메타데이터 관리
- 문서 검색 기능
- 문서 미리보기 기능
- 검토 상태 관리
- 검토 결과 저장 및 표시
- 마크다운 렌더링

### Documentation
- 설치 가이드
- 배포 가이드
- 빠른 시작 가이드
- 아키텍처 문서
- Cognito 통합 가이드
- QuickSight 설정 가이드
- AgentCore MCP 설정 가이드
- 문제 해결 가이드
- 기여 가이드

### Infrastructure
- AWS CDK 스택 구성
- Lambda 함수 배포
- API Gateway REST API
- S3 버킷 생성
- DynamoDB 테이블 생성
- Cognito User Pool 설정
- AgentCore Gateway 설정

### Scripts
- 초기 설정 스크립트 (setup.sh)
- 배포 스크립트 (deploy.sh)
- 로컬 개발 스크립트 (local-dev.sh)

## [0.1.0] - 2024-12-XX

### Added
- 프로젝트 초기 설정
- 기본 프로젝트 구조
- 개발 환경 구성

---

## 버전 관리 규칙

### 버전 번호 형식: MAJOR.MINOR.PATCH

- **MAJOR**: 호환되지 않는 API 변경
- **MINOR**: 하위 호환되는 기능 추가
- **PATCH**: 하위 호환되는 버그 수정

### 변경 유형

- **Added**: 새로운 기능
- **Changed**: 기존 기능의 변경
- **Deprecated**: 곧 제거될 기능
- **Removed**: 제거된 기능
- **Fixed**: 버그 수정
- **Security**: 보안 관련 변경

[Unreleased]: https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/releases/tag/v1.0.0
[0.1.0]: https://github.com/ironpe/architecture-review-using-quicksuite-chatagent-embeding/releases/tag/v0.1.0
