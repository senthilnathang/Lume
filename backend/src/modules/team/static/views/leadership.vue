<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Crown, RefreshCw, Mail, Phone, Building } from 'lucide-vue-next';
import { getLeaders, type TeamMember } from '@modules/team/static/api/index';

defineOptions({ name: 'TeamLeadershipView' });

const loading = ref(false);
const leaders = ref<TeamMember[]>([]);

async function loadLeaders() {
  loading.value = true;
  try {
    const res = await getLeaders();
    leaders.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { leaders.value = []; }
  finally { loading.value = false; }
}

function getInitials(member: TeamMember): string {
  return `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#1890ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2'];
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

onMounted(() => { loadLeaders(); });
</script>

<template>
  <div class="leadership-page p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><Crown :size="24" /> Leadership Team</h1>
        <p class="text-gray-500 m-0">Team members in leadership positions</p>
      </div>
      <a-button @click="loadLeaders" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>Refresh
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-row v-if="leaders.length" :gutter="[16, 16]">
        <a-col v-for="leader in leaders" :key="leader.id" :xs="24" :sm="12" :lg="8" :xl="6">
          <a-card hoverable class="text-center">
            <div class="mb-3">
              <a-avatar v-if="leader.photo" :src="leader.photo" :size="80" />
              <a-avatar v-else :size="80" :style="{ backgroundColor: getAvatarColor(leader.first_name + leader.last_name), fontSize: '24px' }">
                {{ getInitials(leader) }}
              </a-avatar>
            </div>
            <div class="mb-1">
              <Crown :size="14" class="text-yellow-500 inline mr-1" style="vertical-align: -2px" />
              <span class="font-semibold">{{ leader.first_name }} {{ leader.last_name }}</span>
            </div>
            <div v-if="leader.position" class="text-sm text-blue-500 mb-2">{{ leader.position }}</div>
            <div v-if="leader.department" class="text-xs text-gray-400 mb-3 flex items-center justify-center gap-1">
              <Building :size="12" /> {{ leader.department }}
            </div>
            <div class="flex justify-center gap-3 text-gray-400">
              <a-tooltip v-if="leader.email" :title="leader.email">
                <Mail :size="16" class="cursor-pointer hover:text-blue-500" />
              </a-tooltip>
              <a-tooltip v-if="leader.phone" :title="leader.phone">
                <Phone :size="16" class="cursor-pointer hover:text-green-500" />
              </a-tooltip>
            </div>
            <div v-if="leader.bio" class="mt-3 text-xs text-gray-400 text-left line-clamp-3">{{ leader.bio }}</div>
          </a-card>
        </a-col>
      </a-row>
      <a-empty v-else-if="!loading" description="No leaders found" />
    </a-spin>
  </div>
</template>

<style scoped>
.leadership-page { min-height: 100%; }
.line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
</style>
