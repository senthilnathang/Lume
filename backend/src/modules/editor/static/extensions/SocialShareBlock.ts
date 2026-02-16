import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SocialShareBlockView from '../components/blocks/SocialShareBlockView.vue'

export const SocialShareBlock = Node.create({
  name: 'socialShare',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      platforms: { default: [] },
      style: { default: 'icon' }, // icon, button, icon-text
      size: { default: 'md' }, // sm, md, lg
      alignment: { default: 'left' }, // left, center, right
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="socialShare"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'socialShare' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(SocialShareBlockView)
  },
})
