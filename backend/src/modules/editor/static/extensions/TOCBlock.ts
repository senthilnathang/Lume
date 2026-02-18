import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TOCBlockView from '../components/blocks/TOCBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const TOCBlock = Node.create({
  name: 'tocBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      title: { default: 'Table of Contents' },
      maxDepth: {
        default: 3,
        parseHTML: (el) => parseInt(el.getAttribute('data-max-depth') || '3', 10),
        renderHTML: (attrs) => ({ 'data-max-depth': attrs.maxDepth }),
      },
      displayStyle: { default: 'list' }, // list, numbered, dots
      sticky: { default: false },
      smoothScroll: { default: true },
      collapsible: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tocBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tocBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(TOCBlockView)
  },
})
