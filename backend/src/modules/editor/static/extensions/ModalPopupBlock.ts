import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ModalPopupBlockView from '../components/blocks/ModalPopupBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const ModalPopupBlock = Node.create({
  name: 'modalPopup',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      triggerText: { default: 'Open Modal' },
      triggerVariant: { default: 'primary' },
      modalTitle: { default: 'Modal Title' },
      modalContent: { default: 'Your modal content here' },
      modalWidth: { default: 'md' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="modalPopup"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'modalPopup' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ModalPopupBlockView)
  },
})
