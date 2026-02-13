/**
 * Drag and Drop Composable
 *
 * Provides drag and drop functionality for file uploads and reordering.
 *
 * Usage:
 * ```ts
 * import { useDragAndDrop, useDropZone } from '#/composables';
 *
 * // For file drops
 * const dropZone = ref<HTMLElement>();
 * const { isDragging, files } = useDropZone(dropZone, {
 *   onDrop: (files) => handleFiles(files),
 * });
 *
 * // For reorderable lists
 * const { dragging, dragStart, dragEnd, dragOver } = useDragAndDrop({
 *   onReorder: (from, to) => reorderList(from, to),
 * });
 * ```
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue';

// ============= Drop Zone =============

export interface DropZoneOptions {
  /** Callback when files are dropped */
  onDrop?: (files: File[]) => void;
  /** Callback when drag enters */
  onDragEnter?: () => void;
  /** Callback when drag leaves */
  onDragLeave?: () => void;
  /** Accepted file types */
  accept?: string[];
  /** Allow multiple files */
  multiple?: boolean;
  /** Prevent default behavior */
  preventDefault?: boolean;
}

export interface UseDropZoneReturn {
  /** Whether dragging over zone */
  isDragging: Ref<boolean>;
  /** Dropped files */
  files: Ref<File[]>;
  /** Clear dropped files */
  clear: () => void;
}

/**
 * Drop zone composable
 */
export function useDropZone(
  target: Ref<HTMLElement | undefined>,
  options: DropZoneOptions = {},
): UseDropZoneReturn {
  const {
    onDrop,
    onDragEnter,
    onDragLeave,
    accept,
    multiple = true,
    preventDefault = true,
  } = options;

  const isDragging = ref(false);
  const files = ref<File[]>([]);

  let dragCounter = 0;

  /**
   * Filter files by accepted types
   */
  function filterFiles(fileList: FileList): File[] {
    const result: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]!;

      if (accept && accept.length > 0) {
        const isValid = accept.some((type) => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.endsWith('/*')) {
            const category = type.replace('/*', '');
            return file.type.startsWith(category);
          }
          return file.type === type;
        });

        if (!isValid) continue;
      }

      result.push(file);

      if (!multiple) break;
    }

    return result;
  }

  function handleDragEnter(e: DragEvent): void {
    if (preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }

    dragCounter++;
    if (dragCounter === 1) {
      isDragging.value = true;
      onDragEnter?.();
    }
  }

  function handleDragLeave(e: DragEvent): void {
    if (preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }

    dragCounter--;
    if (dragCounter === 0) {
      isDragging.value = false;
      onDragLeave?.();
    }
  }

  function handleDragOver(e: DragEvent): void {
    if (preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleDrop(e: DragEvent): void {
    if (preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }

    dragCounter = 0;
    isDragging.value = false;

    if (e.dataTransfer?.files) {
      const droppedFiles = filterFiles(e.dataTransfer.files);
      files.value = droppedFiles;
      onDrop?.(droppedFiles);
    }
  }

  function clear(): void {
    files.value = [];
  }

  onMounted(() => {
    const el = target.value;
    if (!el) return;

    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);
  });

  onUnmounted(() => {
    const el = target.value;
    if (!el) return;

    el.removeEventListener('dragenter', handleDragEnter);
    el.removeEventListener('dragleave', handleDragLeave);
    el.removeEventListener('dragover', handleDragOver);
    el.removeEventListener('drop', handleDrop);
  });

  return {
    isDragging,
    files,
    clear,
  };
}

// ============= Drag and Drop List =============

export interface DragAndDropOptions<T> {
  /** Callback when item is reordered */
  onReorder?: (from: number, to: number, item: T) => void;
  /** Callback when drag starts */
  onDragStart?: (index: number, item: T) => void;
  /** Callback when drag ends */
  onDragEnd?: (index: number, item: T) => void;
  /** Data transfer type */
  dataType?: string;
}

export interface UseDragAndDropReturn<T> {
  /** Currently dragging item index */
  draggingIndex: Ref<number | null>;
  /** Currently dragging over index */
  dragOverIndex: Ref<number | null>;
  /** Whether currently dragging */
  isDragging: Ref<boolean>;
  /** Start dragging an item */
  dragStart: (e: DragEvent, index: number, item: T) => void;
  /** End dragging */
  dragEnd: (e: DragEvent) => void;
  /** Drag over an item */
  dragOver: (e: DragEvent, index: number) => void;
  /** Drop on an item */
  drop: (e: DragEvent, index: number) => void;
  /** Get drag handle props */
  getDragHandleProps: (index: number, item: T) => Record<string, any>;
  /** Get droppable props */
  getDroppableProps: (index: number) => Record<string, any>;
}

/**
 * Drag and drop list composable
 */
export function useDragAndDrop<T>(
  options: DragAndDropOptions<T> = {},
): UseDragAndDropReturn<T> {
  const { onReorder, onDragStart, onDragEnd, dataType = 'text/plain' } = options;

  const draggingIndex = ref<number | null>(null);
  const dragOverIndex = ref<number | null>(null);
  const currentItem = ref<T | null>(null);

  const isDragging = ref(false);

  function dragStart(e: DragEvent, index: number, item: T): void {
    draggingIndex.value = index;
    currentItem.value = item;
    isDragging.value = true;

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(dataType, String(index));
    }

    onDragStart?.(index, item);
  }

  function dragEnd(_e: DragEvent): void {
    const fromIndex = draggingIndex.value;
    const item = currentItem.value;

    draggingIndex.value = null;
    dragOverIndex.value = null;
    currentItem.value = null;
    isDragging.value = false;

    if (fromIndex !== null && item !== null) {
      onDragEnd?.(fromIndex, item as T);
    }
  }

  function dragOver(e: DragEvent, index: number): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    dragOverIndex.value = index;
  }

  function drop(e: DragEvent, toIndex: number): void {
    e.preventDefault();

    const fromIndex = draggingIndex.value;
    const item = currentItem.value;

    if (fromIndex !== null && fromIndex !== toIndex && item !== null) {
      onReorder?.(fromIndex, toIndex, item as T);
    }

    draggingIndex.value = null;
    dragOverIndex.value = null;
    currentItem.value = null;
    isDragging.value = false;
  }

  function getDragHandleProps(index: number, item: T): Record<string, any> {
    return {
      draggable: true,
      onDragstart: (e: DragEvent) => dragStart(e, index, item),
      onDragend: dragEnd,
    };
  }

  function getDroppableProps(index: number): Record<string, any> {
    return {
      onDragover: (e: DragEvent) => dragOver(e, index),
      onDrop: (e: DragEvent) => drop(e, index),
    };
  }

  return {
    draggingIndex,
    dragOverIndex,
    isDragging,
    dragStart,
    dragEnd,
    dragOver,
    drop,
    getDragHandleProps,
    getDroppableProps,
  };
}

/**
 * Reorder array helper
 */
export function reorderArray<T>(array: T[], from: number, to: number): T[] {
  const result = [...array];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed as T);
  return result;
}

export default useDragAndDrop;
