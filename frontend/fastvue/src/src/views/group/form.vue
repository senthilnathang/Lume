<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tree,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  KeyOutlined,
  SaveOutlined,
  TeamOutlined,
  UnlockOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import {
  createGroupApi,
  getGroupApi,
  getGroupUsersApi,
  getPermissionsApi,
  removeUsersFromGroupApi,
  setGroupUsersApi,
  type SettingsApi,
  updateGroupApi,
} from '#/api/settings';
import { getUsersApi, type UserApi } from '#/api/user';
import {
  getGroupMenuPermissionsApi,
  getMenuItemsTreeApi,
  setGroupMenuPermissionsApi,
  type RBACApi,
} from '#/api/rbac';

defineOptions({
  name: 'GroupForm',
});

const route = useRoute();
const router = useRouter();

const isEditMode = computed(() => route.name === 'GroupEdit');
const groupId = computed(() => Number(route.params.id));
const activeTab = ref('general');

const loading = ref(false);
const submitting = ref(false);
const formRef = ref();

// Group form data
const formState = reactive({
  name: '',
  codename: '',
  description: '',
});

// Permissions
const allPermissions = ref<SettingsApi.Permission[]>([]);
const groupedPermissions = ref<Record<string, SettingsApi.Permission[]>>({});
const selectedPermissions = ref<number[]>([]);

// Users management
const groupUsers = ref<Array<{ id: number; username: string; email: string }>>([]);
const availableUsers = ref<UserApi.User[]>([]);
const loadingUsers = ref(false);
const showAddUsersModal = ref(false);
const selectedUsersToAdd = ref<number[]>([]);
const loadingAvailableUsers = ref(false);

const rules: Record<string, any> = {
  name: [{ required: true, message: 'Group name is required', trigger: 'blur' }],
  codename: [{ required: true, message: 'Codename is required', trigger: 'blur' }],
};

// Menu Access (RBAC)
const menuItems = ref<RBACApi.MenuItem[]>([]);
const selectedMenuCodes = ref<string[]>([]);
const loadingMenus = ref(false);
const savingMenuPerms = ref(false);

// Convert menu items to tree data for Ant Design Tree
function convertToTreeData(items: RBACApi.MenuItem[]): any[] {
  return items.map((item) => ({
    key: item.code,
    title: item.name,
    icon: item.icon,
    children: item.children ? convertToTreeData(item.children) : [],
  }));
}

async function fetchMenuItems() {
  try {
    menuItems.value = await getMenuItemsTreeApi();
  } catch (error) {
    console.error('Failed to fetch menu items:', error);
  }
}

async function fetchGroupMenuPermissions() {
  if (!groupId.value) return;

  loadingMenus.value = true;
  try {
    const response = await getGroupMenuPermissionsApi(groupId.value);
    selectedMenuCodes.value = (response as any).menu_codes || [];
  } catch (error) {
    console.error('Failed to fetch group menu permissions:', error);
    selectedMenuCodes.value = [];
  } finally {
    loadingMenus.value = false;
  }
}

async function saveMenuPermissions() {
  if (!groupId.value) {
    message.warning('Please save the group first');
    return;
  }

  savingMenuPerms.value = true;
  try {
    await setGroupMenuPermissionsApi(groupId.value, selectedMenuCodes.value as any);
    message.success('Menu permissions saved successfully');
  } catch (error: any) {
    console.error('Failed to save menu permissions:', error);
    message.error(error?.response?.data?.error || 'Failed to save menu permissions');
  } finally {
    savingMenuPerms.value = false;
  }
}

// User table columns
const userColumns = [
  {
    title: 'User',
    key: 'user',
    width: 300,
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
  },
];

// Computed for user select options (all users)
const userSelectOptions = computed(() => {
  return availableUsers.value.map((user: any) => ({
    value: user.id,
    label: user.username,
    email: user.email,
  }));
});

async function fetchPermissions() {
  try {
    const response = await getPermissionsApi();
    allPermissions.value = (response as any).permissions || [];
    groupedPermissions.value = response.grouped || {};
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
  }
}

async function fetchGroup() {
  if (!isEditMode.value) return;

  loading.value = true;
  try {
    const group = await getGroupApi(groupId.value);
    formState.name = group.name;
    formState.codename = group.codename || '';
    formState.description = group.description || '';
    selectedPermissions.value = (group.permissions || []).map((p: any) => p.id);

    // Fetch users and menu permissions in parallel
    await Promise.all([
      fetchGroupUsers(),
      fetchGroupMenuPermissions(),
    ]);
  } catch (error) {
    console.error('Failed to fetch group:', error);
    message.error('Failed to load group data');
    router.push('/settings/groups');
  } finally {
    loading.value = false;
  }
}

