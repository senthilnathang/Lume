import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import OffCanvasBlockView from '../components/blocks/OffCanvasBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const OffCanvasBlock = Node.create({
  name: 'offCanvasBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      triggerText: { default: 'Open Panel' },
      triggerVariant: { default: 'primary' }, // primary, outline, ghost
      direction: { default: 'right' }, // left, right
      width: { default: '400' },
      panelTitle: { default: 'Panel' },
      panelContent: { default: 'Your content here' },
      overlayColor: { default: 'rgba(0,0,0,0.5)' },
      showCloseButton: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="offCanvasBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'offCanvasBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(OffCanvasBlockView)
  },
})
