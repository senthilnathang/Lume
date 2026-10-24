<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'

const route = useRoute()

// Update document title based on route
watch(
  () => route.meta.title,
  (title) => {
    if (title) {
      document.title = `${title} - Lume Admin`
    } else {
      document.title = 'Lume Admin'
    }
  },
  { immediate: true }
)
</script>

<template>
  <a-layout class="basic-layout">
    <AppSidebar />

    <a-layout class="main-layout">
      <AppHeader />

      <a-layout-content class="main-content">
        <div class="content-wrapper">
          <slot />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.basic-layout {
  min-height: 100vh;
}

.main-layout {
  flex: 1;
}

.main-content {
  background: #f5f7fa;
  min-height: calc(100vh - 64px);
  padding: 24px;
}

.content-wrapper {
  background: white;
  border-radius: 8px;
  padding: 24px;
  min-height: calc(100vh - 112px);
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }

  .content-wrapper {
    padding: 16px;
  }
}
</style>