async function fetchGroupUsers() {
  if (!groupId.value) return;

  loadingUsers.value = true;
  try {
    const response = await getGroupUsersApi(groupId.value);
    groupUsers.value = response.users || [];
  } catch (error) {
    console.error('Failed to fetch group users:', error);
    // If endpoint doesn't exist yet, we'll handle gracefully
    groupUsers.value = [];
  } finally {
    loadingUsers.value = false;
  }
}

async function fetchAvailableUsers() {
  loadingAvailableUsers.value = true;
  try {
    const response = await getUsersApi({ page_size: 1000 });
    availableUsers.value = (response as any).results || [];
  } catch (error) {
    console.error('Failed to fetch users:', error);
    availableUsers.value = [];
  } finally {
    loadingAvailableUsers.value = false;
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    message.error('Please fill in all required fields');
    return;
  }

  submitting.value = true;
  try {
    if (isEditMode.value) {
      const updateData = {
        name: formState.name,
        description: formState.description || undefined,
        permission_ids: selectedPermissions.value,
        user_ids: groupUsers.value.map((u) => u.id),
      };
      await updateGroupApi(groupId.value, updateData);
      message.success('Group updated successfully');
    } else {
      const createData = {
        name: formState.name,
        codename: formState.codename,
        description: formState.description || undefined,
        permission_ids: selectedPermissions.value,
      };
      const newGroup = await createGroupApi(createData);
      message.success('Group created successfully');
      // Redirect to edit mode to allow adding users
      router.replace({ name: 'GroupEdit', params: { id: newGroup.id } });
      return;
    }

    router.push('/settings/groups');
  } catch (error: any) {
    console.error('Failed to save group:', error);
    message.error(error?.response?.data?.detail || 'Failed to save group');
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  router.push('/settings/groups');
}

function handleBack() {
  router.back();
}

// Permission helpers
function isPermissionSelected(permId: number) {
  return selectedPermissions.value.includes(permId);
}

function togglePermission(permId: number) {
  const index = selectedPermissions.value.indexOf(permId);
  if (index === -1) {
    selectedPermissions.value.push(permId);
  } else {
    selectedPermissions.value.splice(index, 1);
  }
}

function selectAllInGroup(groupPerms: SettingsApi.Permission[]) {
  const permIds = groupPerms.map((p) => p.id);
  const allSelected = permIds.every((id) => selectedPermissions.value.includes(id));

  if (allSelected) {
    selectedPermissions.value = selectedPermissions.value.filter((id) => !permIds.includes(id));
  } else {
    permIds.forEach((id) => {
      if (!selectedPermissions.value.includes(id)) {
        selectedPermissions.value.push(id);
      }
    });
  }
}

function isGroupFullySelected(groupPerms: SettingsApi.Permission[]) {
  return groupPerms.every((p) => selectedPermissions.value.includes(p.id));
}

function formatGroupName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
}

// User management
async function openAddUsersModal() {
  availableUsers.value = [];
  showAddUsersModal.value = true;
  // Fetch users in background after modal opens
  await fetchAvailableUsers();
  // Pre-select existing group users
  selectedUsersToAdd.value = groupUsers.value.map((u) => u.id);
}

async function handleAddUsers() {
  loadingUsers.value = true;
  try {
    await setGroupUsersApi(groupId.value, selectedUsersToAdd.value);
    message.success('Group users updated successfully');
    showAddUsersModal.value = false;
    await fetchGroupUsers();
  } catch (error: any) {
    console.error('Failed to update group users:', error);
    message.error(error?.response?.data?.error || 'Failed to update group users');
  } finally {
    loadingUsers.value = false;
  }
}

async function handleRemoveUser(userId: number) {
  loadingUsers.value = true;
  try {
    await removeUsersFromGroupApi(groupId.value, [userId]);
    message.success('User removed from group');
    await fetchGroupUsers();
  } catch (error: any) {
    console.error('Failed to remove user:', error);
    message.error(error?.response?.data?.error || 'Failed to remove user');
  } finally {
    loadingUsers.value = false;
  }
}

