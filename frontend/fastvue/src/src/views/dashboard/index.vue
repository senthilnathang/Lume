<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { getPendingApprovalRequestsApi } from '#/api/core/base';

import {
  Avatar,
  Card,
  Col,
  Row,
  Statistic,
  Tag,
} from 'ant-design-vue';
import {
  BuildOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'Dashboard',
});

const router = useRouter();
const userStore = useUserStore();


const userInfo = computed(() => userStore.userInfo);
const userName = computed(() => userInfo.value?.realName || userInfo.value?.username || 'User');

// Quick stats (could be fetched from API)
const stats = ref({
  users: 0,
  companies: 0,
  groups: 0,
  permissions: 0,
  pendingApprovals: 0,
});

function navigateTo(path: string) {
  router.push(path);
}

async function fetchPendingApprovalsCount() {
  try {
    const response = await getPendingApprovalRequestsApi();
    stats.value.pendingApprovals = response.length;
  } catch (error) {
    console.error('Failed to fetch pending approvals count:', error);
  }
}

onMounted(() => {
  // Could fetch dashboard stats here
  fetchPendingApprovalsCount();
});
</script>

<template>
  <Page auto-content-height>
    <div class="dashboard-page p-4">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold mb-2">
          Welcome, {{ userName }}!
        </h1>
        <p class="text-gray-500">
          FastVue Framework - Your full-stack Vue.js + FastAPI starter
        </p>
      </div>

      <!-- User Info Card -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :span="24">
          <Card>
            <div class="flex items-center gap-4">
              <Avatar :size="64" :src="userInfo?.avatar">
                <template #icon>
                  <UserOutlined />
                </template>
              </Avatar>
              <div>
                <h3 class="text-lg font-semibold m-0">{{ userName }}</h3>
                <p class="text-gray-500 m-0">{{ userInfo?.desc || 'No description' }}</p>
                <div class="mt-2">
                  <Tag v-for="role in userInfo?.roles || []" :key="role" color="blue">
                    {{ role }}
                  </Tag>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <!-- Quick Stats -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="24" :sm="12" :md="6">
          <Card class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/settings/users')">
            <Statistic title="Users" :value="stats.users" :value-style="{ color: '#1890ff' }">
              <template #prefix>
                <TeamOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="12" :md="6">
          <Card class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/settings/companies')">
            <Statistic title="Companies" :value="stats.companies" :value-style="{ color: '#52c41a' }">
              <template #prefix>
                <BuildOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="12" :md="6">
          <Card class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/settings/groups')">
            <Statistic title="Groups" :value="stats.groups" :value-style="{ color: '#722ed1' }">
              <template #prefix>
                <SafetyCertificateOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="12" :md="6">
          <Card class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/settings/permissions')">
            <Statistic title="Permissions" :value="stats.permissions" :value-style="{ color: '#faad14' }">
              <template #prefix>
                <SettingOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <!-- Approvals Row -->
      <Row :gutter="[16, 16]" class="mb-6" v-if="stats.pendingApprovals > 0">
        <Col :xs="24" :sm="12" :md="6">
          <Card class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/approvals/pending')">
            <Statistic
              title="Pending Approvals"
              :value="stats.pendingApprovals"
              :value-style="{ color: stats.pendingApprovals > 0 ? '#ff4d4f' : '#52c41a' }"
            >
              <template #prefix>
                <CheckCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <!-- Quick Actions -->
      <Row :gutter="[16, 16]">
        <Col :span="24">
          <Card title="Quick Actions">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                class="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
                @click="navigateTo('/settings/users')"
              >
                <TeamOutlined class="text-2xl text-blue-500 mb-2" />
                <div class="font-medium">Manage Users</div>
              </div>
              <div
                class="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
                @click="navigateTo('/settings/companies')"
              >
                <BuildOutlined class="text-2xl text-green-500 mb-2" />
                <div class="font-medium">Manage Companies</div>
              </div>
              <div
                class="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
                @click="navigateTo('/settings/groups')"
              >
                <SafetyCertificateOutlined class="text-2xl text-purple-500 mb-2" />
                <div class="font-medium">Manage Groups</div>
              </div>
              <div
                class="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
                @click="navigateTo('/settings/permissions')"
              >
                <SettingOutlined class="text-2xl text-orange-500 mb-2" />
                <div class="font-medium">View Permissions</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  </Page>
</template>

<style scoped>
.dashboard-page {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
