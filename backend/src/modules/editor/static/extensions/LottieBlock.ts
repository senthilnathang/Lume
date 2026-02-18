import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import LottieBlockView from '../components/blocks/LottieBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const LottieBlock = Node.create({
  name: 'lottieBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      jsonUrl: { default: '' },
      trigger: { default: 'none' },
      loop: { default: true },
      speed: { default: 1 },
      width: { default: '100%' },
      height: { default: '300px' },
      autoplay: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="lottieBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'lottieBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(LottieBlockView)
  },
})
