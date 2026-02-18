<script lang="ts">
import { defineComponent, computed, defineAsyncComponent, h, ref, type Component, type VNode } from 'vue';
import { widgetRegistry, type WidgetDef } from './registry';
import './widget-styles.css';

// Render components — lazy-loaded (same as BlockRenderer)
const renders: Record<string, Component> = {
  sectionBlock: defineAsyncComponent(() => import('./renders/SectionRender.vue')),
  columnsBlock: defineAsyncComponent(() => import('./renders/ColumnsRender.vue')),
  columnBlock: defineAsyncComponent(() => import('./renders/ColumnRender.vue')),
  imageBlock: defineAsyncComponent(() => import('./renders/ImageRender.vue')),
  videoBlock: defineAsyncComponent(() => import('./renders/VideoRender.vue')),
  buttonBlock: defineAsyncComponent(() => import('./renders/ButtonRender.vue')),
  spacerBlock: defineAsyncComponent(() => import('./renders/SpacerRender.vue')),
  calloutBlock: defineAsyncComponent(() => import('./renders/CalloutRender.vue')),
  htmlBlock: defineAsyncComponent(() => import('./renders/HtmlRender.vue')),
  advancedHeading: defineAsyncComponent(() => import('./renders/AdvancedHeadingRender.vue')),
  dualHeading: defineAsyncComponent(() => import('./renders/DualHeadingRender.vue')),
  infoBox: defineAsyncComponent(() => import('./renders/InfoBoxRender.vue')),
  imageGallery: defineAsyncComponent(() => import('./renders/ImageGalleryRender.vue')),
  faq: defineAsyncComponent(() => import('./renders/FaqRender.vue')),
  priceTable: defineAsyncComponent(() => import('./renders/PriceTableRender.vue')),
  priceList: defineAsyncComponent(() => import('./renders/PriceListRender.vue')),
  teamMember: defineAsyncComponent(() => import('./renders/TeamMemberRender.vue')),
  testimonial: defineAsyncComponent(() => import('./renders/TestimonialRender.vue')),
  countdown: defineAsyncComponent(() => import('./renders/CountdownRender.vue')),
  contentToggle: defineAsyncComponent(() => import('./renders/ContentToggleRender.vue')),
  marketingButton: defineAsyncComponent(() => import('./renders/MarketingButtonRender.vue')),
  modalPopup: defineAsyncComponent(() => import('./renders/ModalPopupRender.vue')),
  googleMap: defineAsyncComponent(() => import('./renders/GoogleMapRender.vue')),
  contactForm: defineAsyncComponent(() => import('./renders/ContactFormRender.vue')),
  businessHours: defineAsyncComponent(() => import('./renders/BusinessHoursRender.vue')),
  socialShare: defineAsyncComponent(() => import('./renders/SocialShareRender.vue')),
  postsGrid: defineAsyncComponent(() => import('./renders/PostsGridRender.vue')),
  iconList: defineAsyncComponent(() => import('./renders/IconListRender.vue')),
  progressBar: defineAsyncComponent(() => import('./renders/ProgressBarRender.vue')),
};

const markTags: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strike: 's',
  code: 'code',
};

const containerTypes = new Set(['sectionBlock', 'columnsBlock', 'columnBlock', 'calloutBlock']);

const arrayAttrs = new Set(['items', 'features', 'images', 'links', 'fields', 'hours', 'platforms', 'socials', 'contentA', 'contentB']);

/** Parse attrs: JSON strings -> objects/arrays, rename conflicting keys */
function prepareAttrs(attrs: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(attrs)) {
    const key = k === 'style' ? 'displayStyle' : k;
    if (arrayAttrs.has(k) && (v === '' || v === null || v === undefined)) {
      result[key] = [];
      continue;
    }
    if (typeof v === 'string' && v && (arrayAttrs.has(k) || (v.startsWith('[') || v.startsWith('{')))) {
      try { result[key] = JSON.parse(v); continue; } catch { /* not JSON */ }
    }
    result[key] = v;
  }
  return result;
}

