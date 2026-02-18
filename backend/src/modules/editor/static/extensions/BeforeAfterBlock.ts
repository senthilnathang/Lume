import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import BeforeAfterBlockView from '../components/blocks/BeforeAfterBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const BeforeAfterBlock = Node.create({
  name: 'beforeAfterBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      beforeImage: { default: '' },
      afterImage: { default: '' },
      beforeLabel: { default: 'Before' },
      afterLabel: { default: 'After' },
      orientation: { default: 'horizontal' },
      handleColor: { default: '#ffffff' },
      handleWidth: { default: 4 },
      startPosition: { default: 50 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="beforeAfterBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'beforeAfterBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(BeforeAfterBlockView)
  },
})
