# Base RBAC Module (NestJS)

## Overview

The Base RBAC (Role-Based Access Control) module provides foundational RBAC permission checking primitives using Prisma and core models (Role, Permission, RolePermission).

This module is the lower-level RBAC layer that the higher-level `rbac` module depends on. It provides:

- Permission checking utilities (single, any, all)
- Role and permission management
- Role-permission assignment
- Permission grouping and retrieval

## Key Features

### Permission Checking
- `hasPermission(userId, code)` - Check single permission
- `hasAnyPermission(userId, codes)` - Check if user has any of permissions
- `hasAllPermissions(userId, codes)` - Check if user has all permissions
- `getUserPermissions(userId)` - Get all user permissions
- `getRolePermissions(roleId)` - Get role permissions

### Role Management
- List all roles
- Get role with permissions
- Create new role
- Update role
- Delete role (with validation)

### Permission Management
- List all permissions
- Get permissions grouped by module
- Create new permission
- Update permission
- Delete permission (with validation)

### Role-Permission Assignment
- Assign permissions to role
- Retrieve role permissions

## API Endpoints

### Roles

```
GET    /api/base-rbac/roles              - Get all roles
GET    /api/base-rbac/roles/:id          - Get role by ID
POST   /api/base-rbac/roles              - Create role
PUT    /api/base-rbac/roles/:id          - Update role
DELETE /api/base-rbac/roles/:id          - Delete role
```

### Permissions

```
GET    /api/base-rbac/permissions              - Get all permissions
GET    /api/base-rbac/permissions/grouped      - Get permissions grouped by module
POST   /api/base-rbac/permissions              - Create permission
PUT    /api/base-rbac/permissions/:id          - Update permission
DELETE /api/base-rbac/permissions/:id          - Delete permission
```

### Role-Permission Assignments

```
POST   /api/base-rbac/roles/:id/permissions    - Assign permissions to role
GET    /api/base-rbac/roles/:id/permissions    - Get role permissions
```

### Permission Checking

```
POST   /api/base-rbac/check-permission   - Check if user has permission
GET    /api/base-rbac/me/permissions     - Get current user permissions
```

## DTOs

### CreateRoleDto
```typescript
{
  name: string;                    // Required: Role name
  description?: string;            // Optional: Role description
  permissionIds?: number[];        // Optional: Permission IDs to assign
  is_active?: boolean;            // Optional: Active status (default: true)
}
```

### UpdateRoleDto
Partial version of CreateRoleDto

### CreatePermissionDto
```typescript
{
  name: string;                   // Required: Permission name
  code: string;                   // Required: Permission code (e.g., 'base.users.read')
  description?: string;           // Optional: Permission description
  group?: string;                 // Optional: Permission group/module
  is_active?: boolean;           // Optional: Active status (default: true)
}
```

### UpdatePermissionDto
Partial version of CreatePermissionDto

### AssignPermissionDto
```typescript
{
  permissionIds: number[];       // Required: Array of permission IDs
}
```

## Service Usage

### Check Permissions

```typescript
import { BaseRbacService } from '@modules/base_rbac';

@Injectable()
export class MyService {
  constructor(private baseRbac: BaseRbacService) {}

  async performAction(userId: number) {
    // Single permission
    const canRead = await this.baseRbac.hasPermission(userId, 'users.read');
    if (!canRead) throw new ForbiddenException();

    // Any permission
    const hasAccess = await this.baseRbac.hasAnyPermission(userId, [
      'users.read',
      'users.write'
    ]);

    // All permissions
    const fullAccess = await this.baseRbac.hasAllPermissions(userId, [
      'users.read',
      'users.write',
      'users.delete'
    ]);

    // Get all permissions
    const permissions = await this.baseRbac.getUserPermissions(userId);
    return permissions; // ['users.read', 'users.write', ...]
  }
}
```

### Get Permissions

```typescript
// Get all permissions
const perms = await this.baseRbac.getAllPermissions();

// Get grouped permissions
const grouped = await this.baseRbac.getPermissionsGrouped();
// Returns: { users: [...], roles: [...], ... }

// Get role permissions
const rolePerms = await this.baseRbac.getRolePermissions(roleId);

// Get user role
const role = await this.baseRbac.getUserRole(userId);

// Get all roles
const roles = await this.baseRbac.getAllRoles();
```

## Integration

### With Auth Module

The BaseRbacService integrates with the auth system for permission checks:

```typescript
// In auth/guards/rbac.guard.ts
const hasPermission = await this.baseRbac.hasPermission(userId, requiredPermission);
```

### With Other Modules

Import BaseRbacModule to use RBAC checks:

```typescript
import { BaseRbacModule } from '@modules/base_rbac';

@Module({
  imports: [BaseRbacModule],
})
export class MyModule {}
```

## Permission Naming Convention

Permissions follow the convention: `module.resource.action`

Examples:
- `base.users.read` - Read users
- `base.users.write` - Create/Update users
- `base.users.delete` - Delete users
- `base.roles.manage` - Manage roles
- `base.permissions.manage` - Manage permissions

## Error Handling

All service methods return gracefully with empty results on error:

```typescript
// Permission check returns false on error
const has = await this.baseRbac.hasPermission(999, 'any.permission'); // false

// Permission lists return empty arrays on error
const perms = await this.baseRbac.getUserPermissions(999); // []
```

Controller endpoints return standard success/error responses:

```typescript
{
  success: true|false,
  data?: any,
  error?: string,
  message?: string
}
```

## Authorization

All endpoints are protected by:
- `JwtAuthGuard` - Requires valid JWT token
- `RbacGuard` - Enforces permission checks
- `@Permissions()` decorator - Specifies required permissions

Example:
```typescript
@Get('roles')
@UseGuards(JwtAuthGuard, RbacGuard)
@Permissions('base.roles.read')
async getAllRoles() { ... }
```

## Database Models

The module uses Prisma core models:

- **Role** - Role definition with name, description
- **Permission** - Permission definition with code and group
- **RolePermission** - M2M relationship between roles and permissions
- **User** - User with role assignment

## System Roles

Two special system roles bypass all permission checks:
- `admin` - Administrator role
- `super_admin` - Super administrator role

Users with these roles automatically have all permissions (represented as `['*']`).

## Dependencies

- `@nestjs/common` - NestJS core
- `@prisma/client` - Prisma ORM client
- `PrismaService` - Core Prisma service
- `JwtAuthGuard` - JWT authentication
- `RbacGuard` - RBAC enforcement

## File Structure

```
src/modules/base_rbac/
├── base-rbac.module.ts              - Module definition
├── controllers/
│   └── base-rbac.controller.ts      - API endpoints
├── services/
│   └── base-rbac.service.ts         - Business logic
├── dtos/
│   ├── create-role.dto.ts
│   ├── update-role.dto.ts
│   ├── create-permission.dto.ts
│   ├── update-permission.dto.ts
│   ├── assign-permission.dto.ts
│   └── index.ts
├── index.ts                         - Exports
└── README.md                        - This file
```

## Migration Notes

This module was migrated from Express to NestJS from `/opt/Lume/backend/src/modules/base_rbac/`. 

Original Express module only contained model schema definitions. This NestJS implementation adds:
- Service layer for RBAC primitives
- Full controller with all CRUD and permission check endpoints
- DTOs for type safety
- Integration with NestJS decorators and guards
