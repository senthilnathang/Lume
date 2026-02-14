/**
 * Custom Field Renderer Component
 *
 * Dynamically renders custom fields based on their type configuration.
 * Used in forms to display company-specific custom fields.
 */

import { h, computed, ref, watch } from 'vue';
import {
  Input,
  InputNumber,
  Select,
  Checkbox,
  DatePicker,
  Switch,
  Form,
  Row,
  Col,
  Tooltip,
} from 'ant-design-vue';
import { HelpCircle } from 'lucide-vue-next';

export const CustomFieldRenderer = {
  name: 'CustomFieldRenderer',
  props: {
    field: {
      type: Object,
      required: true,
    },
    modelValue: {
      type: [String, Number, Boolean, Array, Object],
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const internalValue = ref(props.modelValue);

    watch(() => props.modelValue, (newVal) => {
      internalValue.value = newVal;
    });

    watch(internalValue, (newVal) => {
      emit('update:modelValue', newVal);
    });

    const isDisabled = computed(() => {
      return props.disabled || props.readonly || props.field.readonly;
    });

    const placeholder = computed(() => {
      return props.field.placeholder || `Enter ${props.field.label}`;
    });

    const renderField = () => {
      const field = props.field;
      const fieldType = field.type || field.field_type;

      switch (fieldType) {
        case 'string':
        case 'text':
          return fieldType === 'text'
            ? h(Input.TextArea, {
                value: internalValue.value,
                'onUpdate:value': (val) => { internalValue.value = val; },
                placeholder: placeholder.value,
                disabled: isDisabled.value,
                rows: 3,
                maxlength: field.maxLength || field.max_length,
              })
            : h(Input, {
                value: internalValue.value,
                'onUpdate:value': (val) => { internalValue.value = val; },
                placeholder: placeholder.value,
                disabled: isDisabled.value,
                maxlength: field.maxLength || field.max_length,
              });

        case 'integer':
          return h(InputNumber, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value,
            disabled: isDisabled.value,
            style: { width: '100%' },
            precision: 0,
            min: field.minValue || field.min_value,
            max: field.maxValue || field.max_value,
          });

        case 'float':
        case 'currency':
        case 'percent':
          return h(InputNumber, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value,
            disabled: isDisabled.value,
            style: { width: '100%' },
            precision: 2,
            min: field.minValue || field.min_value,
            max: field.maxValue || field.max_value,
            prefix: fieldType === 'currency' ? '$' : undefined,
            suffix: fieldType === 'percent' ? '%' : undefined,
          });

        case 'boolean':
          return h(Switch, {
            checked: internalValue.value,
            'onUpdate:checked': (val) => { internalValue.value = val; },
            disabled: isDisabled.value,
          });

        case 'date':
          return h(DatePicker, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value,
            disabled: isDisabled.value,
            style: { width: '100%' },
            format: 'YYYY-MM-DD',
          });

        case 'datetime':
          return h(DatePicker, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value,
            disabled: isDisabled.value,
            style: { width: '100%' },
            showTime: true,
            format: 'YYYY-MM-DD HH:mm:ss',
          });

        case 'select':
          return h(Select, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value,
            disabled: isDisabled.value,
            style: { width: '100%' },
            allowClear: !field.required,
            options: (field.options || []).map(opt => ({
              value: opt.value,
              label: opt.label,
            })),
          });

        case 'multiselect':
          return h(Select, {
            value: internalValue.value || [],
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value,
            disabled: isDisabled.value,
            style: { width: '100%' },
            mode: 'multiple',
            allowClear: true,
            options: (field.options || []).map(opt => ({
              value: opt.value,
              label: opt.label,
            })),
          });

        case 'email':
          return h(Input, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value || 'email@example.com',
            disabled: isDisabled.value,
            type: 'email',
          });

        case 'phone':
          return h(Input, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value || '+1 (555) 000-0000',
            disabled: isDisabled.value,
            type: 'tel',
          });

        case 'url':
          return h(Input, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value || 'https://',
            disabled: isDisabled.value,
            type: 'url',
          });

        case 'color':
          return h(Input, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            disabled: isDisabled.value,
            type: 'color',
            style: { width: '80px', padding: '2px' },
          });

        case 'link':
          // For link types, we typically render a Select with async search
          // This is a simplified version
          return h(Select, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value || `Select ${field.linkModel || 'record'}`,
            disabled: isDisabled.value,
            style: { width: '100%' },
            allowClear: !field.required,
            showSearch: true,
            filterOption: (input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
            options: [], // Would be populated via async search
          });

        default:
          return h(Input, {
            value: internalValue.value,
            'onUpdate:value': (val) => { internalValue.value = val; },
            placeholder: placeholder.value,
            disabled: isDisabled.value,
          });
      }
    };

    return () => {
      const field = props.field;

      // Don't render hidden fields
      if (field.hidden || field.is_hidden) {
        return null;
      }

      const labelContent = [field.label];
      if (field.helpText || field.help_text) {
        labelContent.push(
          h(Tooltip, { title: field.helpText || field.help_text }, () =>
            h(HelpCircle, { size: 14, style: { marginLeft: '4px', color: '#999' } })
          )
        );
      }

      return h(
        Form.Item,
        {
          label: h('span', {}, labelContent),
          required: field.required || field.is_required,
          class: field.cssClass || field.css_class,
        },
        () => renderField()
      );
    };
  },
};

