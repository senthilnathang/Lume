<template>
  <div class="plugin-detail-view">
    <!-- Back Button -->
    <a-button
      type="link"
      @click="goBack"
      style="margin-bottom: 20px"
    >
      ← Back to Marketplace
    </a-button>

    <a-spin :spinning="loading" tip="Loading plugin details...">
      <div v-if="plugin">
        <!-- Hero Section -->
        <a-card class="hero-card">
          <a-row :gutter="[24, 24]">
            <a-col :xs="24" :sm="6" :md="4">
              <div class="hero-icon">{{ plugin.icon || '🔌' }}</div>
            </a-col>
            <a-col :xs="24" :sm="18" :md="20">
              <h1 class="plugin-title">{{ plugin.displayName }}</h1>
              <p class="plugin-author-info">
                by <strong>{{ plugin.author }}</strong>
              </p>

              <a-space wrap style="margin: 16px 0">
                <a-tag color="blue">{{ plugin.category }}</a-tag>
                <a-tag>v{{ plugin.version }}</a-tag>
                <a-tag
                  :color="plugin.pricing === 'free' ? 'green' : 'gold'"
                >
                  {{ plugin.pricing }}
                </a-tag>
              </a-space>

              <a-divider style="margin: 16px 0" />

              <a-row :gutter="[16, 16]">
                <a-col :xs="24" :sm="8">
                  <div class="stat">
                    <div class="stat-value">
                      <a-rate
                        v-model:value="plugin.rating"
                        disabled
                        :allow-half="true"
                      />
                    </div>
                    <div class="stat-label">
                      {{ plugin.rating }} ({{ plugin.reviewCount }} reviews)
                    </div>
                  </div>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <div class="stat">
                    <div class="stat-value">
                      {{ formatNumber(plugin.downloadCount) }}
                    </div>
                    <div class="stat-label">Downloads</div>
                  </div>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <div class="stat">
                    <div class="stat-value">
                      {{ new Date(plugin.publishedAt).toLocaleDateString() }}
                    </div>
                    <div class="stat-label">Published</div>
                  </div>
                </a-col>
              </a-row>

              <a-space style="margin-top: 20px">
                <a-button
                  type="primary"
                  size="large"
                  @click="handleInstall"
                  :loading="installing"
                >
                  Install
                </a-button>
                <a-button size="large">
                  View Source
                </a-button>
              </a-space>
            </a-col>
          </a-row>
        </a-card>

        <!-- Description -->
        <a-card title="About" class="section-card" style="margin-top: 20px">
          <p v-if="plugin.description">{{ plugin.description }}</p>
          <p v-else style="color: #999">No description provided</p>
        </a-card>

        <!-- Reviews Section -->
        <a-card title="Reviews" class="section-card" style="margin-top: 20px">
          <!-- Rating Summary -->
          <a-row :gutter="[24, 24]" style="margin-bottom: 24px">
            <a-col :xs="24" :sm="8">
              <div class="rating-summary">
                <div class="rating-avg">{{ plugin.rating }}</div>
                <a-rate
                  v-model:value="plugin.rating"
                  disabled
                  :allow-half="true"
                />
                <p style="color: #999; margin-top: 8px">
                  {{ plugin.reviewCount }} reviews
                </p>
              </div>
            </a-col>
            <a-col :xs="24" :sm="16">
              <a-divider type="vertical" style="height: auto" />
              <!-- Rating Breakdown -->
              <div class="rating-breakdown">
                <div
                  v-for="stars in [5, 4, 3, 2, 1]"
                  :key="stars"
                  class="rating-row-bar"
                >
                  <span class="stars">{{ stars }} ⭐</span>
                  <a-progress :percent="50" :show-info="false" />
                </div>
              </div>
            </a-col>
          </a-row>

          <a-divider />

          <!-- Write Review Form -->
          <div class="write-review">
            <h3>Write a Review</h3>
            <a-form :model="newReview" layout="vertical">
              <a-form-item label="Rating">
                <a-rate v-model:value="newReview.rating" />
              </a-form-item>
              <a-form-item label="Title">
                <a-input
                  v-model:value="newReview.title"
                  placeholder="Review title"
                />
              </a-form-item>
              <a-form-item label="Review">
                <a-textarea
                  v-model:value="newReview.body"
                  placeholder="Share your experience with this plugin"
                  :rows="4"
                />
              </a-form-item>
              <a-button
                type="primary"
                @click="submitReview"
                :loading="submittingReview"
              >
                Submit Review
              </a-button>
            </a-form>
          </div>

          <a-divider />

          <!-- Reviews List -->
          <div class="reviews-list">
            <div v-if="plugin.reviews && plugin.reviews.length > 0">
              <div v-for="review in plugin.reviews" :key="review.id" class="review-item">
                <a-row :gutter="[16, 8]">
                  <a-col :xs="24">
                    <a-space>
                      <a-rate
                        v-model:value="review.rating"
                        disabled
                        :allow-half="true"
                        style="font-size: 12px"
                      />
                      <span class="review-title" v-if="review.title">
                        {{ review.title }}
                      </span>
                    </a-space>
                  </a-col>
                  <a-col :xs="24">
                    <p class="review-body">{{ review.body }}</p>
                  </a-col>
                </a-row>
                <a-divider />
              </div>
            </div>
            <p v-else style="color: #999">
              No reviews yet. Be the first to review this plugin!
            </p>
          </div>
        </a-card>

        <!-- Plugin Info -->
        <a-card title="Plugin Information" class="section-card" style="margin-top: 20px">
          <a-descriptions :column="1" bordered>
            <a-descriptions-item label="Version">
              {{ plugin.version }}
            </a-descriptions-item>
            <a-descriptions-item label="Author">
              {{ plugin.author }}
            </a-descriptions-item>
            <a-descriptions-item label="Category">
              {{ plugin.category }}
            </a-descriptions-item>
            <a-descriptions-item label="Pricing">
              {{ plugin.pricing }}
            </a-descriptions-item>
            <a-descriptions-item label="Published">
              {{ new Date(plugin.publishedAt).toLocaleDateString() }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </div>

      <!-- Error State -->
      <a-empty
        v-if="!loading && !plugin"
        description="Plugin not found"
        style="margin-top: 50px"
      />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { marketplaceAPI } from '../api/marketplace';

const route = useRoute();
const router = useRouter();

// State
const plugin = ref<any>(null);
const loading = ref(false);
const installing = ref(false);
const submittingReview = ref(false);
const newReview = ref({
  rating: 5,
  title: '',
  body: '',
});

// Methods
const loadPlugin = async () => {
  try {
    loading.value = true;
    const pluginName = route.params.name as string;
    const result = await marketplaceAPI.getMarketplacePlugin(pluginName);

    if (result.success) {
      plugin.value = result.data;
    } else {
      message.error('Failed to load plugin');
    }
  } catch (error) {
    message.error('Error loading plugin details');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleInstall = async () => {
  try {
    installing.value = true;
    const result = await marketplaceAPI.installFromMarketplace(
      plugin.value.name,
    );

    if (result.success) {
      message.success(`${plugin.value.displayName} installed successfully`);
    } else {
      message.error(`Failed to install ${plugin.value.displayName}`);
    }
  } catch (error) {
    message.error('Installation failed');
    console.error(error);
  } finally {
    installing.value = false;
  }
};

const submitReview = async () => {
  try {
    submittingReview.value = true;
    const result = await marketplaceAPI.submitReview(
      plugin.value.name,
      newReview.value,
    );

    if (result.success) {
      message.success('Review submitted successfully');
      newReview.value = { rating: 5, title: '', body: '' };
      // Reload plugin to show new review
      await loadPlugin();
    } else {
      message.error('Failed to submit review');
    }
  } catch (error) {
    message.error('Error submitting review');
    console.error(error);
  } finally {
    submittingReview.value = false;
  }
};

const goBack = () => {
  router.back();
};

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Lifecycle
onMounted(() => {
  loadPlugin();
});
</script>

<style scoped>
.plugin-detail-view {
  padding: 20px;
}

.hero-card {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
}

.hero-icon {
  font-size: 80px;
  text-align: center;
}

.plugin-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: bold;
}

.plugin-author-info {
  margin: 8px 0;
  font-size: 14px;
  color: #666;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.section-card {
  margin-top: 20px;
}

.rating-summary {
  text-align: center;
}

.rating-avg {
  font-size: 48px;
  font-weight: bold;
}

.rating-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rating-row-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stars {
  min-width: 40px;
  text-align: right;
}

.write-review {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.write-review h3 {
  margin-top: 0;
}

.reviews-list {
  margin-top: 20px;
}

.review-item {
  padding: 16px 0;
}

.review-title {
  font-weight: 600;
}

.review-body {
  margin: 8px 0 0 0;
  color: #666;
}
</style>
