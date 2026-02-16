import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import FaqBlockView from '../components/blocks/FaqBlockView.vue'

export const FaqBlock = Node.create({
  name: 'faq',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: { default: [] },
      style: { default: 'accordion' }, // accordion, list
      iconPosition: { default: 'right' }, // left, right
      activeColor: { default: '#3b82f6' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="faq"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'faq' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(FaqBlockView)
  },
})
