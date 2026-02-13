<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Header from '@/components/common/Header.vue';
import Footer from '@/components/common/Footer.vue';
import api from '@/api';

interface TeamMember {
  id: number;
  name: string;
  designation: string;
  photo: string;
  message: string;
}

interface Organization {
  name: string;
  vision: string;
  mission: string;
  objectives: string;
  founded_date: string;
}

const organization = ref<Organization | null>(null);
const teamMembers = ref<TeamMember[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await api.get('/public/about');
    organization.value = data.organization;
    teamMembers.value = data.teamMembers || [];
  } catch (error) {
    console.error('Failed to fetch about data:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="about-page">
    <Header />

    <section class="page-header">
      <div class="container">
        <h1>About Us</h1>
        <p>Empowering communities since 1997</p>
      </div>
    </section>

    <section class="breadcrumb-section">
      <div class="container">
        <div class="breadcrumb">
          <router-link to="/">Home</router-link>
          <span>/</span>
          <span>About Us</span>
        </div>
      </div>
    </section>

    <section class="section about-content">
      <div class="container">
        <div class="about-grid">
          <div class="about-main">
            <h2>Who We Are</h2>
            <p class="lead">
              GAWDESY is committed to empower underprivileged people to attain social, 
              physical, and economical well-being through enhancing their awareness towards 
              self-reliant development and standards of quality of life.
            </p>
            
            <div class="about-text">
              <p>
                It attempts to motivate the people to set goals in their life according to 
                their aims and desire to achieve meaningful resources for self and social 
                satisfactions. We believe in the power of community-driven development and 
                sustainable change.
              </p>
            </div>

            <div class="vm-section">
              <div class="vm-block">
                <h3>👁️ Vision</h3>
                <p v-if="organization?.vision">{{ organization.vision }}</p>
                <p v-else>
                  A society attained with holistic development of Education, Health and 
                  Socio-Economic well-being resulting in standard quality of life.
                </p>
              </div>

              <div class="vm-block">
                <h3>🎯 Mission</h3>
                <p v-if="organization?.mission">{{ organization.mission }}</p>
                <p v-else>
                  • Awareness generation and sensitization on components required to meet 
                  out the social values and educational developments.<br/>
                  • Social mobilization and integration of people towards attaining physical, 
                  psychological, social, political and economic well-being.<br/>
                  • Capacity building and empowering of underprivileged, vulnerable and 
                  marginalized community through vocational trainings.
                </p>
              </div>
            </div>

            <div class="objectives-block">
              <h3>Our Objectives</h3>
              <ul class="objectives-list">
                <li>To create awareness among the Target people in various aspects to lead a happy and peaceful living.</li>
                <li>To establish and run crèches, balwadies, daycare centre for children in the age group of 1-5 years.</li>
                <li>To create employment generation for the youth and the needy people.</li>
                <li>To start and run homes for the aged and elderly persons in the needy places.</li>
                <li>To promote projects for the empowerment of persons with disabilities.</li>
                <li>To provide psycho-social support and rehabilitation services to special groups.</li>
              </ul>
            </div>
          </div>

          <aside class="about-sidebar">
            <div class="sidebar-card">
              <h4>Established</h4>
              <p>1997</p>
            </div>
            <div class="sidebar-card">
              <h4>Location</h4>
              <p>Thanjavur, Tamil Nadu</p>
            </div>
            <div class="sidebar-card">
              <h4>Focus Areas</h4>
              <ul>
                <li>Education</li>
                <li>Health</li>
                <li>Women Empowerment</li>
                <li>Agriculture</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section class="section leadership-section">
      <div class="container">
        <div class="section-title">
          <h2>Leadership</h2>
          <p>Meet our dedicated team working for community development</p>
        </div>

        <div class="leadership-grid">
          <div v-for="member in teamMembers" :key="member.id" class="leadership-card">
            <div class="member-photo">
              <div class="photo-placeholder">
                {{ member.name.charAt(0) }}
              </div>
            </div>
            <div class="member-info">
              <h3>{{ member.name }}</h3>
              <p class="designation">{{ member.designation }}</p>
              <p class="message">{{ member.message?.slice(0, 150) }}...</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
}

.breadcrumb-section {
  background: white;
  padding: 12px 0;
}

.about-content {
  background: white;
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 48px;
}

.about-main h2 {
  font-size: 32px;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.lead {
  font-size: 18px;
  color: var(--text-primary);
  line-height: 1.7;
  margin-bottom: 24px;
  padding: 20px;
  background: var(--background-color);
  border-left: 4px solid var(--primary-color);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.about-text p {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 32px;
}

.vm-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

.vm-block {
  padding: 32px;
  border-radius: var(--radius-lg);
}

.vm-block:first-child {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
}

.vm-block:last-child {
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
}

.vm-block h3 {
  font-size: 20px;
  margin-bottom: 12px;
}

.vm-block p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.objectives-block {
  background: var(--background-color);
  padding: 32px;
  border-radius: var(--radius-lg);
}

.objectives-block h3 {
  font-size: 24px;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.objectives-list {
  list-style: none;
}

.objectives-list li {
  padding: 12px 0;
  padding-left: 32px;
  position: relative;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  line-height: 1.6;
}

.objectives-list li:last-child {
  border-bottom: none;
}

.objectives-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--primary-color);
  font-weight: bold;
}

.about-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-card {
  background: var(--background-color);
  padding: 24px;
  border-radius: var(--radius-md);
}

.sidebar-card h4 {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.sidebar-card p,
.sidebar-card li {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 500;
}

.sidebar-card ul {
  list-style: none;
}

.sidebar-card li {
  padding: 4px 0;
  font-weight: 400;
}

.leadership-section {
  background: var(--background-color);
}

.leadership-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.leadership-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-align: center;
  transition: all 0.3s ease;
}

.leadership-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

.member-photo {
  height: 200px;
  overflow: hidden;
}

.photo-placeholder {
  height: 100%;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  color: white;
  font-weight: 700;
}

.member-info {
  padding: 24px;
}

.member-info h3 {
  font-size: 20px;
  margin-bottom: 8px;
}

.designation {
  color: var(--primary-color);
  font-weight: 500;
  margin-bottom: 12px;
}

.message {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

@media (max-width: 1024px) {
  .about-grid {
    grid-template-columns: 1fr;
  }

  .about-sidebar {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .sidebar-card {
    flex: 1;
    min-width: 200px;
  }

  .vm-section {
    grid-template-columns: 1fr;
  }

  .leadership-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .leadership-grid {
    grid-template-columns: 1fr;
  }
}
</style>
