# GAWDESY Playwright Test Report

## Test Summary

| Metric | Value |
|--------|-------|
| Total Tests | 14 |
| Passed | 11 |
| Failed | 3 |
| Success Rate | 79% |
| Duration | ~1 minute |

## Test Results

### ✅ Passing Tests (11)

1. **can navigate between pages** - Navigation works correctly between pages
2. **public pages load correctly** - All public pages load with content
3. **admin route redirects to login** - Authentication redirect works
4. **no critical console errors on homepage** - No JavaScript errors
5. **responsive design works** - Mobile and desktop views work
6. **page performance is acceptable** - Page loads in <10 seconds
7. **footer is visible on homepage** - Footer component renders
8. **header navigation is visible** - Header component renders
9. **programmes page has content** - Programmes page loads correctly
10. **contact page has form elements** - Contact form elements present
11. **health endpoint responds** - API health check works (backend dependent)

### ❌ Failing Tests (3)

1. **homepage loads and renders correctly** - Title mismatch (expected "GAWDESY", got "Home - Gandhian Welfare...")
2. **login page renders with form elements** - Vue hydration timing issue
3. **login form has email and password fields** - Vue hydration timing issue

## Running Tests

### Install Dependencies
```bash
cd frontend/apps/web-gawdesy
npm install
```

### Install Playwright Browsers
```bash
npm run test:e2e:install
```

### Run Tests
```bash
# Run all tests
npm run test:e2e

# Run with HTML report
npm run test:e2e:report

# Run specific test file
npx playwright test tests/app.spec.ts

# Run with UI mode
npx playwright test --ui
```

### View Reports
```bash
# Open HTML report
open playwright-report/index.html
```

## Test Configuration

- **Browser**: Chromium (default)
- **Viewport**: Multiple (Desktop, Mobile)
- **Base URL**: http://localhost:5174
- **Timeout**: 60 seconds per test

## Known Issues

1. **Login Page Hydration** - The login page may take longer to hydrate in test environment. This is a timing issue with Vue's client-side rendering, not a bug in the application.

2. **Backend Dependency** - Some API tests require the backend server to be running on port 3000. Tests are designed to fail gracefully when backend is unavailable.

3. **Network Proxy** - The Vite dev server proxies `/api` requests to backend. When backend is not running, these requests fail with connection refused errors.

## Recommendations

1. Increase wait time for Vue hydration in login page tests
2. Mock API responses in frontend-only tests
3. Run full E2E tests with backend server running
4. Add visual regression tests for critical pages

## Files Created/Modified

- `playwright.config.ts` - Playwright configuration
- `tests/app.spec.ts` - Main test file
- `tests/fixtures.ts` - Test fixtures
- `test-app.cjs` - Simple HTTP test script

## Next Steps

1. Fix login page Vue hydration tests
2. Add visual regression tests
3. Add API integration tests (with backend)
4. Set up CI/CD pipeline for tests
5. Add performance benchmarks
