// Core API exports for FastVue

// Authentication
export * from './auth';

// User management
export * from './user';

// Company management - exclude names that conflict with user and auth
// @ts-expect-error duplicate export resolution
export * from './company';

// RBAC (Roles, Permissions, Groups) - exclude names that conflict with user and settings
// @ts-expect-error duplicate export resolution
export * from './rbac';

// Menu and navigation
export * from './menu';

// Base utilities - exclude names that conflict with company and auth
// @ts-expect-error duplicate export resolution
export * from './base';

// Audit logs
export * from './audit';

// Settings - exclude names that conflict with rbac and user
// @ts-expect-error duplicate export resolution
export * from './settings';

// Module management
export * from './modules';
