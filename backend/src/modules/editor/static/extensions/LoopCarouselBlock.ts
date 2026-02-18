import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import LoopCarouselBlockView from '../components/blocks/LoopCarouselBlockView.vue'

export const LoopCarouselBlock = Node.create({
  name: 'loopCarouselBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      query: { default: '{}' },
      effect: { default: 'slide' },
      autoplay: { default: false },
      height: { default: 400 },
      cardTemplate: { default: '{}' },
      pagination: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="loop-carousel-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'loop-carousel-block' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(LoopCarouselBlockView)
  },
})
