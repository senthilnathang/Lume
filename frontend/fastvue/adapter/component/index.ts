/**
 * Component adapter for Ant Design Vue
 */

import type { Component } from 'vue';

import type { BaseFormComponentType } from '@vben/common-ui';

import { defineAsyncComponent, defineComponent, h, ref } from 'vue';

import { ApiComponent, globalShareState, IconPicker } from '@vben/common-ui';
// IconifyIcon available from @vben/icons if needed
import { $t } from '@vben/locales';

import { notification } from 'ant-design-vue';

const AutoComplete = defineAsyncComponent(
  () => import('ant-design-vue/es/auto-complete'),
);
const Alert = defineAsyncComponent(() => import('ant-design-vue/es/alert'));
const Badge = defineAsyncComponent(() => import('ant-design-vue/es/badge'));
const Button = defineAsyncComponent(() => import('ant-design-vue/es/button'));
const Card = defineAsyncComponent(() => import('ant-design-vue/es/card'));
const Modal = defineAsyncComponent(() => import('ant-design-vue/es/modal'));
const Checkbox = defineAsyncComponent(
  () => import('ant-design-vue/es/checkbox'),
);
const CheckboxGroup = defineAsyncComponent(() =>
  import('ant-design-vue/es/checkbox').then((res) => res.CheckboxGroup),
);
const DatePicker = defineAsyncComponent(
  () => import('ant-design-vue/es/date-picker'),
);
const Divider = defineAsyncComponent(() => import('ant-design-vue/es/divider'));
const Form = defineAsyncComponent(() => import('ant-design-vue/es/form'));
const FormItem = defineAsyncComponent(() =>
  import('ant-design-vue/es/form').then((res) => res.FormItem),
);
const Input = defineAsyncComponent(() => import('ant-design-vue/es/input'));
const InputNumber = defineAsyncComponent(
  () => import('ant-design-vue/es/input-number'),
);
const InputPassword = defineAsyncComponent(() =>
  import('ant-design-vue/es/input').then((res) => res.InputPassword),
);
const Mentions = defineAsyncComponent(
  () => import('ant-design-vue/es/mentions'),
);
const Radio = defineAsyncComponent(() => import('ant-design-vue/es/radio'));
const RadioButton = defineAsyncComponent(() =>
  import('ant-design-vue/es/radio').then((res) => res.RadioButton),
);
const RadioGroup = defineAsyncComponent(() =>
  import('ant-design-vue/es/radio').then((res) => res.RadioGroup),
);
const RangePicker = defineAsyncComponent(() =>
  import('ant-design-vue/es/date-picker').then((res) => res.RangePicker),
);
const Rate = defineAsyncComponent(() => import('ant-design-vue/es/rate'));
const Select = defineAsyncComponent(() => import('ant-design-vue/es/select'));
const SelectOption = defineAsyncComponent(() =>
  import('ant-design-vue/es/select').then((res) => res.SelectOption),
);
const Space = defineAsyncComponent(() => import('ant-design-vue/es/space'));
const Spin = defineAsyncComponent(() => import('ant-design-vue/es/spin'));
const Switch = defineAsyncComponent(() => import('ant-design-vue/es/switch'));
const Textarea = defineAsyncComponent(() =>
  import('ant-design-vue/es/input').then((res) => res.Textarea),
);
const TimePicker = defineAsyncComponent(
  () => import('ant-design-vue/es/time-picker'),
);
const Table = defineAsyncComponent(() => import('ant-design-vue/es/table'));
const Tabs = defineAsyncComponent(() => import('ant-design-vue/es/tabs'));
const TabPane = defineAsyncComponent(() =>
  import('ant-design-vue/es/tabs').then((res) => res.TabPane),
);
const Tag = defineAsyncComponent(() => import('ant-design-vue/es/tag'));
const Tooltip = defineAsyncComponent(() => import('ant-design-vue/es/tooltip'));
const TreeSelect = defineAsyncComponent(
  () => import('ant-design-vue/es/tree-select'),
);
const Upload = defineAsyncComponent(() => import('ant-design-vue/es/upload'));

