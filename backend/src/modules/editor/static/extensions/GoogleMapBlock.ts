import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import GoogleMapBlockView from '../components/blocks/GoogleMapBlockView.vue'

export const GoogleMapBlock = Node.create({
  name: 'googleMap',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      lat: { default: 37.7749 },
      lng: { default: -122.4194 },
      zoom: { default: 12 },
      height: { default: 400 },
      markerTitle: { default: '' },
      style: { default: 'roadmap' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="googleMap"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'googleMap' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(GoogleMapBlockView)
  },
})
