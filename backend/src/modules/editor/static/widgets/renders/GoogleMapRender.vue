<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  lat?: number;
  lng?: number;
  zoom?: number;
  height?: number;
  markerTitle?: string;
  displayStyle?: string;
}>(), {
  lat: 37.7749,
  lng: -122.4194,
  zoom: 12,
  height: 400,
  markerTitle: '',
  displayStyle: 'roadmap',
});

const mapSrc = computed(() => {
  const query = props.markerTitle
    ? encodeURIComponent(props.markerTitle)
    : `${props.lat},${props.lng}`;
  return `https://maps.google.com/maps?q=${query}&z=${props.zoom}&t=${mapTypeCode.value}&output=embed`;
});

const mapTypeCode = computed(() => {
  const types: Record<string, string> = {
    roadmap: 'm',
    satellite: 'k',
    hybrid: 'h',
    terrain: 'p',
  };
  return types[props.displayStyle] || 'm';
});
</script>

<template>
  <div class="lume-google-map">
    <div class="lume-map-container" :style="{ height: height + 'px' }">
      <iframe
        :src="mapSrc"
        allowfullscreen
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      />
    </div>
  </div>
</template>