const withDefaultPlaceholder = <T extends Component>(
  component: T,
  type: 'input' | 'select',
  componentProps: Record<string, any> = {},
) => {
  return defineComponent({
    name: (component as any).name,
    inheritAttrs: false,
    setup: (props: any, { attrs, expose, slots }) => {
      const placeholder =
        props?.placeholder ||
        attrs?.placeholder ||
        $t(`ui.placeholder.${type}`);
      const innerRef = ref();
      expose(
        new Proxy(
          {},
          {
            get: (_target, key) => innerRef.value?.[key],
            has: (_target, key) => key in (innerRef.value || {}),
          },
        ),
      );
      return () =>
        h(
          component,
          { ...componentProps, placeholder, ...props, ...attrs, ref: innerRef },
          slots,
        );
    },
  });
};

export type ComponentType =
  | 'Alert'
  | 'ApiSelect'
  | 'ApiTreeSelect'
  | 'AutoComplete'
  | 'Badge'
  | 'Card'
  | 'Checkbox'
  | 'CheckboxGroup'
  | 'DatePicker'
  | 'DefaultButton'
  | 'Divider'
  | 'Form'
  | 'FormItem'
  | 'IconPicker'
  | 'Input'
  | 'InputNumber'
  | 'InputPassword'
  | 'Mentions'
  | 'Modal'
  | 'PrimaryButton'
  | 'Radio'
  | 'RadioButton'
  | 'RadioGroup'
  | 'RangePicker'
  | 'Rate'
  | 'Select'
  | 'SelectOption'
  | 'Space'
  | 'Spin'
  | 'Switch'
  | 'TabPane'
  | 'Table'
  | 'Tabs'
  | 'Tag'
  | 'Textarea'
  | 'TimePicker'
  | 'Tooltip'
  | 'TreeSelect'
  | 'Upload'
  | BaseFormComponentType;

async function initComponentAdapter() {
  const components: Partial<Record<ComponentType, Component>> = {
    Alert,
    ApiSelect: withDefaultPlaceholder(
      {
        ...ApiComponent,
        name: 'ApiSelect',
      },
      'select',
      {
        component: Select,
        loadingSlot: 'suffixIcon',
        visibleEvent: 'onDropdownVisibleChange',
        modelPropName: 'value',
      },
    ),
    ApiTreeSelect: withDefaultPlaceholder(
      {
        ...ApiComponent,
        name: 'ApiTreeSelect',
      },
      'select',
      {
        component: TreeSelect,
        fieldNames: { label: 'label', value: 'value', children: 'children' },
        loadingSlot: 'suffixIcon',
        modelPropName: 'value',
        optionsPropName: 'treeData',
        visibleEvent: 'onVisibleChange',
      },
    ),
    AutoComplete,
    Badge,
    Card,
    Checkbox,
    CheckboxGroup,
    DatePicker,
    DefaultButton: (props, { attrs, slots }) => {
      return h(Button, { ...props, attrs, type: 'default' }, slots);
    },
    Divider,
    Form,
    FormItem,
    IconPicker: withDefaultPlaceholder(IconPicker, 'select', {
      iconSlot: 'addonAfter',
      inputComponent: Input,
      modelValueProp: 'value',
    }),
    Input: withDefaultPlaceholder(Input, 'input'),
    InputNumber: withDefaultPlaceholder(InputNumber, 'input'),
    InputPassword: withDefaultPlaceholder(InputPassword, 'input'),
    Mentions: withDefaultPlaceholder(Mentions, 'input'),
    Modal,
    PrimaryButton: (props, { attrs, slots }) => {
      return h(Button, { ...props, attrs, type: 'primary' }, slots);
    },
    Radio,
    RadioButton,
    RadioGroup,
    RangePicker,
    Rate,
    Select: withDefaultPlaceholder(Select, 'select'),
    SelectOption,
    Space,
    Spin,
    Switch,
    TabPane,
    Table,
    Tabs,
    Tag,
    Textarea: withDefaultPlaceholder(Textarea, 'input'),
    TimePicker,
    Tooltip,
    TreeSelect: withDefaultPlaceholder(TreeSelect, 'select'),
    Upload,
  };

  globalShareState.setComponents(components);

  globalShareState.defineMessage({
    copyPreferencesSuccess: (title, content) => {
      notification.success({
        description: content,
        message: title,
        placement: 'bottomRight',
      });
    },
  });
}

export { initComponentAdapter };
