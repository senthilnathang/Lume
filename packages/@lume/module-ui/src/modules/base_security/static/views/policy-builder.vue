<script>
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  Spin,
  Switch,
  Textarea,
  message,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import {
  getPolicyApi,
  createPolicyApi,
  updatePolicyApi,
} from '#/api/base_security';

export default {
  name: 'PolicyBuilder',
  components: {
    Page,
    AAlert: Alert,
    AButton: Button,
    ACard: Card,
    AForm: Form,
    AFormItem: FormItem,
    AInput: Input,
    ATextarea: Textarea,
    AInputNumber: InputNumber,
    ASelect: Select,
    ASpin: Spin,
    ASwitch: Switch,
    ArrowLeftOutlined,
    SaveOutlined,
    PlusOutlined,
    DeleteOutlined,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();

    // Define constants locally
    const POLICY_EFFECTS = [
      { value: 'allow', label: 'Allow', color: 'success' },
      { value: 'deny', label: 'Deny', color: 'error' },
    ];

    const POLICY_SCOPES = [
      { value: 'global', label: 'Global' },
      { value: 'model', label: 'Model' },
      { value: 'field', label: 'Field' },
      { value: 'action', label: 'Action' },
      { value: 'record', label: 'Record' },
    ];

    const POLICY_CONDITION_TYPES = [
      { value: 'attribute', label: 'Attribute' },
      { value: 'role', label: 'Role' },
      { value: 'time', label: 'Time' },
      { value: 'ip', label: 'IP Address' },
      { value: 'custom', label: 'Custom Expression' },
    ];

    const effectOptions = POLICY_EFFECTS.map(e => ({ value: e.value, label: e.label }));

    const loading = ref(false);
    const saving = ref(false);
    const policyId = ref(null);

    const policy = ref({
      name: '',
      code: '',
      description: '',
      effect: 'allow',
      scope: 'model',
      target: {
        models: [],
        actions: [],
        fields: [],
      },
      conditions: [],
      condition_logic: 'and',
      priority: 100,
      is_active: true,
      tags: [],
    });

    const isNew = computed(() => !policyId.value);

    const conditionOperators = [
      { value: 'eq', label: 'Equals (=)' },
      { value: 'ne', label: 'Not Equals (!=)' },
      { value: 'gt', label: 'Greater Than (>)' },
      { value: 'lt', label: 'Less Than (<)' },
      { value: 'gte', label: 'Greater or Equal (>=)' },
      { value: 'lte', label: 'Less or Equal (<=)' },
      { value: 'in', label: 'In List' },
      { value: 'contains', label: 'Contains' },
      { value: 'starts_with', label: 'Starts With' },
      { value: 'ends_with', label: 'Ends With' },
    ];

    const commonActions = [
      { value: 'read', label: 'Read' },
      { value: 'write', label: 'Write' },
      { value: 'create', label: 'Create' },
      { value: 'update', label: 'Update' },
      { value: 'delete', label: 'Delete' },
      { value: 'export', label: 'Export' },
    ];

    const fetchPolicy = async () => {
      if (!policyId.value) return;

      loading.value = true;
      try {
        const response = await getPolicyApi(policyId.value);
        const data = response.data || response;
        policy.value = {
          name: data.name || '',
          code: data.code || '',
          description: data.description || '',
          effect: data.effect || 'allow',
          scope: data.scope || 'model',
          target: data.target || { models: [], actions: [], fields: [] },
          conditions: data.conditions || [],
          condition_logic: data.condition_logic || 'and',
          priority: data.priority || 100,
          is_active: data.is_active !== false,
          tags: data.tags || [],
        };
      } catch (e) {
        message.error('Failed to load policy');
        console.error(e);
      } finally {
        loading.value = false;
      }
    };

    const savePolicy = async () => {
      if (!policy.value.name || !policy.value.code) {
        message.error('Name and Code are required');
        return;
      }

      saving.value = true;
      try {
        const data = { ...policy.value };

        if (isNew.value) {
          const response = await createPolicyApi(data);
          const newPolicy = response.data || response;
          policyId.value = newPolicy.id;
          message.success('Policy created');
          router.replace(`/base_security/policy-builder?id=${newPolicy.id}`);
        } else {
          await updatePolicyApi(policyId.value, data);
          message.success('Policy saved');
        }
        await fetchPolicy();
      } catch (e) {
        message.error('Failed to save policy');
        console.error(e);
      } finally {
        saving.value = false;
      }
    };

    const goBack = () => {
      router.push('/base_security/policies-list');
    };

    const addCondition = () => {
      policy.value.conditions.push({
        type: 'attribute',
        subject: '',
        operator: 'eq',
        value: '',
      });
    };

    const removeCondition = (index) => {
      policy.value.conditions.splice(index, 1);
    };

    watch(() => route.query.id, (newId) => {
      policyId.value = newId ? parseInt(newId) : null;
      if (policyId.value) {
        fetchPolicy();
      }
    }, { immediate: true });

    return {
      loading,
      saving,
      policyId,
      policy,
      isNew,
      effectOptions,
      POLICY_SCOPES,
      POLICY_CONDITION_TYPES,
      conditionOperators,
      commonActions,
      fetchPolicy,
      savePolicy,
      goBack,
      addCondition,
      removeCondition,
    };
  },
};
</script>

