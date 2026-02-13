import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { stringUtil, responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, DONATION_STATUS, PAGINATION } from '../../shared/constants/index.js';

export class DonationService {
  constructor() {
    this.db = getDatabase();
    this.Donation = this.db.models.Donation;
    this.Donor = this.db.models.Donor;
    this.Campaign = this.db.models.Campaign;
  }

  async createDonor(donorData) {
    const donor = await this.Donor.create(donorData);
    return responseUtil.success(donor, MESSAGES.CREATED);
  }

  async findDonorById(id) {
    const donor = await this.Donor.findByPk(id);
    if (!donor) {
      return responseUtil.notFound('Donor');
    }
    return responseUtil.success(donor);
  }

  async findAllDonors(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, search } = options;
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await this.Donor.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async create(donationData) {
    const donation = await this.Donation.create(donationData);
    return responseUtil.success(donation, MESSAGES.CREATED);
  }

  async findById(id) {
    const donation = await this.Donation.findByPk(id, {
      include: [{ model: this.Donor }]
    });
    if (!donation) {
      return responseUtil.notFound('Donation');
    }
    return responseUtil.success(donation);
  }

  async findAll(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, donor_id, campaign_id, start_date, end_date } = options;
    const offset = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (donor_id) {
      where.donor_id = donor_id;
    }

    if (campaign_id) {
      where.campaign_id = campaign_id;
    }

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = start_date;
      if (end_date) where.created_at[Op.lte] = end_date;
    }

    const { count, rows } = await this.Donation.findAndCountAll({
      where,
      limit,
      offset,
      include: [{ model: this.Donor }],
      order: [['created_at', 'DESC']]
    });

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async update(id, donationData) {
    const donation = await this.Donation.findByPk(id);

    if (!donation) {
      return responseUtil.notFound('Donation');
    }

    await donation.update(donationData);
    return responseUtil.success(donation, MESSAGES.UPDATED);
  }

  async updateStatus(id, status) {
    const donation = await this.Donation.findByPk(id);

    if (!donation) {
      return responseUtil.notFound('Donation');
    }

    await donation.update({ status });

    if (status === 'completed' && donation.campaign_id) {
      await this.updateCampaignProgress(donation.campaign_id);
    }

    return responseUtil.success(donation, MESSAGES.UPDATED);
  }

  async updateCampaignProgress(campaignId) {
    const campaign = await this.Campaign.findByPk(campaignId);
    if (!campaign) return;

    const total = await this.Donation.sum('amount', {
      where: { campaign_id: campaignId, status: 'completed' }
    });

    await campaign.update({ raised_amount: total || 0 });
  }

  async createCampaign(campaignData) {
    if (campaignData.name) {
      campaignData.slug = stringUtil.slugify(campaignData.name) + '-' + stringUtil.randomString(6);
    }
    const campaign = await this.Campaign.create(campaignData);
    return responseUtil.success(campaign, MESSAGES.CREATED);
  }

  async findAllCampaigns(options = {}) {
    const campaigns = await this.Campaign.findAll({
      where: { status: 'active' },
      order: [['created_at', 'DESC']]
    });
    return responseUtil.success(campaigns);
  }

  async getStats() {
    const totalDonations = await this.Donation.count({ where: { status: 'completed' } });
    const totalAmount = await this.Donation.sum('amount', { where: { status: 'completed' } }) || 0;
    const pendingAmount = await this.Donation.sum('amount', { where: { status: 'pending' } }) || 0;
    const uniqueDonors = await this.Donation.count({ distinct: true, col: 'donor_id', where: { status: 'completed' } });

    return responseUtil.success({
      totalDonations,
      totalAmount,
      pendingAmount,
      uniqueDonors,
      averageDonation: totalDonations > 0 ? (totalAmount / totalDonations).toFixed(2) : 0
    });
  }

  async getDonorStats(donorId) {
    const donor = await this.Donor.findByPk(donorId);
    if (!donor) {
      return responseUtil.notFound('Donor');
    }

    const totalDonations = await this.Donation.count({ where: { donor_id: donorId, status: 'completed' } });
    const totalAmount = await this.Donation.sum('amount', { where: { donor_id: donorId, status: 'completed' } }) || 0;

    return responseUtil.success({
      donor: donor.toJSON(),
      totalDonations,
      totalAmount,
      averageDonation: totalDonations > 0 ? (totalAmount / totalDonations).toFixed(2) : 0
    });
  }
}

export default DonationService;
