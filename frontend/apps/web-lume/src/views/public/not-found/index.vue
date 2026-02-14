<script setup lang="ts">
// @ts-nocheck
import Header from '@/components/common/Header.vue';
import Footer from '@/components/common/Footer.vue';
</script>

<template>
  <div class="not-found-page">
    <Header />

    <section class="not-found-section">
      <div class="container">
        <div class="not-found-content">
          <span class="error-code">404</span>
          <h1>Page Not Found</h1>
          <p>The page you're looking for doesn't exist or has been moved.</p>
          <router-link to="/" class="btn btn-primary">Back to Home</router-link>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.not-found-page { min-height: 100vh; }

.not-found-section {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 100px 24px;
}

.error-code {
  font-size: 120px;
  font-weight: 700;
  color: var(--primary-color);
  display: block;
  line-height: 1;
  margin-bottom: 24px;
}

h1 {
  font-size: 32px;
  margin-bottom: 16px;
}

p {
  color: var(--text-secondary);
  margin-bottom: 32px;
}
</style>
