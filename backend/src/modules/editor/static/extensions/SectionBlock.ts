import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SectionBlockView from '../components/blocks/SectionBlockView.vue'

export const SectionBlock = Node.create({
  name: 'sectionBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      backgroundColor: { default: 'transparent' },
      backgroundImage: { default: '' },
      paddingTop: { default: '40' },
      paddingBottom: { default: '40' },
      maxWidth: { default: '1200' },
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