/** Look up the widget display name from the registry */
function getWidgetName(type: string): string {
  const def = widgetRegistry.find(w => w.type === type);
  return def?.name || type;
}

/** Check if a node type is an inline/text-level type (not a selectable block) */
function isInlineType(type: string): boolean {
  return ['text', 'hardBreak'].includes(type);
}

/** Check if a node type is a structural text type rendered as HTML tag */
function isTextBlockType(type: string): boolean {
  return ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock', 'horizontalRule', 'image', 'table', 'tableRow', 'tableCell', 'tableHeader'].includes(type);
}

export default defineComponent({
  name: 'EditableBlockRenderer',
  props: {
    content: { type: [Object, String, Array], default: null },
    editMode: { type: Boolean, default: false },
  },
  emits: ['update:content', 'select-block', 'move-block', 'delete-block', 'duplicate-block', 'insert-block'],
  setup(props, { emit }) {
    const selectedPath = ref<number[]>([]);
    const hoveredPath = ref<number[]>([]);

    const doc = computed(() => {
      if (!props.content) return null;
      if (typeof props.content === 'string') {
        try { return JSON.parse(props.content); } catch { return null; }
      }
      return props.content;
    });

    const nodes = computed(() => {
      const d = doc.value;
      if (!d) return [];
      if (d.type === 'doc') return d.content || [];
      if (Array.isArray(d)) return d;
      return [d];
    });

    function pathsEqual(a: number[], b: number[]): boolean {
      if (a.length !== b.length) return false;
      return a.every((v, i) => v === b[i]);
    }

    function selectBlock(path: number[]) {
      selectedPath.value = [...path];
      emit('select-block', [...path]);
    }

    function clearSelection() {
      selectedPath.value = [];
    }

    function getBlockAtPath(docObj: any, path: number[]): any {
      let node = docObj;
      for (const idx of path) {
        node = (node.content || [])[idx];
      }
      return node;
    }

    function getParentContent(path: number[]): any[] | null {
      const d = doc.value;
      if (!d) return null;
      if (path.length <= 1) {
        return d.content || (d as any);
      }
      const parent = getBlockAtPath(d, path.slice(0, -1));
      return parent?.content || null;
    }

    function canMove(path: number[], direction: 'up' | 'down'): boolean {
      const parent = getParentContent(path);
      if (!parent) return false;
      const idx = path[path.length - 1];
      if (direction === 'up') return idx > 0;
      return idx < parent.length - 1;
    }

    function handleMove(path: number[], direction: 'up' | 'down') {
      const d = doc.value;
      if (!d) return;
      const parent = path.length > 1 ? getBlockAtPath(d, path.slice(0, -1)) : d;
      const content = parent.content;
      const idx = path[path.length - 1];
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= content.length) return;
      const [item] = content.splice(idx, 1);
      content.splice(newIdx, 0, item);
      // Update selection to follow the moved block
      const newPath = [...path.slice(0, -1), newIdx];
      selectedPath.value = newPath;
      emit('move-block', path, direction);
      emit('update:content', JSON.parse(JSON.stringify(d)));
    }

    function handleDelete(path: number[]) {
      const d = doc.value;
      if (!d) return;
      const parent = path.length > 1 ? getBlockAtPath(d, path.slice(0, -1)) : d;
      const idx = path[path.length - 1];
      parent.content.splice(idx, 1);
      selectedPath.value = [];
      emit('delete-block', path);
      emit('update:content', JSON.parse(JSON.stringify(d)));
    }

    function handleDuplicate(path: number[]) {
      const d = doc.value;
      if (!d) return;
      const parent = path.length > 1 ? getBlockAtPath(d, path.slice(0, -1)) : d;
      const idx = path[path.length - 1];
      const clone = JSON.parse(JSON.stringify(parent.content[idx]));
      parent.content.splice(idx + 1, 0, clone);
      const newPath = [...path.slice(0, -1), idx + 1];
      selectedPath.value = newPath;
      emit('duplicate-block', path);
      emit('update:content', JSON.parse(JSON.stringify(d)));
    }

    function handleInsert(path: number[], position: 'before' | 'after') {
      emit('insert-block', path, position);
    }

    /** Render text node with marks */
    function renderTextNode(node: any, key: number): any {
      let text: any = node.text || '';
      if (node.marks && node.marks.length) {
        for (const mark of node.marks) {
          const tag = markTags[mark.type];
          if (tag) {
            text = h(tag, null, text);
          } else if (mark.type === 'link') {
            text = h('a', { href: mark.attrs?.href || '#', target: mark.attrs?.target || '_blank', rel: 'noopener noreferrer' }, text);
          } else if (mark.type === 'textStyle') {
            text = h('span', { style: { color: mark.attrs?.color } }, text);
          } else if (mark.type === 'highlight') {
            text = h('mark', { style: { backgroundColor: mark.attrs?.color } }, text);
          }
        }
      }
      return text;
    }

    /** Core render logic for a node (without edit wrapper) */
    function renderNodeContent(node: any, key: number, currentPath: number[]): any {
      if (!node || !node.type) return null;

      const attrs = node.attrs || {};
      const children = node.content || [];

      if (node.type === 'text') return renderTextNode(node, key);
      if (node.type === 'hardBreak') return h('br', { key });

      if (node.type === 'paragraph') {
        const style: any = {};
        if (attrs.textAlign) style.textAlign = attrs.textAlign;
        return h('p', { key, style }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));
      }

      if (node.type === 'heading') {
        const tag = `h${attrs.level || 2}`;
        const style: any = {};
        if (attrs.textAlign) style.textAlign = attrs.textAlign;
        return h(tag, { key, style }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));
      }

      if (node.type === 'bulletList') return h('ul', { key }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));
      if (node.type === 'orderedList') return h('ol', { key, start: attrs.start || 1 }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));
      if (node.type === 'listItem') return h('li', { key }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));
      if (node.type === 'blockquote') return h('blockquote', { key }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));

      if (node.type === 'codeBlock') {
        const code = children.map((c: any) => c.text || '').join('');
        return h('pre', { key }, [h('code', { class: attrs.language ? `language-${attrs.language}` : '' }, code)]);
      }

      if (node.type === 'horizontalRule') return h('hr', { key });
      if (node.type === 'image') return h('img', { key, src: attrs.src, alt: attrs.alt || '', title: attrs.title || '' });

      if (node.type === 'table') return h('table', { key }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));
      if (node.type === 'tableRow') return h('tr', { key }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));
      if (node.type === 'tableCell') return h('td', { key, colspan: attrs.colspan, rowspan: attrs.rowspan }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));
      if (node.type === 'tableHeader') return h('th', { key, colspan: attrs.colspan, rowspan: attrs.rowspan }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));

      const RenderComp = renders[node.type];
      if (RenderComp) {
        const prepared = prepareAttrs(attrs);
        if (containerTypes.has(node.type) && children.length) {
          return h(RenderComp, { key, ...prepared }, {
            default: () => children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])),
          });
        }
        return h(RenderComp, { key, ...prepared });
      }

      if (children.length) {
        return h('div', { key, 'data-type': node.type }, children.map((c: any, i: number) => renderNode(c, i, [...currentPath, i])));
      }
      return null;
    }

    /** Main render function — wraps blocks in edit wrappers when in edit mode */
    function renderNode(node: any, key: number, currentPath: number[]): any {
      if (!node || !node.type) return null;

      // Inline types never get wrappers
      if (isInlineType(node.type)) {
        return renderNodeContent(node, key, currentPath);
      }

      // In non-edit mode, render without wrappers
      if (!props.editMode) {
        return renderNodeContent(node, key, currentPath);
      }

      // Text-level block types (paragraph, heading, etc.) get minimal wrappers
      // only at the top level of the document
      const isWidget = !!renders[node.type];
      const isContainer = containerTypes.has(node.type);
      const shouldWrap = isWidget || isTextBlockType(node.type);

      if (!shouldWrap) {
        return renderNodeContent(node, key, currentPath);
      }

      const isSelected = pathsEqual(currentPath, selectedPath.value);
      const isHovered = pathsEqual(currentPath, hoveredPath.value);
      const widgetName = getWidgetName(node.type);

      // Build the edit wrapper
      const wrapperClasses = [
        'editable-block-wrapper',
        isSelected ? 'editable-block-selected' : '',
        isHovered && !isSelected ? 'editable-block-hovered' : '',
        isContainer ? 'editable-block-container' : '',
      ].filter(Boolean).join(' ');

      const wrapperChildren: VNode[] = [];

      // Hover label
      if (isHovered || isSelected) {
        wrapperChildren.push(
          h('div', { class: 'editable-block-label' }, widgetName)
        );
      }

      // Floating toolbar when selected
      if (isSelected) {
        const toolbarButtons: VNode[] = [];

        if (canMove(currentPath, 'up')) {
          toolbarButtons.push(
            h('button', {
              class: 'edt-toolbar-btn',
              title: 'Move Up',
              onClick: (e: Event) => { e.stopPropagation(); handleMove(currentPath, 'up'); },
            }, '\u2191')
          );
        }

        if (canMove(currentPath, 'down')) {
          toolbarButtons.push(
            h('button', {
              class: 'edt-toolbar-btn',
              title: 'Move Down',
              onClick: (e: Event) => { e.stopPropagation(); handleMove(currentPath, 'down'); },
            }, '\u2193')
          );
        }

        toolbarButtons.push(
          h('button', {
            class: 'edt-toolbar-btn',
            title: 'Duplicate',
            onClick: (e: Event) => { e.stopPropagation(); handleDuplicate(currentPath); },
          }, '\u2398')
        );

        toolbarButtons.push(
          h('button', {
            class: 'edt-toolbar-btn edt-toolbar-btn-danger',
            title: 'Delete',
            onClick: (e: Event) => { e.stopPropagation(); handleDelete(currentPath); },
          }, '\u2715')
        );

        wrapperChildren.push(
          h('div', { class: 'editable-block-toolbar' }, toolbarButtons)
        );
      }

      // The actual block content
      wrapperChildren.push(renderNodeContent(node, key, currentPath));

      return h('div', {
        key,
        class: wrapperClasses,
        'data-block-path': currentPath.join('-'),
        onMouseenter: (e: Event) => {
          e.stopPropagation();
          hoveredPath.value = [...currentPath];
        },
        onMouseleave: () => {
          if (pathsEqual(hoveredPath.value, currentPath)) {
            hoveredPath.value = [];
          }
        },
        onClick: (e: Event) => {
          e.stopPropagation();
          selectBlock(currentPath);
        },
      }, wrapperChildren);
    }

    /** Render insert button between blocks */
    function renderInsertButton(path: number[], position: 'after'): VNode {
      return h('div', { class: 'editable-insert-zone' }, [
        h('button', {
          class: 'editable-insert-btn',
          title: 'Insert widget here',
          onClick: (e: Event) => {
            e.stopPropagation();
            handleInsert(path, position);
          },
        }, '+'),
      ]);
    }

    return {
      doc,
      nodes,
      selectedPath,
      hoveredPath,
      renderNode,
      renderInsertButton,
      selectBlock,
      clearSelection,
      getBlockAtPath: (path: number[]) => {
        const d = doc.value;
        if (!d) return null;
        return getBlockAtPath(d, path);
      },
    };
  },
  render() {
    if (!this.nodes || !this.nodes.length) return null;

    const children: any[] = [];

    if (this.editMode) {
      // Insert zone before the first block — use 'before' so handlers can compute index=0
      children.push(this.renderInsertButton([0], 'before'));

      this.nodes.forEach((n: any, i: number) => {
        children.push(this.renderNode(n, i, [i]));
        // Insert zone after block i → index = i + 1
        children.push(this.renderInsertButton([i], 'after'));
      });
    } else {
      this.nodes.forEach((n: any, i: number) => {
        children.push(this.renderNode(n, i, [i]));
      });
    }

    return h('div', {
      class: ['lume-page-content', this.editMode ? 'lume-edit-mode' : ''].filter(Boolean).join(' '),
      onClick: () => {
        if (this.editMode) {
          this.clearSelection();
        }
      },
    }, children);
  },
});
</script>

