# NestJS Migration Guide - 22 Modules

## Current Status
- ✅ Phase 0: Tests fixed (Express unit tests pass, NestJS 8/8 pass)
- ✅ Phase 1: Core infrastructure complete (BaseModule, SharedModule, decorators)
- 🔄 Phase 2-6: Module migration in progress (0/20 modules complete)

## Module Migration Pattern

Each module follows this structure:

```
src/modules/<module-name>/
  <module-name>.module.ts       — @Module() class
  controllers/
    <module-name>.controller.ts — @Controller() with routes
  services/
    <module-name>.service.ts    — @Injectable() service
  dtos/
    create-<module-name>.dto.ts — class-validator DTO
    update-<module-name>.dto.ts — PartialType(CreateDto)
    index.ts                    — barrel export
```

### Express → NestJS Translation Rules

| Express | NestJS |
|---------|--------|
| `new Service()` | `@Injectable() class` injected via constructor |
| `req.user` from middleware | `@CurrentUser()` decorator or `@Req()` |
| `authenticate` middleware | `@UseGuards(JwtAuthGuard)` |
| `authorize('res', 'action')` | `@UseGuards(RbacGuard)` + `@Permissions('res.action')` |
| `throw new Error()` | `throw new NestException()` |
| Direct Prisma usage | Inject `PrismaService` |
| Direct Drizzle usage | Inject `DrizzleService` |
| `res.status(200).json()` | `return { success: true, data }` |
| Input validation via `express-validator` | `class-validator` in DTOs |
| Public routes (no auth) | `@Public()` decorator on route method |

### Example: Converting Express Route to NestJS

**Express:**
```javascript
router.post('/', authenticate, authorize('settings', 'write'), settingValidation, validateRequest, async (req, res) => {
  const result = await getSettingService().set(req.body.key, req.body.value, req.body);
  res.status(result.success ? 201 : 400).json(result);
});
```

**NestJS:**
```typescript
@Post()
@UseGuards(JwtAuthGuard, RbacGuard)
@Permissions('settings.write')
async create(@Body() dto: CreateSettingDto) {
  return this.settingsService.set(dto.key, dto.value, dto);
}
```

## Key Services Available

All injected via constructor in service classes:
- `PrismaService` — Prisma ORM (11 core models)
- `DrizzleService` — Drizzle ORM (39+ module tables)
- `AuthService` (actually JwtService) — Token generation, password hashing
- `LoggerService` — Logging
- `RbacService` — Permission checking

## Module Dependencies

Order of migration (based on dependencies):
1. **base** — Foundation (0 deps)
2. **common** — Shared utilities (0 deps)
3. **settings** — App config (depends on base)
4. **rbac, base_rbac, base_security, audit** — Auth/Security (depend on base)
5. **editor** — Page builder (depends on base)
6. **website** — CMS (depends on editor, settings)
7. **activities, documents, team, media, donations, messages** — Content modules (depend on base)
8. **base_automation, base_customization, base_features_data, advanced_features** — Feature modules
9. **lume, gawdesy, security-audit** — Platform modules

## How to Migrate a Module

### 1. Read Express Module
```bash
cat /opt/Lume/backend/src/modules/<name>/<name>.routes.js
cat /opt/Lume/backend/src/modules/<name>/<name>.service.js
cat /opt/Lume/backend/src/modules/<name>/__manifest__.js
```

### 2. Create NestJS Module File
```typescript
import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { <Name>Service } from './services/<name>.service';
import { <Name>Controller } from './controllers/<name>.controller';

@Module({
  imports: [SharedModule],
  controllers: [<Name>Controller],
  providers: [<Name>Service],
  exports: [<Name>Service],
})
export class <Name>Module {}
```

### 3. Create Service
- Copy the Express service logic
- Change Prisma/Drizzle calls from direct imports to injected services
- Remove `responseUtil` calls - just return `{ success: true, data }`
- Throw NestJS exceptions instead of returning error responses

### 4. Create Controller
- Create one method per Express route
- Use `@Get()`, `@Post()`, `@Put()`, `@Delete()` decorators
- Add `@UseGuards()` and `@Permissions()` where needed
- Add `@Public()` for unauthenticated routes

### 5. Create DTOs
- Use `class-validator` decorators
- One for Create, one for Update (extends PartialType)

### 6. Add Tests
- Unit tests in `test/unit/<name>/`
- Integration tests in `test/integration/<name>.spec.ts`

### 7. Register in AppModule
Add to `src/app.module.ts` imports array:
```typescript
imports: [
  ...
  <Name>Module,
],
```

## Testing After Migration

```bash
# Type check
npm run typecheck

# Run tests
npm test

# Build
npm run build

# Start server
npm run start
```

## Modules to Migrate (20 remaining)

- [ ] settings (example template provided in code)
- [ ] base
- [ ] common
- [ ] rbac
- [ ] base_rbac
- [ ] base_security
- [ ] audit
- [ ] editor
- [ ] website
- [ ] activities
- [ ] documents
- [ ] team
- [ ] media
- [ ] donations
- [ ] messages
- [ ] base_automation
- [ ] base_customization
- [ ] base_features_data
- [ ] advanced_features
- [ ] lume
- [ ] gawdesy
- [ ] security-audit

## Expected Effort

- Simple modules (CRUD only): ~30 minutes each
- Complex modules (business logic): ~1-2 hours each
- Website module (CMS + public API): ~2-3 hours

Total estimated time: 30-40 hours for full migration

## Key Files to Reference

- Reference module: `src/modules/users/` — completed implementation
- Core infrastructure: `src/core/` — services, guards, decorators, pipes
- Test examples: `test/integration/auth/` — auth tests
- Configuration: `src/main.ts` — app setup, global pipes/guards/filters
