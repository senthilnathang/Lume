import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import FlipBoxBlockView from '../components/blocks/FlipBoxBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const FlipBoxBlock = Node.create({
  name: 'flipBox',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      frontTitle: { default: 'Front Side' },
      frontDescription: { default: 'Hover to flip' },
      frontIcon: { default: 'layers' },
      frontBgColor: { default: '#ffffff' },
      backTitle: { default: 'Back Side' },
      backDescription: { default: 'More details here' },
      backBgColor: { default: '#3b82f6' },
      backTextColor: { default: '#ffffff' },
      flipDirection: { default: 'horizontal' }, // horizontal, vertical
      height: { default: 280 },
      backLinkUrl: { default: '' },
      backLinkText: { default: 'Learn More' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="flipBox"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'flipBox' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(FlipBoxBlockView)
  },
})
