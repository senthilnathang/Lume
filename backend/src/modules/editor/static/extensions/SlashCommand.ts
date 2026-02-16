import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { VueRenderer } from '@tiptap/vue-3';
import { type Plugin, PluginKey } from '@tiptap/pm/state';
import SlashCommandList from '../components/SlashCommandList.vue';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: any; range: any }) => void;
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          const items: SlashCommandItem[] = [
            {
              title: 'Heading 1',
              description: 'Large section heading',
              icon: 'heading-1',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
              },
            },
            {
              title: 'Heading 2',
              description: 'Medium section heading',
              icon: 'heading-2',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
              },
            },
            {
              title: 'Heading 3',
              description: 'Small section heading',
              icon: 'heading-3',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
              },
            },
            {
              title: 'Bullet List',
              description: 'Unordered list',
              icon: 'list',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
              },
            },
            {
              title: 'Numbered List',
              description: 'Ordered list',
              icon: 'list-ordered',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
              },
            },
            {
              title: 'Quote',
              description: 'Block quotation',
              icon: 'quote',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
              },
            },
            {
              title: 'Code Block',
              description: 'Code snippet',
              icon: 'code-2',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
              },
            },
            {
              title: 'Divider',
              description: 'Horizontal line',
              icon: 'minus',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run();
              },
            },
            {
              title: 'Section',
              description: 'Full-width section wrapper',
              icon: 'layout',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({
                  type: 'sectionBlock',
                  content: [{ type: 'paragraph' }],
                }).run();
              },
            },
            {
              title: '2 Columns',
              description: 'Two column layout',
              icon: 'columns-3',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({
                  type: 'columnsBlock',
                  attrs: { columns: 2 },
                  content: [
                    { type: 'columnBlock', content: [{ type: 'paragraph' }] },
                    { type: 'columnBlock', content: [{ type: 'paragraph' }] },
                  ],
                }).run();
              },
            },
            {
              title: '3 Columns',
              description: 'Three column layout',
              icon: 'columns-3',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({
                  type: 'columnsBlock',
                  attrs: { columns: 3 },
                  content: [
                    { type: 'columnBlock', content: [{ type: 'paragraph' }] },
                    { type: 'columnBlock', content: [{ type: 'paragraph' }] },
                    { type: 'columnBlock', content: [{ type: 'paragraph' }] },
                  ],
                }).run();
              },
            },
            {
              title: 'Image',
              description: 'Image with caption',
              icon: 'image',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'imageBlock' }).run();
              },
            },
            {
              title: 'Video',
              description: 'YouTube or Vimeo embed',
              icon: 'video',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'videoBlock' }).run();
              },
            },
            {
              title: 'Button',
              description: 'Call-to-action button',
              icon: 'mouse-pointer-click',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'buttonBlock' }).run();
              },
            },
            {
              title: 'Spacer',
              description: 'Vertical space',
              icon: 'move-vertical',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'spacerBlock' }).run();
              },
            },
            {
              title: 'Callout',
              description: 'Info/warning callout box',
              icon: 'alert-triangle',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({
                  type: 'calloutBlock',
                  content: [{ type: 'paragraph' }],
                }).run();
              },
            },
            {
              title: 'HTML',
              description: 'Custom HTML code',
              icon: 'file-code-2',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'htmlBlock' }).run();
              },
            },
            {
              title: 'Table',
              description: 'Data table',
              icon: 'table-2',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              },
            },
            // New widgets
            {
              title: 'Advanced Heading',
              description: 'Heading with separator',
              icon: 'heading',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'advancedHeading' }).run();
              },
            },
            {
              title: 'Dual Heading',
              description: 'Two-color heading',
              icon: 'type',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'dualHeading' }).run();
              },
            },
            {
              title: 'Info Box',
              description: 'Icon + title + description card',
              icon: 'info',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'infoBox' }).run();
              },
            },
            {
              title: 'Image Gallery',
              description: 'Grid image gallery',
              icon: 'grid-3x3',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'imageGallery' }).run();
              },
            },
            {
              title: 'FAQ',
              description: 'Accordion Q&A',
              icon: 'help-circle',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'faq' }).run();
              },
            },
            {
              title: 'Price Table',
              description: 'Pricing plan card',
              icon: 'credit-card',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'priceTable' }).run();
              },
            },
            {
              title: 'Price List',
              description: 'Menu/service price list',
              icon: 'list',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'priceList' }).run();
              },
            },
            {
              title: 'Team Member',
              description: 'Profile card',
              icon: 'user-circle',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'teamMember' }).run();
              },
            },
            {
              title: 'Testimonial',
              description: 'Customer review',
              icon: 'quote',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'testimonial' }).run();
              },
            },
            {
              title: 'Countdown',
              description: 'Countdown timer',
              icon: 'timer',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'countdown' }).run();
              },
            },
            {
              title: 'Content Toggle',
              description: 'A/B content switcher',
              icon: 'toggle-left',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'contentToggle' }).run();
              },
            },
            {
              title: 'Marketing Button',
              description: 'Button with subtext',
              icon: 'zap',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'marketingButton' }).run();
              },
            },
            {
              title: 'Modal Popup',
              description: 'Button + modal dialog',
              icon: 'maximize-2',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'modalPopup' }).run();
              },
            },
            {
              title: 'Google Map',
              description: 'Embedded map',
              icon: 'map-pin',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'googleMap' }).run();
              },
            },
            {
              title: 'Contact Form',
              description: 'Customizable form',
              icon: 'mail',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'contactForm' }).run();
              },
            },
            {
              title: 'Business Hours',
              description: 'Schedule display',
              icon: 'clock',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'businessHours' }).run();
              },
            },
            {
              title: 'Social Share',
              description: 'Share buttons',
              icon: 'share-2',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'socialShare' }).run();
              },
            },
            {
              title: 'Posts Grid',
              description: 'Dynamic posts grid',
              icon: 'layout-grid',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'postsGrid' }).run();
              },
            },
            {
              title: 'Icon List',
              description: 'List with icons',
              icon: 'list-checks',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'iconList' }).run();
              },
            },
            {
              title: 'Progress Bar',
              description: 'Progress indicators',
              icon: 'bar-chart-2',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: 'progressBar' }).run();
              },
            },
          ];

          if (!query) return items;
          return items.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase())
          );
        },

        render: () => {
          let component: VueRenderer | null = null;
          let popup: HTMLElement | null = null;

          return {
            onStart: (props: any) => {
              component = new VueRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = document.createElement('div');
              popup.style.position = 'absolute';
              popup.style.zIndex = '9999';
              document.body.appendChild(popup);

              const rect = props.clientRect();
              if (rect) {
                popup.style.left = `${rect.left}px`;
                popup.style.top = `${rect.bottom + 4}px`;
              }

              popup.appendChild(component.element);
            },

            onUpdate: (props: any) => {
              component?.updateProps(props);

              if (!props.clientRect || !popup) return;

              const rect = props.clientRect();
              if (rect) {
                popup.style.left = `${rect.left}px`;
                popup.style.top = `${rect.bottom + 4}px`;
              }
            },

            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                popup?.remove();
                popup = null;
                component?.destroy();
                component = null;
                return true;
              }

              return (component?.ref as any)?.onKeyDown?.(props.event) || false;
            },

            onExit: () => {
              popup?.remove();
              popup = null;
              component?.destroy();
              component = null;
            },
          };
        },
      }) as unknown as Plugin,
    ];
  },
});
