import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ProgressBarBlockView from '../components/blocks/ProgressBarBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const ProgressBarBlock = Node.create({
  name: 'progressBar',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      items: { default: [] },
      style: { default: 'bar' },
      animated: { default: true },
      showPercentage: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="progressBar"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'progressBar' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ProgressBarBlockView)
  },
})
