import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SlidesBlockView from '../components/blocks/SlidesBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const SlidesBlock = Node.create({
  name: 'slidesBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      slides: { default: '[{"bgImage":"","heading":"Welcome to Our Site","description":"Discover amazing content","buttonText":"Learn More","buttonUrl":"#"}]' },
      autoplay: { default: true },
      effect: { default: 'fade' },
      height: { default: 500 },
      overlayColor: { default: 'rgba(0,0,0,0.3)' },
      interval: { default: 5000 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="slidesBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'slidesBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(SlidesBlockView)
  },
})
