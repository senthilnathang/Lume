#!/bin/bash

echo "🧪 Lume Application Comprehensive Test Suite"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

test_api() {
  local name="$1"
  local endpoint="$2"
  local expected_code="$3"
  
  status=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer invalid" "$endpoint")
  
  if [[ "$status" == "$expected_code" ]]; then
    echo "✓ $name: $status"
  else
    echo "✗ $name: got $status, expected $expected_code"
    ((ERRORS++))
  fi
}

echo "1. Backend API Tests"
echo "-------------------"
test_api "Health Check" "http://localhost:3000/health" "200"
test_api "Unauthorized Users" "http://localhost:3000/api/users" "401"
test_api "Unauthorized Settings" "http://localhost:3000/api/settings" "401"
echo ""

echo "2. Frontend Tests"
echo "----------------"

# Check home page
response=$(curl -s http://localhost:5173/)
if echo "$response" | grep -q "Lume\|Vue\|DOCTYPE"; then
  echo "✓ Home page loads"
else
  echo "✗ Home page not loading properly"
  ((ERRORS++))
fi

# Check login page
response=$(curl -s http://localhost:5173/login)
if echo "$response" | grep -q "input\|button\|form"; then
  echo "✓ Login page loads"
else
  echo "✗ Login page not loading"
  ((ERRORS++))
fi

# Check dashboard page
response=$(curl -s http://localhost:5173/dashboard)
if echo "$response" | grep -q "DOCTYPE\|html"; then
  echo "✓ Dashboard page loads"
else
  echo "✗ Dashboard page error"
  ((ERRORS++))
fi
echo ""

echo "3. Backend Module Status"
echo "-----------------------"

# Check module endpoints exist
modules=("audit" "auth" "website" "editor" "media" "messages")
for mod in "${modules[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer invalid" "http://localhost:3000/api/$mod" 2>/dev/null)
  if [[ "$status" == "401" || "$status" == "200" ]]; then
    echo "✓ /api/$mod: responding ($status)"
  else
    echo "⚠ /api/$mod: $status"
    ((WARNINGS++))
  fi
done
echo ""

echo "4. Database Connectivity"
echo "----------------------"

# Test Prisma connection
result=$(curl -s http://localhost:3000/health | grep -o '"success":true')
if [[ -n "$result" ]]; then
  echo "✓ Prisma database connected"
else
  echo "✗ Database connection failed"
  ((ERRORS++))
fi
echo ""

echo "5. Performance Checks"
echo "--------------------"

# Measure API response time
start=$(date +%s%N)
curl -s http://localhost:3000/health > /dev/null
end=$(date +%s%N)
duration=$((($end - $start) / 1000000))

echo "✓ Backend response time: ${duration}ms"
if [[ $duration -gt 1000 ]]; then
  echo "⚠ Response time is high (>1s)"
  ((WARNINGS++))
fi

# Frontend response time
start=$(date +%s%N)
curl -s http://localhost:5173/ > /dev/null
end=$(date +%s%N)
duration=$((($end - $start) / 1000000))

echo "✓ Frontend response time: ${duration}ms"
if [[ $duration -gt 2000 ]]; then
  echo "⚠ Frontend response time is slow (>2s)"
  ((WARNINGS++))
fi
echo ""

echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo "✓ Passed"
echo "✗ Errors: $ERRORS"
echo "⚠ Warnings: $WARNINGS"
echo ""

if [[ $ERRORS -eq 0 ]]; then
  echo "✨ All critical tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
