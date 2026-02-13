<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Tree,
} from 'ant-design-vue';
import {
  AppstoreOutlined,
  MenuOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import {
  getGroupMenuPermissionsApi,
  getGroupsApi,
  getMenuItemsFlatApi,
  getMenuTreeWithSummaryApi,
  getRoleMenuPermissionsApi,
  getUserMenuPermissionsApi,
  setGroupMenuPermissionsApi,
  setRoleMenuPermissionsApi,
  setUserMenuPermissionsApi,
  type MenuPermissionWithPriority,
  type MenuTreeNodeWithSummary,
  type RBACApi,
} from '#/api/core/rbac';
import { getRolesApi } from '#/api/roles';
import { getUsersApi } from '#/api/core/user';

import MenuPermissionListTab from './components/MenuPermissionListTab.vue';
import MenuPermissionPanel from './components/MenuPermissionPanel.vue';
import MenuTreePanel from './components/MenuTreePanel.vue';

defineOptions({
  name: 'MenuAccessSettings',
});

// =============================================================================
// TOP-LEVEL TAB STATE
// =============================================================================
const topTab = ref('by-menu');

// =============================================================================
// BY MENU TAB STATE
// =============================================================================
const menuTree = ref<MenuTreeNodeWithSummary[]>([]);
const selectedMenuId = ref<number | null>(null);
const treeLoading = ref(false);

async function fetchMenuTree() {
  treeLoading.value = true;
  try {
    menuTree.value = await getMenuTreeWithSummaryApi();
  } catch {
    message.error('Failed to load menu tree');
  } finally {
    treeLoading.value = false;
  }
}

function onMenuSelect(menuItemId: number) {
  selectedMenuId.value = menuItemId;
}

function onPermissionsChanged() {
  // Refresh tree counts
  fetchMenuTree();
}

// =============================================================================
// BY ENTITY TAB STATE (existing functionality)
// =============================================================================
const entityTab = ref('roles');
const loading = ref(false);
const saving = ref(false);

// Menu items state
const menuItems = ref<RBACApi.MenuItem[]>([]);

// Roles tab state
const roles = ref<Array<{ id: number; name: string; codename: string }>>([]);
const selectedRoleId = ref<any>(null);
const rolePermissions = ref<Map<number, MenuPermissionWithPriority>>(new Map());
const roleDefaultPriority = ref(10);

// Groups tab state
const groups = ref<Array<{ id: number; name: string; codename: string }>>([]);
const selectedGroupId = ref<any>(null);
const groupPermissions = ref<Map<number, MenuPermissionWithPriority>>(new Map());
const groupDefaultPriority = ref(50);

// Users tab state
const users = ref<Array<{ id: number; username: string; full_name: string | null; email: string }>>([]);
const selectedUserId = ref<any>(null);
const userPermissions = ref<Map<number, MenuPermissionWithPriority>>(new Map());
const userDefaultPriority = ref(100);

// Computed tree data for menu items
const menuTreeData = computed(() => {
  const itemMap = new Map<number, RBACApi.MenuItem>();
  const rootItems: RBACApi.MenuItem[] = [];

  menuItems.value.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  menuItems.value.forEach(item => {
    const mappedItem = itemMap.get(item.id)!;
    if (item.parent_id && itemMap.has(item.parent_id)) {
      const parent = itemMap.get(item.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(mappedItem);
    } else {
      rootItems.push(mappedItem);
    }
  });

  const transformToTreeNode = (item: RBACApi.MenuItem): any => ({
    key: item.id,
    title: item.name,
    code: item.code,
    path: item.path,
    children: item.children?.map(transformToTreeNode) || [],
  });

  return rootItems.map(transformToTreeNode);
});

const allMenuIds = computed(() => {
  const ids: number[] = [];
  const collect = (items: RBACApi.MenuItem[]) => {
    items.forEach(item => {
      ids.push(item.id);
      if (item.children) collect(item.children);
    });
  };
  collect(menuItems.value);
  return ids;
});

const roleCheckedKeys = computed({
  get() {
    const keys: number[] = [];
    rolePermissions.value.forEach((perm, menuId) => {
      if (perm.can_view) keys.push(menuId);
    });
    return keys;
  },
  set(keys: number[]) {
    const newPermissions = new Map(rolePermissions.value);
    allMenuIds.value.forEach(menuId => {
      const isChecked = keys.includes(menuId);
      const existing = newPermissions.get(menuId);
      if (isChecked) {
        if (existing) {
          existing.can_view = true;
        } else {
          newPermissions.set(menuId, {
            menu_item_id: menuId, can_view: true, can_edit: false,
            can_delete: false, can_create: false, priority: roleDefaultPriority.value,
          });
        }
      } else if (existing) {
        existing.can_view = false;
      }
    });
    rolePermissions.value = newPermissions;
  },
});

const groupCheckedKeys = computed({
  get() {
    const keys: number[] = [];
    groupPermissions.value.forEach((perm, menuId) => {
      if (perm.can_view) keys.push(menuId);
    });
    return keys;
  },
  set(keys: number[]) {
    const newPermissions = new Map(groupPermissions.value);
    allMenuIds.value.forEach(menuId => {
      const isChecked = keys.includes(menuId);
      const existing = newPermissions.get(menuId);
      if (isChecked) {
        if (existing) {
          existing.can_view = true;
        } else {
          newPermissions.set(menuId, {
            menu_item_id: menuId, can_view: true, can_edit: false,
            can_delete: false, can_create: false, priority: groupDefaultPriority.value,
          });
        }
      } else if (existing) {
        existing.can_view = false;
      }
    });
    groupPermissions.value = newPermissions;
  },
});

const userCheckedKeys = computed({
  get() {
    const keys: number[] = [];
    userPermissions.value.forEach((perm, menuId) => {
      if (perm.can_view) keys.push(menuId);
    });
    return keys;
  },
  set(keys: number[]) {
    const newPermissions = new Map(userPermissions.value);
    allMenuIds.value.forEach(menuId => {
      const isChecked = keys.includes(menuId);
      const existing = newPermissions.get(menuId);
      if (isChecked) {
        if (existing) {
          existing.can_view = true;
        } else {
          newPermissions.set(menuId, {
            menu_item_id: menuId, can_view: true, can_edit: false,
            can_delete: false, can_create: false, priority: userDefaultPriority.value,
          });
        }
      } else if (existing) {
        existing.can_view = false;
      }
    });
    userPermissions.value = newPermissions;
  },
});

async function fetchMenuItems() {
  try {
    const response = await getMenuItemsFlatApi();
    menuItems.value = response;
  } catch {
    message.error('Failed to load menu items');
  }
}

async function fetchRoles() {
  try {
    const response = await getRolesApi({ page: 1, page_size: 100 });
    roles.value = response.items.map(r => ({ id: r.id, name: r.name, codename: r.codename }));
  } catch {
    message.error('Failed to load roles');
  }
}

async function fetchGroups() {
  try {
    const response = await getGroupsApi({ page: 1, page_size: 100 });
    groups.value = response.items.map(g => ({ id: g.id, name: g.name, codename: g.codename }));
  } catch {
    message.error('Failed to load groups');
  }
}

async function fetchUsers() {
  try {
    const response = await getUsersApi({ page: 1, page_size: 100 });
    users.value = response.items.map(u => ({ id: u.id, username: u.username, full_name: u.full_name, email: u.email }));
  } catch {
    message.error('Failed to load users');
  }
}

async function fetchRolePermissions(roleId: number) {
  loading.value = true;
  try {
    const response = await getRoleMenuPermissionsApi(roleId);
    const permMap = new Map<number, MenuPermissionWithPriority>();
    response.permissions.forEach(p => { permMap.set(p.menu_item_id, p); });
    rolePermissions.value = permMap;
  } catch {
    message.error('Failed to load role permissions');
    rolePermissions.value = new Map();
  } finally {
    loading.value = false;
  }
}

async function saveRolePermissions() {
  if (!selectedRoleId.value) { message.warning('Please select a role first'); return; }
  saving.value = true;
  try {
    const permissions: MenuPermissionWithPriority[] = [];
    rolePermissions.value.forEach((perm, menuId) => {
      if (perm.can_view) {
        permissions.push({ menu_item_id: menuId, can_view: perm.can_view, can_edit: perm.can_edit, can_delete: perm.can_delete, can_create: perm.can_create, priority: perm.priority });
      }
    });
    await setRoleMenuPermissionsApi(selectedRoleId.value, permissions);
    message.success('Menu permissions saved successfully');
  } catch {
    message.error('Failed to save permissions');
  } finally {
    saving.value = false;
  }
}

function updateRolePermission(menuId: number, field: keyof MenuPermissionWithPriority, value: any) {
  const perm = rolePermissions.value.get(menuId);
  if (perm) { (perm as any)[field] = value; }
}

async function fetchGroupPermissions(groupId: number) {
  loading.value = true;
  try {
    const response = await getGroupMenuPermissionsApi(groupId);
    const permMap = new Map<number, MenuPermissionWithPriority>();
    response.permissions.forEach(p => { permMap.set(p.menu_item_id, p); });
    groupPermissions.value = permMap;
  } catch {
    message.error('Failed to load group permissions');
    groupPermissions.value = new Map();
  } finally {
    loading.value = false;
  }
}

async function saveGroupPermissions() {
  if (!selectedGroupId.value) { message.warning('Please select a group first'); return; }
  saving.value = true;
  try {
    const permissions: MenuPermissionWithPriority[] = [];
    groupPermissions.value.forEach((perm, menuId) => {
      if (perm.can_view) {
        permissions.push({ menu_item_id: menuId, can_view: perm.can_view, can_edit: perm.can_edit, can_delete: perm.can_delete, can_create: perm.can_create, priority: perm.priority });
      }
    });
    await setGroupMenuPermissionsApi(selectedGroupId.value, permissions);
    message.success('Group menu permissions saved successfully');
  } catch {
    message.error('Failed to save group permissions');
  } finally {
    saving.value = false;
  }
}

function updateGroupPermission(menuId: number, field: keyof MenuPermissionWithPriority, value: any) {
  const perm = groupPermissions.value.get(menuId);
  if (perm) { (perm as any)[field] = value; }
}

async function fetchUserPermissions(userId: number) {
  loading.value = true;
  try {
    const response = await getUserMenuPermissionsApi(userId);
    const permMap = new Map<number, MenuPermissionWithPriority>();
    response.permissions.forEach(p => { permMap.set(p.menu_item_id, p); });
    userPermissions.value = permMap;
  } catch {
    message.error('Failed to load user permissions');
    userPermissions.value = new Map();
  } finally {
    loading.value = false;
  }
}

async function saveUserPermissions() {
  if (!selectedUserId.value) { message.warning('Please select a user first'); return; }
  saving.value = true;
  try {
    const permissions: MenuPermissionWithPriority[] = [];
    userPermissions.value.forEach((perm, menuId) => {
      if (perm.can_view) {
        permissions.push({ menu_item_id: menuId, can_view: perm.can_view, can_edit: perm.can_edit, can_delete: perm.can_delete, can_create: perm.can_create, priority: perm.priority });
      }
    });
    await setUserMenuPermissionsApi(selectedUserId.value, permissions);
    message.success('User menu permissions saved successfully');
  } catch {
    message.error('Failed to save user permissions');
  } finally {
    saving.value = false;
  }
}

function updateUserPermission(menuId: number, field: keyof MenuPermissionWithPriority, value: any) {
  const perm = userPermissions.value.get(menuId);
  if (perm) { (perm as any)[field] = value; }
}

watch(selectedRoleId, (v) => { if (v) fetchRolePermissions(v); else rolePermissions.value = new Map(); });
watch(selectedGroupId, (v) => { if (v) fetchGroupPermissions(v); else groupPermissions.value = new Map(); });
watch(selectedUserId, (v) => { if (v) fetchUserPermissions(v); else userPermissions.value = new Map(); });

async function handleRefresh() {
  if (topTab.value === 'by-menu') {
    await fetchMenuTree();
  } else {
    loading.value = true;
    await Promise.all([fetchMenuItems(), fetchRoles(), fetchGroups(), fetchUsers()]);
    loading.value = false;
  }
}

onMounted(async () => {
  // Load "By Menu" data
  await fetchMenuTree();
  // Lazy-load entity data when switching to "By Entity" tab
});

// Lazy-load entity data when switching to "By Entity" tab
const entityDataLoaded = ref(false);
watch(topTab, async (tab) => {
  if (tab === 'by-entity' && !entityDataLoaded.value) {
    loading.value = true;
    await Promise.all([fetchMenuItems(), fetchRoles(), fetchGroups(), fetchUsers()]);
    loading.value = false;
    entityDataLoaded.value = true;
  }
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <MenuOutlined />
          <span>Menu Access Management</span>
        </div>
      </template>
      <template #extra>
        <Space>
          <Button @click="handleRefresh">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
        </Space>
      </template>

      <!-- Top-level tabs: By Menu / By Entity -->
      <Tabs v-model:activeKey="topTab">
        <!-- ============================================ -->
        <!-- BY MENU TAB (New Odoo-style) -->
        <!-- ============================================ -->
        <Tabs.TabPane key="by-menu">
          <template #tab>
            <span class="flex items-center gap-1">
              <AppstoreOutlined />
              By Menu
            </span>
          </template>

          <Spin :spinning="treeLoading">
            <Row :gutter="16">
              <!-- Left: Menu Tree -->
              <Col :xs="24" :sm="24" :md="8" :lg="7" :xl="6">
                <div class="tree-wrapper rounded border p-3">
                  <MenuTreePanel
                    :tree-data="menuTree"
                    :selected-menu-id="selectedMenuId"
                    @select="onMenuSelect"
                  />
                </div>
              </Col>

              <!-- Right: Permission Detail -->
              <Col :xs="24" :sm="24" :md="16" :lg="17" :xl="18">
                <div class="detail-wrapper rounded border p-4">
                  <MenuPermissionPanel
                    :menu-item-id="selectedMenuId"
                    @permissions-changed="onPermissionsChanged"
                  />
                </div>
              </Col>
            </Row>
          </Spin>
        </Tabs.TabPane>

        <!-- ============================================ -->
        <!-- BY ENTITY TAB (Existing functionality) -->
        <!-- ============================================ -->
        <Tabs.TabPane key="by-entity">
          <template #tab>
            <span class="flex items-center gap-1">
              <SafetyCertificateOutlined />
              By Role / Group / User
            </span>
          </template>

          <Tabs v-model:activeKey="entityTab">
            <!-- Roles Tab -->
            <Tabs.TabPane key="roles">
              <template #tab>
                <span>
                  <SafetyCertificateOutlined />
                  Roles
                </span>
              </template>

              <Row :gutter="[16, 16]">
                <Col :span="24">
                  <div class="mb-4 flex items-center gap-4">
                    <span class="font-medium">Select Role:</span>
                    <Select
                      v-model:value="selectedRoleId"
                      placeholder="Choose a role to manage"
                      style="width: 300px"
                      :options="roles.map(r => ({ value: r.id, label: `${r.name} (${r.codename})` }))"
                      show-search
                      :filter-option="(input: string, option: any) =>
                        option.label.toLowerCase().includes(input.toLowerCase())"
                    />
                    <span class="text-gray-500">Default Priority:</span>
                    <InputNumber v-model:value="roleDefaultPriority" :min="1" :max="100" style="width: 80px" />
                    <Button type="primary" :loading="saving" :disabled="!selectedRoleId" @click="saveRolePermissions">
                      <template #icon><SaveOutlined /></template>
                      Save Permissions
                    </Button>
                  </div>
                </Col>
                <Col :span="24">
                  <Spin :spinning="loading">
                    <div v-if="selectedRoleId" class="rounded border p-4">
                      <div class="mb-4">
                        <Tag color="blue">Priority Hierarchy: User &gt; Group &gt; Role</Tag>
                        <span class="ml-2 text-sm text-gray-500">(Higher priority level overrides lower)</span>
                      </div>
                      <div v-if="menuTreeData.length > 0">
                        <Tree v-model:checkedKeys="roleCheckedKeys" :tree-data="menuTreeData" checkable default-expand-all :selectable="false">
                          <template #title="{ title, key }">
                            <div class="flex items-center gap-2">
                              <span>{{ title }}</span>
                              <template v-if="rolePermissions.has(key) && rolePermissions.get(key)?.can_view">
                                <Checkbox :checked="rolePermissions.get(key)?.can_edit" size="small" @change="(e: any) => updateRolePermission(key, 'can_edit', e.target.checked)">Edit</Checkbox>
                                <Checkbox :checked="rolePermissions.get(key)?.can_create" size="small" @change="(e: any) => updateRolePermission(key, 'can_create', e.target.checked)">Create</Checkbox>
                                <Checkbox :checked="rolePermissions.get(key)?.can_delete" size="small" @change="(e: any) => updateRolePermission(key, 'can_delete', e.target.checked)">Delete</Checkbox>
                              </template>
                            </div>
                          </template>
                        </Tree>
                      </div>
                      <Empty v-else description="No menu items available" />
                    </div>
                    <div v-else class="py-12 text-center">
                      <SafetyCertificateOutlined class="mb-4 text-5xl text-gray-300" />
                      <p class="text-gray-500">Select a role to manage its menu permissions</p>
                    </div>
                  </Spin>
                </Col>
              </Row>
            </Tabs.TabPane>

            <!-- Groups Tab -->
            <Tabs.TabPane key="groups">
              <template #tab>
                <span>
                  <TeamOutlined />
                  Groups
                </span>
              </template>

              <Row :gutter="[16, 16]">
                <Col :span="24">
                  <div class="mb-4 flex items-center gap-4">
                    <span class="font-medium">Select Group:</span>
                    <Select
                      v-model:value="selectedGroupId"
                      placeholder="Choose a group to manage"
                      style="width: 300px"
                      :options="groups.map(g => ({ value: g.id, label: `${g.name} (${g.codename})` }))"
                      show-search
                      :filter-option="(input: string, option: any) =>
                        option.label.toLowerCase().includes(input.toLowerCase())"
                    />
                    <span class="text-gray-500">Default Priority:</span>
                    <InputNumber v-model:value="groupDefaultPriority" :min="1" :max="100" style="width: 80px" />
                    <Button type="primary" :loading="saving" :disabled="!selectedGroupId" @click="saveGroupPermissions">
                      <template #icon><SaveOutlined /></template>
                      Save Permissions
                    </Button>
                  </div>
                </Col>
                <Col :span="24">
                  <Spin :spinning="loading">
                    <div v-if="selectedGroupId" class="rounded border p-4">
                      <div class="mb-4">
                        <Tag color="green">Priority: 50 (Medium)</Tag>
                        <span class="ml-2 text-sm text-gray-500">Group permissions override Role permissions but are overridden by User permissions</span>
                      </div>
                      <div v-if="menuTreeData.length > 0">
                        <Tree v-model:checkedKeys="groupCheckedKeys" :tree-data="menuTreeData" checkable default-expand-all :selectable="false">
                          <template #title="{ title, key }">
                            <div class="flex items-center gap-2">
                              <span>{{ title }}</span>
                              <template v-if="groupPermissions.has(key) && groupPermissions.get(key)?.can_view">
                                <Checkbox :checked="groupPermissions.get(key)?.can_edit" size="small" @change="(e: any) => updateGroupPermission(key, 'can_edit', e.target.checked)">Edit</Checkbox>
                                <Checkbox :checked="groupPermissions.get(key)?.can_create" size="small" @change="(e: any) => updateGroupPermission(key, 'can_create', e.target.checked)">Create</Checkbox>
                                <Checkbox :checked="groupPermissions.get(key)?.can_delete" size="small" @change="(e: any) => updateGroupPermission(key, 'can_delete', e.target.checked)">Delete</Checkbox>
                              </template>
                            </div>
                          </template>
                        </Tree>
                      </div>
                      <Empty v-else description="No menu items available" />
                    </div>
                    <div v-else class="py-12 text-center">
                      <TeamOutlined class="mb-4 text-5xl text-gray-300" />
                      <p class="text-gray-500">Select a group to manage its menu permissions</p>
                    </div>
                  </Spin>
                </Col>
              </Row>
            </Tabs.TabPane>

            <!-- Users Tab -->
            <Tabs.TabPane key="users">
              <template #tab>
                <span>
                  <UserOutlined />
                  Users
                </span>
              </template>

              <Row :gutter="[16, 16]">
                <Col :span="24">
                  <div class="mb-4 flex items-center gap-4">
                    <span class="font-medium">Select User:</span>
                    <Select
                      v-model:value="selectedUserId"
                      placeholder="Choose a user to manage"
                      style="width: 300px"
                      :options="users.map(u => ({ value: u.id, label: `${u.full_name || u.username} (${u.email})` }))"
                      show-search
                      :filter-option="(input: string, option: any) =>
                        option.label.toLowerCase().includes(input.toLowerCase())"
                    />
                    <span class="text-gray-500">Default Priority:</span>
                    <InputNumber v-model:value="userDefaultPriority" :min="1" :max="100" style="width: 80px" />
                    <Button type="primary" :loading="saving" :disabled="!selectedUserId" @click="saveUserPermissions">
                      <template #icon><SaveOutlined /></template>
                      Save Permissions
                    </Button>
                  </div>
                </Col>
                <Col :span="24">
                  <Spin :spinning="loading">
                    <div v-if="selectedUserId" class="rounded border p-4">
                      <div class="mb-4">
                        <Tag color="red">Priority: 100 (Highest)</Tag>
                        <span class="ml-2 text-sm text-gray-500">User permissions have the highest priority and override both Group and Role permissions</span>
                      </div>
                      <div v-if="menuTreeData.length > 0">
                        <Tree v-model:checkedKeys="userCheckedKeys" :tree-data="menuTreeData" checkable default-expand-all :selectable="false">
                          <template #title="{ title, key }">
                            <div class="flex items-center gap-2">
                              <span>{{ title }}</span>
                              <template v-if="userPermissions.has(key) && userPermissions.get(key)?.can_view">
                                <Checkbox :checked="userPermissions.get(key)?.can_edit" size="small" @change="(e: any) => updateUserPermission(key, 'can_edit', e.target.checked)">Edit</Checkbox>
                                <Checkbox :checked="userPermissions.get(key)?.can_create" size="small" @change="(e: any) => updateUserPermission(key, 'can_create', e.target.checked)">Create</Checkbox>
                                <Checkbox :checked="userPermissions.get(key)?.can_delete" size="small" @change="(e: any) => updateUserPermission(key, 'can_delete', e.target.checked)">Delete</Checkbox>
                              </template>
                            </div>
                          </template>
                        </Tree>
                      </div>
                      <Empty v-else description="No menu items available" />
                    </div>
                    <div v-else class="py-12 text-center">
                      <UserOutlined class="mb-4 text-5xl text-gray-300" />
                      <p class="text-gray-500">Select a user to manage their menu permissions</p>
                    </div>
                  </Spin>
                </Col>
              </Row>
            </Tabs.TabPane>
          </Tabs>
        </Tabs.TabPane>

        <!-- ============================================ -->
        <!-- LIST VIEW TAB -->
        <!-- ============================================ -->
        <Tabs.TabPane key="list">
          <template #tab>
            <span class="flex items-center gap-1">
              <UnorderedListOutlined />
              List View
            </span>
          </template>

          <MenuPermissionListTab />
        </Tabs.TabPane>
      </Tabs>
    </Card>
  </Page>
</template>

<style scoped>
.tree-wrapper {
  min-height: 500px;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.detail-wrapper {
  min-height: 500px;
}

:deep(.ant-tree-title) {
  display: flex;
  align-items: center;
}
</style>
