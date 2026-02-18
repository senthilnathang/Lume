<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  src?: string;
  title?: string;
  artist?: string;
  cover?: string;
  autoplay?: boolean;
  loop?: boolean;
}>(), {
  src: '',
  title: '',
  artist: '',
  cover: '',
  autoplay: false,
  loop: false,
});

const audioEl = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);

const progress = computed(() => duration.value ? (currentTime.value / duration.value) * 100 : 0);

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function togglePlay() {
  if (!audioEl.value) return;
  if (isPlaying.value) audioEl.value.pause();
  else audioEl.value.play();
}

function seek(e: MouseEvent) {
  if (!audioEl.value || !duration.value) return;
  const bar = (e.currentTarget as HTMLElement);
  const rect = bar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audioEl.value.currentTime = pct * duration.value;
}

function onTimeUpdate() {
  if (audioEl.value) currentTime.value = audioEl.value.currentTime;
}

function onLoadedMetadata() {
  if (audioEl.value) duration.value = audioEl.value.duration;
}
</script>

<template>
  <div class="lume-audio">
    <audio
      ref="audioEl"
      :src="src"
      :autoplay="autoplay"
      :loop="loop"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="isPlaying = false"
    />
    <div class="lume-audio-player">
      <div v-if="cover" class="lume-audio-cover">
        <img :src="cover" :alt="title || 'Audio cover'" />
      </div>
      <div class="lume-audio-main">
        <div class="lume-audio-info">
          <div class="lume-audio-title">{{ title || 'Untitled' }}</div>
          <div v-if="artist" class="lume-audio-artist">{{ artist }}</div>
        </div>
        <div class="lume-audio-controls">
          <button class="lume-audio-play" @click="togglePlay" :aria-label="isPlaying ? 'Pause' : 'Play'">
            <svg v-if="!isPlaying" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>
          <div class="lume-audio-progress" @click="seek">
            <div class="lume-audio-bar">
              <div class="lume-audio-fill" :style="{ width: progress + '%' }"></div>
            </div>
          </div>
          <span class="lume-audio-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lume-audio {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}
.lume-audio-player {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 16px;
}
.lume-audio-cover {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.lume-audio-cover img { width: 100%; height: 100%; object-fit: cover; }
.lume-audio-main { flex: 1; min-width: 0; }
.lume-audio-info { margin-bottom: 10px; }
.lume-audio-title { font-size: 15px; font-weight: 600; color: #1f2937; }
.lume-audio-artist { font-size: 13px; color: #6b7280; margin-top: 2px; }
.lume-audio-controls { display: flex; align-items: center; gap: 12px; }
.lume-audio-play {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1677ff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  transition: background 0.15s;
}
.lume-audio-play:hover { background: #1262cc; }
.lume-audio-progress {
  flex: 1;
  cursor: pointer;
  padding: 4px 0;
}
.lume-audio-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}
.lume-audio-fill {
  height: 100%;
  background: #1677ff;
  border-radius: 2px;
  transition: width 0.1s linear;
}
.lume-audio-time {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
}
</style>
