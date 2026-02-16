<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

interface SocialPlatform {
  name: string;
  url?: string;
}

const props = withDefaults(defineProps<{
  platforms?: SocialPlatform[];
  displayStyle?: string;
  size?: string;
  alignment?: string;
}>(), {
  platforms: () => [],
  displayStyle: 'icon',
  size: 'md',
  alignment: 'left',
});

const platformLabels: Record<string, string> = {
  facebook: 'Facebook',
  twitter: 'X',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  email: 'Email',
};

const platformIcons: Record<string, string> = {
  facebook: 'f',
  twitter: 'X',
  linkedin: 'in',
  pinterest: 'P',
  reddit: 'r/',
  whatsapp: 'W',
  telegram: 'T',
  email: '@',
};

const containerClasses = computed(() => [
  'lume-social-share',
  `lume-social-share--${props.size}`,
  props.displayStyle === 'icon' ? 'lume-social-share--icon-only' : '',
]);

const containerStyle = computed(() => ({
  justifyContent: props.alignment === 'center' ? 'center' :
                  props.alignment === 'right' ? 'flex-end' : 'flex-start',
}));

function getButtonClass(platformName: string) {
  return `lume-social-share-btn lume-social-share-btn--${platformName}`;
}

function getLabel(platformName: string) {
  return platformLabels[platformName] || platformName;
}

function getIcon(platformName: string) {
  return platformIcons[platformName] || platformName.charAt(0).toUpperCase();
}
</script>

<template>
  <div :class="containerClasses" :style="containerStyle">
    <a
      v-for="(platform, index) in platforms"
      :key="index"
      :href="platform.url || '#'"
      :class="getButtonClass(platform.name)"
      target="_blank"
      rel="noopener noreferrer"
      :title="getLabel(platform.name)"
    >
      <span>{{ getIcon(platform.name) }}</span>
      <span v-if="displayStyle === 'icon-text' || displayStyle === 'button'">{{ getLabel(platform.name) }}</span>
    </a>
  </div>
</template>
