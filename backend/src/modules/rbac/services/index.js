/**
 * RBAC Services
 */

class RoleService {
  async getAllRoles() {
    const response = await fetch('/api/rbac/roles');
    const result = await response.json();
    return result.data;
  }

  async getRoleById(id) {
    const response = await fetch(`/api/rbac/roles/${id}`);
    const result = await response.json();
    return result.data;
  }

  async createRole(roleData) {
    const response = await fetch('/api/rbac/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData)
    });
    const result = await response.json();
    return result.data;
  }

  async updateRole(id, roleData) {
    const response = await fetch(`/api/rbac/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData)
    });
    const result = await response.json();
    return result.data;
  }

  async deleteRole(id) {
    const response = await fetch(`/api/rbac/roles/${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  }
}

class PermissionService {
  async getAllPermissions() {
    const response = await fetch('/api/rbac/permissions');
    const result = await response.json();
    return result.data;
  }

  async getPermissionsGrouped() {
    const response = await fetch('/api/rbac/permissions/grouped');
    const result = await response.json();
    return result.data;
  }
}

class AccessRuleService {
  async getAllRules() {
    const response = await fetch('/api/rbac/rules');
    const result = await response.json();
    return result.data;
  }

  async createRule(ruleData) {
    const response = await fetch('/api/rbac/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData)
    });
    const result = await response.json();
    return result.data;
  }

  async updateRule(id, ruleData) {
    const response = await fetch(`/api/rbac/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData)
    });
    const result = await response.json();
    return result.data;
  }

  async deleteRule(id) {
    const response = await fetch(`/api/rbac/rules/${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  }
}

export const roleService = new RoleService();
export const permissionService = new PermissionService();
export const accessRuleService = new AccessRuleService();

export default {
  roleService,
  permissionService,
  accessRuleService
};
