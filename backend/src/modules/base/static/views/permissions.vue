<template>
  <div class="permissions-page">
    <div class="page-header">
      <div>
        <h1>Permissions</h1>
        <p class="subtitle">View all available system permissions</p>
      </div>
    </div>

    <div class="filters">
      <a-input-search
        v-model:value="searchText"
        placeholder="Search permissions..."
        @search="handleSearch"
        style="width: 300px"
      />
    </div>

    <a-spin :spinning="loading">
      <div class="permissions-grid">
        <a-card
          v-for="perm in filteredPermissions"
          :key="perm.code"
          class="permission-card"
        >
          <div class="permission-header">
            <h3>{{ perm.code }}</h3>
            <a-tag color="blue">{{ perm.group }}</a-tag>
          </div>
          <p class="permission-desc">{{ perm.description }}</p>
        </a-card>
      </div>

      <a-empty v-if="filteredPermissions.length === 0" description="No permissions found" />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get } from '#/api/request'

const permissions = ref<any[]>([])
const loading = ref(false)
const searchText = ref('')

const filteredPermissions = computed(() => {
  const search = searchText.value.toLowerCase()
  return permissions.value.filter(p =>
    p.code.toLowerCase().includes(search) ||
    p.description.toLowerCase().includes(search) ||
    p.group.toLowerCase().includes(search)
  )
})

const fetchPermissions = async () => {
  loading.value = true
  try {
    const data = await get('/permissions')
    permissions.value = data || []
  } catch (err) {
    message.error('Failed to load permissions')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // Search is reactive through computed property
}

onMounted(() => {
  fetchPermissions()
})
</script>

<style scoped>
.permissions-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.filters {
  margin-bottom: 24px;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.permission-card {
  cursor: default;
}

.permission-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.permission-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.permission-desc {
  margin: 0;
  color: #666;
  font-size: 12px;
  line-height: 1.5;
}
</style>
