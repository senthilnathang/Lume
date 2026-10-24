import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AdvancedHeadingBlockView from '../components/blocks/AdvancedHeadingBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const AdvancedHeadingBlock = Node.create({
  name: 'advancedHeading',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      text: { default: 'Heading' },
      tag: { default: 'h2' },
      alignment: { default: 'left' },
      color: { default: '#000000' },
      fontSize: { default: 32 },
      fontWeight: { default: '600' },
      separator: { default: 'none' }, // none, solid, dashed, dotted
      separatorColor: { default: '#e5e7eb' },
      separatorWidth: { default: 60 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="advancedHeading"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'advancedHeading' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(AdvancedHeadingBlockView)
  },
})
