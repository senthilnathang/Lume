import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import PriceTableBlockView from '../components/blocks/PriceTableBlockView.vue'

export const PriceTableBlock = Node.create({
  name: 'priceTable',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Basic Plan' },
      price: { default: '$29' },
      period: { default: '/month' },
      features: { default: [] },
      ctaText: { default: 'Get Started' },
      ctaUrl: { default: '' },
      highlighted: { default: false },
      ribbonText: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="priceTable"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'priceTable' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(PriceTableBlockView)
  },
})
