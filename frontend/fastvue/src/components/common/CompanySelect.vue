<script lang="ts" setup>
/**
 * CompanySelect - A form field component for selecting company
 * Only visible to users with company:multi_company permission
 */
import { computed, onMounted, ref, watch } from 'vue';

import { Select, FormItem } from 'ant-design-vue';

import { type BaseApi, getCompanySwitchListApi } from '#/api/core/base';
import { usePermissionStore, PERMISSIONS } from '#/store/permission';

defineOptions({
  name: 'CompanySelect',
});

interface Props {
  modelValue?: number | null;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showAllOption?: boolean;
  formItemClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: 'Company',
  placeholder: 'Select company',
  required: false,
  disabled: false,
  showAllOption: false,
  formItemClass: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: number | null];
  change: [value: number | null, company: BaseApi.Company | null];
}>();

const permissionStore = usePermissionStore();
const loading = ref(false);
const companies = ref<BaseApi.Company[]>([]);

// Check if user has multi-company permission
const hasMultiCompanyPermission = computed(() => {
  return permissionStore.hasPermission((PERMISSIONS as any).COMPANY_MULTI_COMPANY ?? 'company.multi_company');
});

// Build select options
const options = computed(() => {
  const opts: Array<{ value: number | null; label: string; company?: BaseApi.Company }> = [];

  if (props.showAllOption) {
    opts.push({ value: null, label: 'All Companies' });
  }

  companies.value.forEach((company) => {
    let label = (company as any).company || company.name;
    if ((company as any).hq) {
      label += ' (HQ)';
    } else if ((company as any).is_branch) {
      label += ' (Branch)';
    }
    opts.push({ value: company.id, label: label as string, company });
  });

  return opts;
});

// Local value for v-model
const localValue = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val);
    const company = companies.value.find((c) => c.id === val) || null;
    emit('change', val, company);
  },
});

async function fetchCompanies() {
  if (!hasMultiCompanyPermission.value) return;

  loading.value = true;
  try {
    const response = await getCompanySwitchListApi();
    companies.value = response;
  } catch (error) {
    console.error('Failed to fetch companies:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (hasMultiCompanyPermission.value) {
    fetchCompanies();
  }
});

// Watch for permission changes
watch(hasMultiCompanyPermission, (hasPermission) => {
  if (hasPermission && companies.value.length === 0) {
    fetchCompanies();
  }
});

// Expose method to refresh companies
defineExpose({
  refresh: fetchCompanies,
  companies,
});
</script>

<template>
  <FormItem
    v-if="hasMultiCompanyPermission"
    :label="label"
    :required="required"
    :class="formItemClass"
  >
    <Select
      v-model:value="(localValue as any)"
      :placeholder="placeholder"
      :loading="loading"
      :disabled="disabled"
      :options="options"
      :allow-clear="!required"
      show-search
      :filter-option="(input: string, option: any) =>
        option.label.toLowerCase().includes(input.toLowerCase())
      "
      style="width: 100%"
    >
      <template #option="{ label, company }">
        <div class="flex items-center gap-2">
          <span>{{ label }}</span>
          <span v-if="company?.hq" class="text-xs text-yellow-600">(HQ)</span>
          <span v-else-if="company?.is_branch" class="text-xs text-blue-600">(Branch)</span>
        </div>
      </template>
    </Select>
  </FormItem>
</template>