<template>
  <Page auto-content-height>
    <ASpin :spinning="loading">
      <div class="p-4">
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <AButton @click="goBack">
              <template #icon><ArrowLeftOutlined /></template>
              Back
            </AButton>
            <h1 class="text-xl font-bold">
              {{ isNew ? 'Create Policy' : 'Edit Policy' }}
            </h1>
          </div>
          <AButton type="primary" :loading="saving" @click="savePolicy">
            <template #icon><SaveOutlined /></template>
            Save
          </AButton>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <!-- Main Form -->
          <div class="col-span-2">
            <ACard title="Policy Details">
              <AForm layout="vertical">
                <div class="grid grid-cols-2 gap-4">
                  <AFormItem label="Name" required>
                    <AInput v-model:value="policy.name" placeholder="Department Access Policy" />
                  </AFormItem>
                  <AFormItem label="Code" required>
                    <AInput v-model:value="policy.code" placeholder="dept_access" :disabled="!isNew" />
                  </AFormItem>
                </div>

                <AFormItem label="Description">
                  <ATextarea v-model:value="policy.description" :rows="2" placeholder="Describe what this policy controls..." />
                </AFormItem>

                <div class="grid grid-cols-3 gap-4">
                  <AFormItem label="Effect">
                    <ASelect v-model:value="policy.effect" :options="effectOptions" />
                  </AFormItem>
                  <AFormItem label="Scope">
                    <ASelect v-model:value="policy.scope" :options="POLICY_SCOPES" />
                  </AFormItem>
                  <AFormItem label="Priority">
                    <AInputNumber v-model:value="policy.priority" :min="0" :max="1000" style="width: 100%" />
                  </AFormItem>
                </div>
              </AForm>
            </ACard>

            <!-- Target -->
            <ACard title="Target" class="mt-4">
              <AForm layout="vertical">
                <AFormItem label="Models">
                  <ASelect
                    v-model:value="policy.target.models"
                    mode="tags"
                    placeholder="Enter model names (e.g., employees, salaries)"
                    style="width: 100%"
                  />
                </AFormItem>
                <AFormItem label="Actions">
                  <ASelect
                    v-model:value="policy.target.actions"
                    mode="multiple"
                    placeholder="Select actions"
                    style="width: 100%"
                    :options="commonActions"
                  />
                </AFormItem>
                <AFormItem label="Fields (optional)">
                  <ASelect
                    v-model:value="policy.target.fields"
                    mode="tags"
                    placeholder="Enter field names to restrict"
                    style="width: 100%"
                  />
                </AFormItem>
              </AForm>
            </ACard>

            <!-- Conditions -->
            <ACard title="Conditions" class="mt-4">
              <AAlert v-if="policy.conditions.length === 0" type="info" show-icon class="mb-4">
                Add conditions to control when this policy applies. Without conditions, the policy applies to all matching targets.
              </AAlert>

              <div v-if="policy.conditions.length > 1" class="mb-4">
                <AFormItem label="Condition Logic">
                  <ASelect
                    v-model:value="policy.condition_logic"
                    style="width: 120px"
                    :options="[
                      { value: 'and', label: 'ALL (AND)' },
                      { value: 'or', label: 'ANY (OR)' },
                    ]"
                  />
                </AFormItem>
              </div>

              <div v-for="(condition, index) in policy.conditions" :key="index" class="mb-4 p-4 bg-gray-50 rounded">
                <div class="flex items-start gap-4">
                  <div class="flex-1 grid grid-cols-4 gap-3">
                    <AFormItem label="Type" class="mb-0">
                      <ASelect v-model:value="condition.type" size="small" :options="POLICY_CONDITION_TYPES" />
                    </AFormItem>
                    <AFormItem label="Subject" class="mb-0">
                      <AInput v-model:value="condition.subject" size="small" placeholder="user.department_id" />
                    </AFormItem>
                    <AFormItem label="Operator" class="mb-0">
                      <ASelect v-model:value="condition.operator" size="small" :options="conditionOperators" />
                    </AFormItem>
                    <AFormItem label="Value" class="mb-0">
                      <AInput v-model:value="condition.value" size="small" placeholder="$record.department_id" />
                    </AFormItem>
                  </div>
                  <AButton type="text" danger size="small" @click="removeCondition(index)" class="mt-6">
                    <template #icon><DeleteOutlined /></template>
                  </AButton>
                </div>
              </div>

              <AButton type="dashed" block @click="addCondition">
                <template #icon><PlusOutlined /></template>
                Add Condition
              </AButton>
            </ACard>
          </div>

          <!-- Sidebar -->
          <div>
            <ACard title="Settings">
              <AForm layout="vertical">
                <AFormItem label="Active">
                  <ASwitch v-model:checked="policy.is_active" />
                </AFormItem>
                <AFormItem label="Tags">
                  <ASelect
                    v-model:value="policy.tags"
                    mode="tags"
                    placeholder="Add tags"
                    style="width: 100%"
                  />
                </AFormItem>
              </AForm>
            </ACard>

            <ACard title="Help" class="mt-4">
              <div class="text-sm text-gray-600">
                <p class="mb-2"><strong>Effect:</strong> Allow or Deny access when conditions match.</p>
                <p class="mb-2"><strong>Scope:</strong> What level this policy applies to (global, model, field, etc.).</p>
                <p class="mb-2"><strong>Conditions:</strong> Use <code>$record.field</code> to reference record attributes and <code>user.field</code> for user attributes.</p>
                <p><strong>Priority:</strong> Higher numbers are evaluated first.</p>
              </div>
            </ACard>
          </div>
        </div>
      </div>
    </ASpin>
  </Page>
</template>
