<script setup lang="ts">
// @ts-nocheck
import { ref } from 'vue';
import Header from '@/components/common/Header.vue';
import Footer from '@/components/common/Footer.vue';
import api from '@/api';

const form = ref({ name: '', email: '', phone: '', subject: '', message: '' });
const submitting = ref(false);
const success = ref(false);
const error = ref('');

const handleSubmit = async () => {
  submitting.value = true;
  error.value = '';
  try {
    await api.post('/public/contact', form.value);
    success.value = true;
    form.value = { name: '', email: '', phone: '', subject: '', message: '' };
  } catch (err) {
    error.value = 'Failed to send message. Please try again.';
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="contact-page">
    <Header />

    <section class="page-header">
      <div class="container">
        <h1>Contact Us</h1>
        <p>Get in touch with us for any queries or collaborations</p>
      </div>
    </section>

    <section class="breadcrumb-section">
      <div class="container">
        <div class="breadcrumb">
          <router-link to="/">Home</router-link>
          <span>/</span>
          <span>Contact Us</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="contact-grid">
          <div class="contact-info">
            <h2>Get In Touch</h2>
            <p>We'd love to hear from you. Reach out to us for any questions or suggestions.</p>

            <div class="info-cards">
              <div class="info-card">
                <span class="icon">📍</span>
                <div>
                  <h4>Address</h4>
                  <p>Main Road, Karuppur, Konerirajapuram Po<br/>Thiruvaiyaru Tk, Thanjavur<br/>Tamil Nadu - 613101</p>
                </div>
              </div>
              <div class="info-card">
                <span class="icon">📞</span>
                <div>
                  <h4>Phone</h4>
                  <p>+91 43622 83720</p>
                </div>
              </div>
              <div class="info-card">
                <span class="icon">✉️</span>
                <div>
                  <h4>Email</h4>
                  <p>gawdesy@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

          <div class="contact-form-wrapper">
            <div v-if="success" class="success-message">
              <span class="success-icon">✓</span>
              <h3>Message Sent!</h3>
              <p>Thank you for reaching out. We'll get back to you soon.</p>
              <button @click="success = false" class="btn btn-primary">Send Another Message</button>
            </div>

            <form v-else @submit.prevent="handleSubmit" class="contact-form">
              <h3>Send us a Message</h3>

              <div v-if="error" class="error-message">{{ error }}</div>

              <div class="form-row">
                <div class="form-group">
                  <label>Name *</label>
                  <input v-model="form.name" type="text" required placeholder="Your name" />
                </div>
                <div class="form-group">
                  <label>Email *</label>
                  <input v-model="form.email" type="email" required placeholder="your@email.com" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Phone</label>
                  <input v-model="form.phone" type="tel" placeholder="+91 XXXXX XXXXX" />
                </div>
                <div class="form-group">
                  <label>Subject</label>
                  <input v-model="form.subject" type="text" placeholder="How can we help?" />
                </div>
              </div>

              <div class="form-group">
                <label>Message *</label>
                <textarea v-model="form.message" required rows="5" placeholder="Your message..."></textarea>
              </div>

              <button type="submit" :disabled="submitting" class="btn btn-primary btn-block">
                {{ submitting ? 'Sending...' : 'Send Message' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.contact-page { min-height: 100vh; }

.breadcrumb-section { background: white; padding: 12px 0; }

.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 48px;
}

.contact-info h2 {
  font-size: 32px;
  margin-bottom: 16px;
}

.contact-info > p {
  color: var(--text-secondary);
  margin-bottom: 32px;
  line-height: 1.7;
}

.info-cards {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.info-card .icon {
  font-size: 28px;
}

.info-card h4 {
  font-size: 16px;
  margin-bottom: 4px;
}

.info-card p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.contact-form-wrapper {
  background: white;
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-md);
}

.contact-form h3 {
  font-size: 24px;
  margin-bottom: 24px;
}

.success-message {
  text-align: center;
  padding: 48px 0;
}

.success-icon {
  width: 64px;
  height: 64px;
  background: #E8F5E9;
  color: var(--primary-color);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 20px;
}

.success-message h3 {
  font-size: 24px;
  margin-bottom: 12px;
}

.success-message p {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.error-message {
  background: #FFF2F0;
  color: #F5222D;
  padding: 12px;
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.btn-block {
  width: 100%;
}

@media (max-width: 1024px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
