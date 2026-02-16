<script setup lang="ts">
import { computed } from 'vue';
import { Info, Shield, Star, Heart, Zap, Settings, Users, Mail } from 'lucide-vue-next';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  title?: string;
  description?: string;
  icon?: string;
  iconPosition?: string;
  iconColor?: string;
  iconBgColor?: string;
  linkUrl?: string;
  linkText?: string;
}>(), {
  title: 'Info Box Title',
  description: 'Your description here',
  icon: 'info',
  iconPosition: 'top',
  iconColor: '#3b82f6',
  iconBgColor: '#dbeafe',
  linkUrl: '',
  linkText: 'Learn More',
});

const iconMap: Record<string, any> = {
  info: Info,
  shield: Shield,
  star: Star,
  heart: Heart,
  zap: Zap,
  settings: Settings,
  users: Users,
  mail: Mail,
};

const iconComponent = computed(() => iconMap[props.icon] || Info);

const containerClass = computed(() => [
  'lume-info-box',
  `lume-info-box--icon-${props.iconPosition}`,
]);
</script>

<template>
  <div :class="containerClass">
    <div
      class="lume-info-box-icon"
      :style="{ backgroundColor: iconBgColor, color: iconColor }"
    >
      <component :is="iconComponent" :size="28" />
    </div>
    <div class="lume-info-box-content">
      <h4 class="lume-info-box-title">{{ title }}</h4>
      <p class="lume-info-box-description">{{ description }}</p>
      <a
        v-if="linkUrl"
        :href="linkUrl"
        class="lume-info-box-link"
      >
        {{ linkText }}
      </a>
    </div>
  </div>
</template>
