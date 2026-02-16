import { table, int, integer, varchar, text, boolean, json, timestamp, decimal } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const donations = table('donations', {
  ...baseColumns(),
  donorId: idCol('donor_id'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: varchar('status', { length: 20 }).default('pending'),
  paymentMethod: varchar('payment_method', { length: 20 }),
  transactionId: varchar('transaction_id', { length: 255 }),
  paymentGateway: varchar('payment_gateway', { length: 50 }),
  campaignId: idCol('campaign_id'),
  activityId: idCol('activity_id'),
  designation: varchar('designation', { length: 255 }),
  isRecurring: boolean('is_recurring').default(false),
  frequency: varchar('frequency', { length: 20 }).default('one_time'),
  receiptSent: boolean('receipt_sent').default(false),
  receiptSentAt: timestamp('receipt_sent_at'),
  notes: text('notes'),
  anonymous: boolean('anonymous').default(false),
  metadata: json('metadata').$type().default({}),
});

export const campaigns = table('campaigns', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  goalAmount: decimal('goal_amount', { precision: 12, scale: 2 }),
  raisedAmount: decimal('raised_amount', { precision: 12, scale: 2 }).default('0'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  status: varchar('status', { length: 20 }).default('draft'),
  coverImage: varchar('cover_image', { length: 500 }),
  isFeatured: boolean('is_featured').default(false),
  metadata: json('metadata').$type().default({}),
});

export const donors = table('donors', {
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
