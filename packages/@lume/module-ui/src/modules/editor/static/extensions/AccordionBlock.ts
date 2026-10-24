import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AccordionBlockView from '../components/blocks/AccordionBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const AccordionBlock = Node.create({
  name: 'accordionBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      items: { default: '[{"title":"Section 1","content":"Content for section 1","icon":""},{"title":"Section 2","content":"Content for section 2","icon":""},{"title":"Section 3","content":"Content for section 3","icon":""}]' },
      allowMultiple: { default: false },
      defaultOpen: { default: 0 },
      style: { default: 'default' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="accordionBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'accordionBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(AccordionBlockView)
  },
})
