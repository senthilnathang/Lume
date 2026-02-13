<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { Input, Tag, Tree } from 'ant-design-vue';
import { SearchOutlined } from '@ant-design/icons-vue';

import type { MenuTreeNodeWithSummary } from '#/api/core/rbac';

const props = defineProps<{
  treeData: MenuTreeNodeWithSummary[];
  selectedMenuId: number | null;
}>();

const emit = defineEmits<{
  select: [menuItemId: number];
}>();

const searchText = ref('');

function flattenTree(
  nodes: MenuTreeNodeWithSummary[],
): Map<number, MenuTreeNodeWithSummary> {
  const map = new Map<number, MenuTreeNodeWithSummary>();
  const walk = (items: MenuTreeNodeWithSummary[]) => {
    for (const item of items) {
      map.set(item.id, item);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(nodes);
  return map;
}

function filterTree(
  nodes: MenuTreeNodeWithSummary[],
  text: string,
): MenuTreeNodeWithSummary[] {
  if (!text) return nodes;
  const lower = text.toLowerCase();

  const filter = (
    items: MenuTreeNodeWithSummary[],
  ): MenuTreeNodeWithSummary[] => {
    const result: MenuTreeNodeWithSummary[] = [];
    for (const item of items) {
      const childMatches = filter(item.children || []);
      if (
        item.name.toLowerCase().includes(lower) ||
        childMatches.length > 0
      ) {
        result.push({ ...item, children: childMatches.length > 0 ? childMatches : item.children || [] });
      }
    }
    return result;
  };

  return filter(nodes);
}

const filteredTree = computed(() =>
  filterTree(props.treeData, searchText.value),
);

const antTreeData = computed(() => {
  const convert = (node: MenuTreeNodeWithSummary): any => ({
    key: node.id,
    title: node.name,
    icon: node.icon,
    roleCount: node.role_count,
    groupCount: node.group_count,
    userCount: node.user_count,
    children: node.children?.map(convert) || [],
  });
  return filteredTree.value.map(convert);
});

const expandedKeys = ref<number[]>([]);

// Auto-expand all on data change
watch(
  () => props.treeData,
  () => {
    const allMap = flattenTree(props.treeData);
    expandedKeys.value = [...allMap.keys()];
  },
  { immediate: true },
);

const selectedKeys = computed(() =>
  props.selectedMenuId ? [props.selectedMenuId] : [],
);

function onSelect(keys: any[]) {
  if (keys.length > 0) {
    emit('select', keys[0] as number);
  }
}
</script>

<template>
  <div class="menu-tree-panel">
    <div class="mb-3">
      <Input
        v-model:value="searchText"
        placeholder="Search menus..."
        allow-clear
      >
        <template #prefix>
          <SearchOutlined class="text-gray-400" />
        </template>
      </Input>
    </div>

    <div class="tree-container">
      <Tree
        v-model:expandedKeys="expandedKeys"
        :tree-data="antTreeData"
        :selected-keys="selectedKeys"
        :selectable="true"
        block-node
        @select="onSelect"
      >
        <template #title="{ title, roleCount, groupCount, userCount }">
          <div class="flex items-center gap-1.5">
            <span class="flex-1 truncate">{{ title }}</span>
            <Tag
              v-if="roleCount > 0"
              color="blue"
              class="count-tag"
            >
              R:{{ roleCount }}
            </Tag>
            <Tag
              v-if="groupCount > 0"
              color="green"
              class="count-tag"
            >
              G:{{ groupCount }}
            </Tag>
            <Tag
              v-if="userCount > 0"
              color="orange"
              class="count-tag"
            >
              U:{{ userCount }}
            </Tag>
          </div>
        </template>
      </Tree>
    </div>
  </div>
</template>

<style scoped>
.menu-tree-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
}

.count-tag {
  margin: 0;
  padding: 0 4px;
  font-size: 11px;
  line-height: 18px;
  border-radius: 4px;
}

:deep(.ant-tree-title) {
  display: flex;
  align-items: center;
  width: 100%;
}
</style>
