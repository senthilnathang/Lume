<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  FormItem,
  InputNumber,
  message,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  TreeSelect,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue';

import {
  bulkAddMenuPermissionsApi,
  getMenuItemsFlatApi,
  type RBACApi,
} from '#/api/core/rbac';
import { getRolesApi } from '#/api/roles';
import { getGroupsApi } from '#/api/core/rbac';
import { getUsersApi } from '#/api/core/user';

defineOptions({
  name: 'MenuAccessForm',
});

const router = useRouter();
const route = useRoute();

const isEdit = computed(() => !!route.params.id);

// Form state - multi-select for many-to-many
const formState = reactive({
  permission_type: 'role' as 'role' | 'group' | 'user',
  entity_ids: [] as number[],
  menu_item_ids: [] as number[],
  can_view: true,
  can_edit: false,
  can_create: false,
  can_delete: false,
  priority: 10,
});

// Loading states
const loading = ref(false);
const saving = ref(false);

// Entity options
const roles = ref<Array<{ id: number; name: string; codename: string }>>([]);
const groups = ref<Array<{ id: number; name: string; codename: string }>>([]);
const users = ref<Array<{ id: number; username: string; full_name: string | null; email: string }>>([]);
const menuItems = ref<RBACApi.MenuItem[]>([]);

// Computed entity options based on selected type
const entityOptions = computed(() => {
  switch (formState.permission_type) {
    case 'role':
      return roles.value.map(r => ({ value: r.id, label: `${r.name} (${r.codename})` }));
    case 'group':
      return groups.value.map(g => ({ value: g.id, label: `${g.name} (${g.codename})` }));
    case 'user':
      return users.value.map(u => ({ value: u.id, label: `${u.full_name || u.username} (${u.email})` }));
    default:
      return [];
  }
});

const entityLabel = computed(() => {
  const labels: Record<string, string> = { role: 'Roles', group: 'Groups', user: 'Users' };
  return labels[formState.permission_type] || 'Entities';
});

const entitySingular = computed(() => {
  const labels: Record<string, string> = { role: 'role', group: 'group', user: 'user' };
  return labels[formState.permission_type] || 'entity';
});

// Build tree data for menu TreeSelect
const menuTreeData = computed(() => {
  const itemMap = new Map<number, any>();
  const rootItems: any[] = [];

  menuItems.value.forEach(item => {
    itemMap.set(item.id, { value: item.id, title: item.name, label: `${item.name} (${item.code})`, children: [] });
  });

  menuItems.value.forEach(item => {
    const mapped = itemMap.get(item.id)!;
    if (item.parent_id && itemMap.has(item.parent_id)) {
      itemMap.get(item.parent_id)!.children.push(mapped);
    } else {
      rootItems.push(mapped);
    }
  });

  return rootItems;
});

// Summary text
const summaryText = computed(() => {
  const entities = formState.entity_ids.length;
  const menus = formState.menu_item_ids.length;
  if (!entities || !menus) return '';
  const total = entities * menus;
  return `${entities} ${entitySingular.value}${entities > 1 ? 's' : ''} × ${menus} menu${menus > 1 ? 's' : ''} = ${total} permission${total > 1 ? 's' : ''} will be created`;
});

// Set default priority based on permission type
watch(() => formState.permission_type, (type) => {
  formState.entity_ids = [];
  switch (type) {
    case 'role': formState.priority = 10; break;
    case 'group': formState.priority = 50; break;
    case 'user': formState.priority = 100; break;
  }
});

