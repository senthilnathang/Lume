<script setup lang="ts">
import { ref } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  placeholder?: string;
  style?: string;
  buttonText?: string;
  showButton?: boolean;
}>(), {
  placeholder: 'Search...',
  style: 'default',
  buttonText: 'Search',
  showButton: true,
});

const query = ref('');

function onSubmit() {
  if (query.value.trim()) {
    window.location.href = `/search?q=${encodeURIComponent(query.value.trim())}`;
  }
}
</script>

<template>
  <form class="lume-search-form" :class="`lume-search--${style}`" @submit.prevent="onSubmit" role="search">
    <div class="lume-search-input-wrapper">
      <svg class="lume-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        v-model="query"
        type="search"
        class="lume-search-input"
        :placeholder="placeholder"
        aria-label="Search"
      />
    </div>
    <button v-if="showButton" type="submit" class="lume-search-btn">{{ buttonText }}</button>
  </form>
</template>

<style scoped>
.lume-search-form {
  display: flex;
  gap: 8px;
  max-width: 600px;
  width: 100%;
}
.lume-search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.lume-search-icon {
  position: absolute;
  left: 14px;
  color: #9ca3af;
  pointer-events: none;
}
.lume-search-input {
  width: 100%;
  padding: 10px 14px 10px 42px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  background: white;
}
.lume-search-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.1);
}

/* Rounded style */
.lume-search--rounded .lume-search-input { border-radius: 24px; }
.lume-search--rounded .lume-search-btn { border-radius: 24px; }

/* Minimal style */
.lume-search--minimal .lume-search-input {
  border: none;
  border-bottom: 2px solid #e5e7eb;
  border-radius: 0;
  padding-left: 36px;
}
.lume-search--minimal .lume-search-input:focus {
  border-bottom-color: #1677ff;
  box-shadow: none;
}

.lume-search-btn {
  padding: 10px 24px;
  background: #1677ff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.lume-search-btn:hover { background: #1262cc; }
</style>
