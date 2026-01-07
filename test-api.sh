#!/bin/bash

# API 엔드포인트 설정
API_URL="https://your-api-id.execute-api.region.amazonaws.com/prod"

echo "=== Testing Architecture Review System API ==="

# 1. Upload URL 요청
echo -e "\n1. Requesting upload URL..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/documents/upload-url" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.pdf",
    "fileType": "application/pdf",
    "fileSize": 1000000
  }')

echo "Upload URL Response:"
echo $UPLOAD_RESPONSE | jq '.'

# 2. 문서 목록 조회
echo -e "\n2. Listing documents..."
curl -s "$API_URL/documents?page=1&limit=20" | jq '.'

# 3. 문서 검색
echo -e "\n3. Searching documents..."
curl -s "$API_URL/documents/search?query=test" | jq '.'

# 4. 특정 문서 조회 (documentId 필요)
# echo -e "\n4. Getting document..."
# curl -s "$API_URL/documents/YOUR_DOCUMENT_ID" | jq '.'

echo -e "\n=== API Test Complete ==="
