import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import DynamicTagBlockView from '../components/blocks/DynamicTagBlockView.vue'

export const DynamicTagBlock = Node.create({
  name: 'dynamicTag',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      tagName: { default: 'site_name' },
      fieldKey: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="dynamicTag"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'dynamicTag' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(DynamicTagBlockView)
  },
})
