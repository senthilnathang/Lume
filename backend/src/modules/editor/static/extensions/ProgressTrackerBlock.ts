import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ProgressTrackerBlockView from '../components/blocks/ProgressTrackerBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const ProgressTrackerBlock = Node.create({
  name: 'progressTrackerBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      height: { default: 4 },
      color: { default: '#1677ff' },
      backgroundColor: { default: '#e5e7eb' },
      position: { default: 'top' },
      style: { default: 'bar' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="progressTrackerBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'progressTrackerBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ProgressTrackerBlockView)
  },
})