<style>
/* Reuse base BlockRenderer styles */
.lume-page-content {
  max-width: 100%;
  overflow-x: hidden;
}
.lume-page-content p { margin: 0.5em 0; }
.lume-page-content h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; }
.lume-page-content h2 { font-size: 1.5em; font-weight: 600; margin: 0.75em 0; }
.lume-page-content h3 { font-size: 1.25em; font-weight: 600; margin: 0.75em 0; }
.lume-page-content h4 { font-size: 1.1em; font-weight: 600; margin: 0.75em 0; }
.lume-page-content ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
.lume-page-content ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
.lume-page-content blockquote { border-left: 3px solid #d1d5db; padding-left: 1em; color: #6b7280; font-style: italic; margin: 0.5em 0; }
.lume-page-content pre { background: #1e1e2e; color: #cdd6f4; border-radius: 6px; padding: 12px 16px; font-family: 'SF Mono', Monaco, monospace; font-size: 13px; overflow-x: auto; margin: 0.5em 0; }
.lume-page-content code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
.lume-page-content pre code { background: none; padding: 0; }
.lume-page-content img { max-width: 100%; height: auto; }
.lume-page-content a { color: #3b82f6; text-decoration: underline; }
.lume-page-content table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.lume-page-content th, .lume-page-content td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
.lume-page-content th { background: #f9fafb; font-weight: 600; }
.lume-page-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 1em 0; }

/* Edit mode styles */
.lume-edit-mode {
  padding-bottom: 60px;
}

.editable-block-wrapper {
  position: relative;
  transition: all 0.15s ease;
  border: 2px solid transparent;
  border-radius: 4px;
  margin: 2px 0;
}

.editable-block-wrapper:not(.editable-block-container) {
  cursor: pointer;
}

.editable-block-hovered {
  border: 2px dashed #93c5fd;
  background: rgba(147, 197, 253, 0.04);
}

.editable-block-selected {
  border: 2px solid #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(59, 130, 246, 0.08);
  background: rgba(59, 130, 246, 0.02);
}

.editable-block-container {
  border-style: dashed;
}

.editable-block-container.editable-block-selected {
  border-style: solid;
}

/* Block type label */
.editable-block-label {
  position: absolute;
  top: -1px;
  left: 8px;
  transform: translateY(-100%);
  background: #3b82f6;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px 4px 0 0;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
  line-height: 18px;
}

.editable-block-hovered:not(.editable-block-selected) .editable-block-label {
  background: #93c5fd;
  color: #1e3a5f;
}

/* Floating toolbar */
.editable-block-toolbar {
  position: absolute;
  top: -1px;
  right: 8px;
  transform: translateY(-100%);
  display: flex;
  gap: 2px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  padding: 3px 4px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  z-index: 11;
}

.edt-toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 26px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #4b5563;
  transition: all 0.15s ease;
  line-height: 1;
}

.edt-toolbar-btn:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
  color: #1f2937;
}

.edt-toolbar-btn-danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

/* Insert button zone */
.editable-insert-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  position: relative;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.lume-edit-mode:hover .editable-insert-zone {
  opacity: 1;
}

.editable-insert-zone::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 10%;
  right: 10%;
  height: 1px;
  background: #d1d5db;
  transform: translateY(-50%);
}

.editable-insert-btn {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #6b7280;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
}

.editable-insert-btn:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}
</style>
