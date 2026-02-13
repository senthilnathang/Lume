<script setup lang="ts">
/**
 * Trust Level Indicator
 *
 * Visual display of current trust level and scores.
 */
import { computed } from 'vue';
import { Progress, Space, Typography, Tag, Tooltip } from 'ant-design-vue';
import {
  SafetyCertificateOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';

const { Text, Title } = Typography;

const props = defineProps<{
  level: string;
  score: number;
  riskScore: number;
}>();

// Trust level configuration
const levelConfig = {
  none: {
    color: '#ff4d4f',
    label: 'No Trust',
    description: 'Your session has minimal trust. Additional verification required.',
    icon: ExclamationCircleOutlined,
  },
  low: {
    color: '#fa8c16',
    label: 'Low Trust',
    description: 'Basic authentication completed. Some features may be restricted.',
    icon: WarningOutlined,
  },
  medium: {
    color: '#faad14',
    label: 'Medium Trust',
    description: 'Good security posture. Most features available.',
    icon: SafetyCertificateOutlined,
  },
  high: {
    color: '#52c41a',
    label: 'High Trust',
    description: 'Strong security posture. All features available.',
    icon: CheckCircleOutlined,
  },
  critical: {
    color: '#1890ff',
    label: 'Maximum Trust',
    description: 'Highest security level. Full access granted.',
    icon: SafetyCertificateOutlined,
  },
};

// Computed
const config = computed(() => levelConfig[props.level as keyof typeof levelConfig] || levelConfig.low);

const trustProgressColor = computed(() => {
  if (props.score >= 80) return '#52c41a';
  if (props.score >= 60) return '#faad14';
  if (props.score >= 40) return '#fa8c16';
  return '#ff4d4f';
});

const riskProgressColor = computed(() => {
  if (props.riskScore >= 70) return '#ff4d4f';
  if (props.riskScore >= 50) return '#fa8c16';
  if (props.riskScore >= 25) return '#faad14';
  return '#52c41a';
});

const riskLevel = computed(() => {
  if (props.riskScore >= 70) return { label: 'Critical', color: 'red' };
  if (props.riskScore >= 50) return { label: 'High', color: 'orange' };
  if (props.riskScore >= 25) return { label: 'Medium', color: 'gold' };
  return { label: 'Low', color: 'green' };
});
</script>

<template>
  <div class="trust-indicator">
    <div class="trust-header">
      <Space align="center">
        <div class="trust-icon" :style="{ backgroundColor: config.color }">
          <component :is="config.icon" class="icon" />
        </div>
        <div>
          <Title :level="4" style="margin: 0">{{ config.label }}</Title>
          <Text type="secondary">{{ config.description }}</Text>
        </div>
      </Space>
    </div>

    <div class="trust-scores">
      <div class="score-item">
        <div class="score-header">
          <Text strong>Trust Score</Text>
          <Tooltip title="Your overall trust score based on authentication, device, location, and behavior">
            <Text type="secondary" class="score-value">{{ score }}/100</Text>
          </Tooltip>
        </div>
        <Progress
          :percent="score"
          :strokeColor="trustProgressColor"
          :showInfo="false"
          :strokeWidth="8"
        />
      </div>

      <div class="score-item">
        <div class="score-header">
          <Text strong>Risk Score</Text>
          <Space>
            <Tag :color="riskLevel.color">{{ riskLevel.label }}</Tag>
            <Text type="secondary" class="score-value">{{ riskScore }}/100</Text>
          </Space>
        </div>
        <Progress
          :percent="riskScore"
          :strokeColor="riskProgressColor"
          :showInfo="false"
          :strokeWidth="8"
        />
      </div>
    </div>

    <div class="trust-factors">
      <Text type="secondary" class="factors-label">Trust Factors</Text>
      <Space wrap>
        <Tag color="blue">Password</Tag>
        <Tag v-if="score >= 60" color="green">MFA Enabled</Tag>
        <Tag v-if="score >= 50" color="cyan">Known Device</Tag>
        <Tag v-if="score >= 70" color="purple">Trusted Location</Tag>
      </Space>
    </div>
  </div>
</template>

<style scoped>
.trust-indicator {
  padding: 8px;
}

.trust-header {
  margin-bottom: 24px;
}

.trust-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trust-icon .icon {
  font-size: 24px;
  color: white;
}

.trust-scores {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.score-item {
  flex: 1;
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.score-value {
  font-size: 12px;
}

.trust-factors {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.factors-label {
  display: block;
  margin-bottom: 8px;
}

@media (max-width: 576px) {
  .trust-scores {
    flex-direction: column;
  }
}
</style>
