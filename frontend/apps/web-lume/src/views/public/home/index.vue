<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Header from '@/components/common/Header.vue';
import Footer from '@/components/common/Footer.vue';
import api from '@/api';

interface Programme {
  id: number;
  title: string;
  slug: string;
  icon: string;
  color: string;
}

interface Activity {
  id: number;
  title: string;
  description: string;
  activity_date: string;
  location: string;
  images: string[];
  programme?: {
    title: string;
    icon: string;
  };
}

interface Organization {
  name: string;
  vision: string;
  mission: string;
}

const router = useRouter();
const loading = ref(true);
const organization = ref<Organization | null>(null);
const programmes = ref<Programme[]>([]);
const recentActivities = ref<Activity[]>([]);

const stats = [
  { value: '1997', label: 'Year Established', icon: '📅' },
  { value: '1500+', label: 'Beneficiaries', icon: '👥' },
  { value: '600+', label: 'SHG Members', icon: '🤝' },
  { value: '98', label: 'Farmers Clubs', icon: '🌾' }
];

onMounted(async () => {
  try {
    const data = await api.get('/public/home');
    organization.value = data.organization;
    programmes.value = data.programmes || [];
    recentActivities.value = data.recentActivities || [];
  } catch (error) {
    console.error('Failed to fetch home data:', error);
  } finally {
    loading.value = false;
  }
});

const navigateToProgramme = (slug: string) => {
  router.push(`/programmes/${slug}`);
};

const navigateToActivities = () => {
  router.push('/activities');
};
</script>

<template>
  <div class="home-page">
    <Header />

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <h1 class="hero-title">Gandhian Welfare & Development Society</h1>
        <p class="hero-subtitle">
          Empowering underprivileged communities to attain social, physical, and economic 
          well-being through education, health, and sustainable development.
        </p>
        <div class="hero-actions">
          <router-link to="/about" class="btn btn-primary">Learn More</router-link>
          <router-link to="/programmes" class="btn btn-outline-light">Our Programmes</router-link>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <div v-for="stat in stats" :key="stat.label" class="stat-card">
            <span class="stat-icon">{{ stat.icon }}</span>
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Vision & Mission -->
    <section class="section vm-section">
      <div class="container">
        <div class="vm-grid">
          <div class="vm-card vision-card">
            <div class="vm-icon">👁️</div>
            <h3>Our Vision</h3>
            <p v-if="organization?.vision">{{ organization.vision }}</p>
            <p v-else>
              A society attained with holistic development of Education, Health and 
              Socio-Economic well-being resulting in standard quality of life.
            </p>
          </div>
          <div class="vm-card mission-card">
            <div class="vm-icon">🎯</div>
            <h3>Our Mission</h3>
            <p v-if="organization?.mission">{{ organization.mission }}</p>
            <p v-else>
              To create awareness, build capacity, and empower underprivileged communities 
              through vocational training, health programs, and socio-economic initiatives.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Programmes -->
    <section class="section programmes-section">
      <div class="container">
        <div class="section-title">
          <h2>Our Programmes</h2>
          <p>Comprehensive development initiatives for community empowerment</p>
        </div>

        <div class="programmes-grid">
          <div 
            v-for="programme in programmes" 
            :key="programme.id" 
            class="programme-card"
            :style="{ '--card-color': programme.color || '#2E7D32' }"
            @click="navigateToProgramme(programme.slug)"
          >
            <div class="programme-icon">{{ programme.icon || '📋' }}</div>
            <h3>{{ programme.title }}</h3>
            <p>{{ programme.description }}</p>
            <span class="learn-more">Learn More →</span>
          </div>
        </div>

        <div class="text-center mt-8">
          <router-link to="/programmes" class="btn btn-outline">View All Programmes</router-link>
        </div>
      </div>
    </section>

    <!-- Recent Activities -->
    <section class="section activities-section">
      <div class="container">
        <div class="section-title">
          <h2>Recent Activities</h2>
          <p>Highlights from our ongoing community initiatives</p>
        </div>

        <div class="activities-grid">
          <div v-for="activity in recentActivities" :key="activity.id" class="activity-card">
            <div class="activity-image">
              <div class="image-placeholder">
                <span>{{ activity.programme?.icon || '📷' }}</span>
              </div>
            </div>
            <div class="activity-content">
              <span class="activity-badge">{{ activity.programme?.title || 'Activity' }}</span>
              <h3>{{ activity.title }}</h3>
              <p>{{ activity.description?.slice(0, 120) }}...</p>
              <div class="activity-meta">
                <span>{{ activity.activity_date }}</span>
                <span>{{ activity.location }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-8">
          <button @click="navigateToActivities" class="btn btn-primary">View All Activities</button>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section cta-section">
      <div class="container">
        <div class="cta-card">
          <h2>Join Us in Making a Difference</h2>
          <p>Together, we can create lasting change in the lives of underprivileged communities.</p>
          <div class="cta-actions">
            <router-link to="/contact" class="btn btn-primary">Contact Us</router-link>
            <router-link to="/documents" class="btn btn-outline-light">Download Brochure</router-link>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
}

