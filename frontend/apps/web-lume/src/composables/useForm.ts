import { ref, reactive, computed, watch } from 'vue';

export interface FormRule {
  required?: boolean;
  message?: string;
  pattern?: RegExp;
  validator?: (value: any) => Promise<void> | void;
  trigger?: 'blur' | 'change';
}

export interface FormSchema {
  field: string;
  label?: string;
  component?: string;
  componentProps?: Record<string, any>;
  rules?: FormRule[];
  colProps?: {
    span?: number;
    offset?: number;
  };
}

export interface FormState {
  loading: boolean;
  model: Record<string, any>;
  rules: Record<string, FormRule[]>;
  schema: FormSchema[];
}

export function useForm(options: {
  initialValues?: Record<string, any>;
  schema?: FormSchema[];
  rules?: Record<string, FormRule[]>;
  submitFn?: (values: Record<string, any>) => Promise<void>;
} = {}) {
  const { initialValues = {}, schema = [], rules = {}, submitFn } = options;

  const formRef = ref<any>(null);

  const state = reactive<FormState>({
    loading: false,
    model: { ...initialValues },
    rules: { ...rules },
    schema: schema,
  });

  const isDirty = computed(() => {
    const initial = JSON.stringify(initialValues);
    const current = JSON.stringify(state.model);
    return initial !== current;
  });

  const validateField = async (field: string): Promise<boolean> => {
    try {
      await formRef.value?.validateField(field);
      return true;
    } catch {
      return false;
    }
  };

  const validate = async (): Promise<boolean> => {
    try {
      await formRef.value?.validate();
      return true;
    } catch {
      return false;
    }
  };

  const resetFields = () => {
    formRef.value?.resetFields();
    state.model = { ...initialValues };
  };

  const clearValidate = (fields?: string[]) => {
    formRef.value?.clearValidate(fields);
  };

  const setFieldsValue = (values: Record<string, any>) => {
    Object.keys(values).forEach(key => {
      state.model[key] = values[key];
    });
  };

  const getFieldsValue = (): Record<string, any> => {
    return { ...state.model };
  };

  const handleSubmit = async (): Promise<any> => {
    const valid = await validate();
    if (!valid) return null;

    state.loading = true;
    try {
      if (submitFn) {
        const result = await submitFn(state.model);
        return result;
      }
      return state.model;
    } finally {
      state.loading = false;
    }
  };

  const handleReset = () => {
    resetFields();
  };

  const addField = (field: string, rule?: FormRule[]) => {
    if (rule) {
      state.rules[field] = rule;
    }
  };

  const removeField = (field: string) => {
    delete state.rules[field];
    delete state.model[field];
  };

  const updateSchema = (newSchema: FormSchema[]) => {
    state.schema = newSchema;
  };

  watch(
    () => state.model,
    () => {},
    { deep: true }
  );

  return {
    formRef,
    state,
    isDirty,
    validateField,
    validate,
    resetFields,
    clearValidate,
    setFieldsValue,
    getFieldsValue,
    handleSubmit,
    handleReset,
    addField,
    removeField,
    updateSchema,
  };
}

export function useAsyncForm<T = any>(options: {
  fetchFn: (id?: string | number) => Promise<T>;
  initialValues?: Record<string, any>;
  schema?: FormSchema[];
  rules?: Record<string, FormRule[]>;
  submitFn?: (values: Record<string, any>) => Promise<void>;
} = {}) {
  const { fetchFn, initialValues = {}, schema = [], rules = {}, submitFn } = options;

  const loading = ref(false);
  const loaded = ref(false);

  const form = useForm({
    initialValues,
    schema,
    rules,
    submitFn,
  });

  const loadData = async (id?: string | number) => {
    loading.value = true;
    try {
      const data = await fetchFn(id);
      form.setFieldsValue(data as Record<string, any>);
      loaded.value = true;
    } catch (error) {
      console.error('Failed to load form data:', error);
    } finally {
      loading.value = false;
    }
  };

  return {
    ...form,
    loading,
    loaded,
    loadData,
  };
}
