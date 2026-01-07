# AWS Architecture Diagram Generator

Python Lambda 함수로 AWS 아키텍처 다이어그램을 생성합니다.

## 기능

- QuickSight BI 아키텍처 다이어그램 생성
- 일반 AWS 아키텍처 다이어그램 생성
- S3에 PNG 이미지 저장

## 로컬 테스트

```bash
# 가상 환경 생성
python3 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 테스트
python lambda_function.py
```

## Docker 빌드

```bash
docker build -t diagram-generator .
```

## Lambda 배포

ECR에 이미지를 푸시하고 Lambda 함수를 생성합니다.

```bash
# ECR 로그인
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# 이미지 빌드 및 태그
docker build -t diagram-generator .
docker tag diagram-generator:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/diagram-generator:latest

# ECR에 푸시
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/diagram-generator:latest
```

## 사용 예시

### QuickSight BI 다이어그램

```json
{
  "documentId": "abc-123",
  "diagramType": "quicksight-bi",
  "description": "전사 BI QuickSight 아키텍처"
}
```

### 일반 다이어그램

```json
{
  "documentId": "abc-123",
  "diagramType": "generic",
  "description": "웹 애플리케이션 아키텍처"
}
```

## 출력

```json
{
  "output": {
    "message": "Diagram generated successfully",
    "documentId": "abc-123",
    "s3Key": "diagrams/abc-123/quicksight-bi-abc-123.png",
    "bucket": "architecture-review-files-...",
    "s3Url": "s3://..."
  }
}
```
