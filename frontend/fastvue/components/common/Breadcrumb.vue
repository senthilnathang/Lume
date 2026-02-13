<script setup lang="ts">
/**
 * Breadcrumb Navigation Component
 *
 * Automatically generates breadcrumbs from current route.
 *
 * Usage:
 * ```vue
 * <Breadcrumb />
 * <Breadcrumb :custom-items="[{ title: 'Custom', path: '/custom' }]" />
 * ```
 */

import { computed } from 'vue';
import { useRoute, useRouter, type RouteLocationMatched } from 'vue-router';
import { HomeOutlined, RightOutlined } from '@ant-design/icons-vue';

interface BreadcrumbItem {
  title: string;
  path?: string;
  icon?: string;
}

interface Props {
  customItems?: BreadcrumbItem[];
  showHome?: boolean;
  separator?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showHome: true,
});

const route = useRoute();
const router = useRouter();

// Generate breadcrumbs from route
const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  if (props.customItems?.length) {
    return props.customItems;
  }

  const items: BreadcrumbItem[] = [];

  // Add home if enabled
  if (props.showHome) {
    items.push({
      title: 'Home',
      path: '/dashboard',
      icon: 'home',
    });
  }

  // Process matched routes
  route.matched.forEach((matched: RouteLocationMatched, index: number) => {
    const meta = matched.meta || {};
    const title = (meta.title as string) || matched.name?.toString() || '';

    // Skip if no title or if hidden
    if (!title || meta.hideInBreadcrumb) {
      return;
    }

    // Skip home route if already added
    if (matched.path === '/dashboard' && props.showHome) {
      return;
    }

    // Determine if this is the last item (current page)
    const isLast = index === route.matched.length - 1;

    items.push({
      title,
      path: isLast ? undefined : matched.path,
      icon: meta.icon as string | undefined,
    });
  });

  return items;
});

// Navigate to breadcrumb
function navigateTo(item: BreadcrumbItem): void {
  if (item.path) {
    router.push(item.path);
  }
}
</script>

<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      <li
        v-for="(item, index) in breadcrumbs"
        :key="index"
        class="breadcrumb-item"
      >
        <!-- Separator -->
        <span v-if="index > 0" class="breadcrumb-separator">
          <slot name="separator">
            <RightOutlined v-if="!separator" class="separator-icon" />
            <span v-else>{{ separator }}</span>
          </slot>
        </span>

        <!-- Item -->
        <component
          :is="item.path ? 'a' : 'span'"
          :href="item.path"
          :class="[
            'breadcrumb-link',
            { 'is-current': !item.path, 'is-clickable': !!item.path },
          ]"
          :aria-current="!item.path ? 'page' : undefined"
          @click.prevent="navigateTo(item)"
        >
          <HomeOutlined v-if="item.icon === 'home'" class="breadcrumb-icon" />
          <span>{{ item.title }}</span>
        </component>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb {
  font-size: 14px;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 4px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-separator {
  display: flex;
  align-items: center;
  color: #9ca3af;
  margin: 0 4px;
}

.separator-icon {
  font-size: 10px;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-link.is-clickable {
  cursor: pointer;
}

.breadcrumb-link.is-clickable:hover {
  color: #3b82f6;
}

.breadcrumb-link.is-current {
  color: #1f2937;
  font-weight: 500;
  cursor: default;
}

.breadcrumb-icon {
  font-size: 14px;
}
</style>
