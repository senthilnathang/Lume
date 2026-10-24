import { ref, computed, type Ref } from 'vue';

interface HistoryEntry {
  description: string;
  snapshot: Record<string, any>;
  timestamp: number;
}

const MAX_HISTORY = 50;

export function useEditorHistory(editor: Ref<any>) {
  const undoStack = ref<HistoryEntry[]>([]);
  const redoStack = ref<HistoryEntry[]>([]);
  const isProgrammatic = ref(false);

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  const currentDescription = computed(() => {
    const last = undoStack.value[undoStack.value.length - 1];
    return last?.description || '';
  });

  function takeSnapshot(): Record<string, any> | null {
    if (!editor.value) return null;
    return editor.value.getJSON();
  }

  function push(description: string, snapshot?: Record<string, any>) {
    const snap = snapshot || takeSnapshot();
    if (!snap) return;

    undoStack.value.push({
      description,
      snapshot: JSON.parse(JSON.stringify(snap)),
      timestamp: Date.now(),
    });

    // Trim to max
    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value = undoStack.value.slice(-MAX_HISTORY);
    }

    // Clear redo stack on new action
    redoStack.value = [];
  }

  function undo() {
    if (!canUndo.value || !editor.value) return;

    // Save current state to redo stack
    const currentSnap = takeSnapshot();
    if (currentSnap) {
      redoStack.value.push({
        description: 'Redo',
        snapshot: JSON.parse(JSON.stringify(currentSnap)),
        timestamp: Date.now(),
      });
    }

    const entry = undoStack.value.pop()!;
    isProgrammatic.value = true;
    editor.value.commands.setContent(entry.snapshot, false);
    isProgrammatic.value = false;
  }

  function redo() {
    if (!canRedo.value || !editor.value) return;

    // Save current state to undo stack
    const currentSnap = takeSnapshot();
    if (currentSnap) {
      undoStack.value.push({
        description: 'Undo',
        snapshot: JSON.parse(JSON.stringify(currentSnap)),
        timestamp: Date.now(),
      });
    }

    const entry = redoStack.value.pop()!;
    isProgrammatic.value = true;
    editor.value.commands.setContent(entry.snapshot, false);
    isProgrammatic.value = false;
  }

  function clear() {
    undoStack.value = [];
    redoStack.value = [];
  }

  // Watch editor transactions and auto-snapshot on block-level changes
  let lastChildCount = 0;
  let lastBlockTypes = '';
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function startWatching() {
    if (!editor.value) return;

    lastChildCount = editor.value.state.doc.childCount;
    lastBlockTypes = getBlockSignature(editor.value);

    // Save initial state
    push('Initial state');

    editor.value.on('transaction', ({ transaction }: any) => {
      if (isProgrammatic.value) return;
      if (!transaction.docChanged) return;

      const currentCount = editor.value.state.doc.childCount;
      const currentTypes = getBlockSignature(editor.value);

      let description = '';

      if (currentCount > lastChildCount) {
        description = 'Add block';
      } else if (currentCount < lastChildCount) {
        description = 'Delete block';
      } else if (currentTypes !== lastBlockTypes) {
        description = 'Move block';
      } else {
        // Attribute or content change - debounce these
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          push('Edit block');
          lastChildCount = editor.value?.state.doc.childCount || 0;
          lastBlockTypes = editor.value ? getBlockSignature(editor.value) : '';
        }, 500);
        return;
      }

      if (description) {
        push(description);
        lastChildCount = currentCount;
        lastBlockTypes = currentTypes;
      }
    });
  }

  function stopWatching() {
    if (debounceTimer) clearTimeout(debounceTimer);
  }

  return {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    currentDescription,
    push,
    undo,
    redo,
    clear,
    startWatching,
    stopWatching,
  };
}

function getBlockSignature(editor: any): string {
  const doc = editor.state.doc;
  const types: string[] = [];
  doc.forEach((node: any) => {
    types.push(node.type.name);
  });
  return types.join(',');
}
