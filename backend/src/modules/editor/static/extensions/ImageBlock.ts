import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ImageBlockView from '../components/blocks/ImageBlockView.vue'

export const ImageBlock = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,  // Treated as a single unit
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      alignment: { default: 'center' }, // left, center, right, full
      link: { default: '' },
      width: { default: '100%' },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="imageBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes, { 'data-type': 'imageBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageBlockView)
  },
})
