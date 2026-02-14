<template>
  <div class="module-view">
    <div v-if="loading" class="module-loading">
      <div class="loading-spinner"></div>
      <span>Loading...</span>
    </div>
    
    <div v-else-if="error" class="module-error">
      <h3>Error</h3>
      <p>{{ error }}</p>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>
    
    <div v-else class="module-content">
      <div class="module-header">
        <div class="header-content">
          <h2>{{ title || moduleTitle }}</h2>
          <p v-if="description" class="header-description">{{ description }}</p>
        </div>
        <div class="header-actions">
          <ExportMenu 
            v-if="viewType === 'list' && data.length > 0"
            :data="filteredData" 
            :columns="columns"
            :module-name="moduleTitle"
            @export="handleExport"
          />
          <button v-if="showCreate" @click="handleCreate" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            {{ createLabel }}
          </button>
        </div>
      </div>

      <div class="module-body">
        <div v-if="viewType === 'list'" class="list-view">
          <div class="list-header">
            <div class="search-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search..."
                @input="handleSearch"
              />
            </div>
            <div class="list-filters">
              <select v-model="statusFilter" @change="handleFilter">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th v-for="col in columns" :key="col.key" :class="{ 'sortable': col.sortable }" @click="handleSort(col.key)">
                    {{ col.title }}
                    <svg v-if="sortColumn === col.key" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path v-if="sortDirection === 'asc'" d="M12 5v14M19 12l-7 7-7-7"></path>
                      <path v-else d="M12 19V5M5 12l7-7 7 7"></path>
                    </svg>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredData" :key="item.id" @click="handleRowClick(item)">
                  <td v-for="col in columns" :key="col.key">
                    <span v-if="col.type === 'status'" :class="['status-badge', item[col.key]]">
                      {{ item[col.key] }}
                    </span>
                    <span v-else-if="col.type === 'date'">
                      {{ formatDate(item[col.key]) }}
                    </span>
                    <span v-else-if="col.type === 'action'" class="action-links">
                      <a @click.stop="handleView(item)" title="View">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </a>
                      <a @click.stop="handleEdit(item)" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </a>
                      <a v-if="showDelete" @click.stop="handleDelete(item)" title="Delete" class="delete-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </a>
                    </span>
                    <span v-else>{{ item[col.key] }}</span>
                  </td>
                </tr>
                <tr v-if="filteredData.length === 0">
                  <td :colspan="columns.length" class="empty-state">
                    <div class="empty-content">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      <p>No {{ moduleTitle.toLowerCase() }} found</p>
                      <button @click="handleCreate" class="btn btn-secondary">
                        Add {{ moduleTitle }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination" v-if="totalPages > 1">
            <button 
              @click="handlePageChange(currentPage - 1)" 
              :disabled="currentPage === 1"
              class="page-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            <button 
              @click="handlePageChange(currentPage + 1)" 
              :disabled="currentPage === totalPages"
              class="page-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div v-else-if="viewType === 'form'" class="form-view">
          <form @submit.prevent="handleSubmit" class="module-form">
            <div class="form-fields">
              <div v-for="field in formFields" :key="field.key" class="form-field">
                <label :for="field.key">
                  {{ field.title }}
                  <span v-if="field.required" class="required-mark">*</span>
                </label>
                <input 
                  v-if="field.type === 'text' || field.type === 'email' || field.type === 'number'"
                  :id="field.key"
                  v-model="formData[field.key]"
                  :type="field.type"
                  :required="field.required"
                  :placeholder="field.placeholder"
                  :disabled="field.disabled"
                />
                <textarea 
                  v-else-if="field.type === 'textarea'"
                  :id="field.key"
                  v-model="formData[field.key]"
                  :required="field.required"
                  :placeholder="field.placeholder"
                  :rows="field.rows || 4"
                  :disabled="field.disabled"
                ></textarea>
                <select 
                  v-else-if="field.type === 'select'"
                  :id="field.key"
                  v-model="formData[field.key]"
                  :required="field.required"
                  :disabled="field.disabled"
                >
                  <option value="">Select {{ field.title }}</option>
                  <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <div v-else-if="field.type === 'checkbox'" class="checkbox-field">
                  <input 
                    type="checkbox"
                    :id="field.key"
                    v-model="formData[field.key]"
                    :disabled="field.disabled"
                  />
                  <label :for="field.key">{{ field.checkboxLabel }}</label>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" @click="handleCancel" class="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                {{ submitting ? 'Saving...' : saveLabel }}
              </button>
            </div>
          </form>
        </div>

        <div v-else-if="viewType === 'detail'" class="detail-view">
          <div class="detail-header">
            <button @click="handleBack" class="back-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back to List
            </button>
            <div class="detail-actions">
              <button @click="handleEdit(currentItem)" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit
              </button>
            </div>
          </div>
          
          <div class="detail-content">
            <div v-for="field in columns" :key="field.key" class="detail-field">
              <span class="field-label">{{ field.title }}</span>
              <span v-if="field.type === 'status'" :class="['status-badge', currentItem[field.key]]">
                {{ currentItem[field.key] }}
              </span>
              <span v-else-if="field.type === 'date'" class="field-value">
                {{ formatDate(currentItem[field.key]) }}
              </span>
              <span v-else class="field-value">{{ currentItem[field.key] || '-' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { get, post, put, del } from '@/api/request';
import ExportMenu from './ExportMenu.vue';

const props = defineProps<{
  moduleName?: string;
  viewName?: string;
}>();

const route = useRoute();
useRouter();

// Use route params as fallback for moduleName
const effectiveModuleName = computed(() => {
  return props.moduleName || route.params.moduleName || route.meta?.module || 'default';
});

const loading = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);

const viewType = ref<'list' | 'form' | 'detail'>('list');
const currentItem = ref<any>(null);
const itemId = ref<string | number | null>(null);

const searchQuery = ref('');
const statusFilter = ref('');
const sortColumn = ref('');
const sortDirection = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);
const pageSize = 10;

const formData = ref<Record<string, any>>({});

const data = ref<any[]>([]);

function getConfigKey(moduleName: string, routePath: string): string {
  const path = routePath || '';
  
  // If it's a direct module name match, use that
  if (moduleConfig[moduleName]) {
    return moduleName;
  }
  
  // Extract key from path - remove leading slash, handle special cases
  let key = path.startsWith('/') ? path.slice(1) : path;
  
  // Remove /settings/ prefix for settings pages
  key = key.replace(/^settings\//, '');
  
  // Check if we have this config
  if (moduleConfig[key]) {
    return key;
  }
  
  // Try with moduleName if it looks like base_* modules
  if (moduleName.startsWith('base_')) {
    // Map base module names to config keys
    const baseModuleMap: Record<string, string> = {
      'base_security': 'security/access',
      'base_features_data': 'features/flags',
      'base_automation': 'automation/workflows',
    };
    if (baseModuleMap[moduleName]) {
      return baseModuleMap[moduleName];
    }
  }
  
  return moduleName;
}

const currentConfigKey = computed(() => {
  return getConfigKey(String(effectiveModuleName.value), route.path);
});

const moduleConfig: Record<string, any> = {
  // Base module settings
  modules: {
    title: 'Modules',
    description: 'Manage system modules',
    apiEndpoint: '/base/modules',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'displayName', title: 'Display Name', sortable: true },
      { key: 'version', title: 'Version', sortable: true },
      { key: 'state', title: 'State', type: 'status', sortable: true },
      { key: 'installedAt', title: 'Installed', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Technical Name', type: 'text', required: true },
      { key: 'displayName', title: 'Display Name', type: 'text', required: true },
      { key: 'version', title: 'Version', type: 'text', required: true },
      { key: 'state', title: 'State', type: 'select', options: [
        { value: 'uninstalled', label: 'Uninstalled' },
        { value: 'installed', label: 'Installed' },
        { value: 'to_upgrade', label: 'To Upgrade' },
      ]},
    ],
  },
  // Base Security module
  'security/access': {
    title: 'Access Control',
    description: 'Manage IP access control',
    apiEndpoint: '/base_security/ip-access',
    columns: [
      { key: 'ipAddress', title: 'IP Address', sortable: true },
      { key: 'description', title: 'Description', sortable: true },
      { key: 'type', title: 'Type', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'ipAddress', title: 'IP Address', type: 'text', required: true },
      { key: 'description', title: 'Description', type: 'text' },
      { key: 'type', title: 'Type', type: 'select', options: [
        { value: 'whitelist', label: 'Whitelist' },
        { value: 'blacklist', label: 'Blacklist' },
      ], required: true },
    ],
  },
  'security/api-keys': {
    title: 'API Keys',
    description: 'Manage API keys',
    apiEndpoint: '/base_security/api-keys',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'prefix', title: 'Prefix', sortable: true },
      { key: 'expiresAt', title: 'Expires', type: 'date', sortable: true },
      { key: 'lastUsedAt', title: 'Last Used', type: 'date', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Name', type: 'text', required: true },
      { key: 'scopes', title: 'Scopes', type: 'text' },
    ],
  },
  'security/sessions': {
    title: 'Sessions',
    description: 'Manage active sessions',
    apiEndpoint: '/base_security/sessions',
    columns: [
      { key: 'id', title: 'ID', sortable: true },
      { key: 'ipAddress', title: 'IP Address', sortable: true },
      { key: 'userAgent', title: 'User Agent', sortable: true },
      { key: 'lastActivityAt', title: 'Last Activity', type: 'date', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
  },
  // Base Features Data module
  'features/flags': {
    title: 'Feature Flags',
    description: 'Manage feature flags',
    apiEndpoint: '/base_features_data/flags',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'key', title: 'Key', sortable: true },
      { key: 'enabled', title: 'Enabled', type: 'status', sortable: true },
      { key: 'description', title: 'Description', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Name', type: 'text', required: true },
      { key: 'key', title: 'Key', type: 'text', required: true },
      { key: 'description', title: 'Description', type: 'textarea' },
      { key: 'enabled', title: 'Enabled', type: 'checkbox', checkboxLabel: 'Enable feature' },
    ],
  },
  'features/import': {
    title: 'Data Import',
    description: 'Import data from files',
    apiEndpoint: '/base_features_data/imports',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'model', title: 'Model', sortable: true },
      { key: 'totalRows', title: 'Total Rows', sortable: true },
      { key: 'successRows', title: 'Success', sortable: true },
      { key: 'failedRows', title: 'Failed', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', title: 'Created', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
  },
  'features/export': {
    title: 'Data Export',
    description: 'Export data to files',
    apiEndpoint: '/base_features_data/exports',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'model', title: 'Model', sortable: true },
      { key: 'format', title: 'Format', sortable: true },
      { key: 'recordCount', title: 'Records', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', title: 'Created', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
  },
  'features/backups': {
    title: 'Backups',
    description: 'Manage database backups',
    apiEndpoint: '/base_features_data/backups',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'type', title: 'Type', sortable: true },
      { key: 'fileSize', title: 'Size', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', title: 'Created', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Name', type: 'text', required: true },
      { key: 'type', title: 'Type', type: 'select', options: [
        { value: 'full', label: 'Full' },
        { value: 'partial', label: 'Partial' },
        { value: 'incremental', label: 'Incremental' },
      ], required: true },
    ],
  },
  // Base Automation module
  'automation/workflows': {
    title: 'Workflows',
    description: 'Manage workflows',
    apiEndpoint: '/base_automation/workflows',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'model', title: 'Model', sortable: true },
      { key: 'state', title: 'State', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', title: 'Created', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
  },
  'automation/flows': {
    title: 'Flows',
    description: 'Manage flows',
    apiEndpoint: '/base_automation/flows',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'trigger', title: 'Trigger', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', title: 'Created', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
  },
  'automation/business-rules': {
    title: 'Business Rules',
    description: 'Manage business rules',
    apiEndpoint: '/base_automation/rules',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'model', title: 'Model', sortable: true },
      { key: 'action', title: 'Action', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
  },
  menus: {
    title: 'Menus',
    description: 'Manage navigation menus',
    apiEndpoint: '/base/menus',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'path', title: 'Path', sortable: true },
      { key: 'icon', title: 'Icon', sortable: true },
      { key: 'sequence', title: 'Sequence', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Name', type: 'text', required: true },
      { key: 'path', title: 'Path', type: 'text', required: true },
      { key: 'icon', title: 'Icon', type: 'text' },
      { key: 'sequence', title: 'Sequence', type: 'number' },
    ],
  },
  users: {
    title: 'Users',
    description: 'Manage system users',
    apiEndpoint: '/base/users',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'email', title: 'Email', sortable: true },
      { key: 'role', title: 'Role', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'createdAt', title: 'Created', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'firstName', title: 'First Name', type: 'text', required: true },
      { key: 'lastName', title: 'Last Name', type: 'text', required: true },
      { key: 'email', title: 'Email', type: 'email', required: true },
      { key: 'roleId', title: 'Role', type: 'select', options: [
        { value: 1, label: 'Admin' },
        { value: 2, label: 'Manager' },
        { value: 3, label: 'User' },
      ]},
    ],
  },
  groups: {
    title: 'Groups',
    description: 'Manage user groups',
    apiEndpoint: '/base/groups',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'description', title: 'Description', sortable: true },
      { key: 'sequence', title: 'Sequence', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Name', type: 'text', required: true },
      { key: 'description', title: 'Description', type: 'textarea' },
      { key: 'sequence', title: 'Sequence', type: 'number' },
    ],
  },
  roles: {
    title: 'Roles',
    description: 'Manage user roles',
    apiEndpoint: '/base/roles',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'description', title: 'Description', sortable: true },
      { key: 'sequence', title: 'Sequence', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Name', type: 'text', required: true },
      { key: 'description', title: 'Description', type: 'textarea' },
      { key: 'sequence', title: 'Sequence', type: 'number' },
    ],
  },
  permissions: {
    title: 'Permissions',
    description: 'Manage permissions',
    apiEndpoint: '/base/permissions',
    columns: [
      { key: 'name', title: 'Permission', sortable: true },
      { key: 'description', title: 'Description', sortable: true },
      { key: 'group', title: 'Group', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Permission Name', type: 'text', required: true },
      { key: 'description', title: 'Description', type: 'textarea' },
      { key: 'group', title: 'Group', type: 'text' },
    ],
  },
  'record-rules': {
    title: 'Record Rules',
    description: 'Manage record access rules',
    apiEndpoint: '/base/record-rules',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'model', title: 'Model', sortable: true },
      { key: 'domain', title: 'Domain', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Name', type: 'text', required: true },
      { key: 'model', title: 'Model', type: 'text', required: true },
      { key: 'domain', title: 'Domain', type: 'textarea' },
    ],
  },
  sequences: {
    title: 'Sequences',
    description: 'Manage number sequences',
    apiEndpoint: '/base/sequences',
    columns: [
      { key: 'code', title: 'Code', sortable: true },
      { key: 'name', title: 'Name', sortable: true },
      { key: 'current', title: 'Current', sortable: true },
      { key: 'step', title: 'Step', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'code', title: 'Code', type: 'text', required: true },
      { key: 'name', title: 'Name', type: 'text', required: true },
      { key: 'current', title: 'Current Number', type: 'number' },
      { key: 'step', title: 'Step', type: 'number' },
    ],
  },
  activities: {
    title: 'Activities',
    description: 'Manage activities and events',
    apiEndpoint: '/activities',
    columns: [
      { key: 'title', title: 'Title', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'start_date', title: 'Start Date', type: 'date', sortable: true },
      { key: 'end_date', title: 'End Date', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'title', title: 'Title', type: 'text', required: true },
      { key: 'description', title: 'Description', type: 'textarea', required: true },
      { key: 'start_date', title: 'Start Date', type: 'text', required: true },
      { key: 'end_date', title: 'End Date', type: 'text', required: true },
      { key: 'status', title: 'Status', type: 'select', options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
        { value: 'completed', label: 'Completed' },
      ]},
    ],
  },
  donations: {
    title: 'Donations',
    description: 'Manage donations and donors',
    apiEndpoint: '/donations',
    columns: [
      { key: 'id', title: 'ID', sortable: true },
      { key: 'amount', title: 'Amount', sortable: true },
      { key: 'donor_name', title: 'Donor', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'created_at', title: 'Date', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'amount', title: 'Amount', type: 'number', required: true },
      { key: 'donor_name', title: 'Donor Name', type: 'text', required: true },
      { key: 'donor_email', title: 'Donor Email', type: 'email' },
      { key: 'note', title: 'Note', type: 'textarea' },
      { key: 'status', title: 'Status', type: 'select', options: [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
      ]},
    ],
  },
  team: {
    title: 'Team Members',
    description: 'Manage team members',
    apiEndpoint: '/team',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'email', title: 'Email', sortable: true },
      { key: 'role', title: 'Role', sortable: true },
      { key: 'department', title: 'Department', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'name', title: 'Name', type: 'text', required: true },
      { key: 'email', title: 'Email', type: 'email', required: true },
      { key: 'role', title: 'Role', type: 'text', required: true },
      { key: 'department', title: 'Department', type: 'text' },
      { key: 'phone', title: 'Phone', type: 'text' },
    ],
  },
  documents: {
    title: 'Documents',
    description: 'Manage documents',
    apiEndpoint: '/documents',
    columns: [
      { key: 'title', title: 'Title', sortable: true },
      { key: 'filename', title: 'Filename', sortable: true },
      { key: 'type', title: 'Type', sortable: true },
      { key: 'size', title: 'Size', sortable: true },
      { key: 'status', title: 'Status', type: 'status' },
      { key: 'created_at', title: 'Created', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'title', title: 'Title', type: 'text', required: true },
      { key: 'filename', title: 'Filename', type: 'text', required: true },
      { key: 'path', title: 'File Path', type: 'text', required: true },
      { key: 'description', title: 'Description', type: 'textarea' },
      { key: 'type', title: 'Type', type: 'select', options: [
        { value: 'image', label: 'Image' },
        { value: 'video', label: 'Video' },
        { value: 'document', label: 'Document' },
        { value: 'audio', label: 'Audio' },
        { value: 'other', label: 'Other' },
      ]},
    ],
  },
  messages: {
    title: 'Messages',
    description: 'Contact messages',
    apiEndpoint: '/messages',
    columns: [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'email', title: 'Email', sortable: true },
      { key: 'subject', title: 'Subject', sortable: true },
      { key: 'status', title: 'Status', type: 'status', sortable: true },
      { key: 'created_at', title: 'Date', type: 'date', sortable: true },
      { key: 'actions', title: 'Actions', type: 'action' },
    ],
    formFields: [
      { key: 'status', title: 'Status', type: 'select', options: [
        { value: 'new', label: 'New' },
        { value: 'read', label: 'Read' },
        { value: 'replied', label: 'Replied' },
      ]},
      { key: 'reply', title: 'Reply', type: 'textarea' },
    ],
  },
};

