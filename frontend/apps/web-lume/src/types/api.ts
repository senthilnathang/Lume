// TypeScript Interfaces for GAWDESY API
import type { PaginationProps } from 'ant-design-vue';

// API Response Types
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  total?: number;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

// Pagination Params
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'EDITOR' | 'VIEWER';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Programme Types
export interface Programme {
  id: number;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  category?: string;
  status: ProgrammeStatus;
  startDate?: string;
  endDate?: string;
  targetAmount?: number;
  raisedAmount?: number;
  beneficiaryCount?: number;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProgrammeStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface ProgrammeFormData {
  title: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  category?: string;
  status: ProgrammeStatus;
  startDate?: string;
  endDate?: string;
  targetAmount?: number;
  beneficiaryCount?: number;
}

// Activity Types
export interface Activity {
  id: number;
  programmeId?: number;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  activityDate?: string;
  location?: string;
  status: ActivityStatus;
  beneficiaryCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type ActivityStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';

export interface ActivityFormData {
  title: string;
  description?: string;
  image?: string;
  activityDate?: string;
  location?: string;
  status: ActivityStatus;
  beneficiaryCount?: number;
}

// Document Types
export interface Document {
  id: number;
  programmeId?: number;
  title: string;
  description?: string;
  filePath: string;
  fileType?: string;
  fileSize?: number;
  category?: string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFormData {
  title: string;
  description?: string;
  filePath: string;
  category?: string;
  isPublic: boolean;
}

// Contact Message Types
export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: MessageStatus;
  repliedBy?: number;
  repliedAt?: string;
  reply?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageStatus = 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

// Donor Types
export interface Donor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  anonymousDonation: boolean;
  status: DonorStatus;
  totalDonated: number;
  createdAt: string;
  updatedAt: string;
}

export type DonorStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface DonorFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  anonymousDonation: boolean;
  status: DonorStatus;
}

// Donation Types
export interface Donation {
  id: number;
  donorId?: number;
  programmeId?: number;
  amount: number;
  currency: string;
  paymentMethod?: string;
  transactionId?: string;
  status: DonationStatus;
  message?: string;
  donatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type DonationStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export interface DonationFormData {
  donorId?: number;
  programmeId?: number;
  amount: number;
  currency: string;
  paymentMethod?: string;
  transactionId?: string;
  status: DonationStatus;
  message?: string;
}

// Team Member Types
export interface TeamMember {
  id: number;
  organizationId?: number;
  name: string;
  position?: string;
  bio?: string;
  image?: string;
  phone?: string;
  email?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberFormData {
  name: string;
  position?: string;
  bio?: string;
  image?: string;
  phone?: string;
  email?: string;
  order: number;
  isActive: boolean;
}

// Organization Types
export interface Organization {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationFormData {
  name: string;
  description?: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
}

// Dashboard Stats
export interface DashboardStats {
  totalProgrammes: number;
  totalActivities: number;
  totalDonors: number;
  totalDonations: number;
  totalContactMessages: number;
  newContactMessages: number;
  totalBeneficiaries: number;
  totalDonationAmount: number;
  thisMonthDonations: number;
  recentDonations: Donation[];
}

// Table Column Types
export interface TableColumn<T = any> {
  title: string;
  dataIndex: keyof T | string;
  key: string;
  width?: number | string;
  fixed?: 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  sorter?: boolean | ((a: T, b: T) => number);
  filters?: { text: string; value: string }[];
  filterMultiple?: boolean;
  customRender?: (value: any, record: T, index: number) => any;
}

// Form Schema Types
export interface FormSchema {
  field: string;
  label: string;
  component: 'Input' | 'InputNumber' | 'Select' | 'TreeSelect' | 'Cascader' | 'Radio' | 'Checkbox' | 'DatePicker' | 'Upload' | 'Textarea' | 'Switch';
  componentProps?: object;
  rules?: object[];
  colProps?: object;
  defaultValue?: any;
}

// Select Option
export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}
