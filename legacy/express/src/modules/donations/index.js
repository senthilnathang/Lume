import DonationService from './donation.service.js';
import donationRoutes from './donation.routes.js';
import { donations, donors, campaigns } from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';

const donationAdapter = new DrizzleAdapter(donations);
const donorAdapter = new DrizzleAdapter(donors);
const campaignAdapter = new DrizzleAdapter(campaigns);

export {
  DonationService,
  donationRoutes,
  donationAdapter,
  donorAdapter,
  campaignAdapter,
  donations,
  donors,
  campaigns
};

export default {
  DonationService,
  donationRoutes,
  donationAdapter,
  donorAdapter,
  campaignAdapter,
  donations,
  donors,
  campaigns
};
