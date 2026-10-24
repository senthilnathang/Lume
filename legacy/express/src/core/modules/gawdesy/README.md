# GAWDESY Enterprise Module

## Overview

The **Gawdesy** module is the core enterprise module that provides all advanced features for the Gawdesy platform, inspired by FastVue patterns.

## Features

### 1. CRUD Mixin (`CRUDMixin`)
Reusable CRUD operations for all models:
- `search(options)` - Advanced search with pagination, sorting, domain filtering
- `browse(options)` - List records with domain filters
- `read(id)` - Get single record
- `create(vals)` - Create new record
- `write(id, vals)` - Update record
- `unlink(id)` - Soft delete
- `delete(id)` - Hard delete

### 2. Hook System (`hooks/index.js`)
Event-driven hooks for model lifecycle:
- `@before_create(model)` - Before record creation
- `@after_create(model)` - After record creation
- `@before_update(model)` - Before record update
- `@after_update(model)` - After record update
- `@before_delete(model)` - Before record deletion
- `@after_delete(model)` - After record deletion
- `@onchange(model, fields)` - Field change events
- `@constrains(model, field)` - Field constraints

### 3. Record Rules (`record-rule.service.js`)
Row-level security with domain-based access control:
- Domain filtering for read/write access
- User/role-based rule scoping
- JSON-based domain expressions

### 4. Sequence Service (`sequence.service.js`)
Auto-numbering for documents:
- Pattern-based numbering: `{PREFIX}{YYYY}{MM}{0000}{SUFFIX}`
- Date-based patterns
- Configurable padding and step
- Company-scoped sequences

### 5. Security Service (`security.service.js`)
Enterprise RBAC with profiles:
- Profile-based permissions
- IP restrictions
- Time-based login hours
- Row-level security

## Module Structure

```
gawdesy/
├── __manifest__.js          # Module metadata, permissions, menus
├── index.js                # Module exports and hooks
├── gawdesy.service.js      # Core service with CRUD, sequences, rules
└── routes.js              # API endpoints
```

## Manifest Configuration

```javascript
{
    name: "gawdesy",
    version: "1.0.0",
    permissions: [
        { name: "gawdesy.read" },
        { name: "gawdesy.write" },
        { name: "gawdesy.admin" }
    ],
    menus: [
        { title: "Settings", path: "/gawdesy/settings" }
    ],
    views: [
        { name: "GawdesySettings", path: "/gawdesy/settings" }
    ],
    hooks: {
        pre_init_hook: "preInit",
        post_init_hook: "postInit",
        post_load_hook: "postLoad"
    },
    auto_install: true
}
```

## API Endpoints

### System Info
```
GET /api/gawdesy/info
GET /api/gawdesy/health
```

### Statistics
```
GET /api/gawdesy/statistics
```

### Modules
```
GET /api/modules              # List all modules
GET /api/gawdesy/modules      # List Gawdesy module info
```

### Menus & Permissions
```
GET /api/menus               # List all menus
GET /api/gawdesy/menus       # List Gawdesy menus
GET /api/permissions         # List all permissions
```

### Settings
```
GET /api/gawdesy/settings    # Get settings
PUT /api/gawdesy/settings   # Update settings
```

### Sequences
```
POST /api/sequences/generate?name=XXX  # Generate next number
```

### Record Rules
```
GET /api/record-rules/:model   # Get rules for model
POST /api/record-rules         # Create new rule
```

## Usage Examples

### Using CRUDMixin
```javascript
const { CRUDMixin } = require('./core/services');

class UserService extends CRUDMixin {
    constructor(db, context) {
        super(User, db, context);
    }
}

const service = new UserService(db, { user_id: 1 });
const users = await service.search({
    domain: [['status', '=', 'active']],
    page: 1,
    limit: 20,
    order_by: 'created_at',
    order: 'DESC'
});
```

### Using Hooks
```javascript
const { before_create } = require('./core/hooks');

class User extends Model {
    @before_create('user')
    setDefaults(record, context) {
        record.status = 'pending';
        record.created_by = context.user_id;
    }
}
```

### Using Sequences
```javascript
const { SequenceService } = require('./core/services');

const sequenceService = new SequenceService(db);
const receipt = await sequenceService.getNextCode('receipt', {
    company_code: 'GWDS'
});
// Returns: "GWDS-2024-0001"
```

### Using Record Rules
```javascript
const { RecordRuleService } = require('./core/services');

const ruleService = new RecordRuleService(db);
const { domain } = await ruleService.apply_rules(
    userId, 
    'donation', 
    'read'
);
// Returns: [['status', '=', 'active']]
```

## Enterprise Features

### Security Profile
- **IP Restrictions**: Define allowed IP ranges for user logins
- **Time-Based Access**: Restrict login hours per profile
- **Profile Permissions**: CRUD + admin permissions per object

### Row-Level Security
- Domain-based filtering for data access
- User/role-specific rules
- JSON domain expressions: `[['field', '=', value]]`

### Audit Logging
- Automatic tracking of all operations
- User, timestamp, IP address logging
- Change history with diffs

## Integration

### Frontend Module Loader
```javascript
import { useModules } from '@/composables/useModules';

const { modules, menus, loadModules } = useModules();

onMounted(async () => {
    await loadModules();
});
```

### API Client
```javascript
import { useApi } from '@/composables/useApi';

const api = useApi();
const users = await api.get('/users');
```

## Testing

Run module tests:
```bash
npm test
```

Test coverage includes:
- Module manifest validation
- CRUD operations
- Hook system
- Sequence generation
- Record rule enforcement
- API endpoints

## License

MIT
