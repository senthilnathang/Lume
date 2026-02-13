import { computed, reactive, ref, toRaw, watch, type Ref, type UnwrapNestedRefs } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance, Rule } from 'ant-design-vue/es/form';

/**
 * Form field configuration
 */
export interface FormFieldConfig {
  /** Whether field is required */
  required?: boolean;
  /** Validation rules */
  rules?: Rule[];
  /** Default value */
  default?: any;
  /** Transform value before submit */
  transform?: (value: any) => any;
  /** Validate on change */
  validateOnChange?: boolean;
}

/**
 * Options for useForm
 */
export interface UseFormOptions<T extends Record<string, any>> {
  /** Initial form data */
  initialData: T;
  /** Validation rules */
  rules?: Record<keyof T | string, Rule[]>;
  /** Submit handler */
  onSubmit?: (data: T) => Promise<any>;
  /** Success callback */
  onSuccess?: (result: any, data: T) => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Success message */
  successMessage?: string;
  /** Error message */
  errorMessage?: string;
  /** Whether to reset form on success */
  resetOnSuccess?: boolean;
  /** Transform data before submit */
  transform?: (data: T) => any;
  /** Validate before submit (default: true) */
  validateBeforeSubmit?: boolean;
  /** Show success message toast */
  showSuccessMessage?: boolean;
  /** Show error message toast */
  showErrorMessage?: boolean;
}

/**
 * Return type for useForm
 */
export interface UseFormReturn<T extends Record<string, any>> {
  /** Form state (reactive) */
  formState: UnwrapNestedRefs<T>;
  /** Form ref for Ant Design Form */
  formRef: Ref<FormInstance | undefined>;
  /** Validation rules */
  formRules: Record<string, Rule[]>;
  /** Loading state */
  loading: Ref<boolean>;
  /** Submitting state */
  submitting: Ref<boolean>;
  /** Error state */
  error: Ref<Error | null>;
  /** Whether form has been modified */
  isDirty: Ref<boolean>;
  /** Validation errors */
  errors: Ref<Record<string, string[]>>;
  /** Whether form is valid */
  isValid: Ref<boolean>;

  // Methods
  /** Submit form */
  submit: () => Promise<any>;
  /** Reset form to initial values */
  reset: () => void;
  /** Reset to specific values */
  resetTo: (data: Partial<T>) => void;
  /** Set field value */
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Set multiple field values */
  setFieldsValue: (values: Partial<T>) => void;
  /** Validate form */
  validate: () => Promise<boolean>;
  /** Validate specific fields */
  validateFields: (fields: Array<keyof T>) => Promise<boolean>;
  /** Clear validation errors */
  clearValidate: (fields?: Array<keyof T>) => void;
  /** Get raw form data */
  getFormData: () => T;
  /** Get transformed form data (ready for API) */
  getSubmitData: () => any;
  /** Scroll to first error field */
  scrollToError: () => void;
}

/**
 * Composable for standardized form handling with validation, submission, and state management.
 *
 * @example
 * ```ts
 * const {
 *   formState,
 *   formRef,
 *   formRules,
 *   submitting,
 *   submit,
 *   reset,
 * } = useForm({
 *   initialData: {
 *     name: '',
 *     email: '',
 *   },
 *   rules: {
 *     name: [{ required: true, message: 'Name is required' }],
 *     email: [
 *       { required: true, message: 'Email is required' },
 *       { type: 'email', message: 'Invalid email format' },
 *     ],
 *   },
 *   onSubmit: async (data) => await createEmployeeApi(data),
 *   successMessage: 'Employee created successfully',
 * });
 * ```
 */
