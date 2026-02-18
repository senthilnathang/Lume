import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import StarRatingBlockView from '../components/blocks/StarRatingBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const StarRatingBlock = Node.create({
  name: 'starRatingBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      rating: { default: 4.5 },
      scale: { default: 5 },
      icon: { default: 'star' },
      size: { default: 24 },
      color: { default: '#f59e0b' },
      title: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="starRatingBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'starRatingBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(StarRatingBlockView)
  },
})
