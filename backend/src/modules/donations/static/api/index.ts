/**
 * Donations API
 * API for donation, donor, and campaign management
 */
import { get, post, put, del } from '@/api/request';

export interface Donation {
  id: number;
  donor_id?: number;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: 'cash' | 'cheque' | 'bank_transfer' | 'online' | 'other';
  transaction_id?: string;
  payment_gateway?: string;
  campaign_id?: number;
  activity_id?: number;
  designation?: string;
  is_recurring: boolean;
  frequency: 'one_time' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  receipt_sent: boolean;
  receipt_sent_at?: string;
  notes?: string;
  anonymous: boolean;
  metadata?: Record<string, any>;
  donor?: Donor;
  campaign?: Campaign;
  created_at?: string;
  updated_at?: string;
}

export interface Donor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_anonymous: boolean;
  is_subscribed: boolean;
  notes?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Campaign {
  id: number;
  name: string;
  slug: string;
  description?: string;
  goal_amount?: number;
  raised_amount: number;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  cover_image?: string;
  is_featured: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface DonationStats {
  total: number;
  totalAmount: number;
  completed: number;
  pending: number;
}

export interface CreateDonationData {
  donor_id?: number;
  amount: number;
  currency?: string;
  payment_method?: string;
  transaction_id?: string;
  campaign_id?: number;
  designation?: string;
  notes?: string;
  is_recurring?: boolean;
  frequency?: string;
  anonymous?: boolean;
}

export interface CreateDonorData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_anonymous?: boolean;
  is_subscribed?: boolean;
  notes?: string;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  goal_amount?: number;
  start_date?: string;
  end_date?: string;
  cover_image?: string;
  is_featured?: boolean;
}

// Donations
export function getDonations(params?: Record<string, any>): Promise<any> {
  return get('/donations', params);
}

export function getDonation(id: number): Promise<Donation> {
  return get<Donation>(`/donations/${id}`);
}

export function getDonationStats(): Promise<DonationStats> {
  return get<DonationStats>('/donations/stats');
}

export function createDonation(data: CreateDonationData): Promise<Donation> {
  return post<Donation>('/donations', data);
}

export function updateDonation(id: number, data: Partial<CreateDonationData>): Promise<Donation> {
  return put<Donation>(`/donations/${id}`, data);
}

export function updateDonationStatus(id: number, status: string): Promise<Donation> {
  return put<Donation>(`/donations/${id}/status`, { status });
}

export function deleteDonation(id: number): Promise<void> {
  return del(`/donations/${id}`);
}

// Donors
export function getDonors(params?: Record<string, any>): Promise<any> {
  return get('/donations/donors', params);
}

export function getDonor(id: number): Promise<Donor> {
  return get<Donor>(`/donations/donors/${id}`);
}

export function getDonorStats(id: number): Promise<any> {
  return get(`/donations/donors/${id}/stats`);
}

export function createDonor(data: CreateDonorData): Promise<Donor> {
  return post<Donor>('/donations/donors', data);
}

// Campaigns
export function getCampaigns(): Promise<Campaign[]> {
  return get<Campaign[]>('/donations/campaigns');
}

export function getCampaign(id: number): Promise<Campaign> {
  return get<Campaign>(`/donations/campaigns/${id}`);
}

export function createCampaign(data: CreateCampaignData): Promise<Campaign> {
  return post<Campaign>('/donations/campaigns', data);
}

export function updateCampaign(id: number, data: Partial<CreateCampaignData>): Promise<Campaign> {
  return put<Campaign>(`/donations/campaigns/${id}`, data);
}

export function deleteCampaign(id: number): Promise<void> {
  return del(`/donations/campaigns/${id}`);
}