export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>,
): UseFormReturn<T> {
  const {
    initialData,
    rules = {} as Record<keyof T | string, Rule[]>,
    onSubmit,
    onSuccess,
    onError,
    successMessage = 'Operation successful',
    errorMessage = 'Operation failed',
    resetOnSuccess = false,
    transform,
    validateBeforeSubmit = true,
    showSuccessMessage = true,
    showErrorMessage = true,
  } = options;

  // Create deep copy of initial data for reset
  const getInitialData = (): T => JSON.parse(JSON.stringify(initialData));

  // Form state
  const formState = reactive<T>(getInitialData()) as UnwrapNestedRefs<T>;
  const formRef = ref<FormInstance>();

  // Status
  const loading = ref(false);
  const submitting = ref(false);
  const error = ref<Error | null>(null);
  const errors = ref<Record<string, string[]>>({});

  // Track dirty state using touched fields (more efficient than JSON.stringify)
  const touchedFields = ref<Set<string>>(new Set());

  // Computed dirty state based on touched fields
  const isDirty = computed(() => touchedFields.value.size > 0);

  // Store initial values for comparison
  const initialValues = ref<Record<string, any>>({});
  Object.keys(initialData).forEach(key => {
    initialValues.value[key] = JSON.parse(JSON.stringify((initialData as any)[key]));
  });

  // Watch for changes to track dirty state (shallow comparison per field)
  watch(
    () => formState,
    (newState) => {
      for (const key of Object.keys(initialData)) {
        const currentValue = (newState as any)[key];
        const initialValue = initialValues.value[key];

        // Simple comparison for primitives, JSON for objects
        const hasChanged = typeof currentValue === 'object' && currentValue !== null
          ? JSON.stringify(currentValue) !== JSON.stringify(initialValue)
          : currentValue !== initialValue;

        if (hasChanged) {
          touchedFields.value.add(key);
        } else {
          touchedFields.value.delete(key);
        }
      }
    },
    { deep: true },
  );

  // Computed valid state
  const isValid = computed(() => {
    return Object.keys(errors.value).length === 0;
  });

  /**
   * Get raw form data
   */
  function getFormData(): T {
    return toRaw(formState) as T;
  }

  /**
   * Get transformed data for submission
   */
  function getSubmitData(): any {
    const data = getFormData();
    return transform ? transform(data) : data;
  }

  /**
   * Validate entire form
   */
  async function validate(): Promise<boolean> {
    if (!formRef.value) {
      console.warn('useForm: formRef is not bound to a Form component');
      return true;
    }

    try {
      await formRef.value.validate();
      errors.value = {};
      return true;
    } catch (e: any) {
      // Extract validation errors
      if (e.errorFields) {
        const newErrors: Record<string, string[]> = {};
        for (const field of e.errorFields) {
          newErrors[field.name.join('.')] = field.errors;
        }
        errors.value = newErrors;
      }
      return false;
    }
  }

  /**
   * Validate specific fields
   */
  async function validateFields(fields: Array<keyof T>): Promise<boolean> {
    if (!formRef.value) return true;

    try {
      await formRef.value.validateFields(fields as string[]);
      // Clear errors for validated fields
      for (const field of fields) {
        delete errors.value[field as string];
      }
      return true;
    } catch (e: any) {
      if (e.errorFields) {
        for (const field of e.errorFields) {
          errors.value[field.name.join('.')] = field.errors;
        }
      }
      return false;
    }
  }

  /**
   * Clear validation errors
   */
  function clearValidate(fields?: Array<keyof T>): void {
    if (formRef.value) {
      formRef.value.clearValidate(fields as string[]);
    }

    if (fields) {
      for (const field of fields) {
        delete errors.value[field as string];
      }
    } else {
      errors.value = {};
    }
  }

  /**
   * Submit form
   */
  async function submit(): Promise<any> {
    error.value = null;

    // Validate if required
    if (validateBeforeSubmit) {
      const valid = await validate();
      if (!valid) {
        scrollToError();
        return null;
      }
    }

    if (!onSubmit) {
      console.warn('useForm: No onSubmit handler provided');
      return getSubmitData();
    }

    submitting.value = true;

    try {
      const data = getSubmitData();
      const result = await onSubmit(data);

      if (showSuccessMessage) {
        message.success(successMessage);
      }

      onSuccess?.(result, data);

      if (resetOnSuccess) {
        reset();
      }

      return result;
    } catch (e) {
      const err = e as Error;
      error.value = err;

      if (showErrorMessage) {
        // Try to extract server validation errors
        const serverMessage = extractServerError(err);
        message.error(serverMessage || errorMessage);
      }

      onError?.(err);
      return null;
    } finally {
      submitting.value = false;
    }
  }

  /**
   * Extract error message from server response
   */
  function extractServerError(err: Error): string | null {
    // Handle Axios-style errors
    const axiosError = err as any;
    if (axiosError.response?.data) {
      const data = axiosError.response.data;

      // Common API error formats
      if (typeof data.message === 'string') return data.message;
      if (typeof data.error === 'string') return data.error;
      if (typeof data.detail === 'string') return data.detail;

      // Django REST Framework style errors
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          return `${firstKey}: ${data[firstKey][0]}`;
        }
      }
    }

    return null;
  }

  /**
   * Reset form to initial values
   */
  function reset(): void {
    const initial = getInitialData();
    Object.assign(formState, initial);
    clearValidate();
    error.value = null;
    touchedFields.value.clear();
  }

  /**
   * Reset form to specific values
   */
  function resetTo(data: Partial<T>): void {
    const initial = getInitialData();
    Object.assign(formState, { ...initial, ...data });
    clearValidate();
    error.value = null;
  }

  /**
   * Set single field value
   */
  function setFieldValue<K extends keyof T>(field: K, value: T[K]): void {
    (formState as T)[field] = value;
  }

  /**
   * Set multiple field values
   */
  function setFieldsValue(values: Partial<T>): void {
    Object.assign(formState, values);
  }

  /**
   * Scroll to first error field
   */
  function scrollToError(): void {
    if (formRef.value) {
      formRef.value.scrollToField(Object.keys(errors.value)[0] || '');
    }
  }

  return {
    formState,
    formRef,
    formRules: rules as Record<string, Rule[]>,
    loading,
    submitting,
    error,
    isDirty,
    errors,
    isValid,

    submit,
    reset,
    resetTo,
    setFieldValue,
    setFieldsValue,
    validate,
    validateFields,
    clearValidate,
    getFormData,
    getSubmitData,
    scrollToError,
  };
}