async function fetchData() {
  loading.value = true;
  try {
    const [menuRes, roleRes, groupRes, userRes] = await Promise.all([
      getMenuItemsFlatApi(),
      getRolesApi({ page: 1, page_size: 100 }),
      getGroupsApi({ page: 1, page_size: 100 }),
      getUsersApi({ page: 1, page_size: 100 }),
    ]);
    menuItems.value = menuRes;
    roles.value = roleRes.items.map(r => ({ id: r.id, name: r.name, codename: r.codename }));
    groups.value = groupRes.items.map(g => ({ id: g.id, name: g.name, codename: g.codename }));
    users.value = userRes.items.map(u => ({ id: u.id, username: u.username, full_name: u.full_name, email: u.email }));
  } catch {
    message.error('Failed to load form data');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (formState.entity_ids.length === 0) {
    message.warning(`Please select at least one ${entitySingular.value}`);
    return;
  }
  if (formState.menu_item_ids.length === 0) {
    message.warning('Please select at least one menu item');
    return;
  }

  saving.value = true;
  try {
    const result = await bulkAddMenuPermissionsApi({
      permission_type: formState.permission_type,
      entity_ids: formState.entity_ids,
      menu_item_ids: formState.menu_item_ids,
      can_view: formState.can_view,
      can_edit: formState.can_edit,
      can_create: formState.can_create,
      can_delete: formState.can_delete,
      priority: formState.priority,
    });

    if (result.skipped > 0) {
      message.success(`Created ${result.created} permissions (${result.skipped} already existed)`);
    } else {
      message.success(`Created ${result.created} permissions successfully`);
    }
    router.push({ name: 'MenuAccess' });
  } catch (err: any) {
    const detail = err?.response?.data?.detail || 'Failed to save permissions';
    message.error(detail);
  } finally {
    saving.value = false;
  }
}

function goBack() {
  router.push({ name: 'MenuAccess' });
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <Button type="text" @click="goBack">
            <template #icon><ArrowLeftOutlined /></template>
          </Button>
          <span>{{ isEdit ? 'Edit' : 'Add' }} Menu Permissions</span>
        </div>
      </template>

      <Spin :spinning="loading">
        <Form layout="vertical" :model="formState" style="max-width: 700px">
          <!-- Permission Type -->
          <FormItem label="Permission Type" required>
            <Radio.Group v-model:value="formState.permission_type" button-style="solid">
              <Radio.Button value="role">Role</Radio.Button>
              <Radio.Button value="group">Group</Radio.Button>
              <Radio.Button value="user">User</Radio.Button>
            </Radio.Group>
          </FormItem>

          <!-- Entity Selection (multi-select) -->
          <FormItem :label="entityLabel" required>
            <Select
              v-model:value="formState.entity_ids"
              mode="multiple"
              :placeholder="`Select one or more ${entityLabel.toLowerCase()}`"
              :options="entityOptions"
              show-search
              :filter-option="(input: string, option: any) =>
                option.label.toLowerCase().includes(input.toLowerCase())"
              style="width: 100%"
              :max-tag-count="5"
              max-tag-placeholder="..."
            />
          </FormItem>

          <!-- Menu Items (multi-select tree) -->
          <FormItem label="Menu Items" required>
            <TreeSelect
              v-model:value="formState.menu_item_ids"
              :tree-data="menuTreeData"
              placeholder="Select one or more menu items"
              tree-default-expand-all
              show-search
              multiple
              tree-checkable
              :show-checked-strategy="TreeSelect.SHOW_CHILD"
              :filter-tree-node="(input: string, node: any) =>
                node.title?.toLowerCase().includes(input.toLowerCase())"
              style="width: 100%"
              :max-tag-count="5"
              :max-tag-placeholder="(omitted: any) => `+${omitted.length} more`"
            />
          </FormItem>

          <!-- Summary -->
          <div v-if="summaryText" class="mb-4 rounded bg-blue-50 px-4 py-2 text-sm text-blue-600">
            {{ summaryText }}
          </div>

          <!-- Permissions -->
          <FormItem label="Permissions">
            <Row :gutter="16">
              <Col :span="6">
                <Checkbox v-model:checked="formState.can_view">View</Checkbox>
              </Col>
              <Col :span="6">
                <Checkbox v-model:checked="formState.can_edit">Edit</Checkbox>
              </Col>
              <Col :span="6">
                <Checkbox v-model:checked="formState.can_create">Create</Checkbox>
              </Col>
              <Col :span="6">
                <Checkbox v-model:checked="formState.can_delete">Delete</Checkbox>
              </Col>
            </Row>
          </FormItem>

          <!-- Priority -->
          <FormItem label="Priority">
            <InputNumber
              v-model:value="formState.priority"
              :min="1"
              :max="1000"
              style="width: 150px"
            />
            <span class="ml-3 text-sm text-gray-400">
              Role: 10, Group: 50, User: 100 (higher overrides lower)
            </span>
          </FormItem>

          <!-- Actions -->
          <FormItem>
            <Space>
              <Button type="primary" :loading="saving" @click="handleSave">
                <template #icon><SaveOutlined /></template>
                Save
              </Button>
              <Button @click="goBack">Cancel</Button>
            </Space>
          </FormItem>
        </Form>
      </Spin>
    </Card>
  </Page>
</template>
