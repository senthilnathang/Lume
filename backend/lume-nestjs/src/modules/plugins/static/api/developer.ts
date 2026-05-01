import { post, get, put } from '@/api/request';

export interface PluginSubmission {
  pluginName: string;
  displayName: string;
  manifestUrl: string;
}

export const developerAPI = {
  // Submit a new plugin
  async submitPlugin(submission: PluginSubmission) {
    return post('/api/developer/plugins/submit', submission);
  },

  // Get my submitted plugins
  async getMyPlugins() {
    return get('/api/developer/plugins');
  },

  // Get specific plugin submission
  async getPluginSubmission(name: string) {
    return get(`/api/developer/plugins/${name}`);
  },

  // Update plugin submission
  async updatePluginSubmission(
    name: string,
    data: { displayName?: string; description?: string },
  ) {
    return put(`/api/developer/plugins/${name}`, data);
  },

  // Get plugin analytics
  async getPluginAnalytics(name: string) {
    return get(`/api/developer/plugins/${name}/analytics`);
  },
};

export const adminAPI = {
  // Get pending submissions
  async getPendingSubmissions() {
    return get('/api/admin/marketplace/submissions');
  },

  // Get submissions by status
  async getSubmissionsByStatus(status: 'pending' | 'active' | 'rejected') {
    return get(`/api/admin/marketplace/submissions/${status}`);
  },

  // Get submission details
  async getSubmissionDetail(name: string) {
    return get(`/api/admin/marketplace/submissions/${name}`);
  },

  // Approve submission
  async approveSubmission(name: string) {
    return post(`/api/admin/marketplace/submissions/${name}/approve`, {});
  },

  // Reject submission
  async rejectSubmission(name: string, reason?: string) {
    return post(`/api/admin/marketplace/submissions/${name}/reject`, {
      reason,
    });
  },
};
