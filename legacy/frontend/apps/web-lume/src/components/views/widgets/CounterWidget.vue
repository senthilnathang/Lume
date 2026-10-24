<template>
  <div class="counter-widget" :class="widget.color">
    <div class="counter-value">{{ widget.value }}</div>
    <div class="counter-label">{{ widget.title }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  widget: any;
}>();
</script>

<style scoped>
.counter-widget {
  text-align: center;
  padding: 20px;
  border-radius: 4px;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

.counter-widget.blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.counter-widget.green {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.counter-widget.orange {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.counter-value {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 5px;
}

.counter-label {
  font-size: 12px;
  opacity: 0.9;
}
</style>
