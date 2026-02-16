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
