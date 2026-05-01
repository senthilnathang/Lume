import { get, post, put, del } from '@/api/request';

export interface MarketplaceFilters {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sortBy?: 'downloads' | 'rating' | 'newest';
  pricing?: string;
}

export interface ReviewSubmission {
  rating: number;
  title?: string;
  body?: string;
}

export const marketplaceAPI = {
  // Get list of marketplace plugins
  async getMarketplacePlugins(filters?: MarketplaceFilters) {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.pricing) params.append('pricing', filters.pricing);
    }
    const query = params.toString();
    return get(`/api/marketplace/plugins${query ? '?' + query : ''}`);
  },

  // Get single plugin details
  async getMarketplacePlugin(name: string) {
    return get(`/api/marketplace/plugins/${name}`);
  },

  // Get all categories
  async getCategories() {
    return get('/api/marketplace/categories');
  },

  // Get featured plugins
  async getFeaturedPlugins(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return get(`/api/marketplace/plugins/featured${params}`);
  },

  // Get trending plugins
  async getTrendingPlugins(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return get(`/api/marketplace/plugins/trending${params}`);
  },

  // Install plugin from marketplace
  async installFromMarketplace(name: string, version?: string) {
    const params = version ? `?version=${version}` : '';
    return post(`/api/marketplace/plugins/${name}/install${params}`, {});
  },

  // Get reviews for a plugin
  async getPluginReviews(name: string, page?: number, limit?: number) {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    const query = params.toString();
    return get(
      `/api/marketplace/plugins/${name}/reviews${query ? '?' + query : ''}`,
    );
  },

  // Submit a review for a plugin
  async submitReview(name: string, review: ReviewSubmission) {
    return post(`/api/marketplace/plugins/${name}/reviews`, review);
  },

  // Search plugins
  async searchPlugins(query: string, filters?: any) {
    return post(`/api/marketplace/plugins/${query}/search`, filters || {});
  },
};
