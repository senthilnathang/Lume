#!/bin/bash

echo "🧪 Basic Lume Application Tests"
echo "=============================="
echo ""

echo "1. Testing Backend Health..."
curl -s http://localhost:3000/health | jq '.' 2>/dev/null && echo "✓ Backend responding" || echo "✗ Backend not responding"
echo ""

echo "2. Testing Frontend Availability..."
curl -s http://localhost:5173/ | grep -q "Lume Admin" && echo "✓ Frontend responding" || echo "✗ Frontend not responding"
echo ""

echo "3. Testing Login Page..."
curl -s http://localhost:5173/login 2>&1 | grep -q "DOCTYPE\|html" && echo "✓ Login page loads" || echo "✗ Login page not loading"
echo ""

echo "4. Testing API Endpoints..."
echo "   - /api/auth/me:"
curl -s -H "Authorization: Bearer invalid" http://localhost:3000/api/auth/me 2>&1 | head -c 100
echo ""
echo ""

echo "5. Testing Database Connection..."
curl -s http://localhost:3000/api/users 2>&1 | head -c 150
echo ""
echo ""

echo "6. Checking for Critical Errors..."
tail -20 /tmp/backend.log | grep -i "error\|fatal\|critical" || echo "✓ No critical errors in backend"
echo ""

echo "7. Checking Frontend Build..."
ls -lh /opt/Lume/frontend/gawdesy-admin/dist 2>/dev/null && echo "✓ Frontend dist folder exists" || echo "ℹ Frontend dist not built (using dev server)"
echo ""

echo "=============================="
echo "Basic tests completed"
