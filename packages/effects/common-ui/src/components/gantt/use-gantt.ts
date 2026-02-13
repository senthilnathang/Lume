import { computed, ref, type Ref } from 'vue';

import type {
  GanttDateRange,
  GanttTask,
  GanttTaskMoveEvent,
  GanttTaskResizeEvent,
  GanttViewMode,
} from './types';

export interface UseGanttOptions<T = any> {
  tasks: GanttTask<T>[];
  viewMode?: GanttViewMode;
  onTaskMove?: (event: GanttTaskMoveEvent) => void | Promise<void>;
  onTaskResize?: (event: GanttTaskResizeEvent) => void | Promise<void>;
}

export interface UseGanttReturn<T = any> {
  tasks: Ref<GanttTask<T>[]>;
  viewMode: Ref<GanttViewMode>;
  dateRange: Ref<GanttDateRange>;
  loading: Ref<boolean>;
  selectedTaskId: Ref<string | number | null>;

  // Computed
  flatTasks: Ref<GanttTask<T>[]>;
  taskMap: Ref<Map<string | number, GanttTask<T>>>;

  // Methods
  addTask: (task: GanttTask<T>) => void;
  removeTask: (taskId: string | number) => GanttTask<T> | undefined;
  updateTask: (taskId: string | number, updates: Partial<GanttTask<T>>) => void;
  findTask: (taskId: string | number) => GanttTask<T> | undefined;
  getChildTasks: (parentId: string | number) => GanttTask<T>[];
  setViewMode: (mode: GanttViewMode) => void;
  setDateRange: (range: GanttDateRange) => void;
  selectTask: (taskId: string | number | null) => void;
  toggleTaskCollapse: (taskId: string | number) => void;
  handleTaskMove: (event: GanttTaskMoveEvent) => Promise<void>;
  handleTaskResize: (event: GanttTaskResizeEvent) => Promise<void>;
  calculateProgress: (taskId: string | number) => number;
  getDependentTasks: (taskId: string | number) => GanttTask<T>[];
  scrollToTask: (taskId: string | number) => void;
  scrollToToday: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export function useGantt<T = any>(options: UseGanttOptions<T>): UseGanttReturn<T> {
  const tasks = ref<GanttTask<T>[]>(options.tasks) as Ref<GanttTask<T>[]>;
  const viewMode = ref<GanttViewMode>(options.viewMode || 'week');
  const loading = ref(false);
  const selectedTaskId = ref<string | number | null>(null);

  // Calculate initial date range from tasks
  const calculateDateRange = (): GanttDateRange => {
    if (tasks.value.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 3, 0),
      };
    }

    let minDate = new Date(tasks.value[0]!.start);
    let maxDate = new Date(tasks.value[0]!.end);

