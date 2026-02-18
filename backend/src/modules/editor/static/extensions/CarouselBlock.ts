import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CarouselBlockView from '../components/blocks/CarouselBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const CarouselBlock = Node.create({
  name: 'carouselBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      slides: { default: '[]' },
      autoplay: { default: true },
      loop: { default: true },
      slidesPerView: { default: 1 },
      navigation: { default: true },
      pagination: { default: true },
      effect: { default: 'slide' }, // slide, fade, cube
      interval: { default: 3000 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="carouselBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'carouselBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(CarouselBlockView)
  },
})
