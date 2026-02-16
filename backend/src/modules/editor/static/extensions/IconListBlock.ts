import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import IconListBlockView from '../components/blocks/IconListBlockView.vue'

export const IconListBlock = Node.create({
  name: 'iconList',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: { default: [] },
      iconColor: { default: '#3b82f6' },
      iconSize: { default: 20 },
      layout: { default: 'vertical' }, // vertical, horizontal
      connector: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="iconList"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'iconList' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(IconListBlockView)
  },
})
