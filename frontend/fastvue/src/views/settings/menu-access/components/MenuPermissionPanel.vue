<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import {
  Button,
  Checkbox,
  Collapse,
  Empty,
  message,
  Popconfirm,
  Spin,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import {
  addMenuGroupPermissionApi,
  addMenuRolePermissionApi,
  addMenuUserPermissionApi,
  getMenuPermissionDetailsApi,
  removeMenuGroupPermissionApi,
  removeMenuRolePermissionApi,
  removeMenuUserPermissionApi,
  type MenuGroupPermItem,
  type MenuPermissionDetailResponse,
  type MenuRolePermItem,
  type MenuUserPermItem,
} from '#/api/core/rbac';

import AddPermissionModal from './AddPermissionModal.vue';

const props = defineProps<{
  menuItemId: number | null;
}>();

const emit = defineEmits<{
  permissionsChanged: [];
}>();

const loading = ref(false);
const activeTab = ref('roles');
const details = ref<MenuPermissionDetailResponse | null>(null);

// Modal state
const modalOpen = ref(false);
const modalEntityType = ref<'role' | 'group' | 'user'>('role');

const menuName = computed(() => details.value?.menu_item?.name ?? '');
const menuCode = computed(() => details.value?.menu_item?.code ?? '');
const menuPath = computed(() => details.value?.menu_item?.path ?? '');

const existingIds = computed(() => {
  if (!details.value) return [];
  if (modalEntityType.value === 'role') {
    return details.value.roles.map((r) => r.role_id);
  }
  if (modalEntityType.value === 'group') {
    return details.value.groups.map((g) => g.group_id);
  }
  return details.value.users.map((u) => u.user_id);
});

async function fetchDetails() {
  if (!props.menuItemId) {
    details.value = null;
    return;
  }
  loading.value = true;
  try {
    details.value = await getMenuPermissionDetailsApi(props.menuItemId);
  } catch {
    message.error('Failed to load menu permissions');
    details.value = null;
  } finally {
    loading.value = false;
  }
}

watch(() => props.menuItemId, fetchDetails, { immediate: true });

function openAddModal(type: 'role' | 'group' | 'user') {
  modalEntityType.value = type;
  modalOpen.value = true;
}

async function handleAdd(entities: Array<{ id: number; name: string }>) {
  if (!props.menuItemId) return;
  try {
    for (const entity of entities) {
      if (modalEntityType.value === 'role') {
        await addMenuRolePermissionApi(props.menuItemId, {
          role_id: entity.id,
          can_view: true,
        });
      } else if (modalEntityType.value === 'group') {
        await addMenuGroupPermissionApi(props.menuItemId, {
          group_id: entity.id,
          can_view: true,
        });
      } else {
        await addMenuUserPermissionApi(props.menuItemId, {
          user_id: entity.id,
          can_view: true,
        });
      }
    }
    message.success(`Added ${entities.length} ${modalEntityType.value}(s)`);
    await fetchDetails();
    emit('permissionsChanged');
  } catch {
    message.error('Failed to add permissions');
  }
}

async function handleTogglePermission(
  type: 'role' | 'group' | 'user',
  entityId: number,
  item: MenuRolePermItem | MenuGroupPermItem | MenuUserPermItem,
  field: string,
  value: boolean,
) {
  if (!props.menuItemId) return;
  try {
    const updated = { ...item, [field]: value };
    if (type === 'role') {
      await addMenuRolePermissionApi(props.menuItemId, {
        role_id: entityId,
        can_view: updated.can_view,
        can_edit: updated.can_edit,
        can_create: updated.can_create,
        can_delete: updated.can_delete,
        priority: updated.priority,
      });
    } else if (type === 'group') {
      await addMenuGroupPermissionApi(props.menuItemId, {
        group_id: entityId,
        can_view: updated.can_view,
        can_edit: updated.can_edit,
        can_create: updated.can_create,
        can_delete: updated.can_delete,
        priority: updated.priority,
      });
    } else {
      await addMenuUserPermissionApi(props.menuItemId, {
        user_id: entityId,
        can_view: updated.can_view,
        can_edit: updated.can_edit,
        can_create: updated.can_create,
        can_delete: updated.can_delete,
        priority: updated.priority,
      });
    }
    await fetchDetails();
    emit('permissionsChanged');
  } catch {
    message.error('Failed to update permission');
  }
}

async function handleRemove(
  type: 'role' | 'group' | 'user',
  entityId: number,
) {
  if (!props.menuItemId) return;
  try {
    if (type === 'role') {
      await removeMenuRolePermissionApi(props.menuItemId, entityId);
    } else if (type === 'group') {
      await removeMenuGroupPermissionApi(props.menuItemId, entityId);
    } else {
      await removeMenuUserPermissionApi(props.menuItemId, entityId);
    }
    message.success('Permission removed');
    await fetchDetails();
    emit('permissionsChanged');
  } catch {
    message.error('Failed to remove permission');
  }
}

// Table columns
const roleColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Codename', dataIndex: 'codename', key: 'codename', width: 140 },
  { title: 'View', key: 'can_view', width: 70, align: 'center' as const },
  { title: 'Edit', key: 'can_edit', width: 70, align: 'center' as const },
  { title: 'Create', key: 'can_create', width: 70, align: 'center' as const },
  { title: 'Delete', key: 'can_delete', width: 70, align: 'center' as const },
  { title: '', key: 'actions', width: 50, align: 'center' as const },
];