    for (const task of tasks.value) {
      const taskStart = new Date(task.start);
      const taskEnd = new Date(task.end);
      if (taskStart < minDate) minDate = taskStart;
      if (taskEnd > maxDate) maxDate = taskEnd;
    }

    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    return { start: minDate, end: maxDate };
  };

  const dateRange = ref<GanttDateRange>(calculateDateRange());

  // Build task map for quick lookups
  const taskMap = computed(() => {
    const map = new Map<string | number, GanttTask<T>>();
    const addToMap = (taskList: GanttTask<T>[]) => {
      for (const task of taskList) {
        map.set(task.id, task);
      }
    };
    addToMap(tasks.value);
    return map;
  });

  // Flatten tasks for display (respecting collapsed state)
  const flatTasks = computed(() => {
    const result: GanttTask<T>[] = [];
    const collapsedParents = new Set<string | number>();

    // First pass: identify collapsed parents
    for (const task of tasks.value) {
      if (task.collapsed) {
        collapsedParents.add(task.id);
      }
    }

    // Second pass: build flat list excluding children of collapsed parents
    const isVisible = (task: GanttTask<T>): boolean => {
      if (!task.parentId) return true;
      if (collapsedParents.has(task.parentId)) return false;
      const parent = taskMap.value.get(task.parentId);
      return parent ? isVisible(parent) : true;
    };

    for (const task of tasks.value) {
      if (isVisible(task)) {
        result.push(task);
      }
    }

    return result;
  });

  // Find task by ID
  function findTask(taskId: string | number): GanttTask<T> | undefined {
    return taskMap.value.get(taskId);
  }

  // Add a new task
  function addTask(task: GanttTask<T>) {
    tasks.value.push(task);
  }

  // Remove a task
  function removeTask(taskId: string | number): GanttTask<T> | undefined {
    const index = tasks.value.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const [removed] = tasks.value.splice(index, 1);
      return removed;
    }
    return undefined;
  }

  // Update a task
  function updateTask(taskId: string | number, updates: Partial<GanttTask<T>>) {
    const task = findTask(taskId);
    if (task) {
      Object.assign(task, updates);
    }
  }

  // Get child tasks
  function getChildTasks(parentId: string | number): GanttTask<T>[] {
    return tasks.value.filter(t => t.parentId === parentId);
  }

  // Set view mode
  function setViewMode(mode: GanttViewMode) {
    viewMode.value = mode;
  }

  // Set date range
  function setDateRange(range: GanttDateRange) {
    dateRange.value = range;
  }

  // Select a task
  function selectTask(taskId: string | number | null) {
    selectedTaskId.value = taskId;
  }

  // Toggle task collapse
  function toggleTaskCollapse(taskId: string | number) {
    const task = findTask(taskId);
    if (task) {
      task.collapsed = !task.collapsed;
    }
  }

  // Handle task move
  async function handleTaskMove(event: GanttTaskMoveEvent) {
    loading.value = true;
    try {
      updateTask(event.task.id, {
        start: event.newStart,
        end: event.newEnd,
      });

      if (options.onTaskMove) {
        await options.onTaskMove(event);
      }
    } finally {
      loading.value = false;
    }
  }

  // Handle task resize
  async function handleTaskResize(event: GanttTaskResizeEvent) {
    loading.value = true;
    try {
      updateTask(event.task.id, { end: event.newEnd });

      if (options.onTaskResize) {
        await options.onTaskResize(event);
      }
    } finally {
      loading.value = false;
    }
  }

  // Calculate progress for parent tasks based on children
  function calculateProgress(taskId: string | number): number {
    const children = getChildTasks(taskId);
    if (children.length === 0) {
      const task = findTask(taskId);
      return task?.progress || 0;
    }

    let totalDuration = 0;
    let completedDuration = 0;

    for (const child of children) {
      const start = new Date(child.start).getTime();
      const end = new Date(child.end).getTime();
      const duration = end - start;
      const progress = child.progress || 0;

      totalDuration += duration;
      completedDuration += duration * (progress / 100);
    }

    return totalDuration > 0 ? Math.round((completedDuration / totalDuration) * 100) : 0;
  }

  // Get tasks that depend on a given task
  function getDependentTasks(taskId: string | number): GanttTask<T>[] {
    return tasks.value.filter(t =>
      t.dependencies?.includes(taskId)
    );
  }

  // Scroll to a task (to be implemented by component)
  function scrollToTask(_taskId: string | number) {
    // Implementation in component
  }

  // Scroll to today
  function scrollToToday() {
    // Implementation in component
  }

  // Zoom in (decrease time unit)
  function zoomIn() {
    const modes: GanttViewMode[] = ['year', 'quarter', 'month', 'week', 'day'];
    const currentIndex = modes.indexOf(viewMode.value);
    if (currentIndex < modes.length - 1) {
      viewMode.value = modes[currentIndex + 1]!;
    }
  }

  // Zoom out (increase time unit)
  function zoomOut() {
    const modes: GanttViewMode[] = ['year', 'quarter', 'month', 'week', 'day'];
    const currentIndex = modes.indexOf(viewMode.value);
    if (currentIndex > 0) {
      viewMode.value = modes[currentIndex - 1]!;
    }
  }

  return {
    tasks,
    viewMode,
    dateRange,
    loading,
    selectedTaskId,
    flatTasks,
    taskMap,
    addTask,
    removeTask,
    updateTask,
    findTask,
    getChildTasks,
    setViewMode,
    setDateRange,
    selectTask,
    toggleTaskCollapse,
    handleTaskMove,
    handleTaskResize,
    calculateProgress,
    getDependentTasks,
    scrollToTask,
    scrollToToday,
    zoomIn,
    zoomOut,
  };
}