const config = computed(() => moduleConfig[currentConfigKey.value] || {
  title: (props.moduleName || 'Module').charAt(0).toUpperCase() + (props.moduleName || 'module').slice(1),
  apiEndpoint: `/${props.moduleName || 'module'}`,
  columns: [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'status', title: 'Status', type: 'status' },
    { key: 'created_at', title: 'Created', type: 'date' },
    { key: 'actions', title: 'Actions', type: 'action' },
  ],
  formFields: [
    { key: 'name', title: 'Name', type: 'text', required: true },
    { key: 'description', title: 'Description', type: 'textarea' },
  ],
});

const moduleTitle = computed(() => config.value?.title || effectiveModuleName.value || 'Module');
const title = computed(() => route.meta?.title as string | undefined);
const description = computed(() => config.value.description);
const columns = computed(() => config.value.columns || []);
const formFields = computed(() => config.value.formFields || []);
const apiEndpoint = computed(() => config.value.apiEndpoint || `/${props.moduleName}`);

const showCreate = computed(() => viewType.value === 'list');
const createLabel = computed(() => `Add ${moduleTitle.value}`);
const saveLabel = computed(() => itemId.value ? `Update ${moduleTitle.value}` : `Create ${moduleTitle.value}`);
const showDelete = computed(() => true);

