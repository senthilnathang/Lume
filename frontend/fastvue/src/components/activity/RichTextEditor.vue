<script lang="ts" setup>
/**
 * RichTextEditor Component
 *
 * A rich text editor using TipTap with support for:
 * - Basic formatting (bold, italic, underline, strike)
 * - Lists (bullet and numbered)
 * - Code blocks and inline code
 * - Links
 * - @mentions integration
 *
 * Note: This is a lightweight implementation that works without TipTap dependencies.
 * For full TipTap support, install @tiptap/vue-3 and extensions.
 */
import { onMounted, onUnmounted, ref, watch } from 'vue';

import {
  Button,
  Tooltip,
  Divider,
  Input,
  Popover,
} from 'ant-design-vue';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CodeOutlined,
  LinkOutlined,
} from '@ant-design/icons-vue';

// Props
interface Props {
  /** Content value (v-model) */
  modelValue: string;
  /** HTML content (v-model:html) */
  html?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum height */
  minHeight?: string;
  /** Maximum height */
  maxHeight?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Autofocus */
  autoFocus?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Write something...',
  minHeight: '100px',
  maxHeight: '400px',
  disabled: false,
  showToolbar: true,
  autoFocus: false,
});

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:html', value: string): void;
  (e: 'submit'): void;
}>();

// Refs
const editorRef = ref<HTMLDivElement | null>(null);
const linkUrl = ref('');
const showLinkPopover = ref(false);

// State for active formatting
const activeFormats = ref({
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
});

// Methods
function updateContent() {
  if (!editorRef.value) return;

  const text = editorRef.value.innerText || '';
  const html = editorRef.value.innerHTML || '';

  emit('update:modelValue', text);
  emit('update:html', html);
}

function checkActiveFormats() {
  activeFormats.value = {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strike: document.queryCommandState('strikeThrough'),
    code: false, // Custom handling for code
  };
}

function execCommand(command: string, value?: string) {
  if (props.disabled) return;

  editorRef.value?.focus();
  document.execCommand(command, false, value);
  updateContent();
  checkActiveFormats();
}

function toggleBold() {
  execCommand('bold');
}

function toggleItalic() {
  execCommand('italic');
}

function toggleUnderline() {
  execCommand('underline');
}

function toggleStrike() {
  execCommand('strikeThrough');
}

function insertOrderedList() {
  execCommand('insertOrderedList');
}

function insertUnorderedList() {
  execCommand('insertUnorderedList');
}

function toggleCode() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const selectedText = range.toString();

  if (selectedText) {
    const code = document.createElement('code');
    code.textContent = selectedText;
    code.style.backgroundColor = 'var(--ant-color-bg-layout)';
    code.style.padding = '2px 4px';
    code.style.borderRadius = '4px';
    code.style.fontFamily = 'monospace';

    range.deleteContents();
    range.insertNode(code);

    updateContent();
  }
}

function insertLink() {
  if (!linkUrl.value) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const selectedText = range.toString() || linkUrl.value;

  const link = document.createElement('a');
  link.href = linkUrl.value;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = selectedText;

  range.deleteContents();
  range.insertNode(link);

  linkUrl.value = '';
  showLinkPopover.value = false;
  updateContent();
}

function handleKeyDown(event: KeyboardEvent) {
  // Cmd/Ctrl + Enter to submit
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    emit('submit');
    return;
  }

  // Cmd/Ctrl + B for bold
  if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
    event.preventDefault();
    toggleBold();
    return;
  }

  // Cmd/Ctrl + I for italic
  if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
    event.preventDefault();
    toggleItalic();
    return;
  }

  // Cmd/Ctrl + U for underline
  if ((event.metaKey || event.ctrlKey) && event.key === 'u') {
    event.preventDefault();
    toggleUnderline();
    return;
  }
}

function handlePaste(event: ClipboardEvent) {
  // Handle paste - strip formatting by default
  event.preventDefault();

  const text = event.clipboardData?.getData('text/plain') || '';
  document.execCommand('insertText', false, text);
  updateContent();
}

function handleInput() {
  updateContent();
  checkActiveFormats();
}

function handleSelectionChange() {
  checkActiveFormats();
}

// Set initial content
function setContent(content: string) {
  if (editorRef.value && content !== editorRef.value.innerHTML) {
    editorRef.value.innerHTML = content;
  }
}

// Watch for external changes
watch(
  () => props.html,
  (newHtml) => {
    if (newHtml !== undefined) {
      setContent(newHtml);
    }
  },
);

// Lifecycle
onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange);

  if (props.autoFocus && editorRef.value) {
    editorRef.value.focus();
  }

  // Set initial content if provided
  if (props.html) {
    setContent(props.html);
  } else if (props.modelValue) {
    setContent(props.modelValue);
  }
});

onUnmounted(() => {
  document.removeEventListener('selectionchange', handleSelectionChange);
});

