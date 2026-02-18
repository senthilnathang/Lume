import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import PriceListBlockView from '../components/blocks/PriceListBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const PriceListBlock = Node.create({
  name: 'priceList',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      items: { default: [] },
      separator: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="priceList"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'priceList' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(PriceListBlockView)
  },
})
