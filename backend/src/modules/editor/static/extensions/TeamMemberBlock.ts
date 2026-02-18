import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TeamMemberBlockView from '../components/blocks/TeamMemberBlockView.vue'
import { commonTipTapAttributes } from './shared/commonAttributes'

export const TeamMemberBlock = Node.create({
  name: 'teamMember',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      name: { default: 'John Doe' },
      role: { default: 'Team Member' },
      image: { default: '' },
      bio: { default: '' },
      socialLinks: { default: [] },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="teamMember"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'teamMember' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(TeamMemberBlockView)
  },
})
