<script lang="ts" setup>
/**
 * MentionInput Component
 *
 * A text input with @mention autocomplete support.
 * Uses Ant Design Vue Mentions component.
 */
import { ref, watch } from 'vue';

import { Mentions, Avatar, Spin } from 'ant-design-vue';
import { UserOutlined } from '@ant-design/icons-vue';

import { searchUsersForMentionApi, type MentionApi } from '#/api/core/mention';

// Props
interface Props {
  /** Text value (v-model) */
  modelValue: string;
  /** Placeholder text */
  placeholder?: string;
  /** Number of rows for textarea */
  rows?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Maximum length */
  maxLength?: number;
  /** Autofocus on mount */
  autoFocus?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type @ to mention someone...',
  rows: 3,
  disabled: false,
  maxLength: 5000,
  autoFocus: false,
});

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'mention', user: MentionApi.MentionSuggestion): void;
  (e: 'pressEnter', event: KeyboardEvent): void;
}>();

// State
const loading = ref(false);
const options = ref<MentionApi.MentionSuggestion[]>([]);
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

// Handle input change
function handleChange(value: string) {
  emit('update:modelValue', value);
}

// Handle mention search
async function handleSearch(search: string, prefix: string) {
  if (prefix !== '@') return;

  // Debounce search
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  if (!search || search.length < 1) {
    options.value = [];
    return;
  }

  searchTimeout.value = setTimeout(async () => {
    loading.value = true;
    try {
      const results = await searchUsersForMentionApi(search, 10);
      options.value = results;
    } catch (error) {
      console.error('Failed to search users:', error);
      options.value = [];
    } finally {
      loading.value = false;
    }
  }, 200);
}

// Handle mention selection
function handleSelect(option: { value: string; label: string }) {
  const user = options.value.find((u) => u.username === option.value);
  if (user) {
    emit('mention', user);
  }
}

// Handle Enter key
function handlePressEnter(event: KeyboardEvent) {
  // Only emit if not in mention dropdown
  if (!loading.value && options.value.length === 0) {
    emit('pressEnter', event);
  }
}

// Clear options when input is empty
watch(
  () => props.modelValue,
  (value) => {
    if (!value) {
      options.value = [];
    }
  },
);
</script>

<template>
  <Mentions
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    :auto-size="{ minRows: rows, maxRows: 10 }"
    :loading="loading"
    :auto-focus="autoFocus"
    split=" "
    @change="handleChange"
    @search="handleSearch"
    @select="(handleSelect as any)"
    @pressEnter="handlePressEnter"
  >
    <template #notFoundContent>
      <div class="mention-not-found">
        <Spin v-if="loading" size="small" />
        <span v-else>No users found</span>
      </div>
    </template>

    <Mentions.Option
      v-for="user in options"
      :key="user.id"
      :value="user.username"
    >
      <div class="mention-option">
        <Avatar :src="user.avatar_url ?? undefined" :size="24">
          <template #icon>
            <UserOutlined />
          </template>
        </Avatar>
        <div class="mention-option-info">
          <span class="mention-option-name">
            {{ user.full_name || user.username }}
          </span>
          <span v-if="user.full_name" class="mention-option-username">
            @{{ user.username }}
          </span>
        </div>
      </div>
    </Mentions.Option>
  </Mentions>
</template>

<style scoped>
.mention-not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: var(--ant-color-text-secondary);
}

.mention-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.mention-option-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.mention-option-name {
  font-weight: 500;
}

.mention-option-username {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}
</style>
