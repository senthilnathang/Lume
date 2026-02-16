<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

interface SocialLink {
  platform: string;
  url: string;
}

const props = withDefaults(defineProps<{
  name?: string;
  role?: string;
  image?: string;
  bio?: string;
  socialLinks?: SocialLink[];
}>(), {
  name: 'John Doe',
  role: 'Team Member',
  image: '',
  bio: '',
  socialLinks: () => [],
});

const initials = computed(() => {
  return props.name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

const platformLabels: Record<string, string> = {
  twitter: 'X',
  facebook: 'FB',
  linkedin: 'in',
  instagram: 'IG',
  github: 'GH',
  youtube: 'YT',
  email: '@',
};
</script>

<template>
  <div class="lume-team-member">
    <img
      v-if="image"
      :src="image"
      :alt="name"
      class="lume-team-member-image"
    />
    <div
      v-else
      class="lume-team-member-image"
      :style="{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e5e7eb',
        color: '#6b7280',
        fontSize: '2rem',
        fontWeight: '600',
      }"
    >
      {{ initials }}
    </div>
    <h4 class="lume-team-member-name">{{ name }}</h4>
    <p class="lume-team-member-role">{{ role }}</p>
    <p v-if="bio" class="lume-team-member-bio">{{ bio }}</p>
    <div v-if="socialLinks.length" class="lume-team-member-social">
      <a
        v-for="(link, index) in socialLinks"
        :key="index"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        :title="link.platform"
      >
        {{ platformLabels[link.platform] || link.platform.charAt(0).toUpperCase() }}
      </a>
    </div>
  </div>
</template>
