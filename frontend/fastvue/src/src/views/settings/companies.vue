<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Input,
  message,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Tree,
} from 'ant-design-vue';
import type { TableColumnsType } from 'ant-design-vue';
import {
  BankOutlined,
  BranchesOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';

import {
  type CompanyApi,
  deleteCompanyApi,
  getCompaniesApi,
} from '#/api/company';

defineOptions({
  name: 'CompaniesManagement',
});

const router = useRouter();
const loading = ref(false);
const companies = ref<CompanyApi.Company[]>([]);
const searchText = ref('');
const viewMode = ref<'table' | 'tree'>('table');

// Build tree structure for companies
const companyTree = computed(() => {
  const rootCompanies = companies.value.filter((c) => !c.parent_company_id);
  return rootCompanies.map((company) => buildTreeNode(company));
});

function buildTreeNode(company: CompanyApi.Company): any {
  const children = companies.value.filter(
    (c) => c.parent_company_id === company.id,
  );
  return {
    key: company.id,
    title: company.name,
    company,
    children: children.map((c) => buildTreeNode(c)),
  };
}

// Filtered companies for table view
const filteredCompanies = computed(() => {
  if (!searchText.value) return companies.value;
  const search = searchText.value.toLowerCase();
  return companies.value.filter(
    (c) =>
      c.name.toLowerCase().includes(search) ||
      c.code?.toLowerCase().includes(search) ||
      c.city?.toLowerCase().includes(search) ||
      c.country?.toLowerCase().includes(search),
  );
});

const columns: TableColumnsType = [
  {
    title: 'Company',
    key: 'company',
    width: 250,
  },
  {
    title: 'Code',
    dataIndex: 'code',
    key: 'code',
    width: 100,
  },
  {
    title: 'Type',
    key: 'type',
    width: 120,
  },
  {
    title: 'Location',
    key: 'location',
    width: 200,
  },
  {
    title: 'Contact',
    key: 'contact',
    width: 200,
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    fixed: 'right',
  },
];

async function fetchCompanies() {
  loading.value = true;
  try {
    const response = await getCompaniesApi({ page_size: 100 });
    companies.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    message.error('Failed to load companies');
  } finally {
    loading.value = false;
  }
}

function handleCreate() {
  router.push('/settings/companies/create');
}

function handleCreateBranch(parentId: number) {
  router.push(`/settings/companies/create?parent=${parentId}`);
}

function handleEdit(id: number) {
  router.push(`/settings/companies/${id}/edit`);
}

async function handleDelete(id: number) {
  try {
    await deleteCompanyApi(id);
    message.success('Company deleted successfully');
    fetchCompanies();
  } catch (error: any) {
    console.error('Failed to delete company:', error);
    message.error(error.response?.data?.detail || 'Failed to delete company');
  }
}

function getBranchCount(companyId: number): number {
  return companies.value.filter(c => c.parent_company_id === companyId).length;
}

onMounted(() => {
  fetchCompanies();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Companies</h1>
          <p class="text-gray-500">
            Manage companies and branches for multi-tenancy
          </p>
        </div>
        <Button type="primary" @click="handleCreate">
          <template #icon>
            <PlusOutlined />
          </template>
          Add Company
        </Button>
      </div>

      <!-- Filters -->
      <Card class="mb-4">
        <div class="flex flex-wrap items-center gap-4">
          <Input
            v-model:value="searchText"
            placeholder="Search companies..."
            style="width: 300px"
            allow-clear
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>

          <div class="flex gap-2">
            <Button
              :type="viewMode === 'table' ? 'primary' : 'default'"
              @click="viewMode = 'table'"
            >
              <template #icon>
                <BankOutlined />
              </template>
              Table View
            </Button>
            <Button
              :type="viewMode === 'tree' ? 'primary' : 'default'"
              @click="viewMode = 'tree'"
            >
              <template #icon>
                <BranchesOutlined />
              </template>
              Tree View
            </Button>
          </div>
        </div>
      </Card>

      <Spin :spinning="loading">
        <!-- Table View -->
        <Card v-if="viewMode === 'table'">
          <Table
            :columns="columns"
            :data-source="filteredCompanies"
            :pagination="{ pageSize: 20 }"
            row-key="id"
            :scroll="{ x: 1200 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'company'">
                <div class="flex items-center gap-3">
                  <Avatar :size="40" :src="record.logo_url">
                    {{ record.name?.charAt(0) || 'C' }}
                  </Avatar>
                  <div>
                    <div class="font-medium">{{ record.name }}</div>
                    <div v-if="record.email" class="text-xs text-gray-500">
                      {{ record.email }}
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="column.key === 'type'">
                <Tag v-if="record.is_headquarters" color="gold">
                  <BankOutlined class="mr-1" />
                  Headquarters
                </Tag>
                <Tag v-else-if="record.parent_company_id" color="blue">
                  <BranchesOutlined class="mr-1" />
                  Branch
                </Tag>
                <Tag v-else color="default">Company</Tag>
              </template>

              <template v-else-if="column.key === 'location'">
                <div class="text-sm">
                  <div v-if="record.city || record.state">{{ record.city }}{{ record.city && record.state ? ', ' : '' }}{{ record.state }}</div>
                  <div class="text-gray-500">{{ record.country }}</div>
                </div>
              </template>

              <template v-else-if="column.key === 'contact'">
                <div class="text-sm">
                  <div v-if="record.phone">{{ record.phone }}</div>
                  <div v-if="record.website" class="text-blue-500">
                    {{ record.website }}
                  </div>
                </div>
              </template>

              <template v-else-if="column.key === 'status'">
                <Tag :color="record.is_active ? 'green' : 'red'">
                  {{ record.is_active ? 'Active' : 'Inactive' }}
                </Tag>
              </template>

              <template v-else-if="column.key === 'actions'">
                <Space>
                  <Tooltip title="Add Branch">
                    <Button
                      type="text"
                      size="small"
                      @click="handleCreateBranch(record.id)"
                    >
                      <template #icon>
                        <PlusOutlined />
                      </template>
                    </Button>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <Button
                      type="text"
                      size="small"
                      @click="handleEdit(record.id)"
                    >
                      <template #icon>
                        <EditOutlined />
                      </template>
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Delete this company?"
                    :description="
                      getBranchCount(record.id) > 0
                        ? 'This company has branches. Delete them first.'
                        : 'This action cannot be undone.'
                    "
                    :disabled="getBranchCount(record.id) > 0"
                    @confirm="handleDelete(record.id)"
                  >
                    <Tooltip
                      :title="
                        getBranchCount(record.id) > 0
                          ? 'Has branches'
                          : 'Delete'
                      "
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        :disabled="getBranchCount(record.id) > 0"
                      >
                        <template #icon>
                          <DeleteOutlined />
                        </template>
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </template>
            </template>
          </Table>
        </Card>

        <!-- Tree View -->
        <Card v-else>
          <Tree
            :tree-data="companyTree"
            default-expand-all
            :selectable="false"
          >
            <template #title="{ company }">
              <div
                class="flex items-center justify-between rounded p-2 hover:bg-gray-50"
                style="min-width: 400px"
              >
                <div class="flex items-center gap-3">
                  <Avatar :size="32" :src="company?.logo_url">
                    {{ company?.name?.charAt(0) || 'C' }}
                  </Avatar>
                  <div>
                    <span class="font-medium">{{ company?.name }}</span>
                    <Tag v-if="company?.is_headquarters" color="gold" size="small" class="ml-2">
                      HQ
                    </Tag>
                    <Tag v-else-if="company?.parent_company_id" color="blue" size="small" class="ml-2">
                      Branch
                    </Tag>
                  </div>
                </div>
                <Space>
                  <Button
                    type="text"
                    size="small"
                    @click.stop="handleCreateBranch(company?.id)"
                  >
                    <template #icon>
                      <PlusOutlined />
                    </template>
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    @click.stop="handleEdit(company?.id)"
                  >
                    <template #icon>
                      <EditOutlined />
                    </template>
                  </Button>
                </Space>
              </div>
            </template>
          </Tree>

          <div
            v-if="companyTree.length === 0"
            class="py-8 text-center text-gray-500"
          >
            No companies found. Click "Add Company" to create one.
          </div>
        </Card>
      </Spin>
    </div>
  </Page>
</template>
