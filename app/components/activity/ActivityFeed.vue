<script setup lang="ts">
defineProps<{
  activities: Array<{
    id: number;
    action: string;
    entity_type: string;
    entity_name?: string;
    description?: string;
    user_name?: string;
    created_at: string;
    level?: string;
  }>;
  loading?: boolean;
}>();

function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function actionColor(action: string) {
  if (action.includes('create') || action.includes('add')) return 'bg-green-400';
  if (action.includes('update') || action.includes('edit')) return 'bg-blue-400';
  if (action.includes('delete') || action.includes('remove')) return 'bg-red-400';
  if (action.includes('login') || action.includes('auth')) return 'bg-purple-400';
  return 'bg-gray-400';
}
</script>

<template>
  <div class="space-y-0">
    <div v-if="loading" class="text-center text-gray-500 py-8">Loading activities...</div>
    <div v-else-if="activities.length === 0" class="text-center text-gray-400 py-8">No recent activity</div>
    <div v-else v-for="activity in activities" :key="activity.id"
      class="flex gap-3 py-3 border-b border-gray-50 last:border-0">
      <div class="flex-shrink-0 mt-1">
        <div class="w-2 h-2 rounded-full" :class="actionColor(activity.action)" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-gray-900">
          <span class="font-medium">{{ activity.user_name || 'System' }}</span>
          {{ activity.action }}
          <span v-if="activity.entity_name" class="font-medium">{{ activity.entity_name }}</span>
        </p>
        <p v-if="activity.description" class="text-xs text-gray-500 mt-0.5 truncate">
          {{ activity.description }}
        </p>
      </div>
      <span class="text-xs text-gray-400 flex-shrink-0">{{ formatTime(activity.created_at) }}</span>
    </div>
  </div>
</template>
