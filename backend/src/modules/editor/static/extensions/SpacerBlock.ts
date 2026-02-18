import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SpacerBlockView from '../components/blocks/SpacerBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const SpacerBlock = Node.create({
  name: 'spacerBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      height: { default: '40' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="spacerBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'spacerBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(SpacerBlockView)
  },
})
