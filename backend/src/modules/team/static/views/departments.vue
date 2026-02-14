<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import { Building, RefreshCw, Users, Mail, Crown } from 'lucide-vue-next';
import { getDepartments, getTeamMembers, type TeamMember } from '@modules/team/static/api/index';

defineOptions({ name: 'TeamDepartmentsView' });

const loading = ref(false);
const departments = ref<string[]>([]);
const allMembers = ref<TeamMember[]>([]);
const selectedDept = ref<string | null>(null);

async function loadData() {
  loading.value = true;
  try {
    const [deptRes, membersRes] = await Promise.allSettled([getDepartments(), getTeamMembers({ limit: 500 })]);
    if (deptRes.status === 'fulfilled') {
      departments.value = Array.isArray(deptRes.value) ? deptRes.value : (deptRes.value as any)?.data || [];
    }
    if (membersRes.status === 'fulfilled') {
      const m = membersRes.value;
      allMembers.value = Array.isArray(m) ? m : (m as any)?.data || (m as any)?.items || [];
    }
    if (departments.value.length && !selectedDept.value) {
      selectedDept.value = departments.value[0];
    }
  } catch { departments.value = []; allMembers.value = []; }
  finally { loading.value = false; }
}

const deptMembers = computed(() => {
  if (!selectedDept.value) return [];
  return allMembers.value.filter(m => m.department === selectedDept.value && m.is_active);
});

const deptStats = computed(() => {
  return departments.value.map(dept => ({
    name: dept,
    count: allMembers.value.filter(m => m.department === dept && m.is_active).length,
    leaders: allMembers.value.filter(m => m.department === dept && m.is_leader && m.is_active).length,
  }));
});

function getInitials(member: TeamMember): string {
  return `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();
}

onMounted(() => { loadData(); });
</script>

<template>
  <div class="departments-page p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><Building :size="24" /> Departments</h1>
        <p class="text-gray-500 m-0">Team members organized by department</p>
      </div>
      <a-button @click="loadData" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>Refresh
      </a-button>
    </div>

    <a-row :gutter="16">
      <!-- Department List -->
      <a-col :xs="24" :md="8" :lg="6">
        <a-card title="Departments" size="small" :loading="loading">
          <div class="space-y-1">
            <div
              v-for="stat in deptStats" :key="stat.name"
              class="flex items-center justify-between p-2 rounded cursor-pointer transition-colors"
              :class="selectedDept === stat.name ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'"
              @click="selectedDept = stat.name"
            >
              <div class="flex items-center gap-2">
                <Building :size="14" :class="selectedDept === stat.name ? 'text-blue-500' : 'text-gray-400'" />
                <span class="text-sm font-medium">{{ stat.name }}</span>
              </div>
              <div class="flex items-center gap-1">
                <a-badge :count="stat.count" :number-style="{ backgroundColor: selectedDept === stat.name ? '#1890ff' : '#d9d9d9' }" />
              </div>
            </div>
          </div>
          <a-empty v-if="!departments.length && !loading" description="No departments" :image-style="{ height: '40px' }" />
        </a-card>
      </a-col>

      <!-- Members for Selected Department -->
      <a-col :xs="24" :md="16" :lg="18">
        <a-card :title="selectedDept ? `${selectedDept} (${deptMembers.length})` : 'Select a department'" size="small">
          <a-table
            v-if="selectedDept"
            :data-source="deptMembers"
            :loading="loading"
            row-key="id"
            size="middle"
            :pagination="{ pageSize: 15 }"
            :columns="[
              { title: 'Name', key: 'name' },
              { title: 'Position', dataIndex: 'position', key: 'position', width: 180 },
              { title: 'Email', dataIndex: 'email', key: 'email', width: 220, ellipsis: true },
              { title: 'Leader', key: 'leader', width: 80 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="flex items-center gap-2">
                  <a-avatar v-if="record.photo" :src="record.photo" :size="28" />
                  <a-avatar v-else :size="28" style="font-size: 11px">{{ getInitials(record) }}</a-avatar>
                  <span class="font-medium">{{ record.first_name }} {{ record.last_name }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'leader'">
                <Crown v-if="record.is_leader" :size="16" class="text-yellow-500" />
                <span v-else class="text-gray-300">-</span>
              </template>
            </template>
          </a-table>
          <a-empty v-else description="Click a department to view members" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.departments-page { min-height: 100%; }
</style>
