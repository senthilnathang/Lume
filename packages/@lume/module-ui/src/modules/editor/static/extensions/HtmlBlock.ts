import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import HtmlBlockView from '../components/blocks/HtmlBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const HtmlBlock = Node.create({
  name: 'htmlBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      content: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="htmlBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'htmlBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(HtmlBlockView)
  },
})