const filteredData = computed(() => {
  let result = [...data.value];
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(query)
      )
    );
  }
  
  if (statusFilter.value) {
    result = result.filter(item => item.status === statusFilter.value);
  }
  
  if (sortColumn.value) {
    result.sort((a, b) => {
      const aVal = a[sortColumn.value];
      const bVal = b[sortColumn.value];
      const modifier = sortDirection.value === 'asc' ? 1 : -1;
      return aVal > bVal ? modifier : -modifier;
    });
  }
  
  return result;
});

const totalPages = computed(() => Math.ceil(filteredData.value.length / pageSize));

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await get<any[]>(apiEndpoint.value);
    data.value = response || [];
  } catch (e: any) {
    error.value = e.message || 'Failed to load data';
    data.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleFilter = () => {
  currentPage.value = 1;
};

const handleSort = (column: string) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
};

const handlePageChange = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const handleRowClick = (item: any) => {
  handleView(item);
};

const handleView = (item: any) => {
  currentItem.value = item;
  itemId.value = item.id;
  viewType.value = 'detail';
};

const handleCreate = () => {
  currentItem.value = null;
  itemId.value = null;
  formData.value = {};
  viewType.value = 'form';
};

const handleEdit = (item: any) => {
  currentItem.value = item;
  itemId.value = item.id;
  formData.value = { ...item };
  viewType.value = 'form';
};

