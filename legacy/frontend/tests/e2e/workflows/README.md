# E2E Workflow Tests

Comprehensive end-to-end test suites simulating real-world user workflows across the Lume admin platform.

## Overview

Workflow tests simulate complete user journeys combining multiple modules and features:

- **Admin Onboarding** — Setting up the system, creating users, configuring roles
- **Page Creation & Publishing** — Creating content with visual editor and publishing
- **Form Submission** — Creating forms and handling submissions
- **Content Management** — Media upload, menu structure, content organization
- **Team Collaboration** — Multi-user workflows with different roles and permissions

## Test Files

### 1. `admin-onboarding.spec.ts`
**Goal:** Verify complete admin setup workflow

**Tests:**
- `complete admin onboarding flow` — Full setup from login to configuration (6 steps)
- `admin can configure webhooks` — Webhook/automation setup
- `admin can manage multiple users and roles` — User and role management
- `admin setup creates audit trail` — Audit logging verification

**Workflow Steps:**
1. Access admin dashboard
2. Create first team member
3. Configure custom role
4. Set up organization settings
5. Configure site settings (SEO)
6. Verify dashboard setup completion

**Coverage:** User creation, role management, settings configuration, navigation

### 2. `page-creation.spec.ts`
**Goal:** Verify complete page creation to publishing workflow

**Tests:**
- `complete page creation and publishing workflow` — Full page lifecycle (11 steps)
- `page draft and revision workflow` — Draft page management
- `page slug validation and editing` — Slug uniqueness and validation
- `page bulk actions and management` — Bulk operations

**Workflow Steps:**
1. Navigate to pages module
2. Create new page with title and slug
3. Verify page appears in list
4. Edit page content in visual editor
5. Add sections/blocks to page
6. Set SEO metadata
7. Save as draft
8. Preview page
9. Publish page
10. Verify page in published list
11. Verify accessibility at public URL

**Coverage:** Page CRUD, visual editor, SEO metadata, publishing workflow, drafts

### 3. `form-submission.spec.ts`
**Goal:** Verify form creation and submission workflow

**Tests:**
- `complete form creation and submission workflow` — Full form lifecycle (6 steps)
- `form with multiple field types workflow` — Complex form with various fields
- `admin reviews form submissions` — Viewing form submissions
- `export form submissions` — CSV export functionality
- `form validation workflow` — Form validation configuration
- `form conditional logic and fields` — Advanced form features

**Workflow Steps:**
1. Navigate to forms module
2. Create new form with description
3. Add form fields (text, email, etc.)
4. Configure validation rules
5. Publish form
6. Submit form (visitor)
7. Verify submission saved
8. Review submissions in admin
9. Export submissions as CSV

**Coverage:** Form builder, field types, validation, submissions, export

### 4. `content-management.spec.ts`
**Goal:** Verify complete content management lifecycle

**Tests:**
- `complete content management workflow` — Full content workflow (7 steps)
- `media organization and categorization` — Media folder management
- `page hierarchy and breadcrumb navigation` — Page parent-child relationships
- `content publishing and scheduling` — Content scheduling features
- `content access control and visibility` — Page visibility settings

**Workflow Steps:**
1. Upload media files to library
2. Organize media in folders
3. Create menu structure for navigation
4. Create multiple content pages
5. Link pages in menu items
6. Configure site-wide settings
7. Verify navigation hierarchy works end-to-end

**Coverage:** Media management, menu builder, page organization, site settings, access control

### 5. `team-collaboration.spec.ts`
**Goal:** Verify multi-user collaboration workflows

**Tests:**
- `admin creates team member and assigns role` — User creation with role assignment
- `contributor creates and submits draft page for review` — Draft submission workflow
- `admin reviews and publishes contributor content` — Review and approval workflow
- `permission boundaries - contributor cannot delete pages` — Permission enforcement
- `team activity and audit trail` — Activity logging
- `team member collaboration workflow with comments` — In-content collaboration
- `role-based content assignment workflow` — Role-based permissions
- `team member invitation and onboarding` — Team invitations

**Workflow Steps:**
1. Admin creates contributor user
2. Contributor creates draft page
3. Contributor submits for review
4. Admin reviews content
5. Admin approves and publishes
6. Team member views published content
7. Verify permission boundaries
8. Check activity audit trail

**Coverage:** Team management, multi-role workflows, permissions, collaboration, activity logs

## Running Workflow Tests

### All Workflow Tests
```bash
npx playwright test frontend/tests/e2e/workflows
```

### Specific Test Suite
```bash
npx playwright test frontend/tests/e2e/workflows/admin-onboarding.spec.ts
npx playwright test frontend/tests/e2e/workflows/page-creation.spec.ts
npx playwright test frontend/tests/e2e/workflows/form-submission.spec.ts
npx playwright test frontend/tests/e2e/workflows/content-management.spec.ts
npx playwright test frontend/tests/e2e/workflows/team-collaboration.spec.ts
```

### Specific Test
```bash
npx playwright test admin-onboarding.spec.ts -g "complete admin onboarding flow"
npx playwright test page-creation.spec.ts -g "complete page creation and publishing"
```

### With UI Mode
```bash
npx playwright test frontend/tests/e2e/workflows --ui
```

### With Debug Mode
```bash
npx playwright test frontend/tests/e2e/workflows --debug
```

### Generate Report
```bash
npx playwright test frontend/tests/e2e/workflows --reporter=html
npx playwright show-report
```

## Test Patterns

