import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import BlockquoteBlockView from '../components/blocks/BlockquoteBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const BlockquoteBlock = Node.create({
  name: 'blockquoteBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      content: { default: 'Quote text...' },
      author: { default: '' },
      authorTitle: { default: '' },
      authorImage: { default: '' },
      borderColor: { default: '#1677ff' },
      style: { default: 'default' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="blockquoteBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'blockquoteBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(BlockquoteBlockView)
  },
})
