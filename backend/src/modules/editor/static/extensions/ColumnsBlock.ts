import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ColumnsBlockView from '../components/blocks/ColumnsBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const ColumnsBlock = Node.create({
  name: 'columnsBlock',
  group: 'block',
  content: 'columnBlock{2,4}',  // 2-4 columns
  defining: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      columns: { default: 2 },
      gap: { default: '24' },
      layout: { default: 'equal' }, // 'equal', '1-2', '2-1', '1-1-1', '1-2-1'
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columnsBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columnsBlock' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(ColumnsBlockView)
  },
})
