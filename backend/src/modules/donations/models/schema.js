import { mysqlTable, int, varchar, text, boolean, json, timestamp, mysqlEnum, decimal } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const donations = mysqlTable('donations', {
  ...baseColumns(),
  donorId: int('donor_id'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: mysqlEnum('status', ['pending', 'completed', 'failed', 'refunded']).default('pending'),
  paymentMethod: mysqlEnum('payment_method', ['cash', 'cheque', 'bank_transfer', 'online', 'other']),
  transactionId: varchar('transaction_id', { length: 255 }),
  paymentGateway: varchar('payment_gateway', { length: 50 }),
  campaignId: int('campaign_id'),
  activityId: int('activity_id'),
  designation: varchar('designation', { length: 255 }),
  isRecurring: boolean('is_recurring').default(false),
  frequency: mysqlEnum('frequency', ['one_time', 'weekly', 'monthly', 'quarterly', 'annually']).default('one_time'),
  receiptSent: boolean('receipt_sent').default(false),
  receiptSentAt: timestamp('receipt_sent_at'),
  notes: text('notes'),
  anonymous: boolean('anonymous').default(false),
  metadata: json('metadata').$type().default({}),
});

export const campaigns = mysqlTable('campaigns', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  goalAmount: decimal('goal_amount', { precision: 12, scale: 2 }),
  raisedAmount: decimal('raised_amount', { precision: 12, scale: 2 }).default('0'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  status: mysqlEnum('status', ['draft', 'active', 'completed', 'cancelled']).default('draft'),
  coverImage: varchar('cover_image', { length: 500 }),
  isFeatured: boolean('is_featured').default(false),
  metadata: json('metadata').$type().default({}),
});

export const donors = mysqlTable('donors', {
  ...baseColumns(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  isAnonymous: boolean('is_anonymous').default(false),
  isSubscribed: boolean('is_subscribed').default(true),
  notes: text('notes'),
  metadata: json('metadata').$type().default({}),
});
