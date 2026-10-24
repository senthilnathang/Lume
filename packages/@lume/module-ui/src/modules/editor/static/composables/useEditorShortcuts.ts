import { onMounted, onBeforeUnmount, ref, type Ref } from 'vue';

interface ShortcutOptions {
  editor: Ref<any>;
  onSave?: () => void;
  onToggleMobilePreview?: () => void;
  onShowHelp?: () => void;
  history?: {
    undo: () => void;
    redo: () => void;
    canUndo: Ref<boolean>;
    canRedo: Ref<boolean>;
  };
}

export interface ClipboardBlock {
  type: string;
  attrs: Record<string, any>;
  content?: any[];
}

export function useEditorShortcuts(options: ShortcutOptions) {
  const { editor, onSave, onToggleMobilePreview, onShowHelp, history } = options;
  const clipboardBlock = ref<ClipboardBlock | null>(null);

  function getSelectedBlock(): { node: any; pos: number } | null {
    if (!editor.value) return null;
    const sel = editor.value.state.selection;

    // NodeSelection
    if (sel.node) {
      return { node: sel.node, pos: sel.from };
    }

    // Walk up from cursor to find a block node
    const { $from } = sel;
    for (let d = $from.depth; d >= 1; d--) {
      const node = $from.node(d);
      if (node.type.name !== 'paragraph' && node.type.name !== 'text') {
        return { node, pos: $from.before(d) };
      }
    }
    return null;
  }

  function isEditingText(): boolean {
    if (!editor.value) return false;
    return editor.value.isFocused;
  }

  function copyBlock() {
    const block = getSelectedBlock();
    if (!block) return;
    clipboardBlock.value = block.node.toJSON();
  }

  function pasteBlock() {
    if (!clipboardBlock.value || !editor.value) return;
    const sel = editor.value.state.selection;
    const pos = sel.to;
    try {
      const nodeType = editor.value.schema.nodes[clipboardBlock.value.type];
      if (!nodeType) return;
      const node = nodeType.create(
        clipboardBlock.value.attrs,
        clipboardBlock.value.content
          ? editor.value.schema.nodeFromJSON({ type: 'doc', content: clipboardBlock.value.content }).content
          : undefined
      );
      editor.value.chain().focus().insertContentAt(pos, node.toJSON()).run();
    } catch {
      // Fallback: insert as JSON content
      editor.value.chain().focus().insertContentAt(pos, clipboardBlock.value).run();
    }
  }

  function duplicateBlock() {
    const block = getSelectedBlock();
    if (!block || !editor.value) return;
    const json = block.node.toJSON();
    const endPos = block.pos + block.node.nodeSize;
    editor.value.chain().focus().insertContentAt(endPos, json).run();
  }

  function deleteBlock() {
    const block = getSelectedBlock();
    if (!block || !editor.value) return;
    const from = block.pos;
    const to = from + block.node.nodeSize;
    editor.value.chain().focus().deleteRange({ from, to }).run();
  }

  function handleKeydown(e: KeyboardEvent) {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    // Ctrl+S: Save
    if (isCtrl && e.key === 's') {
      e.preventDefault();
      onSave?.();
      return;
    }

    // Ctrl+Z: Undo (block-level if history provided)
    if (isCtrl && !isShift && e.key === 'z') {
      if (history && history.canUndo.value) {
        e.preventDefault();
        history.undo();
        return;
      }
      // Let TipTap handle text-level undo
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z: Redo
    if (isCtrl && (e.key === 'y' || (isShift && e.key === 'z') || (isShift && e.key === 'Z'))) {
      if (history && history.canRedo.value) {
        e.preventDefault();
        history.redo();
        return;
      }
      return;
    }

    // Ctrl+D: Duplicate block
    if (isCtrl && e.key === 'd') {
      e.preventDefault();
      duplicateBlock();
      return;
    }

    // Ctrl+Shift+M: Toggle mobile preview
    if (isCtrl && isShift && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      onToggleMobilePreview?.();
      return;
    }

    // ?: Show shortcuts help (only when not editing text or when Shift+? pressed)
    if (e.key === '?' && !isCtrl) {
      // Only trigger if not actively typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.getAttribute('contenteditable') === 'true';
      if (!isInput && !isContentEditable) {
        e.preventDefault();
        onShowHelp?.();
        return;
      }
    }

    // Ctrl+C on block (custom block copy, not text copy)
    if (isCtrl && e.key === 'c' && !isEditingText()) {
      copyBlock();
      // Don't preventDefault - let native copy still work for text
    }

    // Ctrl+V paste block (only if we have a block in clipboard and not editing text)
    if (isCtrl && e.key === 'v' && clipboardBlock.value && !isEditingText()) {
      e.preventDefault();
      pasteBlock();
      return;
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown);
  });

  return {
    clipboardBlock,
    copyBlock,
    pasteBlock,
    duplicateBlock,
    deleteBlock,
  };
}