const groupColumns = [...roleColumns];

const userColumns = [
  { title: 'Name', key: 'name' },
  { title: 'Email', dataIndex: 'email', key: 'email', width: 180 },
  { title: 'View', key: 'can_view', width: 70, align: 'center' as const },
  { title: 'Edit', key: 'can_edit', width: 70, align: 'center' as const },
  { title: 'Create', key: 'can_create', width: 70, align: 'center' as const },
  { title: 'Delete', key: 'can_delete', width: 70, align: 'center' as const },
  { title: '', key: 'actions', width: 50, align: 'center' as const },
];

const inheritedColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'From', key: 'inherited_from', width: 160 },
  { title: 'View', key: 'can_view', width: 70, align: 'center' as const },
  { title: 'Edit', key: 'can_edit', width: 70, align: 'center' as const },
  { title: 'Create', key: 'can_create', width: 70, align: 'center' as const },
  { title: 'Delete', key: 'can_delete', width: 70, align: 'center' as const },
];

const inheritedUserColumns = [
  { title: 'Name', key: 'name' },
  { title: 'From', key: 'inherited_from', width: 160 },
  { title: 'View', key: 'can_view', width: 70, align: 'center' as const },
  { title: 'Edit', key: 'can_edit', width: 70, align: 'center' as const },
  { title: 'Create', key: 'can_create', width: 70, align: 'center' as const },
  { title: 'Delete', key: 'can_delete', width: 70, align: 'center' as const },
];
</script>

