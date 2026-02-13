<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import {
  Checkbox,
  Input,
  Modal,
  Spin,
} from 'ant-design-vue';
import { SearchOutlined } from '@ant-design/icons-vue';

import { getGroupsApi } from '#/api/core/rbac';
import { getRolesApi } from '#/api/roles';
import { getUsersApi } from '#/api/core/user';

interface EntityItem {
  id: number;
  label: string;
  sublabel: string;
}

const props = defineProps<{
  open: boolean;
  entityType: 'role' | 'group' | 'user';
  existingIds: number[];
  menuName: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  add: [entities: Array<{ id: number; name: string }>];
}>();

const loading = ref(false);
const searchText = ref('');
const allEntities = ref<EntityItem[]>([]);
const selectedIds = ref<number[]>([]);

const entityTypeLabel = computed(() => {
  const labels = { role: 'Roles', group: 'Groups', user: 'Users' };
  return labels[props.entityType];
});

const modalTitle = computed(
  () => `Add ${entityTypeLabel.value} to "${props.menuName}"`,
);

const availableEntities = computed(() =>
  allEntities.value.filter((e) => !props.existingIds.includes(e.id)),
);

const filteredEntities = computed(() => {
  if (!searchText.value) return availableEntities.value;
  const lower = searchText.value.toLowerCase();
  return availableEntities.value.filter(
    (e) =>
      e.label.toLowerCase().includes(lower) ||
      e.sublabel.toLowerCase().includes(lower),
  );
});

async function fetchEntities() {
  loading.value = true;
  try {
    if (props.entityType === 'role') {
      const res = await getRolesApi({ page: 1, page_size: 100 });
      allEntities.value = res.items.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: r.codename,
      }));
    } else if (props.entityType === 'group') {
      const res = await getGroupsApi({ page: 1, page_size: 100 });
      allEntities.value = res.items.map((g) => ({
        id: g.id,
        label: g.name,
        sublabel: g.codename,
      }));
    } else {
      const res = await getUsersApi({ page: 1, page_size: 100 });
      allEntities.value = res.items.map((u) => ({
        id: u.id,
        label: u.full_name || u.username,
        sublabel: u.email,
      }));
    }
  } catch {
    allEntities.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      searchText.value = '';
      selectedIds.value = [];
      fetchEntities();
    }
  },
);

function toggleSelection(id: number) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1);
  } else {
    selectedIds.value.push(id);
  }
}

function handleOk() {
  const selected = allEntities.value
    .filter((e) => selectedIds.value.includes(e.id))
    .map((e) => ({ id: e.id, name: e.label }));
  emit('add', selected);
  emit('update:open', false);
}

function handleCancel() {
  emit('update:open', false);
}
</script>

<template>
  <Modal
    :open="open"
    :title="modalTitle"
    :ok-text="`Add ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`"
    :ok-button-props="{ disabled: selectedIds.length === 0 }"
    width="500px"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="mb-3">
      <Input
        v-model:value="searchText"
        placeholder="Search..."
        allow-clear
      >
        <template #prefix>
          <SearchOutlined class="text-gray-400" />
        </template>
      </Input>
    </div>

    <Spin :spinning="loading">
      <div class="entity-list">
        <div
          v-if="filteredEntities.length === 0 && !loading"
          class="py-8 text-center text-gray-400"
        >
          {{ availableEntities.length === 0 ? `No ${entityTypeLabel.toLowerCase()} available to add` : 'No results found' }}
        </div>

        <div
          v-for="entity in filteredEntities"
          :key="entity.id"
          class="entity-item"
          @click="toggleSelection(entity.id)"
        >
          <Checkbox :checked="selectedIds.includes(entity.id)" />
          <div class="ml-2 flex-1">
            <div class="font-medium">{{ entity.label }}</div>
            <div class="text-xs text-gray-400">{{ entity.sublabel }}</div>
          </div>
        </div>
      </div>
    </Spin>
  </Modal>
</template>

<style scoped>
.entity-list {
  max-height: 350px;
  overflow-y: auto;
}

.entity-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.entity-item:hover {
  background-color: var(--ant-color-bg-text-hover, #f5f5f5);
}
</style>
