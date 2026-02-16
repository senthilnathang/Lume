<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import ImageExt from '@tiptap/extension-image';
import LinkExt from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import UnderlineExt from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Table as TableExt } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import EditorToolbar from './EditorToolbar.vue';

const props = withDefaults(defineProps<{
  modelValue?: string;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}>(), {
  modelValue: '',
  placeholder: 'Start writing...',
  minHeight: '300px',
  maxHeight: '600px',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isSourceView = ref(false);
const sourceContent = ref('');

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit,
    ImageExt.configure({ inline: false, allowBase64: true }),
    LinkExt.configure({ openOnClick: false, autolink: true }),
    Placeholder.configure({ placeholder: props.placeholder }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    UnderlineExt,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TableExt.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
  ],
  onUpdate: ({ editor: ed }) => {
    const html = ed.getHTML();
    emit('update:modelValue', html);
  },
});

// Sync external changes
watch(() => props.modelValue, (newVal) => {
  if (!editor.value) return;
  const currentHtml = editor.value.getHTML();
  if (newVal !== currentHtml) {
    editor.value.commands.setContent(newVal || '', false);
  }
});

function toggleSource() {
  if (!isSourceView.value) {
    sourceContent.value = editor.value?.getHTML() || '';
  } else {
    editor.value?.commands.setContent(sourceContent.value || '', false);
    emit('update:modelValue', sourceContent.value || '');
  }
  isSourceView.value = !isSourceView.value;
}

function onSourceInput(e: Event) {
  sourceContent.value = (e.target as HTMLTextAreaElement).value;
}

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div class="rich-editor border rounded-lg overflow-hidden">
    <EditorToolbar
      :editor="editor"
      :compact="false"
      :show-source-toggle="true"
      :is-source-view="isSourceView"
      @toggle-source="toggleSource"
    />

    <div v-show="!isSourceView" class="editor-content-wrapper overflow-auto" :style="{ minHeight, maxHeight }">
      <EditorContent :editor="editor" class="prose-editor" />
    </div>

    <div v-show="isSourceView" class="source-view">
      <textarea
        :value="sourceContent"
        class="w-full border-0 outline-none resize-none p-4"
        :style="{ minHeight, maxHeight, fontFamily: '\'SF Mono\', Monaco, Menlo, monospace', fontSize: '13px' }"
        @input="onSourceInput"
      />
    </div>
  </div>
</template>

<style scoped>
.rich-editor {
  background: #fff;
}

.prose-editor :deep(.ProseMirror) {
  padding: 16px 20px;
  outline: none;
  min-height: v-bind(minHeight);
}

.prose-editor :deep(.ProseMirror p) {
  margin: 0.5em 0;
}

.prose-editor :deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: 700;
  margin: 0.67em 0;
}

.prose-editor :deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0.75em 0;
}

.prose-editor :deep(.ProseMirror h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 0.75em 0;
}

.prose-editor :deep(.ProseMirror h4) {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0.75em 0;
}

.prose-editor :deep(.ProseMirror ul),
.prose-editor :deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.prose-editor :deep(.ProseMirror ul) {
  list-style-type: disc;
}

.prose-editor :deep(.ProseMirror ol) {
  list-style-type: decimal;
}

.prose-editor :deep(.ProseMirror blockquote) {
  border-left: 3px solid #d1d5db;
  padding-left: 1em;
  margin: 0.5em 0;
  color: #6b7280;
  font-style: italic;
}

.prose-editor :deep(.ProseMirror pre) {
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 6px;
  padding: 12px 16px;
  font-family: 'SF Mono', Monaco, Menlo, monospace;
  font-size: 13px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.prose-editor :deep(.ProseMirror code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

.prose-editor :deep(.ProseMirror pre code) {
  background: none;
  padding: 0;
}

.prose-editor :deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 0.5em 0;
}

.prose-editor :deep(.ProseMirror a) {
  color: #1677ff;
  text-decoration: underline;
  cursor: pointer;
}

.prose-editor :deep(.ProseMirror table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}

.prose-editor :deep(.ProseMirror th),
.prose-editor :deep(.ProseMirror td) {
  border: 1px solid #d1d5db;
  padding: 8px 12px;
  text-align: left;
}

.prose-editor :deep(.ProseMirror th) {
  background: #f9fafb;
  font-weight: 600;
}

.prose-editor :deep(.ProseMirror hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 1em 0;
}

.prose-editor :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

.prose-editor :deep(.ProseMirror mark) {
  border-radius: 2px;
  padding: 1px 2px;
}

.source-view textarea {
  background: #fafafa;
  line-height: 1.6;
}
</style>
