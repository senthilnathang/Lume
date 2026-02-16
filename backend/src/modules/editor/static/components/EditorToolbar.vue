<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, Code, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link, Image, Table, Undo2, Redo2, FileCode, Heading1, Heading2,
  Heading3, Heading4, Palette, Highlighter, Minus,
} from 'lucide-vue-next';

const props = defineProps<{
  editor: any;
  compact?: boolean;
  showSourceToggle?: boolean;
  isSourceView?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-source'): void;
}>();

const linkUrl = ref('');
const linkPopoverVisible = ref(false);
const imageUrl = ref('');
const imagePopoverVisible = ref(false);

function setLink() {
  if (!linkUrl.value) {
    props.editor?.chain().focus().extendMarkRange('link').unsetLink().run();
  } else {
    props.editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.value }).run();
  }
  linkPopoverVisible.value = false;
  linkUrl.value = '';
}

function insertImage() {
  if (imageUrl.value) {
    props.editor?.chain().focus().setImage({ src: imageUrl.value }).run();
  }
  imagePopoverVisible.value = false;
  imageUrl.value = '';
}

function insertTable() {
  props.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
}

const isActive = (name: string, attrs?: Record<string, any>) =>
  props.editor?.isActive(name, attrs) ?? false;
</script>

<template>
  <div class="editor-toolbar flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-gray-50/80">
    <!-- Undo/Redo -->
    <a-tooltip title="Undo">
      <a-button type="text" size="small" :disabled="!editor?.can().undo()" @click="editor?.chain().focus().undo().run()">
        <template #icon><Undo2 :size="15" /></template>
      </a-button>
    </a-tooltip>
    <a-tooltip title="Redo">
      <a-button type="text" size="small" :disabled="!editor?.can().redo()" @click="editor?.chain().focus().redo().run()">
        <template #icon><Redo2 :size="15" /></template>
      </a-button>
    </a-tooltip>

    <a-divider type="vertical" class="mx-1" />

    <!-- Headings (full mode only) -->
    <template v-if="!compact">
      <a-dropdown :trigger="['click']">
        <a-button type="text" size="small" class="flex items-center gap-1">
          <Heading1 :size="15" />
          <span class="text-xs">Heading</span>
        </a-button>
        <template #overlay>
          <a-menu>
            <a-menu-item @click="editor?.chain().focus().setParagraph().run()">
              <span class="text-sm">Paragraph</span>
            </a-menu-item>
            <a-menu-item @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()">
              <span class="text-lg font-bold">Heading 1</span>
            </a-menu-item>
            <a-menu-item @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">
              <span class="text-base font-bold">Heading 2</span>
            </a-menu-item>
            <a-menu-item @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()">
              <span class="text-sm font-bold">Heading 3</span>
            </a-menu-item>
            <a-menu-item @click="editor?.chain().focus().toggleHeading({ level: 4 }).run()">
              <span class="text-xs font-bold">Heading 4</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <a-divider type="vertical" class="mx-1" />
    </template>

    <!-- Text formatting -->
    <a-tooltip title="Bold">
      <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('bold') }" @click="editor?.chain().focus().toggleBold().run()">
        <template #icon><Bold :size="15" /></template>
      </a-button>
    </a-tooltip>
    <a-tooltip title="Italic">
      <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('italic') }" @click="editor?.chain().focus().toggleItalic().run()">
        <template #icon><Italic :size="15" /></template>
      </a-button>
    </a-tooltip>
    <a-tooltip title="Underline">
      <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('underline') }" @click="editor?.chain().focus().toggleUnderline().run()">
        <template #icon><Underline :size="15" /></template>
      </a-button>
    </a-tooltip>

    <template v-if="!compact">
      <a-tooltip title="Strikethrough">
        <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('strike') }" @click="editor?.chain().focus().toggleStrike().run()">
          <template #icon><Strikethrough :size="15" /></template>
        </a-button>
      </a-tooltip>
    </template>

    <a-divider type="vertical" class="mx-1" />

    <!-- Lists -->
    <a-tooltip title="Bullet List">
      <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('bulletList') }" @click="editor?.chain().focus().toggleBulletList().run()">
        <template #icon><List :size="15" /></template>
      </a-button>
    </a-tooltip>
    <a-tooltip title="Numbered List">
      <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('orderedList') }" @click="editor?.chain().focus().toggleOrderedList().run()">
        <template #icon><ListOrdered :size="15" /></template>
      </a-button>
    </a-tooltip>

    <template v-if="!compact">
      <a-divider type="vertical" class="mx-1" />

      <!-- Block elements -->
      <a-tooltip title="Blockquote">
        <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('blockquote') }" @click="editor?.chain().focus().toggleBlockquote().run()">
          <template #icon><Quote :size="15" /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="Code Block">
        <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('codeBlock') }" @click="editor?.chain().focus().toggleCodeBlock().run()">
          <template #icon><Code :size="15" /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="Horizontal Rule">
        <a-button type="text" size="small" @click="editor?.chain().focus().setHorizontalRule().run()">
          <template #icon><Minus :size="15" /></template>
        </a-button>
      </a-tooltip>

      <a-divider type="vertical" class="mx-1" />

      <!-- Text Align -->
      <a-tooltip title="Align Left">
        <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive({ textAlign: 'left' }) }" @click="editor?.chain().focus().setTextAlign('left').run()">
          <template #icon><AlignLeft :size="15" /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="Align Center">
        <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive({ textAlign: 'center' }) }" @click="editor?.chain().focus().setTextAlign('center').run()">
          <template #icon><AlignCenter :size="15" /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="Align Right">
        <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive({ textAlign: 'right' }) }" @click="editor?.chain().focus().setTextAlign('right').run()">
          <template #icon><AlignRight :size="15" /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="Justify">
        <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive({ textAlign: 'justify' }) }" @click="editor?.chain().focus().setTextAlign('justify').run()">
          <template #icon><AlignJustify :size="15" /></template>
        </a-button>
      </a-tooltip>

      <a-divider type="vertical" class="mx-1" />

      <!-- Color & Highlight -->
      <a-tooltip title="Text Color">
        <a-popover trigger="click" placement="bottom">
          <a-button type="text" size="small">
            <template #icon><Palette :size="15" /></template>
          </a-button>
          <template #content>
            <div class="flex flex-wrap gap-1 w-40">
              <button
                v-for="color in ['#000000','#434343','#666666','#999999','#e03131','#c2255c','#9c36b5','#6741d9','#3b5bdb','#1971c2','#0c8599','#099268','#2f9e44','#66a80f','#e8590c','#f08c00']"
                :key="color"
                class="w-6 h-6 rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform"
                :style="{ backgroundColor: color }"
                @click="editor?.chain().focus().setColor(color).run()"
              />
              <button
                class="w-6 h-6 rounded border border-gray-300 cursor-pointer text-xs flex items-center justify-center"
                @click="editor?.chain().focus().unsetColor().run()"
              >
                &times;
              </button>
            </div>
          </template>
        </a-popover>
      </a-tooltip>
      <a-tooltip title="Highlight">
        <a-popover trigger="click" placement="bottom">
          <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('highlight') }">
            <template #icon><Highlighter :size="15" /></template>
          </a-button>
          <template #content>
            <div class="flex flex-wrap gap-1 w-40">
              <button
                v-for="color in ['#ffc9c9','#fcc2d7','#eebefa','#d0bfff','#bac8ff','#a5d8ff','#99e9f2','#96f2d7','#b2f2bb','#d8f5a2','#ffec99','#ffe8cc']"
                :key="color"
                class="w-6 h-6 rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform"
                :style="{ backgroundColor: color }"
                @click="editor?.chain().focus().toggleHighlight({ color }).run()"
              />
              <button
                class="w-6 h-6 rounded border border-gray-300 cursor-pointer text-xs flex items-center justify-center"
                @click="editor?.chain().focus().unsetHighlight().run()"
              >
                &times;
              </button>
            </div>
          </template>
        </a-popover>
      </a-tooltip>
    </template>

    <a-divider type="vertical" class="mx-1" />

    <!-- Link -->
    <a-popover v-model:open="linkPopoverVisible" trigger="click" placement="bottom">
      <a-tooltip title="Link">
        <a-button type="text" size="small" :class="{ 'bg-gray-200': isActive('link') }">
          <template #icon><Link :size="15" /></template>
        </a-button>
      </a-tooltip>
      <template #content>
        <div class="flex gap-2 w-64">
          <a-input v-model:value="linkUrl" placeholder="https://..." size="small" @pressEnter="setLink" />
          <a-button size="small" type="primary" @click="setLink">Set</a-button>
        </div>
      </template>
    </a-popover>

    <template v-if="!compact">
      <!-- Image -->
      <a-popover v-model:open="imagePopoverVisible" trigger="click" placement="bottom">
        <a-tooltip title="Image">
          <a-button type="text" size="small">
            <template #icon><Image :size="15" /></template>
          </a-button>
        </a-tooltip>
        <template #content>
          <div class="flex gap-2 w-64">
            <a-input v-model:value="imageUrl" placeholder="Image URL..." size="small" @pressEnter="insertImage" />
            <a-button size="small" type="primary" @click="insertImage">Insert</a-button>
          </div>
        </template>
      </a-popover>

      <!-- Table -->
      <a-tooltip title="Insert Table">
        <a-button type="text" size="small" @click="insertTable">
          <template #icon><Table :size="15" /></template>
        </a-button>
      </a-tooltip>
    </template>

    <!-- Source toggle (spacer + right align) -->
    <template v-if="showSourceToggle">
      <div class="flex-1" />
      <a-tooltip :title="isSourceView ? 'Visual Editor' : 'HTML Source'">
        <a-button
          type="text"
          size="small"
          :class="{ 'bg-gray-200': isSourceView }"
          @click="emit('toggle-source')"
        >
          <template #icon><FileCode :size="15" /></template>
          <span class="text-xs ml-1">{{ isSourceView ? 'Visual' : 'HTML' }}</span>
        </a-button>
      </a-tooltip>
    </template>
  </div>
</template>

<style scoped>
.editor-toolbar :deep(.ant-btn-text) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 2px 5px;
}
</style>
