import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import FloatingButtonsBlockView from '../components/blocks/FloatingButtonsBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const FloatingButtonsBlock = Node.create({
  name: 'floatingButtonsBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      buttons: { default: '[{"type":"whatsapp","label":"WhatsApp","url":"","icon":"","color":"#25d366"},{"type":"phone","label":"Call Us","url":"","icon":"","color":"#1677ff"}]' },
      position: { default: 'bottom-right' },
      style: { default: 'circle' },
      showLabels: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="floatingButtonsBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'floatingButtonsBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(FloatingButtonsBlockView)
  },
})
