import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ColumnBlockView from '../components/blocks/ColumnBlockView.vue'

export const ColumnBlock = Node.create({
  name: 'columnBlock',
  group: '',  // Not a standalone block, only inside columnsBlock
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      width: { default: '' }, // e.g., '50%', '33.33%', custom
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columnBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columnBlock' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(ColumnBlockView)
  },
})