/**
 * Custom Fields Group Component
 *
 * Renders a group of custom fields in a responsive grid layout.
 */
export const CustomFieldsGroup = {
  name: 'CustomFieldsGroup',
  props: {
    fields: {
      type: Array,
      required: true,
    },
    values: {
      type: Object,
      default: () => ({}),
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:values'],
  setup(props, { emit }) {
    const localValues = ref({ ...props.values });

    watch(() => props.values, (newVal) => {
      localValues.value = { ...newVal };
    }, { deep: true });

    const handleFieldUpdate = (fieldName, value) => {
      localValues.value[fieldName] = value;
      emit('update:values', { ...localValues.value });
    };

    // Group fields by field_group
    const groupedFields = computed(() => {
      const groups = {};
      const ungrouped = [];

      for (const field of props.fields) {
        const groupName = field.field_group || field.fieldGroup;
        if (groupName) {
          if (!groups[groupName]) {
            groups[groupName] = [];
          }
          groups[groupName].push(field);
        } else {
          ungrouped.push(field);
        }
      }

      return { groups, ungrouped };
    });

    const renderFieldInCol = (field) => {
      const fieldName = field.name || field.field_name;
      const width = field.width || 12;
      const span = Math.max(6, Math.min(24, width * 2)); // Convert 1-12 to 6-24

      return h(
        Col,
        { span, key: fieldName },
        () => h(CustomFieldRenderer, {
          field,
          modelValue: localValues.value[fieldName],
          disabled: props.disabled,
          readonly: props.readonly,
          'onUpdate:modelValue': (val) => handleFieldUpdate(fieldName, val),
        })
      );
    };

    return () => {
      const { groups, ungrouped } = groupedFields.value;
      const content = [];

      // Render grouped fields
      for (const [groupName, fields] of Object.entries(groups)) {
        content.push(
          h('div', { key: `group-${groupName}`, class: 'custom-fields-group' }, [
            h('div', { class: 'custom-fields-group-title' }, groupName),
            h(Row, { gutter: 16 }, () => fields.map(renderFieldInCol)),
          ])
        );
      }

      // Render ungrouped fields
      if (ungrouped.length > 0) {
        content.push(
          h(Row, { gutter: 16, key: 'ungrouped' }, () =>
            ungrouped.map(renderFieldInCol)
          )
        );
      }

      return h('div', { class: 'custom-fields-container' }, content);
    };
  },
};

export default CustomFieldRenderer;
