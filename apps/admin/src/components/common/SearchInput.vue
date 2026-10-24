<template>
  <div class="lume-search-input" :class="{ focused, 'has-value': modelValue }">
    <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    
    <input
      ref="inputRef"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keyup.enter="handleEnter"
      @keyup.escape="handleEscape"
    />
    
    <button v-if="allowClear && modelValue" class="clear-btn" @click="handleClear">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
    
    <span v-if="prefix" class="input-prefix">{{ prefix }}</span>
    <span v-if="suffix" class="input-suffix">{{ suffix }}</span>
    
    <kbd v-if="shortcut" class="input-shortcut">{{ shortcut }}</kbd>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: string | number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  maxlength?: number;
  prefix?: string;
  suffix?: string;
  shortcut?: string;
}>(), {
  type: 'text',
  disabled: false,
  allowClear: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  'search': [value: string | number];
  'clear': [];
  'enter': [value: string | number];
  'escape': [];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const focused = ref(false);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

const handleFocus = () => {
  focused.value = true;
};

const handleBlur = () => {
  focused.value = false;
};

const handleEnter = () => {
  emit('enter', props.modelValue);
  emit('search', props.modelValue);
};

const handleEscape = () => {
  emit('escape');
};

const handleClear = () => {
  emit('update:modelValue', '');
  emit('clear');
};

const focus = () => {
  inputRef.value?.focus();
};

const blur = () => {
  inputRef.value?.blur();
};

defineExpose({
  focus,
  blur,
});
</script>

<style scoped>
.lume-search-input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  transition: all 0.2s;
}

.lume-search-input:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.lume-search-input.has-value {
  border-color: #4f46e5;
}

.lume-search-input.disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.search-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.lume-search-input input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #111827;
  background: transparent;
}

.lume-search-input input::placeholder {
  color: #9ca3af;
}

.lume-search-input input:disabled {
  cursor: not-allowed;
  color: #9ca3af;
}

.clear-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #d1d5db;
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
}

.clear-btn:hover {
  background: #9ca3af;
}

.input-prefix,
.input-suffix {
  font-size: 14px;
  color: #6b7280;
}

.input-shortcut {
  padding: 2px 6px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  color: #9ca3af;
}
</style>
