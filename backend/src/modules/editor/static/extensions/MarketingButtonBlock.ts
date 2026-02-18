import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MarketingButtonBlockView from '../components/blocks/MarketingButtonBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const MarketingButtonBlock = Node.create({
  name: 'marketingButton',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      text: { default: 'Get Started' },
      subtext: { default: '' },
      url: { default: '' },
      icon: { default: '' },
      size: { default: 'md' },
      variant: { default: 'primary' },
      hoverEffect: { default: 'grow' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="marketingButton"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'marketingButton' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(MarketingButtonBlockView)
  },
})
