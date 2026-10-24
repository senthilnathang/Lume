<script setup lang="ts">
import { computed } from 'vue'
import { Filter } from 'lucide-vue-next'

const props = defineProps<{
  modelValue?: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
}>()

const query = computed({
  get: () => props.modelValue || {},
  set: (val) => emit('update:modelValue', val),
})

function update(key: string, value: any) {
  emit('update:modelValue', { ...query.value, [key]: value })
}
</script>

<template>
  <div class="query-builder">
    <div class="query-builder-header">
      <Filter :size="14" />
      <span>Query Settings</span>
    </div>

    <a-form layout="vertical" size="small">
      <a-form-item label="Source">
        <a-select
          :value="query.source || 'all'"
          @update:value="(v: string) => update('source', v)"
          style="width: 100%"
        >
          <a-select-option value="all">All Types</a-select-option>
          <a-select-option value="page">Pages</a-select-option>
          <a-select-option value="post">Posts</a-select-option>
          <a-select-option value="blog">Blog</a-select-option>
          <a-select-option value="landing">Landing Pages</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="Order By">
        <a-select
          :value="query.orderBy || 'date'"
          @update:value="(v: string) => update('orderBy', v)"
          style="width: 100%"
        >
          <a-select-option value="date">Date</a-select-option>
          <a-select-option value="title">Title</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="Order Direction">
        <a-select
          :value="query.orderDir || 'desc'"
          @update:value="(v: string) => update('orderDir', v)"
          style="width: 100%"
        >
          <a-select-option value="desc">Descending</a-select-option>
          <a-select-option value="asc">Ascending</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="Limit (1–100)">
        <a-input-number
          :value="query.limit ?? 10"
          :min="1"
          :max="100"
          style="width: 100%"
          @update:value="(v: number) => update('limit', v)"
        />
      </a-form-item>

      <a-form-item label="Offset">
        <a-input-number
          :value="query.offset ?? 0"
          :min="0"
          style="width: 100%"
          @update:value="(v: number) => update('offset', v)"
        />
      </a-form-item>

      <a-form-item label="Date From">
        <a-date-picker
          :value="query.dateFrom || null"
          style="width: 100%"
          @update:value="(v: any) => update('dateFrom', v ? v.toISOString() : null)"
        />
      </a-form-item>

      <a-form-item label="Date To">
        <a-date-picker
          :value="query.dateTo || null"
          style="width: 100%"
          @update:value="(v: any) => update('dateTo', v ? v.toISOString() : null)"
        />
      </a-form-item>

      <a-form-item label="Include IDs (comma-separated)">
        <a-input
          :value="query.includeIds || ''"
          placeholder="e.g. 1,2,3"
          @update:value="(v: string) => update('includeIds', v)"
        />
      </a-form-item>

      <a-form-item label="Exclude IDs (comma-separated)">
        <a-input
          :value="query.excludeIds || ''"
          placeholder="e.g. 4,5,6"
          @update:value="(v: string) => update('excludeIds', v)"
        />
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped>
.query-builder {
  padding: 8px 0;
}
.query-builder-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #4f6ef7;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}
</style>
