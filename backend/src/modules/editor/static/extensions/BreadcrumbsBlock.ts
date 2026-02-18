import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import BreadcrumbsBlockView from '../components/blocks/BreadcrumbsBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const BreadcrumbsBlock = Node.create({
  name: 'breadcrumbsBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      separator: { default: '/' },
      homeLabel: { default: 'Home' },
      showCurrent: { default: true },
      fontSize: { default: 14 },
      color: { default: '#6b7280' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="breadcrumbsBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'breadcrumbsBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(BreadcrumbsBlockView)
  },
})
