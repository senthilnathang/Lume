<template>
  <div class="lume-pagination">
    <div class="lume-pagination-info">
      <span>Showing</span>
      <span class="lume-pagination-range">{{ startItem }}-{{ endItem }}</span>
      <span>of</span>
      <span class="lume-pagination-total">{{ total }}</span>
    </div>

    <div class="lume-pagination-controls">
      <button
        class="lume-pagination-btn"
        :disabled="current === 1"
        @click="handlePageChange(1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="11 17 6 12 11 7"></polyline>
          <polyline points="18 17 13 12 18 7"></polyline>
        </svg>
      </button>
      <button
        class="lume-pagination-btn"
        :disabled="current === 1"
        @click="handlePageChange(current - 1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div class="lume-pagination-pages">
        <button
          v-for="page in visiblePages"
          :key="page"
          class="lume-pagination-page"
          :class="{ active: page === current, ellipsis: page === '...' }"
          :disabled="page === '...'"
          @click="handlePageChange(page)"
        >
          {{ page }}
        </button>
      </div>

      <button
        class="lume-pagination-btn"
        :disabled="current === totalPages"
        @click="handlePageChange(current + 1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
      <button
        class="lume-pagination-btn"
        :disabled="current === totalPages"
        @click="handlePageChange(totalPages)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="13 17 18 12 13 7"></polyline>
          <polyline points="6 17 11 12 6 7"></polyline>
        </svg>
      </button>

      <div v-if="showSizeChanger" class="lume-pagination-size">
        <select
          :value="pageSize"
          @change="handleSizeChange(($event.target as HTMLSelectElement).value)"
          class="lume-pagination-select"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">
            {{ size }} / page
          </option>
        </select>
      </div>

      <div v-if="showQuickJumper" class="lume-pagination-jumper">
        <span>Go to</span>
        <input
          type="number"
          :value="jumpPage"
          min="1"
          :max="totalPages"
          class="lume-pagination-input"
          @keyup.enter="handleJump"
          @input="handleJumpInput"
        />
        <span>page</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  pageSizeOptions?: string[];
}>(), {
  showSizeChanger: true,
  showQuickJumper: false,
  pageSizeOptions: () => ['10', '20', '50', '100'],
});

const emit = defineEmits<{
  'change': [page: number, pageSize: number];
  'show-size-change': [current: number, size: number];
}>();

const jumpPage = ref(1);

const totalPages = computed(() => {
  return Math.ceil(props.total / props.pageSize);
});

const startItem = computed(() => {
  if (props.total === 0) return 0;
  return (props.current - 1) * props.pageSize + 1;
});

const endItem = computed(() => {
  return Math.min(props.current * props.pageSize, props.total);
});

const visiblePages = computed(() => {
  const pages: (number | string)[] = [];
  const total = totalPages.value;
  const current = props.current;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);

    if (start > 2) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < total - 1) {
      pages.push('...');
    }

    pages.push(total);
  }

  return pages;
});

const handlePageChange = (page: number | string) => {
  if (typeof page === 'string') return;
  if (page < 1 || page > totalPages.value) return;
  if (page === props.current) return;
  emit('change', page, props.pageSize);
};

const handleSizeChange = (size: string) => {
  const newSize = parseInt(size, 10);
  const newTotalPages = Math.ceil(props.total / newSize);
  const newCurrent = Math.min(props.current, newTotalPages) || 1;
  emit('show-size-change', newCurrent, newSize);
  emit('change', newCurrent, newSize);
};

const handleJump = () => {
  const page = Math.min(Math.max(1, jumpPage.value), totalPages.value);
  handlePageChange(page);
  jumpPage.value = 1;
};

const handleJumpInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  jumpPage.value = parseInt(target.value, 10) || 1;
};

watch(() => props.current, (newCurrent) => {
  jumpPage.value = newCurrent;
});
</script>

<style scoped>
.lume-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 14px;
  color: #6b7280;
}

.lume-pagination-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.lume-pagination-range,
.lume-pagination-total {
  font-weight: 500;
  color: #111827;
}

.lume-pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lume-pagination-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.lume-pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.lume-pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lume-pagination-pages {
  display: flex;
  align-items: center;
  gap: 4px;
}

.lume-pagination-page {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.lume-pagination-page:hover:not(.active):not(.ellipsis) {
  background: #f3f4f6;
}

.lume-pagination-page.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
}

.lume-pagination-page.ellipsis {
  border: none;
  background: transparent;
  cursor: default;
}

.lume-pagination-size {
  margin-left: 8px;
}

.lume-pagination-select {
  padding: 6px 10px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.lume-pagination-jumper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.lume-pagination-input {
  width: 56px;
  padding: 6px 10px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  text-align: center;
}

.lume-pagination-input:focus {
  outline: none;
  border-color: #4f46e5;
}

@media (max-width: 768px) {
  .lume-pagination {
    flex-direction: column;
    gap: 12px;
  }

  .lume-pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
