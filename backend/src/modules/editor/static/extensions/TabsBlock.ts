import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TabsBlockView from '../components/blocks/TabsBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const TabsBlock = Node.create({
  name: 'tabsBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      tabs: { default: '[{"title":"Tab 1","content":"Content for tab 1"},{"title":"Tab 2","content":"Content for tab 2"},{"title":"Tab 3","content":"Content for tab 3"}]' },
      defaultActive: { default: 0 },
      style: { default: 'default' },
      position: { default: 'top' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tabsBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tabsBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(TabsBlockView)
  },
})
