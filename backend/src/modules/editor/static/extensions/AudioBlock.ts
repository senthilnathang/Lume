import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AudioBlockView from '../components/blocks/AudioBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const AudioBlock = Node.create({
  name: 'audioBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      src: { default: '' },
      title: { default: '' },
      artist: { default: '' },
      cover: { default: '' },
      autoplay: { default: false },
      loop: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="audioBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'audioBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(AudioBlockView)
  },
})
