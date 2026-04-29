# NestJS Migration Integration Checklist

This checklist guides the final integration of all migrated modules.

## ✅ Completed Modules (Auto-integrated)
- [x] Auth Module - in AppModule
- [x] Users Module - in AppModule
- [x] Settings Module - in AppModule

## 🔄 In Progress (Agents working)
- [ ] RBAC Module
- [ ] Base RBAC Module
- [ ] Base Security Module
- [ ] Audit Module
- [ ] Base Module (complex)
- [ ] Editor Module
- [ ] Website Module (most complex)
- [ ] Activities, Documents, Team Modules (parallel)
- [ ] Media, Donations, Messages Modules (parallel)
- [ ] Base Automation, Customization, Features Data Modules (parallel)
- [ ] Advanced Features, Lume, Gawdesy, Security Audit Modules (parallel)

## 📋 Integration Steps

### Step 1: Wait for All Agents to Complete
Monitor agent completion. Once all agents are done, proceed to Step 2.

### Step 2: Update AppModule Imports
Add all new modules to `src/app.module.ts`:

```typescript
// Add to imports section:
import { RbacModule } from './modules/rbac/rbac.module';
import { BaseRbacModule } from './modules/base_rbac/base-rbac.module';
import { BaseSecurityModule } from './modules/base_security/base-security.module';
import { AuditModule } from './modules/audit/audit.module';
import { BaseModule } from './modules/base/base.module';
import { EditorModule } from './modules/editor/editor.module';
import { WebsiteModule } from './modules/website/website.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TeamModule } from './modules/team/team.module';
import { MediaModule } from './modules/media/media.module';
import { DonationsModule } from './modules/donations/donations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { BaseAutomationModule } from './modules/base_automation/base-automation.module';
import { BaseCustomizationModule } from './modules/base_customization/base-customization.module';
import { BaseFeaturesDataModule } from './modules/base_features_data/base-features-data.module';
import { AdvancedFeaturesModule } from './modules/advanced_features/advanced-features.module';
import { LumeModule } from './modules/lume/lume.module';
import { GawdesyModule } from './modules/gawdesy/gawdesy.module';
import { SecurityAuditModule } from './modules/security_audit/security-audit.module';

// Add to @Module imports array:
@Module({
  imports: [
    // ... existing imports ...
    RbacModule,
    BaseRbacModule,
    BaseSecurityModule,
    AuditModule,
    BaseModule,
    EditorModule,
    WebsiteModule,
    ActivitiesModule,
    DocumentsModule,
    TeamModule,
    MediaModule,
    DonationsModule,
    MessagesModule,
    BaseAutomationModule,
    BaseCustomizationModule,
    BaseFeaturesDataModule,
    AdvancedFeaturesModule,
    LumeModule,
    GawdesyModule,
    SecurityAuditModule,
  ],
  // ... rest of module config ...
})
```

### Step 3: Type Check
```bash
cd /opt/Lume/backend/lume-nestjs
npm run typecheck 2>&1
```

**Expected**: No TypeScript errors
**If errors**: Check for:
- Missing imports in modules
- Incorrect DTO names
- Service injection issues
- Guard/decorator usage errors

### Step 4: Run Tests
```bash
npm test 2>&1 | tail -30
```

**Expected**: All tests passing (8/8 suites, 57+ tests)
**If failures**: 
- Check test output for which test failed
- Most likely: missing database connection for integration tests
- Run unit tests only if integration tests fail: `npm test -- --testPathPattern='unit'`

### Step 5: Build
```bash
npm run build 2>&1
```

**Expected**: Successful build, dist/ directory created
**If errors**: TypeScript compilation errors - check type definitions

### Step 6: Verify Server Starts
```bash
npm run start &
sleep 2
curl http://localhost:3001/api/v2/health
```

**Expected**: 
```json
{
  "status": "ok",
  "timestamp": "2026-04-29T..."
}
```

If port 3001 is in use: `lsof -i :3001` to find process, then kill it

### Step 7: Test Key Endpoints

Once server is running:

```bash
# Test health
curl http://localhost:3001/api/v2/health

# Test public endpoint (Settings)
curl http://localhost:3001/api/settings/public

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lume.dev","password":"Admin@123"}'

# Test protected endpoint (Settings list)
curl http://localhost:3001/api/settings \
  -H "Authorization: Bearer <token_from_login>"
```

## ⚠️ Common Issues

### Issue: Module not found
**Solution**: Check module path spelling and imports in AppModule

### Issue: Service injection error
**Solution**: Ensure service is:
1. Marked with `@Injectable()`
2. Listed in module's `providers` array
3. Imported via SharedModule or listed as provider

### Issue: DTO validation errors
**Solution**: Check DTOs have correct class-validator decorators

### Issue: Database connection errors
**Solution**: 
1. Verify MySQL is running: `mysql -u gawdesy -p`
2. Verify database `lume` exists: `SHOW DATABASES;`
3. Check .env file has correct DATABASE_URL

### Issue: Permission/guard errors
**Solution**:
1. Verify @Permissions decorator has correct format: 'module.action'
2. Verify JwtAuthGuard is applied before RbacGuard
3. Check @Public() is applied for unauthenticated endpoints

## 📊 Final Status Targets

After completing all steps:

| Metric | Target |
|--------|--------|
| Total modules | 22 |
| Modules migrated | 22 ✓ |
| TypeScript compilation | 100% ✓ |
| Test suites | 8+ (all pass) ✓ |
| Tests | 57+ (all pass) ✓ |
| Build | Success ✓ |
| Server starts | Successful ✓ |
| Health check | 200 OK ✓ |
| Login works | 200 OK with tokens ✓ |

## 🎉 Success Criteria

Migration is complete when:
- ✅ All 22 modules migrated to NestJS
- ✅ 100% TypeScript compilation (npm run typecheck passes)
- ✅ All tests passing (npm test passes)
- ✅ Server starts successfully (npm run start)
- ✅ Health endpoint responds (GET /api/v2/health → 200)
- ✅ Auth endpoints working (login/refresh/verify)
- ✅ Key endpoints responding (settings, pages, etc.)

## 📞 Troubleshooting

If stuck:
1. Check MIGRATION_GUIDE.md for patterns
2. Reference src/modules/settings/ for working example
3. Check src/modules/users/ for auth example
4. Review test files in test/ directory
5. Check console errors for specific issues
