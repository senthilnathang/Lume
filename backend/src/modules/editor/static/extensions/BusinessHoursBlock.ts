import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import BusinessHoursBlockView from '../components/blocks/BusinessHoursBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const BusinessHoursBlock = Node.create({
  name: 'businessHours',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      title: { default: 'Business Hours' },
      days: { default: [] },
      highlightToday: { default: true },
      closedLabel: { default: 'Closed' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="businessHours"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'businessHours' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(BusinessHoursBlockView)
  },
})
