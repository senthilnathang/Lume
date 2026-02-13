<script lang="ts" setup>
import { Card, Statistic } from 'ant-design-vue';

defineOptions({
  name: 'StatisticCard',
});

const props = withDefaults(
  defineProps<{
    title: string;
    value: number | string;
    color?: string;
    prefix?: string;
    suffix?: string;
    precision?: number;
  }>(),
  {
    color: '#1890ff',
    precision: 0,
  }
);
</script>

<template>
  <Card>
    <Statistic
      :title="title"
      :value="value"
      :value-style="{ color }"
      :precision="precision"
      :prefix="prefix"
      :suffix="suffix"
    >
      <template v-if="$slots.prefix" #prefix>
        <slot name="prefix" />
      </template>
      <template v-if="$slots.suffix" #suffix>
        <slot name="suffix" />
      </template>
    </Statistic>
  </Card>
</template>