### Authentication
Tests use pre-authenticated fixtures:
- `adminPage` — Admin user session (admin@lume.dev)
- `userPage` — Regular user session (user@lume.dev)

### Navigation
- Use `navigateToMenuItem(page, 'path')` for sidebar navigation
- Example: `navigateToMenuItem(page, 'Website > Pages')`

### Form Filling
- Use `fillForm(page, { 'Label': 'value' })` for form inputs
- Supports text, select, checkbox inputs
- Example: `fillForm(page, { 'Title': 'My Page', 'Status': 'Draft' })`

### Table Interactions
- Use `waitForTable(page)` to wait for table to load
- Use `clickTableAction(page, 'identifier', 'action')` for row actions
- Example: `clickTableAction(page, 'John Doe', 'Edit')`

### Drawer/Modal Management
- Use `openDrawer(page, 'create')` or `openDrawer(page, 'edit')`
- Use `closeDrawer(page)` to close
- Use `submitForm(page)` to submit

### Success Verification
- Use `expectSuccessMessage(page)` for success notifications
- Use `expect(page).toHaveURL(...)` for navigation verification
- Use `waitForTable(page)` to verify table load

## Real-World Usage Patterns

### Admin Onboarding
1. **Initial Setup** — Configure organization name, email, basic settings
2. **User Creation** — Add first team members with appropriate roles
3. **Role Configuration** — Define custom roles with specific permissions
4. **Webhook Setup** — Configure automation and integrations
5. **Audit Review** — Verify actions logged in audit trail

### Content Publishing
1. **Draft Creation** — Create page with basic info
2. **Content Addition** — Use visual editor to add sections and blocks
3. **SEO Configuration** — Set title, description, og:image
4. **Preview & Review** — Preview before publishing
5. **Publishing** — Publish to live site
6. **Verification** — Test public URL access

### Form Management
1. **Form Creation** — Define form with title and description
2. **Field Definition** — Add text, email, phone, select fields
3. **Validation Setup** — Configure required fields and patterns
4. **Publishing** — Make form live on website
5. **Submission Review** — View and manage submissions
6. **Export** — Download data as CSV

### Content Organization
1. **Media Library** — Upload and organize media files
2. **Menu Structure** — Create navigation hierarchy
3. **Page Creation** — Create multiple related pages
4. **Menu Linking** — Link pages in menu items
5. **Settings** — Configure site metadata and globals
6. **Navigation Test** — Verify menu structure works

### Team Collaboration
1. **User Creation** — Add team member with role
2. **Draft Submission** — Contributor creates draft
3. **Review Process** — Admin reviews and approves
4. **Publishing** — Admin publishes approved content
5. **Permissions** — Verify role-based access control
6. **Activity Tracking** — Review audit trail of actions

## Debugging Failed Workflows

### Enable Debug Output
```bash
DEBUG=pw:api npx playwright test frontend/tests/e2e/workflows
```

### Slow Down Execution
```bash
npx playwright test frontend/tests/e2e/workflows --debug
```

### Inspect Selectors
Use Playwright Inspector:
```bash
npx playwright test frontend/tests/e2e/workflows --debug
# Then step through and inspect elements
```

### Take Screenshots on Failure
```bash
npx playwright test frontend/tests/e2e/workflows --screenshot=only-on-failure
```

### View Failed Test Video
```bash
npx playwright test frontend/tests/e2e/workflows --video=on-first-retry
npx playwright show-report
```

## Test Data Management

### Unique Identifiers
Tests use `timestamp` to ensure unique data:
```typescript
const timestamp = Date.now();
const pageTitle = `Test Page ${timestamp}`;
const userEmail = `user-${timestamp}@example.com`;
```

### Cleanup
Tests verify data creation but don't explicitly delete. Consider:
- Using fixtures to auto-cleanup after tests
- Implementing `afterAll` hooks for bulk deletion
- Creating test data deletion utilities

### Prerequisites
- Lume backend running on http://localhost:3000
- Admin user exists (admin@lume.dev / admin123)
- Database seeded with roles and permissions
- Website/Editor modules installed

## Success Criteria

✓ 25+ total workflow tests  
✓ 5 comprehensive workflow test files  
✓ 5-10 steps per workflow minimum  
✓ Real-world usage patterns  
✓ Multiple user roles tested  
✓ End-to-end validation  
✓ Permission boundary testing  
✓ Activity/audit trail verification  

## Coverage Matrix

| Feature | Admin Onboarding | Page Creation | Form Submission | Content Mgmt | Team Collab |
|---------|------------------|---------------|-----------------|--------------|-------------|
| User Management | ✓ | | | | ✓ |
| Role Management | ✓ | | | | ✓ |
| Page Creation | ✓ | ✓ | | ✓ | |
| Publishing | | ✓ | | ✓ | ✓ |
| SEO Config | | ✓ | | ✓ | |
| Form Builder | | | ✓ | | |
| Submissions | | | ✓ | | |
| Media Management | | ✓ | | ✓ | |
| Menu Builder | | | | ✓ | |
| Site Settings | ✓ | | | ✓ | |
| Permissions | ✓ | | | | ✓ |
| Activity Logs | ✓ | | | | ✓ |
| Collaboration | | | | | ✓ |
| Team Management | ✓ | | | | ✓ |

## Notes

- Tests are designed to be resilient to UI variations using helper functions
- Many tests gracefully handle missing features (.catch())
- Tests verify feature existence even if implementation varies
- Workflow tests prioritize user journeys over exact UI details
- Tests simulate real usage but don't require test teardown
