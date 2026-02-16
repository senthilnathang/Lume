/**
 * Edit mode composable for live page editing on the public site.
 * Manages edit state, dirty tracking, undo, and save/discard operations.
 */

interface EditModeState {
  active: boolean
  dirty: boolean
  saving: boolean
  pageId: number | null
  originalContent: any
  currentContent: any
  selectedBlockPath: number[]
  undoStack: any[]
  redoStack: any[]
  notification: { type: 'success' | 'error' | 'info'; message: string } | null
  version: number
}

const state = reactive<EditModeState>({
  active: false,
  dirty: false,
  saving: false,
  pageId: null,
  originalContent: null,
  currentContent: null,
  selectedBlockPath: [],
  undoStack: [],
  redoStack: [],
  notification: null,
  version: 0,
})

let notificationTimer: ReturnType<typeof setTimeout> | null = null

export function useEditMode() {
  const { token } = useAuth()
  const config = useRuntimeConfig()

  function enterEditMode(pageId: number, content: any) {
    state.active = true
    state.pageId = pageId
    state.originalContent = JSON.parse(JSON.stringify(content))
    state.currentContent = JSON.parse(JSON.stringify(content))
    state.dirty = false
    state.selectedBlockPath = []
    state.undoStack = []
    state.redoStack = []
    state.notification = null
  }

  function exitEditMode() {
    state.active = false
    state.dirty = false
    state.pageId = null
    state.originalContent = null
    state.currentContent = null
    state.selectedBlockPath = []
    state.undoStack = []
    state.redoStack = []
    state.notification = null
  }

  function updateContent(newContent: any) {
    // Push current state to undo stack
    state.undoStack.push(JSON.parse(JSON.stringify(state.currentContent)))
    if (state.undoStack.length > 50) state.undoStack.shift()
    state.redoStack = []
    state.currentContent = newContent
    state.dirty = true
  }

  function updateBlockAttrs(path: number[], key: string, value: any) {
    const content = JSON.parse(JSON.stringify(state.currentContent))
    let node = content
    for (const idx of path) {
      node = (node.content || [])[idx]
    }
    if (node && node.attrs) {
      // Push current to undo
      state.undoStack.push(JSON.parse(JSON.stringify(state.currentContent)))
      if (state.undoStack.length > 50) state.undoStack.shift()
      state.redoStack = []

      node.attrs[key] = value
      state.currentContent = content
      state.dirty = true
    }
  }

  function selectBlock(path: number[]) {
    state.selectedBlockPath = [...path]
  }

  function clearSelection() {
    state.selectedBlockPath = []
  }

  function undo() {
    if (state.undoStack.length === 0) return
    state.redoStack.push(JSON.parse(JSON.stringify(state.currentContent)))
    state.currentContent = state.undoStack.pop()
    state.dirty = JSON.stringify(state.currentContent) !== JSON.stringify(state.originalContent)
    state.version++
  }

  function redo() {
    if (state.redoStack.length === 0) return
    state.undoStack.push(JSON.parse(JSON.stringify(state.currentContent)))
    state.currentContent = state.redoStack.pop()
    state.dirty = true
    state.version++
  }

  function discard() {
    state.currentContent = JSON.parse(JSON.stringify(state.originalContent))
    state.dirty = false
    state.selectedBlockPath = []
    state.undoStack = []
    state.redoStack = []
    state.version++
    showNotification('info', 'Changes discarded')
  }

  function showNotification(type: 'success' | 'error' | 'info', message: string) {
    state.notification = { type, message }
    if (notificationTimer) clearTimeout(notificationTimer)
    notificationTimer = setTimeout(() => {
      state.notification = null
    }, 3000)
  }

  async function save() {
    if (!state.pageId || !state.currentContent || !token.value) return

    state.saving = true
    try {
      // Use the admin API (not public) to save
      const apiBase = (config.public.apiBase as string).replace('/public', '')
      await $fetch(`${apiBase}/pages/${state.pageId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token.value}` },
        body: {
          content: JSON.stringify(state.currentContent),
        },
      })

      state.originalContent = JSON.parse(JSON.stringify(state.currentContent))
      state.dirty = false
      state.undoStack = []
      state.redoStack = []
      showNotification('success', 'Page saved successfully')
    } catch (err: any) {
      showNotification('error', err?.data?.message || 'Failed to save page')
    } finally {
      state.saving = false
    }
  }

  function getBlockAtPath(path: number[]): any {
    let node = state.currentContent
    for (const idx of path) {
      node = (node?.content || [])[idx]
    }
    return node || null
  }

  return {
    // State
    active: computed(() => state.active),
    dirty: computed(() => state.dirty),
    saving: computed(() => state.saving),
    pageId: computed(() => state.pageId),
    currentContent: computed(() => state.currentContent),
    selectedBlockPath: computed(() => state.selectedBlockPath),
    canUndo: computed(() => state.undoStack.length > 0),
    canRedo: computed(() => state.redoStack.length > 0),
    notification: computed(() => state.notification),
    version: computed(() => state.version),

    // Actions
    enterEditMode,
    exitEditMode,
    updateContent,
    updateBlockAttrs,
    selectBlock,
    clearSelection,
    undo,
    redo,
    discard,
    save,
    getBlockAtPath,
  }
}