/**
 * Create a reusable form configuration
 * Useful for forms that are used in multiple places
 *
 * @example
 * ```ts
 * // In composables/forms/useEmployeeForm.ts
 * export const useEmployeeForm = createFormConfig({
 *   initialData: {
 *     name: '',
 *     email: '',
 *     department_id: null,
 *   },
 *   rules: employeeRules,
 * });
 *
 * // In component
 * const form = useEmployeeForm({
 *   onSubmit: createEmployeeApi,
 * });
 * ```
 */
export function createFormConfig<T extends Record<string, any>>(
  baseOptions: Omit<UseFormOptions<T>, 'onSubmit'>,
) {
  return (overrides?: Partial<UseFormOptions<T>>) => {
    return useForm<T>({
      ...baseOptions,
      ...overrides,
    } as UseFormOptions<T>);
  };
}

/**
 * Helper to create common validation rules
 */
export const formRules = {
  required: (fieldName: string): Rule => ({
    required: true,
    message: `${fieldName} is required`,
    trigger: 'blur',
  }),

  email: (): Rule => ({
    type: 'email',
    message: 'Please enter a valid email address',
    trigger: 'blur',
  }),

  minLength: (min: number, fieldName?: string): Rule => ({
    min,
    message: fieldName
      ? `${fieldName} must be at least ${min} characters`
      : `Must be at least ${min} characters`,
    trigger: 'blur',
  }),

  maxLength: (max: number, fieldName?: string): Rule => ({
    max,
    message: fieldName
      ? `${fieldName} must not exceed ${max} characters`
      : `Must not exceed ${max} characters`,
    trigger: 'blur',
  }),

  pattern: (regex: RegExp, errorMessage: string): Rule => ({
    pattern: regex,
    message: errorMessage,
    trigger: 'blur',
  }),

  phone: (): Rule => ({
    pattern: /^[+]?[\d\s-()]+$/,
    message: 'Please enter a valid phone number',
    trigger: 'blur',
  }),

  url: (): Rule => ({
    type: 'url',
    message: 'Please enter a valid URL',
    trigger: 'blur',
  }),

  number: (): Rule => ({
    type: 'number',
    message: 'Please enter a valid number',
    trigger: 'blur',
  }),

  positiveNumber: (): Rule => ({
    type: 'number',
    min: 0,
    message: 'Please enter a positive number',
    trigger: 'blur',
  }),

  custom: (validator: (value: any) => Promise<void> | void, trigger?: 'blur' | 'change'): Rule => ({
    validator: async (_rule, value) => {
      await validator(value);
    },
    trigger: trigger || 'blur',
  }),

  match: (fieldGetter: () => any, errorMessage: string): Rule => ({
    validator: (_rule, value) => {
      if (value !== fieldGetter()) {
        return Promise.reject(errorMessage);
      }
      return Promise.resolve();
    },
    trigger: 'blur',
  }),
};
