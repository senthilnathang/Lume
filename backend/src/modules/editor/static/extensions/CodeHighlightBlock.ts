import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CodeHighlightBlockView from '../components/blocks/CodeHighlightBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const CodeHighlightBlock = Node.create({
  name: 'codeHighlightBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      code: { default: '' },
      language: { default: 'javascript' },
      theme: { default: 'dark' },
      lineNumbers: { default: true },
      copyButton: { default: true },
      maxHeight: { default: 400 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="codeHighlightBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'codeHighlightBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(CodeHighlightBlockView)
  },
})
