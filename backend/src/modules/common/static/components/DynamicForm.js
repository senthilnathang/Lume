/**
 * Dynamic Form Component
 *
 * Renders forms dynamically based on form layout configurations.
 * Supports sections, field positioning, conditional display, and custom fields.
 *
 * Note: Condition expressions are only evaluated for UI display purposes.
 * Security validation happens on the backend.
 */

import { h, ref, computed, watch, onMounted, defineComponent } from 'vue';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Row,
  Col,
  Collapse,
  Card,
  Spin,
  Tooltip,
} from 'ant-design-vue';
import { HelpCircle } from 'lucide-vue-next';
import { get } from '@/api/request';

/**
 * Fetch effective layout from API
 */
async function fetchEffectiveLayout(targetModel, layoutType) {
  try {
    const response = await get(
      `/base/form-layouts/effective/${targetModel}/${layoutType}/`
    );
    return response;
  } catch (error) {
    console.error('Failed to fetch layout:', error);
    return null;
  }
}

/**
 * Safely evaluate a simple condition expression.
 * This is for UI purposes only - all security checks happen on backend.
 * Only supports simple property access and equality comparisons.
 */
function evaluateSimpleCondition(condition, record) {
  if (!condition) return true;
  if (typeof condition !== 'string') return true;

  // Sanitize: only allow safe characters
  const safePattern = /^[\w.]+\s*[!=<>]+\s*['"\w]+$/;
  if (!safePattern.test(condition.trim())) {
    console.warn('Condition expression not supported:', condition);
    return true;
  }

  try {
    // Parse simple conditions like "record.status === 'active'"
    const equalMatch = condition.match(/^record\.(\w+)\s*===?\s*['"]?(\w+)['"]?$/);
    if (equalMatch) {
      const [, field, value] = equalMatch;
      return record[field] === value;
    }

    const notEqualMatch = condition.match(/^record\.(\w+)\s*!==?\s*['"]?(\w+)['"]?$/);
    if (notEqualMatch) {
      const [, field, value] = notEqualMatch;
      return record[field] !== value;
    }

    // For unsupported conditions, default to visible
    return true;
  } catch (error) {
    console.warn('Failed to evaluate condition:', condition, error);
    return true;
  }
}

/**
 * Field Renderer - renders individual form fields
 */
const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object, required: true },
    fieldConfig: { type: Object, default: () => ({}) },
    value: { type: [String, Number, Boolean, Array, Object, null], default: null },
    record: { type: Object, default: () => ({}) },
    disabled: { type: Boolean, default: false },
    fieldDefinitions: { type: Object, default: () => ({}) },
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    const fieldDef = computed(() => {
      return props.fieldDefinitions[props.field.name] || {};
    });

    const isReadonly = computed(() => {
      if (props.fieldConfig.readonly_condition) {
        return evaluateSimpleCondition(props.fieldConfig.readonly_condition, props.record);
      }
      return fieldDef.value.readonly || false;
    });

    const isHidden = computed(() => {
      if (props.fieldConfig.hidden_condition) {
        return evaluateSimpleCondition(props.fieldConfig.hidden_condition, props.record);
      }
      return false;
    });

    const isRequired = computed(() => {
      if (props.fieldConfig.required_override !== null && props.fieldConfig.required_override !== undefined) {
        return props.fieldConfig.required_override;
      }
      return fieldDef.value.required || false;
    });

    const label = computed(() => {
      return props.fieldConfig.label || fieldDef.value.label || props.field.name;
    });

    const placeholder = computed(() => {
      return fieldDef.value.placeholder || `Enter ${label.value}`;
    });

    const fieldType = computed(() => {
      return fieldDef.value.type || fieldDef.value.field_type || 'string';
    });

    const renderInput = () => {
      const isDisabled = props.disabled || isReadonly.value;
      const type = fieldType.value;

      const updateValue = (val) => emit('update:value', val);

      switch (type) {
        case 'text':
        case 'textarea':
          return h(Input.TextArea, {
            value: props.value,
            'onUpdate:value': updateValue,
            placeholder: placeholder.value,
            disabled: isDisabled,
            rows: 3,
          });

        case 'integer':
          return h(InputNumber, {
            value: props.value,
            'onUpdate:value': updateValue,
            placeholder: placeholder.value,
            disabled: isDisabled,
            style: { width: '100%' },
            precision: 0,
          });

        case 'float':
        case 'decimal':
        case 'currency':
          return h(InputNumber, {
            value: props.value,
            'onUpdate:value': updateValue,
            placeholder: placeholder.value,
            disabled: isDisabled,
            style: { width: '100%' },
            precision: 2,
          });

        case 'boolean':
          return h(Switch, {
            checked: props.value,
            'onUpdate:checked': updateValue,
            disabled: isDisabled,
          });

        case 'date':
          return h(DatePicker, {
            value: props.value,
            'onUpdate:value': updateValue,
            placeholder: placeholder.value,
            disabled: isDisabled,
            style: { width: '100%' },
          });

        case 'datetime':
          return h(DatePicker, {
            value: props.value,
            'onUpdate:value': updateValue,
            placeholder: placeholder.value,
            disabled: isDisabled,
            style: { width: '100%' },
            showTime: true,
          });

        case 'select':
          return h(Select, {
            value: props.value,
            'onUpdate:value': updateValue,
            placeholder: placeholder.value,
            disabled: isDisabled,
            style: { width: '100%' },
            allowClear: !isRequired.value,
            options: (fieldDef.value.options || []).map(opt => ({
              value: opt.value,
              label: opt.label,
            })),
          });

        case 'multiselect':
          return h(Select, {
            value: props.value || [],
            'onUpdate:value': updateValue,
            placeholder: placeholder.value,
            disabled: isDisabled,
            style: { width: '100%' },
            mode: 'multiple',
            options: (fieldDef.value.options || []).map(opt => ({
              value: opt.value,
              label: opt.label,
            })),
          });

        case 'email':
          return h(Input, {
            value: props.value,
            'onUpdate:value': updateValue,
            placeholder: placeholder.value || 'email@example.com',
            disabled: isDisabled,
            type: 'email',
          });

        case 'string':
        default:
          return h(Input, {
            value: props.value,
            'onUpdate:value': updateValue,
            placeholder: placeholder.value,
            disabled: isDisabled,
          });
      }
    };

    return () => {
      if (isHidden.value) return null;

      const labelContent = [label.value];
      if (fieldDef.value.help_text || fieldDef.value.helpText) {
        labelContent.push(
          h(Tooltip, { title: fieldDef.value.help_text || fieldDef.value.helpText }, () =>
            h(HelpCircle, { size: 14, style: { marginLeft: '4px', color: '#999' } })
          )
        );
      }

      return h(
        Form.Item,
        {
          label: h('span', {}, labelContent),
          required: isRequired.value,
          class: props.fieldConfig.css_class,
        },
        () => renderInput()
      );
    };
  },
});

/**
 * Section Renderer - renders form sections
 */
const SectionRenderer = defineComponent({
  name: 'SectionRenderer',
  props: {
    section: { type: Object, required: true },
    values: { type: Object, default: () => ({}) },
    record: { type: Object, default: () => ({}) },
    disabled: { type: Boolean, default: false },
    fieldDefinitions: { type: Object, default: () => ({}) },
  },
  emits: ['update:values'],
  setup(props, { emit }) {
    const isVisible = computed(() => {
      if (props.section.condition) {
        return evaluateSimpleCondition(props.section.condition, props.record);
      }
      return true;
    });

    const handleFieldUpdate = (fieldName, value) => {
      const newValues = { ...props.values, [fieldName]: value };
      emit('update:values', newValues);
    };

    const renderFields = () => {
      const fields = props.section.fields || [];
      const columns = props.section.columns || 1;
      const span = 24 / columns;

      return h(Row, { gutter: 16 }, () =>
        fields.map((field) => {
          const fieldSpan = field.width ? field.width * 2 : span;
          return h(Col, { span: fieldSpan, key: field.name }, () =>
            h(FieldRenderer, {
              field,
              fieldConfig: field,
              value: props.values[field.name],
              record: { ...props.record, ...props.values },
              disabled: props.disabled,
              fieldDefinitions: props.fieldDefinitions,
              'onUpdate:value': (val) => handleFieldUpdate(field.name, val),
            })
          );
        })
      );
    };

    return () => {
      if (!isVisible.value) return null;

      if (props.section.collapsible) {
        return h(
          Collapse,
          {
            defaultActiveKey: props.section.collapsed ? [] : ['content'],
            style: { marginBottom: '16px' },
          },
          () => [
            h(
              Collapse.Panel,
              { key: 'content', header: props.section.title || 'Section' },
              () => renderFields()
            ),
          ]
        );
      }

      if (props.section.title) {
        return h(
          Card,
          {
            title: props.section.title,
            size: 'small',
            style: { marginBottom: '16px' },
          },
          () => renderFields()
        );
      }

      return h('div', { style: { marginBottom: '16px' } }, [renderFields()]);
    };
  },
});

/**
 * Dynamic Form - main component
 */
export const DynamicForm = defineComponent({
  name: 'DynamicForm',
  props: {
    targetModel: { type: String, required: true },
    layoutType: { type: String, default: 'edit' },
    modelValue: { type: Object, default: () => ({}) },
    record: { type: Object, default: () => ({}) },
    disabled: { type: Boolean, default: false },
    fieldDefinitions: { type: Object, default: () => ({}) },
    layout: { type: Object, default: null },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const loading = ref(false);
    const effectiveLayout = ref(null);
    const localValues = ref({ ...props.modelValue });

    watch(() => props.modelValue, (newVal) => {
      localValues.value = { ...newVal };
    }, { deep: true });

    const handleValuesUpdate = (newValues) => {
      localValues.value = newValues;
      emit('update:modelValue', newValues);
    };

    const loadLayout = async () => {
      if (props.layout) {
        effectiveLayout.value = props.layout;
        return;
      }

      loading.value = true;
      try {
        const layout = await fetchEffectiveLayout(props.targetModel, props.layoutType);
        effectiveLayout.value = layout;
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadLayout);

    watch(() => [props.targetModel, props.layoutType], loadLayout);

    return () => {
      if (loading.value) {
        return h(Spin, { tip: 'Loading form layout...' });
      }

      if (!effectiveLayout.value || !effectiveLayout.value.sections) {
        return h('div', { style: { color: '#999' } }, 'No layout configuration found.');
      }

      return h(Form, { layout: 'vertical' }, () =>
        effectiveLayout.value.sections.map((section, index) =>
          h(SectionRenderer, {
            key: index,
            section,
            values: localValues.value,
            record: props.record,
            disabled: props.disabled,
            fieldDefinitions: props.fieldDefinitions,
            'onUpdate:values': handleValuesUpdate,
          })
        )
      );
    };
  },
});

export default DynamicForm;
