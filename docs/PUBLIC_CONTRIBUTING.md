# Lume v2.0 Contributing Guide

**Last Updated:** April 28, 2026  
**Version:** 2.0.0

Guide for contributing to Lume, including development setup, code standards, testing, and pull request process.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Style & Standards](#code-style--standards)
4. [Creating Modules](#creating-modules)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Documentation](#documentation)
8. [Roadmap & Contribution Areas](#roadmap--contribution-areas)
9. [Code of Conduct](#code-of-conduct)

---

## Getting Started

### Prerequisites

- Node.js v18+ LTS
- MySQL 8.0+
- Redis 6.0+
- Git
- Basic JavaScript/TypeScript knowledge

### Fork & Clone

```bash
# Fork on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/lume.git
cd lume

# Add upstream
git remote add upstream https://github.com/lume/lume.git

# Keep fork in sync
git fetch upstream
git rebase upstream/main
```

---

## Development Setup

### Backend

```bash
# Install dependencies
npm install

# Backend setup
cd backend
cp .env.example .env
# Edit .env with database credentials

# Initialize database
npm run db:init

# Start development server
npm run dev
```

### Frontend (Admin Panel)

```bash
cd frontend/apps/web-lume
npm install
npm run dev
# Open http://localhost:5173
```

### Frontend (Public Website)

```bash
cd frontend/apps/riagri-website
npm install
npm run dev
# Open http://localhost:3007
```

---

## Code Style & Standards

### ESM Module System

Always use ES modules (no CommonJS):

```javascript
// ✅ Correct
import { someFunction } from './utils'
export default MyClass

// ❌ Wrong
const { someFunction } = require('./utils')
module.exports = MyClass
```

### TypeScript/JSDoc

Use TypeScript where possible, JSDoc for JavaScript:

```typescript
// TypeScript
interface User {
  id: number
  email: string
  role: 'admin' | 'editor' | 'viewer'
}

async function getUser(id: number): Promise<User> {
  // Implementation
}

// JSDoc (for JS files)
/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Promise<User>} User object
 */
async function getUser(id) {
  // Implementation
}
```

### Code Formatting

Use Prettier (automated):

```bash
npm run format
```

Configuration in `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "arrowParens": "avoid",
  "trailingComma": "es5"
}
```

### Linting

ESLint catches common issues:

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Naming Conventions

- **Files:** `kebab-case.js`
- **Classes:** `PascalCase`
- **Functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Private methods:** `_privateMethod`

---

## Creating Modules

### Module Structure

```
backend/src/modules/mymodule/
├── __manifest__.js                 (Required: metadata)
├── models/schema.js                (Drizzle schema)
├── services/mymodule.service.js    (Business logic)
├── routes.js                       (API endpoints)
├── permissions.js                  (RBAC setup)
├── static/
│   ├── views/MyView.vue           (Optional: components)
│   ├── api/mymodule.api.js        (Frontend API client)
│   └── components/MyComponent.vue
└── tests/mymodule.test.js          (Jest tests)
```

### Manifest File

```javascript
// __manifest__.js
export default {
  name: 'mymodule',
  displayName: 'My Module',
  version: '1.0.0',
  description: 'Module description',
  author: 'Your Name',
  
  permissions: [
    { name: 'mymodule.view', description: 'View data' },
    { name: 'mymodule.edit', description: 'Edit data' }
  ],
  
  menuItems: [
    { path: '/mydata', icon: 'star', category: 'Data' }
  ],
  
  dependencies: ['base', 'security'],
  
  settings: {
    enabled: true,
    public: false
  }
}
```

### Service Class

```typescript
// services/mymodule.service.ts
export class MyModuleService {
  async getAll(filters = {}) {
    return await db.query(/* ... */)
  }

  async getById(id: number) {
    return await db.queryOne(/* ... */)
  }

  async create(data: CreateDTO) {
    // Validate
    // Create
    // Log to audit
    return created
  }

  async update(id: number, data: UpdateDTO) {
    // Validate
    // Update
    // Log changes
    return updated
  }

  async delete(id: number) {
    // Soft delete
    return deleted
  }
}
```

---

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific test file
npm test -- mymodule.test.js
```

### Writing Tests

```javascript
// mymodule.test.js
import { describe, test, expect } from '@jest/globals'
import { MyModuleService } from './services/mymodule.service'

describe('MyModuleService', () => {
  let service

  beforeEach(() => {
    service = new MyModuleService()
  })

  test('should get all records', async () => {
    const records = await service.getAll()
    expect(Array.isArray(records)).toBe(true)
  })

  test('should get record by id', async () => {
    const record = await service.getById(1)
    expect(record.id).toBe(1)
  })

  test('should create record', async () => {
    const record = await service.create({ name: 'Test' })
    expect(record.id).toBeGreaterThan(0)
  })
})
```

### Test Coverage Target

- Minimum 80% statement coverage
- Critical paths 100% coverage
- Run coverage report: `npm test -- --coverage`

---

## Pull Request Process

### Before Creating PR

1. **Fork and branch:**
   ```bash
   git checkout -b feature/description
   ```

2. **Make changes:**
   - Follow code standards
   - Write tests for new code
   - Update documentation

3. **Commit with clear messages:**
   ```bash
   git commit -m "feat: add feature description

   - What changed
   - Why it changed
   - Any breaking changes

   Closes #123"
   ```

   **Types:** feat, fix, docs, style, refactor, test, chore

4. **Ensure tests pass:**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

5. **Keep PR focused:**
   - One feature per PR
   - Logical commits
   - No unrelated changes

### Create PR

1. Push to your fork:
   ```bash
   git push origin feature/description
   ```

2. Create PR on GitHub with:
   - Clear title (under 70 chars)
   - Description explaining changes
   - Link to related issues (#123)
   - Screenshots if UI changes

3. PR Template:
   ```markdown
   ## Description
   What does this PR do?

   ## Motivation
   Why is this change needed?

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation

   ## Testing
   How was this tested?

   ## Checklist
   - [ ] Tests added
   - [ ] Documentation updated
   - [ ] No breaking changes
   - [ ] Follows code style
   ```

### PR Review Process

1. Automated checks run:
   - Linting
   - Tests
   - Build verification

2. Maintainers review:
   - Code quality
   - Architecture
   - Performance
   - Security

3. Address feedback:
   - Make requested changes
   - Push updates (don't force)
   - Resolve conversations

4. Merge:
   - Squash commits for cleanliness
   - Maintainer merges to main

---

## Documentation

### Code Comments

Only comment *why*, not *what*:

```javascript
// ✅ Good: Explains why
// Skip validation if user is admin (they can't introduce invalid data)
if (user.isAdmin) return

// ❌ Bad: Just restates code
// Check if user is admin
if (user.isAdmin) return
```

### JSDoc/Comments

```typescript
/**
 * Retrieve user by email with related data
 * 
 * @param {string} email - User email address
 * @param {Object} options - Query options
 * @param {boolean} options.includeRoles - Include role data
 * @returns {Promise<User|null>} User object or null if not found
 * @throws {ValidationError} If email format invalid
 */
async function getUserByEmail(email, options = {}) {
  // Implementation
}
```

### README Updates

Update docs when adding features:
- User-facing: `docs/PUBLIC_USER_GUIDE.md`
- API changes: `docs/PUBLIC_API_REFERENCE.md`
- Architecture: `docs/PUBLIC_ARCHITECTURE.md`

---

## Roadmap & Contribution Areas

### v2.1 (Next Release)

- [ ] GraphQL API support
- [ ] Multi-tenant support
- [ ] Mobile app beta
- [ ] Advanced analytics
- [ ] A/B testing framework
- [ ] WebAuthn authentication

### Contribution Areas (High Priority)

- 🐛 **Bug fixes:** Help improve stability
- 🧪 **Test coverage:** Write tests for untested code
- 📚 **Documentation:** Improve guides and examples
- 🌍 **Translations:** Help localize Lume
- 🎨 **UI/UX:** Design improvements
- ⚡ **Performance:** Optimization opportunities

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community.

### Expected Behavior

- Be respectful and inclusive
- Assume good intent
- Focus on the work, not the person
- Help others grow and learn
- Report issues to maintainers@lume.dev

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or personal attacks
- Sharing private information
- Spam or commercial promotion

---

## Getting Help

- **Issues:** Ask questions in GitHub discussions
- **Chat:** Join Discord community
- **Email:** contributors@lume.dev
- **Documentation:** Check docs/ folder

---

## Recognition

Contributors recognized in:
- GitHub contributors page
- CHANGELOG.md with each release
- Lume website contributors section
- Release notes

**Thank you for contributing!** 🙌

