/**
 * Shared Module Types
 * Type definitions shared between backend and frontend
 */

// Module Manifest
export interface ModuleManifest {
  name: string;
  technicalName: string;
  version: string;
  summary: string;
  description: string;
  author: string;
  website: string;
  license: string;
  category: string;
  application: boolean;
  installable: boolean;
  autoInstall: boolean;
  depends: string[];
  frontend: FrontendConfig;
  permissions: string[];
  preInit?: string;
  postInit?: string;
}

export interface FrontendConfig {
  routes: string[];
  views: string[];
  components: string[];
  stores: string[];
  composables: string[];
  locales: string[];
  menus: MenuItem[];
}

export interface MenuItem {
  name: string;
  path: string;
  icon?: string;
  sequence?: number;
  children?: MenuItem[];
  hideInMenu?: boolean;
}

// User Types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar?: string;
  role_id: number;
  is_active: boolean;
  is_email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Activity Types
export interface Activity {
  id: number;
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  category?: string;
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  location?: string;
  cover_image?: string;
  gallery: string[];
  capacity?: number;
  registered_count: number;
  is_featured: boolean;
  created_by?: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityDTO {
  title: string;
  description?: string;
  short_description?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  capacity?: number;
  cover_image?: string;
}

export interface UpdateActivityDTO extends Partial<CreateActivityDTO> {
  status?: 'draft' | 'published' | 'completed' | 'cancelled';
}

// Donation Types
export interface Donor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_anonymous: boolean;
  total_donations?: number;
  created_at: string;
}

export interface Donation {
  id: number;
  donor_id?: number;
  donor?: Donor;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  campaign_id?: number;
  designation?: string;
  is_recurring: boolean;
  anonymous: boolean;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  slug: string;
  description?: string;
  goal_amount?: number;
  raised_amount?: number;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  is_featured: boolean;
  created_at: string;
}

// Team Types
export interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  bio?: string;
  photo?: string;
  order: number;
  is_active: boolean;
  is_leader: boolean;
  social_links: Record<string, string>;
  created_at: string;
}

// Message Types
export interface Message {
  id: number;
  subject?: string;
  content: string;
  sender_name?: string;
  sender_email: string;
  sender_phone?: string;
  type: 'contact' | 'inquiry' | 'support' | 'feedback' | 'other';
  status: 'new' | 'read' | 'replied' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_starred: boolean;
  read_at?: string;
  replied_at?: string;
  created_at: string;
}

// Document Types
export interface Document {
  id: number;
  title: string;
  filename: string;
  mime_type?: string;
  size?: number;
  type: 'image' | 'video' | 'document' | 'audio' | 'other';
  category?: string;
  path: string;
  url?: string;
  description?: string;
  uploaded_by?: number;
  downloads: number;
  is_public: boolean;
  created_at: string;
}

// Settings Types
export interface Setting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: string;
  description?: string;
  is_public: boolean;
}

// Audit Types
export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  meta?: {
    pagination?: Pagination;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Dashboard Types
export interface DashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalActivities: number;
    publishedActivities: number;
    totalDonations: number;
    totalDonationAmount: number;
    totalDonors: number;
    totalMessages: number;
    unreadMessages: number;
    totalDocuments: number;
  };
  recentActivities: Array<{
    id: number;
    title: string;
    slug: string;
    start_date: string;
    status: string;
  }>;
  recentDonations: Array<{
    id: number;
    amount: number;
    donor: string;
    created_at: string;
  }>;
}

