<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, provide } from 'vue';
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
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import {
  SectionBlock, ColumnsBlock, ColumnBlock,
  ImageBlock, ButtonBlock, SpacerBlock,
  VideoBlock, CalloutBlock, HtmlBlock,
  SlashCommand,
} from '../extensions';
import EditorToolbar from './EditorToolbar.vue';
import BlockPalette from './BlockPalette.vue';
import BlockSettings from './BlockSettings.vue';
import {
  Monitor, Tablet, Smartphone, Eye, Code2, Undo2, Redo2,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Maximize2, Minimize2
} from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  modelValue?: string;
  placeholder?: string;
  minHeight?: string;
  showBlockPalette?: boolean;
  showSettingsPanel?: boolean;
}>(), {
  modelValue: '',
  placeholder: 'Start building your page...',
  minHeight: '500px',
  showBlockPalette: true,
  showSettingsPanel: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:blocks', value: any): void;
}>();

// UI State
const mode = ref<'visual' | 'text'>('visual');
const devicePreview = ref<'desktop' | 'tablet' | 'mobile'>('desktop');
const sourceContent = ref('');
const showPalette = ref(props.showBlockPalette);
const showSettings = ref(props.showSettingsPanel);
const isFullscreen = ref(false);

const canvasWidth = computed(() => {
  switch (devicePreview.value) {
    case 'tablet': return '768px';
    case 'mobile': return '375px';
    default: return '100%';
  }
});

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      dropcursor: false,
      gapcursor: false,
    }),
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
    Dropcursor.configure({ color: '#1677ff', width: 2 }),
    Gapcursor,
    // Block extensions
    SectionBlock,
    ColumnsBlock,
    ColumnBlock,
    ImageBlock,
    ButtonBlock,
    SpacerBlock,
    VideoBlock,
    CalloutBlock,
    HtmlBlock,
    // Slash command (type / to insert blocks)
    SlashCommand,
  ],
  onUpdate: ({ editor: ed }) => {
    const html = ed.getHTML();
    emit('update:modelValue', html);
    emit('update:blocks', ed.getJSON());
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

// Mode switching
function switchToVisual() {
  if (mode.value === 'text') {
    editor.value?.commands.setContent(sourceContent.value || '', false);
    emit('update:modelValue', sourceContent.value || '');
  }
  mode.value = 'visual';
}

function switchToText() {
  sourceContent.value = editor.value?.getHTML() || '';
  mode.value = 'text';
}

function onSourceInput(e: Event) {
  sourceContent.value = (e.target as HTMLTextAreaElement).value;
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

// Stats
const wordCount = computed(() => {
  if (!editor.value) return 0;
  const text = editor.value.state.doc.textContent;
  return text.split(/\s+/).filter(Boolean).length;
});

const blockCount = computed(() => {
  if (!editor.value) return 0;
  return editor.value.state.doc.childCount;
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div
    class="page-builder"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <!-- Top Toolbar -->
    <div class="builder-toolbar">
      <div class="toolbar-left">
        <!-- Visual / Text Toggle -->
        <div class="mode-toggle">
          <button
            :class="['mode-btn', { active: mode === 'visual' }]"
            @click="switchToVisual"
          >
            <Eye :size="14" />
            <span>Visual</span>
          </button>
          <button
            :class="['mode-btn', { active: mode === 'text' }]"
            @click="switchToText"
          >
            <Code2 :size="14" />
            <span>Text</span>
          </button>
        </div>

        <div class="toolbar-divider" />

        <!-- Panel Toggles -->
        <a-tooltip title="Toggle block palette">
          <button class="toolbar-btn" @click="showPalette = !showPalette">
            <PanelLeftOpen v-if="!showPalette" :size="16" />
            <PanelLeftClose v-else :size="16" />
          </button>
        </a-tooltip>
        <a-tooltip title="Toggle settings panel">
          <button class="toolbar-btn" @click="showSettings = !showSettings">
            <PanelRightOpen v-if="!showSettings" :size="16" />
            <PanelRightClose v-else :size="16" />
          </button>
        </a-tooltip>
      </div>

      <div class="toolbar-center">
        <!-- Device Preview -->
        <div class="device-preview">
          <a-tooltip title="Desktop">
            <button
              :class="['device-btn', { active: devicePreview === 'desktop' }]"
              @click="devicePreview = 'desktop'"
            >
              <Monitor :size="16" />
            </button>
          </a-tooltip>
          <a-tooltip title="Tablet">
            <button
              :class="['device-btn', { active: devicePreview === 'tablet' }]"
              @click="devicePreview = 'tablet'"
            >
              <Tablet :size="16" />
            </button>
          </a-tooltip>
          <a-tooltip title="Mobile">
            <button
              :class="['device-btn', { active: devicePreview === 'mobile' }]"
              @click="devicePreview = 'mobile'"
            >
              <Smartphone :size="16" />
            </button>
          </a-tooltip>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- Undo/Redo -->
        <a-tooltip title="Undo">
          <button class="toolbar-btn" :disabled="!editor?.can().undo()" @click="editor?.chain().focus().undo().run()">
            <Undo2 :size="16" />
          </button>
        </a-tooltip>
        <a-tooltip title="Redo">
          <button class="toolbar-btn" :disabled="!editor?.can().redo()" @click="editor?.chain().focus().redo().run()">
            <Redo2 :size="16" />
          </button>
        </a-tooltip>
        <div class="toolbar-divider" />
        <a-tooltip :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'">
          <button class="toolbar-btn" @click="toggleFullscreen">
            <Minimize2 v-if="isFullscreen" :size="16" />
            <Maximize2 v-else :size="16" />
          </button>
        </a-tooltip>
      </div>
    </div>

    <!-- Formatting Toolbar (Visual mode only) -->
    <div v-show="mode === 'visual'" class="formatting-toolbar">
      <EditorToolbar
        :editor="editor"
        :compact="false"
        :show-source-toggle="false"
        :is-source-view="false"
      />
    </div>

    <!-- Main Content Area -->
    <div class="builder-body">
      <!-- Block Palette (Left) -->
      <BlockPalette
        v-if="showPalette && mode === 'visual'"
        :editor="editor"
      />

      <!-- Canvas (Center) -->
      <div class="builder-canvas">
        <!-- Visual Mode -->
        <div
          v-show="mode === 'visual'"
          class="canvas-viewport"
          :style="{ maxWidth: canvasWidth }"
        >
          <EditorContent
            :editor="editor"
            class="builder-editor-content"
          />
        </div>

        <!-- Text Mode -->
        <div v-show="mode === 'text'" class="text-mode">
          <textarea
            :value="sourceContent"
            class="source-editor"
            :style="{ minHeight }"
            placeholder="Edit HTML source..."
            @input="onSourceInput"
          />
        </div>
      </div>

      <!-- Block Settings (Right) -->
      <BlockSettings
        v-if="showSettings && mode === 'visual'"
        :editor="editor"
      />
    </div>

    <!-- Status Bar -->
    <div class="builder-statusbar">
      <span>{{ wordCount }} words</span>
      <span class="status-divider">|</span>
      <span>{{ blockCount }} blocks</span>
      <span v-if="devicePreview !== 'desktop'" class="status-divider">|</span>
      <span v-if="devicePreview !== 'desktop'" class="device-indicator">
        {{ devicePreview === 'tablet' ? 'Tablet (768px)' : 'Mobile (375px)' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.page-builder {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.page-builder.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  border-radius: 0;
}

/* Top Toolbar */
.builder-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
  gap: 8px;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mode-toggle {
  display: flex;
  background: #e5e7eb;
  border-radius: 6px;
  padding: 2px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.15s;
}

.mode-btn.active {
  background: white;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #d1d5db;
  margin: 0 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
}

.toolbar-btn:hover { background: #e5e7eb; color: #1f2937; }
.toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.device-preview {
  display: flex;
  background: #e5e7eb;
  border-radius: 6px;
  padding: 2px;
}

.device-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
}

.device-btn.active {
  background: white;
  color: #1677ff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* Formatting Toolbar */
.formatting-toolbar {
  border-bottom: 1px solid #e5e7eb;
}

/* Body */
.builder-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Canvas */
.builder-canvas {
  flex: 1;
  overflow-y: auto;
  background: #f0f0f0;
  display: flex;
  justify-content: center;
  padding: 24px;
}

.canvas-viewport {
  width: 100%;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: max-width 0.3s ease;
  min-height: v-bind(minHeight);
}

.builder-editor-content :deep(.ProseMirror) {
  padding: 24px 32px;
  outline: none;
  min-height: v-bind(minHeight);
}

/* Inherit rich text styles from RichEditor */
.builder-editor-content :deep(.ProseMirror p) { margin: 0.5em 0; }
.builder-editor-content :deep(.ProseMirror h1) { font-size: 2em; font-weight: 700; margin: 0.67em 0; }
.builder-editor-content :deep(.ProseMirror h2) { font-size: 1.5em; font-weight: 600; margin: 0.75em 0; }
.builder-editor-content :deep(.ProseMirror h3) { font-size: 1.25em; font-weight: 600; margin: 0.75em 0; }
.builder-editor-content :deep(.ProseMirror h4) { font-size: 1.1em; font-weight: 600; margin: 0.75em 0; }
.builder-editor-content :deep(.ProseMirror ul),
.builder-editor-content :deep(.ProseMirror ol) { padding-left: 1.5em; margin: 0.5em 0; }
.builder-editor-content :deep(.ProseMirror ul) { list-style-type: disc; }
.builder-editor-content :deep(.ProseMirror ol) { list-style-type: decimal; }
.builder-editor-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid #d1d5db; padding-left: 1em; margin: 0.5em 0; color: #6b7280; font-style: italic;
}
.builder-editor-content :deep(.ProseMirror pre) {
  background: #1e1e2e; color: #cdd6f4; border-radius: 6px; padding: 12px 16px;
  font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 13px; overflow-x: auto; margin: 0.5em 0;
}
.builder-editor-content :deep(.ProseMirror code) { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
.builder-editor-content :deep(.ProseMirror pre code) { background: none; padding: 0; }
.builder-editor-content :deep(.ProseMirror img) { max-width: 100%; height: auto; border-radius: 4px; margin: 0.5em 0; }
.builder-editor-content :deep(.ProseMirror a) { color: #1677ff; text-decoration: underline; cursor: pointer; }
.builder-editor-content :deep(.ProseMirror table) { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.builder-editor-content :deep(.ProseMirror th),
.builder-editor-content :deep(.ProseMirror td) { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
.builder-editor-content :deep(.ProseMirror th) { background: #f9fafb; font-weight: 600; }
.builder-editor-content :deep(.ProseMirror hr) { border: none; border-top: 1px solid #e5e7eb; margin: 1em 0; }
.builder-editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder); float: left; color: #9ca3af; pointer-events: none; height: 0;
}
.builder-editor-content :deep(.ProseMirror mark) { border-radius: 2px; padding: 1px 2px; }

/* Dropcursor styling */
.builder-editor-content :deep(.ProseMirror-dropcursor) {
  background: #1677ff !important;
}

/* Text Mode */
.text-mode {
  width: 100%;
}

.source-editor {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 24px 32px;
  font-family: 'SF Mono', Monaco, Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  background: #1e1e2e;
  color: #cdd6f4;
  min-height: 100%;
}

/* Status Bar */
.builder-statusbar {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  font-size: 12px;
  color: #9ca3af;
  gap: 8px;
}

.status-divider {
  color: #d1d5db;
}

.device-indicator {
  color: #1677ff;
  font-weight: 500;
}
</style>
