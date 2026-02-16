import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TestimonialBlockView from '../components/blocks/TestimonialBlockView.vue'

export const TestimonialBlock = Node.create({
  name: 'testimonial',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      quote: { default: 'This is an amazing product!' },
      authorName: { default: 'Jane Smith' },
      authorRole: { default: 'CEO, Company' },
      authorImage: { default: '' },
      rating: { default: 5 },
      style: { default: 'card' }, // card, minimal, bubble
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="testimonial"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'testimonial' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(TestimonialBlockView)
  },
})
