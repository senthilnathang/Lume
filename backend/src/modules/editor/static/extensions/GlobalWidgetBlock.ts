import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import GlobalWidgetBlockView from '../components/blocks/GlobalWidgetBlockView.vue'

export const GlobalWidgetBlock = Node.create({
  name: 'globalWidgetBlock',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      globalWidgetId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-global-widget-id'),
        renderHTML: (attributes) => ({
          'data-global-widget-id': attributes.globalWidgetId,
        }),
      },
      name: {
        default: 'Global Widget',
        parseHTML: (element) => element.getAttribute('data-name'),
        renderHTML: (attributes) => ({
          'data-name': attributes.name,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="global-widget-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'global-widget-block' }),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(GlobalWidgetBlockView)
  },
})
