import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CounterBlockView from '../components/blocks/CounterBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const CounterBlock = Node.create({
  name: 'counterBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      startValue: { default: 0 },
      endValue: { default: 100 },
      prefix: { default: '' },
      suffix: { default: '' },
      duration: { default: 2000 },
      separator: { default: true },
      tag: { default: 'h2' },
      color: { default: '#1677ff' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="counterBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'counterBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(CounterBlockView)
  },
})
