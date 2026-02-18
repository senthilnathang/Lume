import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import ChartBlockView from '../components/blocks/ChartBlockView.vue';
import { commonTipTapAttributes } from './shared/commonAttributes';

export const ChartBlock = Node.create({
  name: 'chartBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...commonTipTapAttributes,
      chartType: { default: 'bar' },
      labels: { default: '["Jan", "Feb", "Mar", "Apr", "May", "Jun"]' },
      datasets: { default: JSON.stringify([{ label: 'Dataset 1', data: [12, 19, 3, 5, 2, 3], backgroundColor: '#1677ff' }]) },
      showLegend: { default: true },
      showGrid: { default: true },
      aspectRatio: { default: 2 },
      height: { default: '300px' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="chartBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chartBlock' })];
  },

  addNodeView() {
    return VueNodeViewRenderer(ChartBlockView);
  },
});
