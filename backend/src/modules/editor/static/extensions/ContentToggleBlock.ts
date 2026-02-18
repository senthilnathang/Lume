import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ContentToggleBlockView from '../components/blocks/ContentToggleBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const ContentToggleBlock = Node.create({
  name: 'contentToggle',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      primaryLabel: { default: 'Option A' },
      secondaryLabel: { default: 'Option B' },
      primaryContent: { default: 'Content for option A' },
      secondaryContent: { default: 'Content for option B' },
      style: { default: 'switch' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="contentToggle"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'contentToggle' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ContentToggleBlockView)
  },
})
