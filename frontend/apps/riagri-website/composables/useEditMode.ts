/**
 * Edit mode composable for live page editing on the public site.
 * Manages edit state, dirty tracking, undo, autosave, and save/discard operations.
 */

interface EditModeState {
  active: boolean
  dirty: boolean
  saving: boolean
  autosaving: boolean
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
  autosaving: false,
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
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let lastSavedHash: string = ''

/**
 * Compute a lightweight hash string from content for change detection.
 */
function contentHash(content: any): string {
  return JSON.stringify(content)
}

/**
 * Standalone toast helper that Overlay.vue (and other components) can import
 * without calling useEditMode() and triggering composable context requirements.
 */
export function showToast(type: 'success' | 'error' | 'info', message: string) {
  state.notification = { type, message }
  if (notificationTimer) clearTimeout(notificationTimer)
  notificationTimer = setTimeout(() => {
    state.notification = null
  }, 3000)
}

export function useEditMode() {
  const { token } = useAuth()
  const config = useRuntimeConfig()

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getAdminApiBase(): string {
    return (config.public.apiBase as string).replace('/public', '')
  }

  function showNotification(type: 'success' | 'error' | 'info', message: string) {
    showToast(type, message)
  }

  // ── Before-unload guard ───────────────────────────────────────────────────

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (state.dirty) {
      e.preventDefault()
      // Legacy support for older browsers
      e.returnValue = ''
    }
  }

  function attachBeforeUnload() {
    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  function detachBeforeUnload() {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  // ── Autosave ──────────────────────────────────────────────────────────────

  /**
   * Schedule a debounced autosave 3 seconds after the last content change.
   * Only fires when content has actually changed since the last save.
   */
  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(async () => {
      if (!state.pageId || !state.currentContent || !token.value) return

      const currentHash = contentHash(state.currentContent)
      if (currentHash === lastSavedHash) return // nothing changed since last save

      state.autosaving = true
      try {
        await $fetch(`${getAdminApiBase()}/pages/${state.pageId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token.value}` },
          body: { content: JSON.stringify(state.currentContent) },
        })
        lastSavedHash = currentHash
        // Update originalContent so undo-dirty calc stays correct
        // but keep dirty=true so the user still sees the "unsaved" UI
        // until they explicitly press Save.
      } catch {
        // Autosave failure is silent — user can still save manually
      } finally {
        state.autosaving = false
      }
    }, 3000)
  }

  function cancelAutosave() {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
  }

  // ── Lifecycle helpers (call from the consuming component) ─────────────────

  /**
   * Call inside the component that activates edit mode so that cleanup
   * (beforeunload listener + pending autosave timer) happens on unmount.
   */
  function registerCleanup() {
    onBeforeUnmount(() => {
      detachBeforeUnload()
      cancelAutosave()
    })
  }

  // ── Core actions ──────────────────────────────────────────────────────────

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
    lastSavedHash = contentHash(content)
    attachBeforeUnload()
  }

  function exitEditMode() {
    detachBeforeUnload()
    cancelAutosave()
    state.active = false
    state.dirty = false
    state.saving = false
    state.autosaving = false
    state.pageId = null
    state.originalContent = null
    state.currentContent = null
    state.selectedBlockPath = []
    state.undoStack = []
    state.redoStack = []
    state.notification = null
    lastSavedHash = ''
  }

  function updateContent(newContent: any) {
    // Push current state to undo stack
    state.undoStack.push(JSON.parse(JSON.stringify(state.currentContent)))
    if (state.undoStack.length > 50) state.undoStack.shift()
    state.redoStack = []
    state.currentContent = newContent
    state.dirty = true
    scheduleAutosave()
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
      scheduleAutosave()
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
    if (state.dirty) scheduleAutosave()
    else cancelAutosave()
  }

  function redo() {
    if (state.redoStack.length === 0) return
    state.undoStack.push(JSON.parse(JSON.stringify(state.currentContent)))
    state.currentContent = state.redoStack.pop()
    state.dirty = true
    state.version++
    scheduleAutosave()
  }

  function discard() {
    cancelAutosave()
    state.currentContent = JSON.parse(JSON.stringify(state.originalContent))
    state.dirty = false
    state.selectedBlockPath = []
    state.undoStack = []
    state.redoStack = []
    state.version++
    lastSavedHash = contentHash(state.currentContent)
    showNotification('info', 'Changes discarded')
  }

  async function save() {
    if (!state.pageId || !state.currentContent || !token.value) return

    cancelAutosave() // No need to autosave — we're saving now
    state.saving = true
    try {
      await $fetch(`${getAdminApiBase()}/pages/${state.pageId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token.value}` },
        body: {
          content: JSON.stringify(state.currentContent),
        },
      })

      state.originalContent = JSON.parse(JSON.stringify(state.currentContent))
      lastSavedHash = contentHash(state.currentContent)
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
    autosaving: computed(() => state.autosaving),
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
    registerCleanup,
  }
}
