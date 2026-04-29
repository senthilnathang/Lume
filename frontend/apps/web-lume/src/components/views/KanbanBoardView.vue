<template>
  <div class="kanban-view">
    <div class="kanban-board">
      <div
        v-for="column in columns"
        :key="column.id"
        class="kanban-column"
        @drop="handleDrop($event, column.id)"
        @dragover.prevent
        @dragenter.prevent
      >
        <div class="column-header">
          <h3>{{ column.title }}</h3>
          <span class="card-count">{{ getColumnCards(column.id).length }}</span>
        </div>
        <div class="cards-container">
          <div
            v-for="card in getColumnCards(column.id)"
            :key="card.id"
            class="kanban-card"
            draggable="true"
            @dragstart="handleDragStart($event, card)"
            @click="selectCard(card)"
          >
            <div class="card-title">{{ card.title }}</div>
            <div class="card-body">{{ card.body }}</div>
            <div class="card-footer">
              <span class="card-label">{{ card.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  viewDefinition: any;
  entityId: number;
}>();

const emit = defineEmits<{
  'record-selected': [record: any];
  'record-updated': [record: any];
}>();

const columns = ref([
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
]);

const cards = ref([
  {
    id: 1,
    columnId: 'todo',
    title: 'Card 1',
    body: 'This is the first card',
    label: 'Feature',
  },
  {
    id: 2,
    columnId: 'todo',
    title: 'Card 2',
    body: 'This is the second card',
    label: 'Bug',
  },
  {
    id: 3,
    columnId: 'in-progress',
    title: 'Card 3',
    body: 'This card is in progress',
    label: 'Feature',
  },
  {
    id: 4,
    columnId: 'done',
    title: 'Card 4',
    body: 'This card is done',
    label: 'Feature',
  },
]);

let draggedCard: any = null;

const getColumnCards = (columnId: string) => {
  return cards.value.filter(c => c.columnId === columnId);
};

const handleDragStart = (event: DragEvent, card: any) => {
  draggedCard = card;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

const handleDrop = (event: DragEvent, columnId: string) => {
  event.preventDefault();
  if (draggedCard) {
    draggedCard.columnId = columnId;
    emit('record-updated', draggedCard);
    draggedCard = null;
  }
};

const selectCard = (card: any) => {
  emit('record-selected', card);
};
</script>

<style scoped>
.kanban-view {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
  overflow-x: auto;
}

.kanban-board {
  display: flex;
  gap: 20px;
  min-width: 100%;
}

.kanban-column {
  flex: 0 0 300px;
  background: white;
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
}

.column-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.card-count {
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  color: #666;
}

.cards-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 400px;
}

.kanban-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 12px;
  cursor: move;
  transition: all 0.2s;
  user-select: none;
}

.kanban-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
  font-size: 13px;
}

.card-body {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: space-between;
}

.card-label {
  display: inline-block;
  padding: 2px 8px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}
</style>