const handleDelete = async (item: any) => {
  if (!confirm(`Are you sure you want to delete this ${moduleTitle.value.toLowerCase()}?`)) return;
  
  submitting.value = true;
  try {
    await del(`${apiEndpoint.value}/${item.id}`);
    await loadData();
    viewType.value = 'list';
  } catch (e: any) {
    alert(e.message || 'Failed to delete');
  } finally {
    submitting.value = false;
  }
};

const handleBack = () => {
  viewType.value = 'list';
  currentItem.value = null;
  itemId.value = null;
};

const handleCancel = () => {
  if (currentItem.value) {
    viewType.value = 'detail';
  } else {
    viewType.value = 'list';
  }
  formData.value = {};
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (itemId.value) {
      await put(`${apiEndpoint.value}/${itemId.value}`, formData.value);
    } else {
      await post(apiEndpoint.value, formData.value);
    }
    await loadData();
    viewType.value = 'list';
    formData.value = {};
    currentItem.value = null;
    itemId.value = null;
  } catch (e: any) {
    alert(e.message || 'Failed to save');
  } finally {
    submitting.value = false;
  }
};

const retry = () => {
  loadData();
};

const handleExport = (format: string, data: any[]) => {
  console.log(`Exported ${data.length} records as ${format}`);
};