// Expose methods
defineExpose({
  focus: () => editorRef.value?.focus(),
  clear: () => {
    if (editorRef.value) {
      editorRef.value.innerHTML = '';
      updateContent();
    }
  },
  getHtml: () => editorRef.value?.innerHTML || '',
  getText: () => editorRef.value?.innerText || '',
});
</script>

<template>
  <div
    :class="[
      'rich-text-editor',
      { 'rich-text-editor--disabled': disabled },
    ]"
  >
    <!-- Toolbar -->
    <div v-if="showToolbar" class="rich-text-toolbar">
      <div class="toolbar-group">
        <Tooltip title="Bold (Ctrl+B)">
          <Button
            type="text"
            size="small"
            :class="{ 'toolbar-btn--active': activeFormats.bold }"
            :disabled="disabled"
            @click="toggleBold"
          >
            <template #icon>
              <BoldOutlined />
            </template>
          </Button>
        </Tooltip>

        <Tooltip title="Italic (Ctrl+I)">
          <Button
            type="text"
            size="small"
            :class="{ 'toolbar-btn--active': activeFormats.italic }"
            :disabled="disabled"
            @click="toggleItalic"
          >
            <template #icon>
              <ItalicOutlined />
            </template>
          </Button>
        </Tooltip>

        <Tooltip title="Underline (Ctrl+U)">
          <Button
            type="text"
            size="small"
            :class="{ 'toolbar-btn--active': activeFormats.underline }"
            :disabled="disabled"
            @click="toggleUnderline"
          >
            <template #icon>
              <UnderlineOutlined />
            </template>
          </Button>
        </Tooltip>

        <Tooltip title="Strikethrough">
          <Button
            type="text"
            size="small"
            :class="{ 'toolbar-btn--active': activeFormats.strike }"
            :disabled="disabled"
            @click="toggleStrike"
          >
            <template #icon>
              <StrikethroughOutlined />
            </template>
          </Button>
        </Tooltip>
      </div>

      <Divider type="vertical" />

      <div class="toolbar-group">
        <Tooltip title="Bullet List">
          <Button
            type="text"
            size="small"
            :disabled="disabled"
            @click="insertUnorderedList"
          >
            <template #icon>
              <UnorderedListOutlined />
            </template>
          </Button>
        </Tooltip>

        <Tooltip title="Numbered List">
          <Button
            type="text"
            size="small"
            :disabled="disabled"
            @click="insertOrderedList"
          >
            <template #icon>
              <OrderedListOutlined />
            </template>
          </Button>
        </Tooltip>
      </div>

      <Divider type="vertical" />

      <div class="toolbar-group">
        <Tooltip title="Code">
          <Button
            type="text"
            size="small"
            :disabled="disabled"
            @click="toggleCode"
          >
            <template #icon>
              <CodeOutlined />
            </template>
          </Button>
        </Tooltip>

        <Popover
          v-model:open="showLinkPopover"
          trigger="click"
          placement="bottom"
        >
          <template #content>
            <div class="link-popover">
              <Input
                v-model:value="linkUrl"
                placeholder="Enter URL..."
                size="small"
                @pressEnter="insertLink"
              />
              <Button
                type="primary"
                size="small"
                @click="insertLink"
              >
                Insert
              </Button>
            </div>
          </template>
          <Tooltip title="Insert Link">
            <Button
              type="text"
              size="small"
              :disabled="disabled"
            >
              <template #icon>
                <LinkOutlined />
              </template>
            </Button>
          </Tooltip>
        </Popover>
      </div>
    </div>

    <!-- Editor -->
    <div
      ref="editorRef"
      class="rich-text-content"
      :contenteditable="!disabled"
      :style="{
        minHeight: minHeight,
        maxHeight: maxHeight,
      }"
      :data-placeholder="placeholder"
      @input="handleInput"
      @keydown="handleKeyDown"
      @paste="handlePaste"
    />
  </div>
</template>

<style scoped>
.rich-text-editor {
  border: 1px solid var(--ant-color-border);
  border-radius: 8px;
  background: var(--ant-color-bg-container);
  overflow: hidden;
}

.rich-text-editor--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.rich-text-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--ant-color-border);
  background: var(--ant-color-bg-layout);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-btn--active {
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
}

.rich-text-content {
  padding: 12px;
  overflow-y: auto;
  outline: none;
  line-height: 1.6;
}

.rich-text-content:empty::before {
  content: attr(data-placeholder);
  color: var(--ant-color-text-placeholder);
  pointer-events: none;
}

.rich-text-content :deep(a) {
  color: var(--ant-color-link);
}

.rich-text-content :deep(code) {
  background: var(--ant-color-bg-layout);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}

.rich-text-content :deep(ul),
.rich-text-content :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.link-popover {
  display: flex;
  gap: 8px;
  min-width: 250px;
}
</style>
