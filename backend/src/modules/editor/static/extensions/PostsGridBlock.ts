import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import PostsGridBlockView from '../components/blocks/PostsGridBlockView.vue'

export const PostsGridBlock = Node.create({
  name: 'postsGrid',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      pageType: { default: 'all' },
      count: { default: 6 },
      columns: { default: 3 },
      showExcerpt: { default: true },
      showImage: { default: true },
      showDate: { default: true },
      orderBy: { default: 'newest' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="postsGrid"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'postsGrid' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(PostsGridBlockView)
  },
})
