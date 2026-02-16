import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import InfoBoxBlockView from '../components/blocks/InfoBoxBlockView.vue'

export const InfoBoxBlock = Node.create({
  name: 'infoBox',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Info Box Title' },
      description: { default: 'Your description here' },
      icon: { default: 'info' },
      iconPosition: { default: 'top' }, // top, left, right
      iconColor: { default: '#3b82f6' },
      iconBgColor: { default: '#dbeafe' },
      linkUrl: { default: '' },
      linkText: { default: 'Learn More' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="infoBox"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'infoBox' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(InfoBoxBlockView)
  },
})
