import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SearchFormBlockView from '../components/blocks/SearchFormBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const SearchFormBlock = Node.create({
  name: 'searchFormBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      placeholder: { default: 'Search...' },
      style: { default: 'default' },
      buttonText: { default: 'Search' },
      showButton: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="searchFormBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'searchFormBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(SearchFormBlockView)
  },
})
