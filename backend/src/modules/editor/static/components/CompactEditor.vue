<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import LinkExt from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import UnderlineExt from '@tiptap/extension-underline';
import EditorToolbar from './EditorToolbar.vue';

const props = withDefaults(defineProps<{
  modelValue?: string;
  placeholder?: string;
  minHeight?: string;
}>(), {
  modelValue: '',
  placeholder: 'Start writing...',
  minHeight: '150px',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({ heading: false, codeBlock: false }),
    LinkExt.configure({ openOnClick: false, autolink: true }),
    Placeholder.configure({ placeholder: props.placeholder }),
    UnderlineExt,
  ],
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML());
  },
});

watch(() => props.modelValue, (newVal) => {
  if (!editor.value) return;
  const currentHtml = editor.value.getHTML();
  if (newVal !== currentHtml) {
    editor.value.commands.setContent(newVal || '', false);
  }
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div class="compact-editor border rounded-lg overflow-hidden">
    <EditorToolbar :editor="editor" :compact="true" />
    <div class="editor-content-wrapper overflow-auto" :style="{ minHeight }">
      <EditorContent :editor="editor" class="compact-prose" />
    </div>
  </div>
</template>

<style scoped>
.compact-editor {
  background: #fff;
}

.compact-prose :deep(.ProseMirror) {
  padding: 10px 14px;
  outline: none;
  min-height: v-bind(minHeight);
  font-size: 14px;
}

.compact-prose :deep(.ProseMirror p) {
  margin: 0.4em 0;
}

.compact-prose :deep(.ProseMirror ul),
.compact-prose :deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 0.4em 0;
}

.compact-prose :deep(.ProseMirror ul) {
  list-style-type: disc;
}

.compact-prose :deep(.ProseMirror ol) {
  list-style-type: decimal;
}

.compact-prose :deep(.ProseMirror blockquote) {
  border-left: 3px solid #d1d5db;
  padding-left: 1em;
  margin: 0.4em 0;
  color: #6b7280;
}

.compact-prose :deep(.ProseMirror a) {
  color: #1677ff;
  text-decoration: underline;
}

.compact-prose :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}
</style>
