<script setup lang="ts">
import { ref, computed } from 'vue';
import '../widget-styles.css';

interface FloatingBtn {
  type: string;
  label: string;
  url: string;
  icon: string;
  color: string;
}

const props = withDefaults(defineProps<{
  buttons?: FloatingBtn[] | string;
  position?: string;
  style?: string;
  showLabels?: boolean;
}>(), {
  buttons: () => [],
  position: 'bottom-right',
  style: 'circle',
  showLabels: false,
});

const parsedButtons = computed<FloatingBtn[]>(() => {
  if (typeof props.buttons === 'string') {
    try { return JSON.parse(props.buttons); } catch { return []; }
  }
  return Array.isArray(props.buttons) ? props.buttons : [];
});

const isExpanded = ref(true);

const typeUrls: Record<string, (url: string) => string> = {
  whatsapp: (url) => `https://wa.me/${url.replace(/\D/g, '')}`,
  phone: (url) => `tel:${url}`,
  email: (url) => `mailto:${url}`,
  messenger: (url) => `https://m.me/${url}`,
  custom: (url) => url,
};

const typeIcons: Record<string, string> = {
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  email: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  messenger: 'M12 2C6.477 2 2 6.145 2 11.243c0 2.907 1.384 5.498 3.548 7.192V22l3.387-1.862C10.042 20.381 11.17 20.5 12 20.5c5.523 0 10-4.145 10-9.257C22 6.145 17.523 2 12 2z',
};

function getHref(btn: FloatingBtn) {
  const fn = typeUrls[btn.type] || typeUrls.custom;
  return fn(btn.url || '');
}
</script>

<template>
  <div class="lume-floating-buttons" :class="`lume-fab--${position}`">
    <a
      v-for="(btn, i) in parsedButtons"
      :key="i"
      :href="getHref(btn)"
      class="lume-fab-btn"
      :class="`lume-fab-btn--${props.style}`"
      :style="{ backgroundColor: btn.color || '#6b7280' }"
      :title="btn.label"
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path v-if="typeIcons[btn.type]" :d="typeIcons[btn.type]" />
        <circle v-else cx="12" cy="12" r="10" /><line v-if="!typeIcons[btn.type]" x1="12" y1="8" x2="12" y2="16" /><line v-if="!typeIcons[btn.type]" x1="8" y1="12" x2="16" y2="12" />
      </svg>
      <span v-if="showLabels" class="lume-fab-label">{{ btn.label }}</span>
    </a>
  </div>
</template>

<style scoped>
.lume-floating-buttons {
  position: fixed;
  z-index: 9990;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lume-fab--bottom-right { bottom: 24px; right: 24px; }
.lume-fab--bottom-left { bottom: 24px; left: 24px; }

.lume-fab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: transform 0.2s, box-shadow 0.2s;
}
.lume-fab-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}

.lume-fab-btn--circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  justify-content: center;
}
.lume-fab-btn--pill {
  padding: 12px 20px;
  border-radius: 28px;
}

.lume-fab-label {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}
</style>
