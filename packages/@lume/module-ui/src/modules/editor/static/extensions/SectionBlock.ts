import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SectionBlockView from '../components/blocks/SectionBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const SectionBlock = Node.create({
  name: 'sectionBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      backgroundColor: { default: 'transparent' },
      backgroundImage: { default: '' },
      paddingTop: { default: '40' },
      paddingBottom: { default: '40' },
      maxWidth: { default: '1200' },
      scrollSnap: { default: 'none' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="sectionBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'sectionBlock' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(SectionBlockView)
  },
})
