import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import LoopGridBlockView from '../components/blocks/LoopGridBlockView.vue'

export const LoopGridBlock = Node.create({
  name: 'loopGridBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      query: { default: '{}' },
      columns: { default: 3 },
      gap: { default: 24 },
      cardTemplate: { default: '{}' },
      pagination: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="loop-grid-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'loop-grid-block' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(LoopGridBlockView)
  },
})
