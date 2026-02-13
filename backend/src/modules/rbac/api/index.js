/**
 * RBAC API Routes
 */

import { Router } from 'express';

const router = Router();

let roles = [
  {
    id: 1,
    name: 'Administrator',
    description: 'Full system access',
    permissions: ['*'],
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Manager',
    description: 'Management level access',
    permissions: ['users.read', 'users.write', 'donations.read', 'reports.read'],
    isSystem: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'Staff',
    description: 'Regular staff access',
    permissions: ['donations.read', 'donations.write', 'activities.read'],
    isSystem: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 4,
    name: 'Volunteer',
    description: 'Limited volunteer access',
    permissions: ['activities.read'],
    isSystem: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
];

let permissions = [
  { id: 1, name: 'View Users', code: 'users.read', description: 'View user accounts', groupName: 'Users', category: 'read' },
  { id: 2, name: 'Manage Users', code: 'users.write', description: 'Create/Edit/Delete users', groupName: 'Users', category: 'write' },
  { id: 3, name: 'View Roles', code: 'roles.read', description: 'View roles', groupName: 'RBAC', category: 'read' },
  { id: 4, name: 'Manage Roles', code: 'roles.write', description: 'Create/Edit roles', groupName: 'RBAC', category: 'write' },
  { id: 5, name: 'View Donations', code: 'donations.read', description: 'View donations', groupName: 'Donations', category: 'read' },
  { id: 6, name: 'Manage Donations', code: 'donations.write', description: 'Create/Edit donations', groupName: 'Donations', category: 'write' },
  { id: 7, name: 'View Reports', code: 'reports.read', description: 'View reports', groupName: 'Reports', category: 'read' },
  { id: 8, name: 'View Activities', code: 'activities.read', description: 'View activities', groupName: 'Activities', category: 'read' },
  { id: 9, name: 'Manage Activities', code: 'activities.write', description: 'Create/Edit activities', groupName: 'Activities', category: 'write' },
  { id: 10, name: 'View Settings', code: 'settings.read', description: 'View settings', groupName: 'Settings', category: 'read' },
  { id: 11, name: 'Manage Settings', code: 'settings.write', description: 'Manage settings', groupName: 'Settings', category: 'write' }
];

let accessRules = [
  {
    id: 1,
    name: 'Staff see only active donations',
    model: 'Donation',
    roleId: 3,
    permission: 'read',
    field: null,
    filter: { status: 'completed' },
    isActive: true,
    priority: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
];

let roleIdCounter = 5;
let permissionIdCounter = 12;
let ruleIdCounter = 2;

// Get all roles
router.get('/roles', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, data: roles });
});

// Get role by ID
router.get('/roles/:id', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const role = roles.find(r => r.id === parseInt(req.params.id));
  if (!role) {
    return res.status(404).json({ success: false, error: 'Role not found' });
  }
  res.json({ success: true, data: role });
});

// Create role
router.post('/roles', (req, res) => {
  const { name, description, permissions: perms } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }
  
  const newRole = {
    id: roleIdCounter++,
    name,
    description: description || '',
    permissions: perms || [],
    isSystem: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  roles.push(newRole);
  res.status(201).json({ success: true, data: newRole });
});

// Update role
router.put('/roles/:id', (req, res) => {
  const role = roles.find(r => r.id === parseInt(req.params.id));
  if (!role) {
    return res.status(404).json({ success: false, error: 'Role not found' });
  }
  
  if (role.isSystem) {
    return res.status(403).json({ success: false, error: 'Cannot modify system role' });
  }
  
  const { name, description, permissions: perms, isActive } = req.body;
  
  if (name) role.name = name;
  if (description !== undefined) role.description = description;
  if (perms) role.permissions = perms;
  if (isActive !== undefined) role.isActive = isActive;
  role.updatedAt = new Date().toISOString();
  
  res.json({ success: true, data: role });
});

// Delete role
router.delete('/roles/:id', (req, res) => {
  const role = roles.find(r => r.id === parseInt(req.params.id));
  if (!role) {
    return res.status(404).json({ success: false, error: 'Role not found' });
  }
  
  if (role.isSystem) {
    return res.status(403).json({ success: false, error: 'Cannot delete system role' });
  }
  
  roles = roles.filter(r => r.id !== parseInt(req.params.id));
  res.json({ success: true, message: 'Role deleted' });
});

// Get all permissions
router.get('/permissions', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, data: permissions });
});

// Get permissions grouped by category
router.get('/permissions/grouped', (req, res) => {
  const grouped = {};
  permissions.forEach(p => {
    const group = p.groupName || 'Other';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(p);
  });
  res.json({ success: true, data: grouped });
});

// Get all access rules
router.get('/rules', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, data: accessRules });
});

// Create access rule
router.post('/rules', (req, res) => {
  const { name, model, roleId, permission, field, filter, priority } = req.body;
  
  if (!name || !model || !roleId || !permission) {
    return res.status(400).json({ success: false, error: 'Name, model, roleId, and permission are required' });
  }
  
  const newRule = {
    id: ruleIdCounter++,
    name,
    model,
    roleId,
    permission,
    field: field || null,
    filter: filter || null,
    isActive: true,
    priority: priority || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  accessRules.push(newRule);
  res.status(201).json({ success: true, data: newRule });
});

// Update access rule
router.put('/rules/:id', (req, res) => {
  const rule = accessRules.find(r => r.id === parseInt(req.params.id));
  if (!rule) {
    return res.status(404).json({ success: false, error: 'Rule not found' });
  }
  
  const { name, model, roleId, permission, field, filter, isActive, priority } = req.body;
  
  if (name) rule.name = name;
  if (model) rule.model = model;
  if (roleId) rule.roleId = roleId;
  if (permission) rule.permission = permission;
  if (field !== undefined) rule.field = field;
  if (filter !== undefined) rule.filter = filter;
  if (isActive !== undefined) rule.isActive = isActive;
  if (priority !== undefined) rule.priority = priority;
  rule.updatedAt = new Date().toISOString();
  
  res.json({ success: true, data: rule });
});

// Delete access rule
router.delete('/rules/:id', (req, res) => {
  const rule = accessRules.find(r => r.id === parseInt(req.params.id));
  if (!rule) {
    return res.status(404).json({ success: false, error: 'Rule not found' });
  }
  
  accessRules = accessRules.filter(r => r.id !== parseInt(req.params.id));
  res.json({ success: true, message: 'Rule deleted' });
});

export default router;
