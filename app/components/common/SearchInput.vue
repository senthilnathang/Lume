<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  debounce?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  search: [value: string];
}>();

let timeout: ReturnType<typeof setTimeout>;

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit('update:modelValue', value);

  clearTimeout(timeout);
  timeout = setTimeout(() => {
    emit('search', value);
  }, props.debounce ?? 300);
}

function handleClear() {
  emit('update:modelValue', '');
  emit('search', '');
}
</script>

<template>
  <div class="relative">
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      :value="modelValue"
      @input="handleInput"
      @keyup.enter="$emit('search', modelValue)"
      type="text"
      :placeholder="placeholder || 'Search...'"
      class="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500"
    />
    <button v-if="modelValue" @click="handleClear"
      class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
