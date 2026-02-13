<script setup lang="ts">
/**
 * Security Dashboard
 *
 * User-facing security management view:
 * - Trust level indicator
 * - Active sessions list
 * - Known devices management
 * - Security events timeline
 */
import { onMounted, ref } from 'vue';
import {
  Card,
  Row,
  Col,
  Typography,
  Tabs,
  Space,
  Spin,
  Empty,
} from 'ant-design-vue';
import {
  SafetyCertificateOutlined,
  LaptopOutlined,
  HistoryOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons-vue';

import { useTrustStore } from '#/store/trust';

import TrustLevelIndicator from '#/components/security/TrustLevelIndicator.vue';
import ActiveSessionsList from '#/components/security/ActiveSessionsList.vue';
import KnownDevicesList from '#/components/security/KnownDevicesList.vue';
import SecurityEventsTimeline from '#/components/security/SecurityEventsTimeline.vue';

const { Title, Text } = Typography;

const trustStore = useTrustStore();

// State
const activeTab = ref('overview');
const isLoading = ref(true);

// Initialize
onMounted(async () => {
  try {
    await trustStore.initialize();
    await Promise.all([
      trustStore.fetchSessions(),
      trustStore.fetchDevices(),
      trustStore.fetchRecentEvents(),
    ]);
  } catch (error) {
    console.error('Failed to load security data:', error);
  } finally {
    isLoading.value = false;
  }
});

// Tab items
const tabItems = [
  {
    key: 'overview',
    label: 'Overview',
    icon: SafetyCertificateOutlined,
  },
  {
    key: 'sessions',
    label: 'Active Sessions',
    icon: SecurityScanOutlined,
  },
  {
    key: 'devices',
    label: 'Known Devices',
    icon: LaptopOutlined,
  },
  {
    key: 'events',
    label: 'Security Events',
    icon: HistoryOutlined,
  },
];
</script>

<template>
  <div class="security-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <Space align="center">
        <SafetyCertificateOutlined class="header-icon" />
        <div>
          <Title :level="3" style="margin: 0">Security Dashboard</Title>
          <Text type="secondary">
            Manage your security settings and monitor activity
          </Text>
        </div>
      </Space>
    </div>

    <Spin :spinning="isLoading">
      <!-- Trust Level Card -->
      <Card class="trust-card" :bordered="false">
        <TrustLevelIndicator
          :level="trustStore.currentTrustLevel"
          :score="trustStore.trustScore"
          :risk-score="trustStore.riskScore"
        />
      </Card>

      <!-- Tabs -->
      <Card :bordered="false" class="content-card">
        <Tabs v-model:activeKey="activeTab">
          <template v-for="tab in tabItems" :key="tab.key">
            <Tabs.TabPane>
              <template #tab>
                <Space>
                  <component :is="tab.icon" />
                  {{ tab.label }}
                </Space>
              </template>
            </Tabs.TabPane>
          </template>
        </Tabs>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Overview -->
          <template v-if="activeTab === 'overview'">
            <Row :gutter="[16, 16]">
              <Col :xs="24" :md="12">
                <Card title="Active Sessions" size="small">
                  <div class="stat-value">
                    {{ trustStore.sessions.length }}
                  </div>
                  <Text type="secondary">
                    Including current session
                  </Text>
                </Card>
              </Col>
              <Col :xs="24" :md="12">
                <Card title="Known Devices" size="small">
                  <div class="stat-value">
                    {{ trustStore.devices.length }}
                  </div>
                  <Text type="secondary">
                    {{ trustStore.trustedDevices.length }} trusted
                  </Text>
                </Card>
              </Col>
              <Col :xs="24">
                <Card title="Recent Security Events" size="small">
                  <SecurityEventsTimeline
                    :events="trustStore.recentEvents.slice(0, 5)"
                    :compact="true"
                  />
                  <Empty
                    v-if="trustStore.recentEvents.length === 0"
                    description="No recent security events"
                  />
                </Card>
              </Col>
            </Row>
          </template>

          <!-- Sessions -->
          <template v-else-if="activeTab === 'sessions'">
            <ActiveSessionsList
              :sessions="trustStore.sessions"
              :loading="trustStore.isLoading"
              @terminate="trustStore.terminateSession"
              @terminate-all="trustStore.terminateAllOtherSessions"
            />
          </template>

          <!-- Devices -->
          <template v-else-if="activeTab === 'devices'">
            <KnownDevicesList
              :devices="trustStore.devices"
              :loading="trustStore.isLoading"
              @trust="trustStore.trustDevice"
              @block="trustStore.blockDevice"
              @delete="trustStore.deleteDevice"
            />
          </template>

          <!-- Events -->
          <template v-else-if="activeTab === 'events'">
            <SecurityEventsTimeline
              :events="trustStore.recentEvents"
              :loading="trustStore.isLoading"
            />
          </template>
        </div>
      </Card>
    </Spin>
  </div>
</template>

<style scoped>
.security-dashboard {
  padding: 24px;
}

.dashboard-header {
  margin-bottom: 24px;
}

.header-icon {
  font-size: 32px;
  color: #1890ff;
}

.trust-card {
  margin-bottom: 24px;
}

.content-card {
  min-height: 400px;
}

.tab-content {
  padding-top: 16px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 4px;
}
</style>
