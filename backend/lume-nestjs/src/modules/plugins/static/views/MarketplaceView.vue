<template>
  <div class="marketplace-view">
    <!-- Header -->
    <div class="marketplace-header">
      <div class="header-content">
        <h1>Plugin Marketplace</h1>
        <p>Discover and install plugins to extend your workspace</p>
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="search-filters-container">
      <a-space class="search-space" direction="vertical" style="width: 100%">
        <!-- Search Input -->
        <a-input-search
          v-model:value="searchQuery"
          placeholder="Search plugins by name or description..."
          @search="handleSearch"
          size="large"
          :loading="loading"
          style="width: 100%"
        />

        <!-- Sort & Pricing Filters -->
        <a-space wrap>
          <a-select
            v-model:value="sortBy"
            style="width: 150px"
            @change="handleSortChange"
          >
            <a-select-option value="newest">Newest</a-select-option>
            <a-select-option value="downloads">Most Downloaded</a-select-option>
            <a-select-option value="rating">Highest Rated</a-select-option>
          </a-select>

          <a-select
            v-model:value="pricingFilter"
            style="width: 120px"
            @change="handleFilterChange"
            placeholder="All Pricing"
            allow-clear
          >
            <a-select-option value="">All Pricing</a-select-option>
            <a-select-option value="free">Free</a-select-option>
            <a-select-option value="premium">Premium</a-select-option>
          </a-select>
        </a-space>

        <!-- Category Tabs -->
        <a-segmented
          v-model:value="selectedCategory"
          :options="categoryOptions"
          @change="handleCategoryChange"
          block
        />
      </a-space>
    </div>

    <!-- Plugins Grid -->
    <div class="plugins-grid-container">
      <a-spin :spinning="loading" tip="Loading plugins...">
        <a-row :gutter="[16, 16]">
          <a-col
            v-for="plugin in plugins"
            :key="plugin.name"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <a-card
              class="plugin-card"
              @click="goToPluginDetail(plugin.name)"
            >
              <!-- Icon -->
              <div class="plugin-icon">{{ plugin.icon || '🔌' }}</div>

              <!-- Name -->
              <h3 class="plugin-name">{{ plugin.displayName }}</h3>

              <!-- Author -->
              <p class="plugin-author">by {{ plugin.author }}</p>

              <!-- Category Badge -->
              <a-tag class="category-tag">{{ plugin.category }}</a-tag>

              <!-- Rating -->
              <div class="rating-row">
                <a-rate
                  v-model:value="plugin.rating"
                  disabled
                  :allow-half="true"
                  style="font-size: 12px"
                />
                <span class="review-count">({{ plugin.reviewCount }})</span>
              </div>

              <!-- Download Count -->
              <p class="download-count">
                📥 {{ formatNumber(plugin.downloadCount) }} downloads
              </p>

              <!-- Pricing Badge -->
              <div class="pricing-badge">
                <a-tag
                  :color="plugin.pricing === 'free' ? 'green' : 'gold'"
                >
                  {{ plugin.pricing }}
                </a-tag>
              </div>

              <!-- Install Button -->
              <a-button
                type="primary"
                block
                @click.stop="handleInstall(plugin.name)"
                :loading="installingPlugin === plugin.name"
              >
                Install
              </a-button>
            </a-card>
          </a-col>
        </a-row>
      </a-spin>

      <!-- Load More -->
      <div v-if="hasMore" class="load-more-container">
        <a-button
          @click="loadMore"
          :loading="loading"
          type="default"
          size="large"
        >
          Load More Plugins
        </a-button>
      </div>

      <!-- Empty State -->
      <a-empty
        v-if="!loading && plugins.length === 0"
        description="No plugins found"
        style="margin-top: 50px"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { marketplaceAPI } from '../api/marketplace';

const router = useRouter();

