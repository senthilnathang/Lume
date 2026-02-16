import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import DualHeadingBlockView from '../components/blocks/DualHeadingBlockView.vue'

export const DualHeadingBlock = Node.create({
  name: 'dualHeading',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      firstText: { default: 'Welcome to' },
      secondText: { default: 'Our Website' },
      tag: { default: 'h1' },
      firstColor: { default: '#000000' },
      secondColor: { default: '#3b82f6' },
      alignment: { default: 'center' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="dualHeading"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'dualHeading' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(DualHeadingBlockView)
  },
})