watch(() => props.moduleName, () => {
  viewType.value = 'list';
  loadData();
});

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.module-view {
  padding: 24px;
  min-height: 100%;
}

.module-loading,
.module-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content h2 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
}

.header-description {
  color: #6b7280;
  margin: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #4f46e5;
  color: white;
}

.btn-primary:hover {
  background: #4338ca;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.list-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
}

.list-filters select {
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 14px;
}

.data-table-container {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable:hover {
  background: #f3f4f6;
}

.data-table tbody tr:hover {
  background: #f9fafb;
  cursor: pointer;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active,
.status-badge.published,
.status-badge.completed,
.status-badge.read {
  background: #ecfdf5;
  color: #059669;
}

.status-badge.inactive,
.status-badge.draft,
.status-badge.pending,
.status-badge.new {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.failed {
  background: #fef2f2;
  color: #dc2626;
}

.action-links {
  display: flex;
  gap: 8px;
}

.action-links a {
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.action-links a:hover {
  color: #4f46e5;
  background: #eef2ff;
}

.action-links a.delete-link:hover {
  color: #dc2626;
  background: #fef2f2;
}

.empty-state {
  text-align: center;
  padding: 48px !important;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #9ca3af;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}

.page-btn {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #6b7280;
  font-size: 14px;
}

.form-view {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 24px;
}

.module-form {
  max-width: 600px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-field input,
.form-field select,
.form-field textarea {
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.15s;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-field input:disabled,
.form-field select:disabled,
.form-field textarea:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.required-mark {
  color: #dc2626;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-field input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.detail-view {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  color: #4f46e5;
}

.detail-content {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  font-weight: 500;
}

.field-value {
  font-size: 16px;
  color: #111827;
}

@media (max-width: 768px) {
  .module-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .list-header {
    flex-direction: column;
  }
  
  .detail-content {
    grid-template-columns: 1fr;
  }
}
</style>
