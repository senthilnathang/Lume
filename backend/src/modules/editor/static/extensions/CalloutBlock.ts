import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CalloutBlockView from '../components/blocks/CalloutBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const CalloutBlock = Node.create({
  name: 'calloutBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      type: { default: 'info' }, // info, warning, success, error
      title: { default: '' },
      icon: { default: '' }, // auto from type if empty
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="calloutBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'calloutBlock' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(CalloutBlockView)
  },
})
