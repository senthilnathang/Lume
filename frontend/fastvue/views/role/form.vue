<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  message,
  Switch,
  Textarea,
  Transfer,
} from 'ant-design-vue';
import { SaveOutlined } from '@ant-design/icons-vue';

import {
  createRoleApi,
  getRoleApi,
  updateRoleApi,
} from '#/api/roles';
import { getPermissionsApi, type SettingsApi } from '#/api/settings';

defineOptions({
  name: 'RoleForm',
});

const route = useRoute();
const router = useRouter();
const formRef = ref();

const roleId = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => !!roleId.value);

const loading = ref(false);
const submitting = ref(false);
const permissions = ref<SettingsApi.Permission[]>([]);
const targetKeys = ref<string[]>([]);

const formState = ref({
  name: '',
  codename: '',
  description: '',
  is_active: true,
  permission_ids: [] as number[],
});

const rules = {
  name: [{ required: true, message: 'Please enter role name' }],
  codename: [
    { required: true, message: 'Please enter role codename' },
    { pattern: /^[a-z_]+$/, message: 'Codename must be lowercase with underscores' },
  ],
};

const transferData = computed(() => {
  return permissions.value.map(p => ({
    key: String(p.id),
    title: p.name,
    description: p.codename,
  }));
});

async function fetchPermissions() {
  try {
    const response = await getPermissionsApi({ page_size: 1000 });
    permissions.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    message.error('Failed to load permissions');
  }
}

async function fetchRole() {
  if (!roleId.value) return;

  loading.value = true;
  try {
    const role = await getRoleApi(Number(roleId.value));
    formState.value = {
      name: role.name,
      codename: role.codename,
      description: role.description || '',
      is_active: role.is_active,
      permission_ids: role.permissions?.map(p => p.id) || [],
    };
    targetKeys.value = role.permissions?.map(p => String(p.id)) || [];
  } catch (error) {
    console.error('Failed to fetch role:', error);
    message.error('Failed to load role');
    router.push('/settings/roles');
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const data = {
      ...formState.value,
      permission_ids: targetKeys.value.map(k => Number(k)),
    };

    if (isEdit.value) {
      await updateRoleApi(Number(roleId.value), data);
      message.success('Role updated successfully');
    } else {
      await createRoleApi(data);
      message.success('Role created successfully');
    }

    router.push('/settings/roles');
  } catch (error: any) {
    console.error('Failed to save role:', error);
    message.error(error.response?.data?.detail || 'Failed to save role');
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  router.push('/settings/roles');
}

function handleTransferChange(nextTargetKeys: string[]) {
  targetKeys.value = nextTargetKeys;
}

onMounted(async () => {
  await fetchPermissions();
  if (isEdit.value) {
    await fetchRole();
  }
});
</script>

<template>
  <Page
    :title="isEdit ? 'Edit Role' : 'Create Role'"
    auto-content-height
  >
    <Card :loading="loading">
      <Form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        class="max-w-2xl"
      >
        <FormItem label="Role Name" name="name">
          <Input
            v-model:value="formState.name"
            placeholder="Enter role name"
            :disabled="isEdit"
          />
        </FormItem>

        <FormItem label="Codename" name="codename">
          <Input
            v-model:value="formState.codename"
            placeholder="e.g., admin, manager, viewer"
            :disabled="isEdit"
          />
        </FormItem>

        <FormItem label="Description" name="description">
          <Textarea
            v-model:value="formState.description"
            placeholder="Describe this role's purpose"
            :rows="3"
          />
        </FormItem>

        <FormItem label="Active" name="is_active">
          <Switch v-model:checked="formState.is_active" />
        </FormItem>

        <FormItem label="Permissions" name="permission_ids">
          <Transfer
            :data-source="transferData"
            :target-keys="targetKeys"
            :titles="['Available', 'Assigned']"
            :render="(item: any) => item.title"
            show-search
            :filter-option="(inputValue: string, item: any) =>
              item.title.toLowerCase().includes(inputValue.toLowerCase()) ||
              item.description.toLowerCase().includes(inputValue.toLowerCase())
            "
            :list-style="{ width: '250px', height: '300px' }"
            @change="handleTransferChange"
          />
        </FormItem>

        <FormItem>
          <div class="flex gap-2">
            <Button
              type="primary"
              :loading="submitting"
              @click="handleSubmit"
            >
              <template #icon><SaveOutlined /></template>
              {{ isEdit ? 'Update' : 'Create' }} Role
            </Button>
            <Button @click="handleCancel">Cancel</Button>
          </div>
        </FormItem>
      </Form>
    </Card>
  </Page>
</template>
