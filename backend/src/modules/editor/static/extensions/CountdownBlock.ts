import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CountdownBlockView from '../components/blocks/CountdownBlockView.vue'

export const CountdownBlock = Node.create({
  name: 'countdown',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      targetDate: { default: '' },
      showLabels: { default: true },
      style: { default: 'simple' },
      expiredMessage: { default: 'Event has ended' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="countdown"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'countdown' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(CountdownBlockView)
  },
})