// State
const plugins = ref<any[]>([]);
const categories = ref<any[]>([]);
const loading = ref(false);
const installingPlugin = ref<string | null>(null);
const searchQuery = ref('');
const selectedCategory = ref('');
const sortBy = ref('newest');
const pricingFilter = ref('');
const currentPage = ref(1);
const pageLimit = ref(12);
const totalCount = ref(0);

// Computed
const categoryOptions = computed(() => [
  { label: 'All', value: '' },
  ...(categories.value.map((cat: any) => ({
    label: cat.name,
    value: cat.slug,
  })) || []),
]);

const hasMore = computed(
  () => plugins.value.length < totalCount.value,
);

// Methods
const loadPlugins = async () => {
  try {
    loading.value = true;
    const result = await marketplaceAPI.getMarketplacePlugins({
      page: currentPage.value,
      limit: pageLimit.value,
      category: selectedCategory.value || undefined,
      search: searchQuery.value || undefined,
      sortBy: (sortBy.value as any) || 'newest',
      pricing: pricingFilter.value || undefined,
    });

    if (result.success) {
      plugins.value = result.data;
      totalCount.value = result.pagination?.total || 0;
    }
  } catch (error) {
    message.error('Failed to load plugins');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const loadCategories = async () => {
  try {
    const result = await marketplaceAPI.getCategories();
    if (result.success) {
      categories.value = result.data;
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadPlugins();
};

const handleCategoryChange = () => {
  currentPage.value = 1;
  loadPlugins();
};

const handleFilterChange = () => {
  currentPage.value = 1;
  loadPlugins();
};

const handleSortChange = () => {
  currentPage.value = 1;
  loadPlugins();
};

const loadMore = () => {
  currentPage.value += 1;
  const loadMorePlugins = async () => {
    try {
      loading.value = true;
      const result = await marketplaceAPI.getMarketplacePlugins({
        page: currentPage.value,
        limit: pageLimit.value,
        category: selectedCategory.value || undefined,
        search: searchQuery.value || undefined,
        sortBy: (sortBy.value as any) || 'newest',
        pricing: pricingFilter.value || undefined,
      });

      if (result.success) {
        plugins.value = [...plugins.value, ...result.data];
        totalCount.value = result.pagination?.total || 0;
      }
    } catch (error) {
      message.error('Failed to load more plugins');
      currentPage.value -= 1;
    } finally {
      loading.value = false;
    }
  };
  loadMorePlugins();
};

const handleInstall = async (pluginName: string) => {
  try {
    installingPlugin.value = pluginName;
    const result = await marketplaceAPI.installFromMarketplace(pluginName);
    if (result.success) {
      message.success(`${pluginName} installed successfully`);
    } else {
      message.error(`Failed to install ${pluginName}`);
    }
  } catch (error) {
    message.error('Installation failed');
    console.error(error);
  } finally {
    installingPlugin.value = null;
  }
};

const goToPluginDetail = (pluginName: string) => {
  router.push({
    name: 'plugins-marketplace-detail',
    params: { name: pluginName },
  });
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
onMounted(async () => {
  await loadCategories();
  await loadPlugins();
});
</script>

<style scoped>
.marketplace-view {
  padding: 20px;
}

.marketplace-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  text-align: center;
}

.header-content h1 {
  margin: 0;
  font-size: 32px;
  font-weight: bold;
}

.header-content p {
  margin: 8px 0 0 0;
  font-size: 16px;
  opacity: 0.9;
}

.search-filters-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.search-space {
  width: 100%;
}

.plugins-grid-container {
  min-height: 400px;
}

.plugin-card {
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.plugin-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
}

.plugin-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.plugin-name {
  margin: 12px 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-author {
  margin: 4px 0;
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-tag {
  margin: 8px 0;
}

.rating-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 8px 0;
}

.review-count {
  font-size: 12px;
  color: #999;
}

.download-count {
  margin: 8px 0;
  font-size: 12px;
  color: #666;
}

.pricing-badge {
  margin: 12px 0;
}

.load-more-container {
  text-align: center;
  padding: 30px 0;
}
</style>
