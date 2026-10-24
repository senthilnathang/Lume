import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import HotspotBlockView from '../components/blocks/HotspotBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const HotspotBlock = Node.create({
  name: 'hotspotBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      image: { default: '' },
      hotspots: { default: '[]' }, // JSON string of [{x, y, title, description, link}]
      tooltipStyle: { default: 'dark' }, // dark, light, colored
      pulseAnimation: { default: true },
      tooltipPosition: { default: 'auto' }, // auto, top, bottom
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="hotspotBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'hotspotBlock' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(HotspotBlockView)
  },
})
