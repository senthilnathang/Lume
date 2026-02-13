<script lang="ts" setup>
import { computed, onMounted } from 'vue';

import { Avatar, Dropdown, Menu, message, Spin, Tag, Tooltip } from 'ant-design-vue';
import {
  BankOutlined,
  CheckOutlined,
  SwapOutlined,
} from '@ant-design/icons-vue';

import { type BaseApi, switchCompanyApi, clearCompanySelectionApi } from '#/api/core/base';
import { useCompanyStore } from '#/store';

defineOptions({
  name: 'CompanySwitcher',
});

const companyStore = useCompanyStore();

const loading = computed(() => companyStore.loading);
const companies = computed(() => companyStore.availableCompanies);
const selectedCompany = computed(() => companyStore.selectedCompany);

const displayName = computed(() => companyStore.selectedCompanyName);

const displayIcon = computed(() => {
  if ((selectedCompany.value as any)?.icon) {
    return (selectedCompany.value as any).icon;
  }
  return null;
});

async function handleSelectCompany(company: BaseApi.Company) {
  try {
    await switchCompanyApi(company.id);
    companyStore.selectCompany(company as any);
    message.success(`Switched to ${(company as any).company || company.name}`);
  } catch (error) {
    console.error('Failed to switch company:', error);
    message.error('Failed to switch company');
  }
}

async function handleClearSelection() {
  try {
    await clearCompanySelectionApi();
    companyStore.clearSelection();
    message.success('Viewing all companies');
  } catch (error) {
    console.error('Failed to clear company selection:', error);
  }
}

onMounted(() => {
  companyStore.initialize();
});
</script>

<template>
  <Dropdown placement="bottomRight" :trigger="['click']">
    <Tooltip title="Switch Company">
      <div
        class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Avatar v-if="displayIcon" :size="24" :src="displayIcon" />
        <SwapOutlined v-else class="text-lg" />
        <span class="hidden max-w-[120px] truncate text-sm md:inline">
          {{ displayName }}
        </span>
      </div>
    </Tooltip>

    <template #overlay>
      <Menu class="min-w-[250px]">
        <div class="border-b px-4 py-2">
          <div class="text-xs font-medium uppercase text-gray-500">
            Switch Company
          </div>
        </div>

        <Spin :spinning="loading">
          <!-- All Companies Option -->
          <Menu.Item
            key="all"
            class="flex items-center justify-between"
            @click="handleClearSelection"
          >
            <div class="flex items-center gap-2">
              <BankOutlined />
              <span>All Companies</span>
            </div>
            <CheckOutlined
              v-if="!selectedCompany"
              class="text-green-500"
            />
          </Menu.Item>

          <Menu.Divider />

          <!-- Company List -->
          <template v-if="companies.length > 0">
            <Menu.Item
              v-for="company in companies"
              :key="company.id"
              class="flex items-center justify-between"
              @click="handleSelectCompany(company as any)"
            >
              <div class="flex items-center gap-2">
                <Avatar :size="24" :src="(company as any).icon">
                  {{ (company as any).company?.charAt(0) || company.name?.charAt(0) || 'C' }}
                </Avatar>
                <div class="flex flex-col">
                  <span>{{ (company as any).company || company.name }}</span>
                  <div class="flex gap-1">
                    <Tag v-if="(company as any).hq" color="gold" size="small" class="m-0">
                      HQ
                    </Tag>
                    <Tag
                      v-else-if="(company as any).is_branch"
                      color="blue"
                      size="small"
                      class="m-0"
                    >
                      Branch
                    </Tag>
                  </div>
                </div>
              </div>
              <CheckOutlined
                v-if="selectedCompany?.id === company.id"
                class="text-green-500"
              />
            </Menu.Item>
          </template>

          <div
            v-else
            class="px-4 py-3 text-center text-sm text-gray-500"
          >
            No companies available
          </div>
        </Spin>
      </Menu>
    </template>
  </Dropdown>
</template>
