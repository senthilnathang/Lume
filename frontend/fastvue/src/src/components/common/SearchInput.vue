<script lang="ts" setup>
import { computed, ref, watch, useSlots } from 'vue';
import { Button, Input, Space } from 'ant-design-vue';
import { LoadingOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue';

defineOptions({
  name: 'SearchInput',
});

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    width?: number | string;
    showSearchButton?: boolean;
    showRefreshButton?: boolean;
    debounce?: number;
    loading?: boolean;
    size?: 'small' | 'middle' | 'large';
    searchButtonText?: string;
  }>(),
  {
    modelValue: '',
    placeholder: 'Search...',
    width: 250,
    showSearchButton: true,
    showRefreshButton: true,
    debounce: 0,
    loading: false,
    size: 'middle',
    searchButtonText: 'Search',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'search', value: string): void;
  (e: 'refresh'): void;
  (e: 'clear'): void;
}>();

const slots = useSlots();
const localValue = ref(props.modelValue);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.modelValue,
  (newValue) => {
    localValue.value = newValue;
  }
);

const inputStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}));

const hasCustomPrefix = computed(() => !!slots.prefix);

function handleInput(value: string) {
  localValue.value = value;
  emit('update:modelValue', value);

  if (props.debounce > 0) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      emit('search', value);
    }, props.debounce);
  }
}

function handleSearch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  emit('search', localValue.value);
}

function handleRefresh() {
  emit('refresh');
}

function handleClear() {
  localValue.value = '';
  emit('update:modelValue', '');
  emit('clear');
}
</script>

<template>
  <Space>
    <Input
      :value="localValue"
      :placeholder="placeholder"
      :style="inputStyle"
      :size="size"
      :disabled="loading"
      allow-clear
      @update:value="handleInput"
      @press-enter="handleSearch"
      @clear="handleClear"
    >
      <template #prefix>
        <LoadingOutlined v-if="loading" spin />
        <slot v-else-if="hasCustomPrefix" name="prefix" />
        <SearchOutlined v-else />
      </template>
    </Input>
    <Button v-if="showSearchButton" :size="size" :loading="loading" @click="handleSearch">
      <template v-if="!loading" #icon>
        <SearchOutlined />
      </template>
      {{ searchButtonText }}
    </Button>
    <Button v-if="showRefreshButton" :size="size" :loading="loading" @click="handleRefresh">
      <template v-if="!loading" #icon>
        <ReloadOutlined />
      </template>
    </Button>
  </Space>
</template>
