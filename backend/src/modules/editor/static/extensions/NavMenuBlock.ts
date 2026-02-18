import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import NavMenuBlockView from '../components/blocks/NavMenuBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const NavMenuBlock = Node.create({
  name: 'navMenuBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      menuLocation: { default: 'main' },
      layout: { default: 'horizontal' },
      hamburgerBreakpoint: { default: 768 },
      mobileLayout: { default: 'dropdown' },
      fontSize: { default: 14 },
      color: { default: '#374151' },
      hoverColor: { default: '#1677ff' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="navMenuBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'navMenuBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(NavMenuBlockView)
  },
})