<template>
  <div class="menu-permission-panel">
    <!-- Empty state -->
    <div v-if="!menuItemId" class="empty-state">
      <SafetyCertificateOutlined class="mb-4 text-5xl text-gray-300" />
      <p class="text-gray-500">Select a menu item to manage its permissions</p>
    </div>

    <!-- Loading -->
    <Spin v-else :spinning="loading">
      <template v-if="details">
        <!-- Header -->
        <div class="mb-4 rounded border border-gray-200 bg-gray-50 px-4 py-3">
          <div class="text-lg font-semibold">{{ menuName }}</div>
          <div class="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <Tag>{{ menuCode }}</Tag>
            <span v-if="menuPath">{{ menuPath }}</span>
          </div>
        </div>

        <!-- Tabs -->
        <Tabs v-model:activeKey="activeTab">
          <!-- Roles Tab -->
          <Tabs.TabPane key="roles">
            <template #tab>
              <span class="flex items-center gap-1">
                <SafetyCertificateOutlined />
                Roles
                <Tag v-if="details.roles.length > 0" color="blue" class="ml-1">
                  {{ details.roles.length }}
                </Tag>
              </span>
            </template>

            <div class="mb-3 flex justify-end">
              <Button type="primary" size="small" @click="openAddModal('role')">
                <template #icon><PlusOutlined /></template>
                Add Role
              </Button>
            </div>

            <Table
              :columns="roleColumns"
              :data-source="details.roles"
              :pagination="false"
              :row-key="(r: MenuRolePermItem) => r.role_id"
              size="small"
              :locale="{ emptyText: 'No roles assigned' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'can_view'">
                  <Checkbox
                    :checked="record.can_view"
                    @change="(e: any) => handleTogglePermission('role', record.role_id, record as any, 'can_view', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'can_edit'">
                  <Checkbox
                    :checked="record.can_edit"
                    @change="(e: any) => handleTogglePermission('role', record.role_id, record as any, 'can_edit', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'can_create'">
                  <Checkbox
                    :checked="record.can_create"
                    @change="(e: any) => handleTogglePermission('role', record.role_id, record as any, 'can_create', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'can_delete'">
                  <Checkbox
                    :checked="record.can_delete"
                    @change="(e: any) => handleTogglePermission('role', record.role_id, record as any, 'can_delete', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Popconfirm
                    title="Remove this role?"
                    @confirm="handleRemove('role', record.role_id)"
                  >
                    <Button type="text" danger size="small">
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Popconfirm>
                </template>
              </template>
            </Table>

            <!-- Inherited Roles -->
            <Collapse
              v-if="details.inherited_roles.length > 0"
              class="mt-3"
              :bordered="false"
            >
              <Collapse.Panel key="inherited" header="Inherited Permissions">
                <Table
                  :columns="inheritedColumns"
                  :data-source="details.inherited_roles"
                  :pagination="false"
                  :row-key="(r: any) => `${r.role_id}-${r.inherited_from_id}`"
                  size="small"
                  class="inherited-table"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'inherited_from'">
                      <Tag color="default">{{ record.inherited_from }}</Tag>
                    </template>
                    <template v-else-if="['can_view', 'can_edit', 'can_create', 'can_delete'].includes(column.key as string)">
                      <Checkbox :checked="record[column.key as string]" disabled />
                    </template>
                  </template>
                </Table>
              </Collapse.Panel>
            </Collapse>
          </Tabs.TabPane>

          <!-- Groups Tab -->
          <Tabs.TabPane key="groups">
            <template #tab>
              <span class="flex items-center gap-1">
                <TeamOutlined />
                Groups
                <Tag v-if="details.groups.length > 0" color="green" class="ml-1">
                  {{ details.groups.length }}
                </Tag>
              </span>
            </template>

            <div class="mb-3 flex justify-end">
              <Button type="primary" size="small" @click="openAddModal('group')">
                <template #icon><PlusOutlined /></template>
                Add Group
              </Button>
            </div>

            <Table
              :columns="groupColumns"
              :data-source="details.groups"
              :pagination="false"
              :row-key="(r: MenuGroupPermItem) => r.group_id"
              size="small"
              :locale="{ emptyText: 'No groups assigned' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'can_view'">
                  <Checkbox
                    :checked="record.can_view"
                    @change="(e: any) => handleTogglePermission('group', record.group_id, record as any, 'can_view', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'can_edit'">
                  <Checkbox
                    :checked="record.can_edit"
                    @change="(e: any) => handleTogglePermission('group', record.group_id, record as any, 'can_edit', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'can_create'">
                  <Checkbox
                    :checked="record.can_create"
                    @change="(e: any) => handleTogglePermission('group', record.group_id, record as any, 'can_create', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'can_delete'">
                  <Checkbox
                    :checked="record.can_delete"
                    @change="(e: any) => handleTogglePermission('group', record.group_id, record as any, 'can_delete', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Popconfirm
                    title="Remove this group?"
                    @confirm="handleRemove('group', record.group_id)"
                  >
                    <Button type="text" danger size="small">
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Popconfirm>
                </template>
              </template>
            </Table>

            <!-- Inherited Groups -->
            <Collapse
              v-if="details.inherited_groups.length > 0"
              class="mt-3"
              :bordered="false"
            >
              <Collapse.Panel key="inherited" header="Inherited Permissions">
                <Table
                  :columns="inheritedColumns"
                  :data-source="details.inherited_groups"
                  :pagination="false"
                  :row-key="(r: any) => `${r.group_id}-${r.inherited_from_id}`"
                  size="small"
                  class="inherited-table"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'inherited_from'">
                      <Tag color="default">{{ record.inherited_from }}</Tag>
                    </template>
                    <template v-else-if="['can_view', 'can_edit', 'can_create', 'can_delete'].includes(column.key as string)">
                      <Checkbox :checked="record[column.key as string]" disabled />
                    </template>
                  </template>
                </Table>
              </Collapse.Panel>
            </Collapse>
          </Tabs.TabPane>

          <!-- Users Tab -->
          <Tabs.TabPane key="users">
            <template #tab>
              <span class="flex items-center gap-1">
                <UserOutlined />
                Users
                <Tag v-if="details.users.length > 0" color="orange" class="ml-1">
                  {{ details.users.length }}
                </Tag>
              </span>
            </template>

            <div class="mb-3 flex justify-end">
              <Button type="primary" size="small" @click="openAddModal('user')">
                <template #icon><PlusOutlined /></template>
                Add User
              </Button>
            </div>

            <Table
              :columns="userColumns"
              :data-source="details.users"
              :pagination="false"
              :row-key="(r: MenuUserPermItem) => r.user_id"
              size="small"
              :locale="{ emptyText: 'No users assigned' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'name'">
                  <span>{{ record.full_name || record.username }}</span>
                </template>
                <template v-else-if="column.key === 'can_view'">
                  <Checkbox
                    :checked="record.can_view"
                    @change="(e: any) => handleTogglePermission('user', record.user_id, record as any, 'can_view', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'can_edit'">
                  <Checkbox
                    :checked="record.can_edit"
                    @change="(e: any) => handleTogglePermission('user', record.user_id, record as any, 'can_edit', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'can_create'">
                  <Checkbox
                    :checked="record.can_create"
                    @change="(e: any) => handleTogglePermission('user', record.user_id, record as any, 'can_create', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'can_delete'">
                  <Checkbox
                    :checked="record.can_delete"
                    @change="(e: any) => handleTogglePermission('user', record.user_id, record as any, 'can_delete', e.target.checked)"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Popconfirm
                    title="Remove this user?"
                    @confirm="handleRemove('user', record.user_id)"
                  >
                    <Button type="text" danger size="small">
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Popconfirm>
                </template>
              </template>
            </Table>

            <!-- Inherited Users -->
            <Collapse
              v-if="details.inherited_users.length > 0"
              class="mt-3"
              :bordered="false"
            >
              <Collapse.Panel key="inherited" header="Inherited Permissions">
                <Table
                  :columns="inheritedUserColumns"
                  :data-source="details.inherited_users"
                  :pagination="false"
                  :row-key="(r: any) => `${r.user_id}-${r.inherited_from_id}`"
                  size="small"
                  class="inherited-table"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'name'">
                      <span>{{ record.full_name || record.username }}</span>
                    </template>
                    <template v-else-if="column.key === 'inherited_from'">
                      <Tag color="default">{{ record.inherited_from }}</Tag>
                    </template>
                    <template v-else-if="['can_view', 'can_edit', 'can_create', 'can_delete'].includes(column.key as string)">
                      <Checkbox :checked="record[column.key as string]" disabled />
                    </template>
                  </template>
                </Table>
              </Collapse.Panel>
            </Collapse>
          </Tabs.TabPane>
        </Tabs>
      </template>

      <Empty v-else-if="!loading" description="Failed to load permissions" />
    </Spin>

    <!-- Add Modal -->
    <AddPermissionModal
      v-model:open="modalOpen"
      :entity-type="modalEntityType"
      :existing-ids="existingIds"
      :menu-name="menuName"
      @add="handleAdd"
    />
  </div>
</template>

<style scoped>
.menu-permission-panel {
  min-height: 400px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.inherited-table :deep(.ant-table) {
  opacity: 0.7;
}
</style>
