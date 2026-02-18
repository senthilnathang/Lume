import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AnimatedHeadlineBlockView from '../components/blocks/AnimatedHeadlineBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const AnimatedHeadlineBlock = Node.create({
  name: 'animatedHeadline',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      beforeText: { default: 'This is' },
      rotatingTexts: { default: '["Amazing","Creative","Beautiful"]' },
      afterText: { default: '' },
      effect: { default: 'typing' }, // typing, fade, slide, clip, rotate
      speed: { default: 2000 },
      tag: { default: 'h2' }, // h1-h6
      color: { default: '#3b82f6' },
      alignment: { default: 'center' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="animatedHeadline"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'animatedHeadline' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(AnimatedHeadlineBlockView)
  },
})