.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1920') center/cover no-repeat;
  padding-top: 72px;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(46, 125, 50, 0.92) 0%, rgba(27, 94, 32, 0.95) 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 800px;
  padding: 40px;
  color: white;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 24px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 20px;
  opacity: 0.9;
  margin-bottom: 40px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-outline-light {
  background: transparent;
  border: 2px solid white;
  color: white;
}

.btn-outline-light:hover {
  background: white;
  color: var(--primary-color);
}

.stats-section {
  margin-top: -60px;
  position: relative;
  z-index: 10;
  padding-bottom: 80px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  text-align: center;
  box-shadow: var(--shadow-lg);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-color);
  display: block;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.vm-section {
  background: white;
}

.vm-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 48px;
}

.vm-card {
  padding: 48px;
  border-radius: var(--radius-lg);
  transition: all 0.3s ease;
}

.vision-card {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
}

.mission-card {
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
}

.vm-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.vm-card h3 {
  font-size: 28px;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.vm-card p {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.programmes-section {
  background: var(--background-color);
}

.programmes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.programme-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border-top: 4px solid var(--card-color);
}

.programme-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
}

.programme-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.programme-card h3 {
  font-size: 20px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.programme-card p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.6;
}

.learn-more {
  color: var(--card-color);
  font-weight: 600;
  font-size: 14px;
}

.activities-section {
  background: white;
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.activity-card {
  background: var(--background-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  transition: all 0.3s ease;
}

.activity-card:hover {
  box-shadow: var(--shadow-md);
}

.activity-image {
  width: 180px;
  flex-shrink: 0;
}

.image-placeholder {
  height: 100%;
  min-height: 200px;
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
}

.activity-content {
  padding: 24px;
  flex: 1;
}

.activity-badge {
  display: inline-block;
  padding: 4px 12px;
  background: var(--primary-color);
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  margin-bottom: 12px;
}

.activity-content h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.activity-content p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.activity-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.cta-section {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: white;
}

.cta-card {
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
}

.cta-card h2 {
  font-size: 36px;
  margin-bottom: 16px;
}

.cta-card p {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 32px;
}

.cta-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.text-center {
  text-align: center;
}

.mt-8 {
  margin-top: 32px;
}

@media (max-width: 1024px) {
  .hero-title {
    font-size: 36px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .vm-grid {
    grid-template-columns: 1fr;
  }

  .programmes-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .activities-grid {
    grid-template-columns: 1fr;
  }

  .activity-card {
    flex-direction: column;
  }

  .activity-image {
    width: 100%;
  }

  .image-placeholder {
    min-height: 180px;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 28px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .programmes-grid {
    grid-template-columns: 1fr;
  }

  .cta-card h2 {
    font-size: 28px;
  }

  .cta-actions {
    flex-direction: column;
  }
}
</style>
