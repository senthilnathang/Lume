<script setup lang="ts">
import { markRaw, computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

const props = defineProps<{
  name: string
}>()

// Convert "lucide:calendar" → "Calendar"
const getComponentName = (iconName: string) => {
  const cleaned = iconName.replace(/^lucide:/, '')
  return cleaned
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

const IconComponent = computed(() => {
  const componentName = getComponentName(props.name)
  // @ts-ignore - lucide-vue-next has dynamic exports
  const Icon = LucideIcons[componentName]

  if (!Icon) {
    // Fallback to Circle icon if not found
    return markRaw(LucideIcons.Circle)
  }

  return markRaw(Icon)
})
</script>

<template>
  <component :is="IconComponent" />
</template>
