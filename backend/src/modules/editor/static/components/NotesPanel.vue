<template>
  <div class="notes-panel">
    <!-- Panel header -->
    <div class="notes-header">
      <div class="notes-header-title">
        <MessageCircle :size="16" />
        <span>Notes</span>
        <span v-if="unresolvedCount > 0" class="notes-badge">{{ unresolvedCount }}</span>
      </div>
      <a-button size="small" type="text" @click="showAddForm = !showAddForm">
        <template #icon><Plus :size="14" /></template>
      </a-button>
    </div>

    <!-- Add note form -->
    <div v-if="showAddForm" class="add-note-form">
      <a-textarea
        v-model:value="newNoteContent"
        placeholder="Add a note..."
        :rows="3"
        :auto-size="{ minRows: 2, maxRows: 5 }"
      />
      <div class="add-note-actions">
        <a-button size="small" @click="cancelAdd">Cancel</a-button>
        <a-button size="small" type="primary" :loading="submitting" @click="submitNote">
          Add Note
        </a-button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="notes-loading">
      <a-spin size="small" />
    </div>

    <!-- Notes list -->
    <div v-else class="notes-list">
      <div v-if="rootNotes.length === 0" class="notes-empty">
        No notes yet
      </div>

      <div
        v-for="note in rootNotes"
        :key="note.id"
        class="note-item"
        :class="{ 'note-resolved': note.isResolved }"
      >
        <!-- Note header -->
        <div class="note-item-header">
          <a-avatar :size="24" class="note-avatar">
            {{ getAuthorInitial(note.authorId) }}
          </a-avatar>
          <span class="note-meta">
            <span class="note-author">Author #{{ note.authorId }}</span>
            <span class="note-time">{{ formatTime(note.createdAt) }}</span>
          </span>
          <div v-if="note.isResolved" class="note-resolved-badge">
            <Check :size="11" />
            Resolved
          </div>
        </div>

        <!-- Note content -->
        <div class="note-content" :class="{ 'note-content-resolved': note.isResolved }">
          {{ note.content }}
        </div>

        <!-- Note actions -->
        <div v-if="!note.isResolved" class="note-actions">
          <button class="note-action-btn" @click="toggleReply(note.id)">
            <Reply :size="12" />
            Reply
          </button>
          <button class="note-action-btn note-action-resolve" @click="resolveNote(note)">
            <Check :size="12" />
            Resolve
          </button>
        </div>

        <!-- Reply form -->
        <div v-if="replyingTo === note.id" class="reply-form">
          <a-textarea
            v-model:value="replyContent"
            placeholder="Write a reply..."
            :rows="2"
          />
          <div class="add-note-actions">
            <a-button size="small" @click="cancelReply">Cancel</a-button>
            <a-button size="small" type="primary" :loading="replying" @click="submitReply(note.id)">
              Reply
            </a-button>
          </div>
        </div>

        <!-- Replies -->
        <div v-if="getReplies(note.id).length > 0" class="note-replies">
          <div
            v-for="reply in getReplies(note.id)"
            :key="reply.id"
            class="note-reply"
            :class="{ 'note-resolved': reply.isResolved }"
          >
            <div class="note-item-header">
              <a-avatar :size="20" class="note-avatar note-avatar-sm">
                {{ getAuthorInitial(reply.authorId) }}
              </a-avatar>
              <span class="note-meta">
                <span class="note-author">Author #{{ reply.authorId }}</span>
                <span class="note-time">{{ formatTime(reply.createdAt) }}</span>
              </span>
            </div>
            <div class="note-content note-reply-content">{{ reply.content }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { MessageCircle, Check, Reply, Plus } from 'lucide-vue-next';
import { get, post, put } from '@/api/request';

const props = defineProps<{
  pageId: number;
  currentUserId?: number;
}>();

const loading = ref(false);
const submitting = ref(false);
const replying = ref(false);
const notes = ref<any[]>([]);
const showAddForm = ref(false);
const newNoteContent = ref('');
const replyingTo = ref<number | null>(null);
const replyContent = ref('');

const rootNotes = computed(() => notes.value.filter((n) => !n.parentId));
const unresolvedCount = computed(() => rootNotes.value.filter((n) => !n.isResolved).length);

function getReplies(parentId: number) {
  return notes.value.filter((n) => n.parentId === parentId);
}

function getAuthorInitial(authorId: number): string {
  return `#${authorId}`.slice(-2);
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadNotes() {
  loading.value = true;
  try {
    const data = await get(`/editor/notes/${props.pageId}`);
    notes.value = Array.isArray(data) ? data : data?.data || [];
  } catch {
    notes.value = [];
  } finally {
    loading.value = false;
  }
}

async function submitNote() {
  if (!newNoteContent.value.trim()) return;
  submitting.value = true;
  try {
    await post('/editor/notes', {
      pageId: props.pageId,
      content: newNoteContent.value,
      authorId: props.currentUserId || 1,
    });
    newNoteContent.value = '';
    showAddForm.value = false;
    await loadNotes();
    message.success('Note added');
  } catch {
    message.error('Failed to add note');
  } finally {
    submitting.value = false;
  }
}

function cancelAdd() {
  showAddForm.value = false;
  newNoteContent.value = '';
}

function toggleReply(noteId: number) {
  replyingTo.value = replyingTo.value === noteId ? null : noteId;
  replyContent.value = '';
}

function cancelReply() {
  replyingTo.value = null;
  replyContent.value = '';
}

async function submitReply(parentId: number) {
  if (!replyContent.value.trim()) return;
  replying.value = true;
  try {
    await post(`/editor/notes/${parentId}/reply`, {
      content: replyContent.value,
      authorId: props.currentUserId || 1,
    });
    replyContent.value = '';
    replyingTo.value = null;
    await loadNotes();
    message.success('Reply added');
  } catch {
    message.error('Failed to add reply');
  } finally {
    replying.value = false;
  }
}

async function resolveNote(note: any) {
  try {
    await put(`/editor/notes/${note.id}/resolve`, {});
    await loadNotes();
    message.success('Note resolved');
  } catch {
    message.error('Failed to resolve note');
  }
}

onMounted(() => {
  if (props.pageId) {
    loadNotes();
  }
});
</script>

<style scoped>
.notes-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e5e7eb;
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.notes-header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.notes-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #f59e0b;
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
}

.add-note-form {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.notes-loading {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.notes-empty {
  padding: 20px 12px;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

.note-item {
  padding: 10px 12px;
  border-bottom: 1px solid #f5f5f5;
}

.note-item:last-child {
  border-bottom: none;
}

.note-resolved {
  opacity: 0.6;
}

.note-item-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.note-avatar {
  background: #4096ff;
  font-size: 10px;
  flex-shrink: 0;
}

.note-avatar-sm {
  background: #7c3aed;
}

.note-meta {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-width: 0;
}

.note-author {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.note-time {
  font-size: 10px;
  color: #9ca3af;
}

.note-resolved-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #10b981;
  font-weight: 600;
  background: #d1fae5;
  border-radius: 10px;
  padding: 1px 6px;
  flex-shrink: 0;
}

.note-content {
  font-size: 12px;
  color: #374151;
  line-height: 1.5;
  margin-bottom: 6px;
}

.note-content-resolved {
  color: #9ca3af;
  text-decoration: line-through;
}

.note-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.note-action-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.15s;
}

.note-action-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.note-action-resolve:hover {
  color: #10b981;
  background: #d1fae5;
}

.reply-form {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-replies {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid #e5e7eb;
}

.note-reply {
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
}

.note-reply:last-child {
  border-bottom: none;
}

.note-reply-content {
  font-size: 11px;
  margin-bottom: 0;
}
</style>
