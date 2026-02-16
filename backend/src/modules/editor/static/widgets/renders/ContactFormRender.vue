<script setup lang="ts">
import '../widget-styles.css';

interface FormField {
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
}

withDefaults(defineProps<{
  fields?: FormField[];
  submitText?: string;
  successMessage?: string;
}>(), {
  fields: () => [
    { label: 'Name', type: 'text', required: true, placeholder: 'Your name' },
    { label: 'Email', type: 'email', required: true, placeholder: 'your@email.com' },
    { label: 'Message', type: 'textarea', required: true, placeholder: 'Your message...' },
  ],
  submitText: 'Send Message',
  successMessage: 'Thank you! Your message has been sent.',
});
</script>

<template>
  <form class="lume-contact-form" @submit.prevent>
    <div
      v-for="(field, index) in fields"
      :key="index"
      class="lume-form-field"
    >
      <label :class="['lume-form-label', { 'lume-form-label--required': field.required }]">
        {{ field.label }}
      </label>
      <textarea
        v-if="field.type === 'textarea'"
        class="lume-form-textarea"
        :placeholder="field.placeholder || ''"
        :required="field.required"
      />
      <select
        v-else-if="field.type === 'select'"
        class="lume-form-select"
        :required="field.required"
      >
        <option value="" disabled selected>{{ field.placeholder || 'Select...' }}</option>
      </select>
      <input
        v-else
        class="lume-form-input"
        :type="field.type || 'text'"
        :placeholder="field.placeholder || ''"
        :required="field.required"
      />
    </div>
    <button type="submit" class="lume-form-submit">
      {{ submitText }}
    </button>
  </form>
</template>
