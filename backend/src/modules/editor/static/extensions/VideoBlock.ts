import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import VideoBlockView from '../components/blocks/VideoBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const VideoBlock = Node.create({
  name: 'videoBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      src: { default: '' },
      aspectRatio: { default: '16:9' }, // 16:9, 4:3, 1:1
      autoplay: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="videoBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'videoBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(VideoBlockView)
  },
})
