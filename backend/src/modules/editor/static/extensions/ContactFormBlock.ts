import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ContactFormBlockView from '../components/blocks/ContactFormBlockView.vue'

export const ContactFormBlock = Node.create({
  name: 'contactForm',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fields: { default: [] },
      submitText: { default: 'Send Message' },
      successMessage: { default: 'Thank you! Your message has been sent.' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="contactForm"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'contactForm' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ContactFormBlockView)
  },
})