onMounted(() => {
  fetchPermissions();
  fetchMenuItems();
  fetchGroup();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <Space>
          <Button @click="handleBack">
            <template #icon>
              <ArrowLeftOutlined />
            </template>
            Back
          </Button>
          <h1 class="m-0 text-2xl font-bold">
            {{ isEditMode ? 'Edit Group' : 'Create Group' }}
          </h1>
        </Space>
        <Space>
          <Button @click="handleCancel">Cancel</Button>
          <Button type="primary" :loading="submitting" @click="handleSubmit">
            <template #icon>
              <SaveOutlined />
            </template>
            {{ isEditMode ? 'Update' : 'Create' }}
          </Button>
        </Space>
      </div>

      <Spin :spinning="loading">
        <Row :gutter="24">
          <!-- Group Info Card -->
          <Col :xs="24" :lg="6">
            <Card class="mb-6 text-center">
              <div class="mb-4">
                <Avatar :size="100" :style="{ backgroundColor: '#1890ff', fontSize: '36px' }">
                  <template #icon><TeamOutlined /></template>
                </Avatar>
              </div>
              <h3 class="mb-1 text-lg font-semibold">
                {{ formState.name || 'New Group' }}
              </h3>
              <div class="mt-2">
                <Tag color="purple">
                  <UnlockOutlined class="mr-1" />
                  {{ selectedPermissions.length }} permissions
                </Tag>
              </div>
              <div v-if="isEditMode" class="mt-2">
                <Tag color="blue">
                  <UserOutlined class="mr-1" />
                  {{ groupUsers.length }} users
                </Tag>
              </div>
              <div v-if="isEditMode" class="mt-2">
                <Tag color="green">
                  <KeyOutlined class="mr-1" />
                  {{ selectedMenuCodes.length }} menus
                </Tag>
              </div>
            </Card>
          </Col>

          <!-- Tabs -->
          <Col :xs="24" :lg="18">
            <Card>
              <Tabs v-model:activeKey="activeTab">
                <!-- General Tab -->
                <Tabs.TabPane key="general" tab="General">
                  <Form ref="formRef" :model="formState" :rules="rules" layout="vertical">
                    <Row :gutter="16">
                      <Col :xs="24" :md="12">
                        <Form.Item label="Group Name" name="name" required>
                          <Input
                            v-model:value="formState.name"
                            placeholder="Enter group name (e.g., Managers, HR Team)"
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      <Col :xs="24" :md="12">
                        <Form.Item label="Codename" name="codename" required>
                          <Input
                            v-model:value="formState.codename"
                            placeholder="Enter codename (e.g., managers, hr_team)"
                            size="large"
                            :disabled="isEditMode"
                          />
                        </Form.Item>
                      </Col>
                      <Col :span="24">
                        <Form.Item label="Description" name="description">
                          <Input.TextArea
                            v-model:value="formState.description"
                            placeholder="Enter group description"
                            :rows="2"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item label="Permissions">
                      <div class="mb-2 text-sm text-gray-500">
                        Select permissions for this group. Users in this group will have these permissions.
                      </div>
                      <div class="max-h-[500px] overflow-y-auto rounded border p-3">
                        <Collapse v-if="Object.keys(groupedPermissions).length > 0">
                          <Collapse.Panel
                            v-for="(perms, permGroupName) in groupedPermissions"
                            :key="permGroupName"
                            :header="formatGroupName(String(permGroupName))"
                          >
                            <template #extra>
                              <Checkbox
                                :checked="isGroupFullySelected(perms)"
                                @click.stop
                                @change="selectAllInGroup(perms)"
                              >
                                Select All
                              </Checkbox>
                            </template>
                            <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                              <div v-for="perm in perms" :key="perm.id" class="flex items-center">
                                <Checkbox
                                  :checked="isPermissionSelected(perm.id)"
                                  @change="togglePermission(perm.id)"
                                >
                                  {{ perm.name }}
                                </Checkbox>
                              </div>
                            </div>
                          </Collapse.Panel>
                        </Collapse>
                        <div v-else class="py-8 text-center text-gray-400">
                          Loading permissions...
                        </div>
                      </div>
                      <div class="mt-2 text-sm text-gray-500">
                        {{ selectedPermissions.length }} permissions selected
                      </div>
                    </Form.Item>
                  </Form>
                </Tabs.TabPane>

                <!-- Users Tab (Only in Edit Mode) -->
                <Tabs.TabPane v-if="isEditMode" key="users" tab="Users">
                  <div class="mb-4 flex items-center justify-between">
                    <div>
                      <h3 class="m-0 text-lg font-semibold">Group Members</h3>
                      <p class="mt-1 text-sm text-gray-500">
                        Manage users who belong to this group
                      </p>
                    </div>
                    <Button type="primary" @click="openAddUsersModal">
                      <template #icon><UserAddOutlined /></template>
                      Manage Users
                    </Button>
                  </div>

                  <Table
                    :columns="userColumns"
                    :data-source="groupUsers"
                    :loading="loadingUsers"
                    :pagination="{ pageSize: 10 }"
                    row-key="id"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'user'">
                        <div class="flex items-center gap-3">
                          <Avatar :size="36" :style="{ backgroundColor: '#1890ff' }">
                            {{ record.username?.charAt(0)?.toUpperCase() || 'U' }}
                          </Avatar>
                          <div>
                            <div class="font-medium">{{ record.username }}</div>
                          </div>
                        </div>
                      </template>

                      <template v-if="column.key === 'actions'">
                        <Popconfirm
                          title="Remove this user from the group?"
                          ok-text="Yes"
                          cancel-text="No"
                          @confirm="handleRemoveUser(record.id)"
                        >
                          <Button type="link" danger size="small">
                            <template #icon><DeleteOutlined /></template>
                            Remove
                          </Button>
                        </Popconfirm>
                      </template>
                    </template>

                    <template #emptyText>
                      <div class="py-8 text-center">
                        <UserOutlined class="mb-2 text-4xl text-gray-300" />
                        <p class="text-gray-500">No users in this group</p>
                        <Button type="primary" class="mt-2" @click="openAddUsersModal">
                          <template #icon><UserAddOutlined /></template>
                          Assign Users
                        </Button>
                      </div>
                    </template>
                  </Table>
                </Tabs.TabPane>

                <!-- Menu Access Tab (Only in Edit Mode) -->
                <Tabs.TabPane v-if="isEditMode" key="menu-access" tab="Menu Access">
                  <div class="mb-4 flex items-center justify-between">
                    <div>
                      <h3 class="m-0 text-lg font-semibold">Menu Permissions</h3>
                      <p class="mt-1 text-sm text-gray-500">
                        Select which menus members of this group can access
                      </p>
                    </div>
                    <Button type="primary" :loading="savingMenuPerms" @click="saveMenuPermissions">
                      <template #icon><SaveOutlined /></template>
                      Save Menu Permissions
                    </Button>
                  </div>

                  <Spin :spinning="loadingMenus">
                    <div class="rounded border p-4">
                      <Tree
                        v-if="menuItems.length > 0"
                        v-model:checkedKeys="selectedMenuCodes"
                        :tree-data="convertToTreeData(menuItems)"
                        checkable
                        default-expand-all
                        :selectable="false"
                      >
                        <template #title="{ title }">
                          <span>{{ title }}</span>
                        </template>
                      </Tree>
                      <div v-else class="py-8 text-center text-gray-400">
                        <KeyOutlined class="mb-2 text-4xl" />
                        <p>No menu items available</p>
                      </div>
                    </div>
                    <div class="mt-3 text-sm text-gray-500">
                      {{ selectedMenuCodes.length }} menu item(s) selected
                    </div>
                  </Spin>
                </Tabs.TabPane>
              </Tabs>
            </Card>
          </Col>
        </Row>

        <!-- Form Actions -->
        <div class="mt-6 flex justify-end gap-4">
          <Button size="large" @click="handleCancel">Cancel</Button>
          <Button type="primary" size="large" :loading="submitting" @click="handleSubmit">
            <template #icon>
              <SaveOutlined />
            </template>
            {{ isEditMode ? 'Update Group' : 'Create Group' }}
          </Button>
        </div>
      </Spin>

      <!-- Manage Users Modal -->
      <Modal
        v-model:open="showAddUsersModal"
        title="Manage Group Users"
        :width="500"
        ok-text="Save"
        :confirm-loading="loadingUsers"
        @ok="handleAddUsers"
        @cancel="showAddUsersModal = false"
      >
        <div class="mb-4">
          <p class="text-gray-600">
            Select users to assign to the <strong>{{ formState.name }}</strong> group.
          </p>
        </div>

        <Form layout="vertical">
          <Form.Item label="Select Users">
            <Select
              v-model:value="selectedUsersToAdd"
              mode="multiple"
              placeholder="Select users to add..."
              :options="userSelectOptions"
              :loading="loadingAvailableUsers"
              :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase()) || option.email?.toLowerCase().includes(input.toLowerCase())"
              show-search
              allow-clear
              style="width: 100%"
              :not-found-content="loadingAvailableUsers ? 'Loading users...' : userSelectOptions.length === 0 ? 'No available users' : 'No users found'"
            >
              <template #option="{ label, email }">
                <div class="flex items-center gap-2">
                  <Avatar :size="24" :style="{ backgroundColor: '#1890ff', fontSize: '12px' }">
                    {{ label?.charAt(0)?.toUpperCase() || 'U' }}
                  </Avatar>
                  <div>
                    <div class="font-medium">{{ label }}</div>
                    <div class="text-xs text-gray-500">{{ email }}</div>
                  </div>
                </div>
              </template>
            </Select>
          </Form.Item>
        </Form>

        <div class="mt-2 text-sm text-gray-500">
          {{ selectedUsersToAdd.length }} user(s) selected
        </div>
      </Modal>
    </div>
  </Page>
</template>
