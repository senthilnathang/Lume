/**
 * FormViewWrapper - Configurable Form Container Component
 *
 * Renders form content inside a Modal, Drawer, or plain div based on mode prop.
 */

import { h, defineComponent } from 'vue';
import {
  Button,
  Drawer,
  Modal,
  Space,
  Spin,
  Tooltip,
} from 'ant-design-vue';
import {
  BlockOutlined,
  ExpandOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons-vue';

const MODE_CONFIG = [
  { key: 'page', icon: ExpandOutlined, label: 'Detailed Form' },
  { key: 'modal', icon: BlockOutlined, label: 'Popup Form' },
  { key: 'drawer', icon: MenuUnfoldOutlined, label: 'Side Panel' },
];

export const FormViewWrapper = defineComponent({
  name: 'FormViewWrapper',
  props: {
    mode: { type: String, default: 'modal' },
    visible: { type: Boolean, default: false },
    title: { type: String, default: '' },
    width: { type: Number, default: 720 },
    drawerWidth: { type: Number, default: 620 },
    loading: { type: Boolean, default: false },
    confirmLoading: { type: Boolean, default: false },
    showModeSwitch: { type: Boolean, default: false },
    closable: { type: Boolean, default: true },
    destroyOnClose: { type: Boolean, default: true },
    okText: { type: String, default: 'Save' },
    cancelText: { type: String, default: 'Cancel' },
    showFooter: { type: Boolean, default: true },
  },
  emits: ['close', 'save', 'modeChange'],
  setup(props, { emit, slots }) {
    function renderModeSwitch() {
      if (!props.showModeSwitch) return null;

      return h(Space, { size: 2 }, () =>
        MODE_CONFIG.map(cfg =>
          h(Tooltip, { title: cfg.label, key: cfg.key }, () =>
            h(Button, {
              type: props.mode === cfg.key ? 'primary' : 'default',
              size: 'small',
              icon: h(cfg.icon),
              onClick: () => emit('modeChange', cfg.key),
            })
          )
        )
      );
    }

    function renderFooter() {
      if (!props.showFooter) return null;

      if (slots.footer) return slots.footer();

      return h(Space, null, () => [
        h(Button, { onClick: () => emit('close') }, () => props.cancelText),
        h(Button, {
          type: 'primary',
          loading: props.confirmLoading,
          onClick: () => emit('save'),
        }, () => props.okText),
      ]);
    }

    function renderContent() {
      const content = slots.default ? slots.default() : null;
      if (props.loading) {
        return h(Spin, { spinning: true }, () => content);
      }
      return content;
    }

    return () => {
      if (props.mode === 'modal') {
        return h(Modal, {
          open: props.visible,
          title: props.title,
          width: props.width,
          closable: props.closable,
          destroyOnClose: props.destroyOnClose,
          confirmLoading: props.confirmLoading,
          'onUpdate:open': (val) => { if (!val) emit('close'); },
          onCancel: () => emit('close'),
        }, {
          default: () => renderContent(),
          footer: () => renderFooter(),
        });
      }

      if (props.mode === 'drawer') {
        const extra = renderModeSwitch();
        return h(Drawer, {
          open: props.visible,
          title: props.title,
          width: props.drawerWidth,
          closable: props.closable,
          destroyOnClose: props.destroyOnClose,
          placement: 'right',
          'onUpdate:open': (val) => { if (!val) emit('close'); },
          onClose: () => emit('close'),
        }, {
          default: () => [
            renderContent(),
            props.showFooter ? h('div', {
              style: {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                borderTop: '1px solid #f0f0f0',
                padding: '10px 16px',
                background: '#fff',
                textAlign: 'right',
              },
            }, [renderFooter()]) : null,
          ],
          extra: () => extra,
        });
      }

      return null;
    };
  },
});

export default FormViewWrapper;
