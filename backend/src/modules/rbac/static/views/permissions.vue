<script setup>
import { ref, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Table,
  Tag,
  Space,
  Input,
  Row,
  Col,
  Collapse,
  CollapsePanel,
  message,
  Spin,
} from 'ant-design-vue';

import {
  SearchOutlined,
  KeyOutlined,
  LockOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'RbacPermissions',
});

const loading = ref(false);
const searchText = ref('');
const permissions = ref([]);
const groupedPermissions = ref({});

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Code',
    dataIndex: 'code',
    key: 'code',
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: 'Category',
    dataIndex: 'category',
    key: 'category',
    width: 100,
  },
];

async function loadPermissions() {
  loading.value = true;
  try {
    const response = await fetch('/api/rbac/permissions/grouped');
    const result = await response.json();
    groupedPermissions.value = result.data;

    const allPerms = await fetch('/api/rbac/permissions');
    permissions.value = (await allPerms.json()).data;
  } catch (error) {
    message.error('Failed to load permissions');
  } finally {
    loading.value = false;
  }
}

function getCategoryColor(category) {
  const colors = {
    read: 'blue',
    write: 'green',
    delete: 'red',
    admin: 'orange'
  };
  return colors[category] || 'default';
}

const filteredPermissions = computed(() => {
  if (!searchText.value) return permissions.value;
  return permissions.value.filter(p =>
    p.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
    p.code.toLowerCase().includes(searchText.value.toLowerCase())
  );
});

onMounted(() => {
  loadPermissions();
});
</script>

<template>
  <Page title="Permissions" description="View all system permissions">
    <Spin :spinning="loading">
      <Card>
        <div class="mb-4">
          <Input
            v-model:value="searchText"
            placeholder="Search permissions..."
            style="width: 300px"
            allow-clear
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>
        </div>

        <Collapse default-active-key="['Users', 'RBAC', 'Donations']" class="permissions-collapse">
          <CollapsePanel v-for="(perms, group) in groupedPermissions" :key="group" :header="group">
            <template #extra>
              <Tag>{{ perms.length }}</Tag>
            </template>
            <Table
              :data-source="perms"
              :columns="columns"
              :row-key="(record) => record.id"
              :pagination="false"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'code'">
                  <CodeOutlined style="margin-right: 8px" />
                  <code>{{ record.code }}</code>
                </template>
                <template v-else-if="column.key === 'category'">
                  <Tag :color="getCategoryColor(record.category)">{{ record.category }}</Tag>
                </template>
              </template>
            </Table>
          </CollapsePanel>
        </Collapse>
      </Card>
    </Spin>
  </Page>
</template>

<script>
import { CodeOutlined } from '@ant-design/icons-vue';

export default {
  components: { CodeOutlined }
};
</script>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.permissions-collapse :deep(.ant-collapse-header) {
  font-weight: 600;
}
</style>
