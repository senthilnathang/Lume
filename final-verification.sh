#!/bin/bash

echo "🎯 Final Lume v2.0 Pre-Launch Verification"
echo "=========================================="
echo ""

PASS=0
FAIL=0

test_endpoint() {
  local name="$1"
  local url="$2"
  local expected="$3"
  
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  
  if [[ "$status" == "$expected" ]]; then
    echo "✅ $name"
    ((PASS++))
  else
    echo "❌ $name (got $status, expected $expected)"
    ((FAIL++))
  fi
}

echo "1️⃣  Backend Endpoints"
test_endpoint "Health Check" "http://localhost:3000/health" "200"
test_endpoint "Auth Endpoint" "http://localhost:3000/api/auth" "401"
test_endpoint "Users Endpoint" "http://localhost:3000/api/users" "401"
test_endpoint "Settings Endpoint" "http://localhost:3000/api/settings" "401"
test_endpoint "Public Menu" "http://localhost:3000/api/website/public/menus/header" "200"
echo ""

echo "2️⃣  Frontend Pages"
test_endpoint "Home Page" "http://localhost:5173/" "200"
test_endpoint "Login Page" "http://localhost:5173/login" "200"
test_endpoint "Dashboard Page" "http://localhost:5173/dashboard" "200"
echo ""

echo "3️⃣  Module API Endpoints"
modules=("audit" "website" "editor" "media" "messages" "documents")
for mod in "${modules[@]}"; do
  test_endpoint "Module: $mod" "http://localhost:3000/api/$mod" "401"
done
echo ""

echo "4️⃣  Performance"
response_time=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:3000/health)
echo "⏱️  Backend response time: ${response_time}s"

frontend_time=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:5173/)
echo "⏱️  Frontend response time: ${frontend_time}s"
echo ""

echo "=========================================="
echo "RESULTS: $PASS passed, $FAIL failed"
echo "=========================================="

if [[ $FAIL -eq 0 ]]; then
  echo "✨ All pre-launch checks PASSED!"
  exit 0
else
  echo "⚠️  Some checks failed"
  exit 1
fi
