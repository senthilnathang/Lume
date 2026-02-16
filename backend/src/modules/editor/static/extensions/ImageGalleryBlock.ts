import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ImageGalleryBlockView from '../components/blocks/ImageGalleryBlockView.vue'

export const ImageGalleryBlock = Node.create({
  name: 'imageGallery',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      images: { default: [] },
      columns: { default: 3 },
      gap: { default: '16px' },
      lightbox: { default: true },
      style: { default: 'grid' }, // grid, masonry
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="imageGallery"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'imageGallery' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageGalleryBlockView)
  },
})
