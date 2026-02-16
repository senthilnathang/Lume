import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ButtonBlockView from '../components/blocks/ButtonBlockView.vue'

export const ButtonBlock = Node.create({
  name: 'buttonBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      text: { default: 'Click me' },
      url: { default: '#' },
      variant: { default: 'primary' }, // primary, outline, ghost, danger
      size: { default: 'md' }, // sm, md, lg
      alignment: { default: 'left' }, // left, center, right
      fullWidth: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="buttonBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'buttonBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ButtonBlockView)
  },
})
