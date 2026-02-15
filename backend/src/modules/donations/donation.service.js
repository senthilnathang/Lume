import prisma from '../../core/db/prisma.js';
import { stringUtil, responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, DONATION_STATUS, PAGINATION } from '../../shared/constants/index.js';

export class DonationService {
  _normalizeDates(data, fields) {
    for (const field of fields) {
      if (data[field] && typeof data[field] === 'string' && !data[field].includes('T')) {
        data[field] = new Date(data[field]).toISOString();
      }
    }
    return data;
  }

  async createDonor(donorData) {
    const donor = await prisma.donors.create({ data: donorData });
    return responseUtil.success(donor, MESSAGES.CREATED);
  }

  async findDonorById(id) {
    const donor = await prisma.donors.findUnique({ where: { id: Number(id) } });
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
      where.OR = [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const [rows, count] = await Promise.all([
      prisma.donors.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' }
      }),
      prisma.donors.count({ where })
    ]);

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async create(donationData) {
    this._normalizeDates(donationData, ['receipt_sent_at']);
    const donation = await prisma.donations.create({ data: donationData });
    return responseUtil.success(donation, MESSAGES.CREATED);
  }

  async findById(id) {
    const donation = await prisma.donations.findUnique({
      where: { id: Number(id) },
      include: { donors: true }
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
      if (start_date) where.created_at.gte = start_date.includes('T') ? start_date : new Date(start_date).toISOString();
      if (end_date) where.created_at.lte = end_date.includes('T') ? end_date : new Date(end_date).toISOString();
    }

    const [rows, count] = await Promise.all([
      prisma.donations.findMany({
        where,
        take: limit,
        skip: offset,
        include: { donors: true },
        orderBy: { created_at: 'desc' }
      }),
      prisma.donations.count({ where })
    ]);

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async update(id, donationData) {
    const donation = await prisma.donations.findUnique({ where: { id: Number(id) } });

    if (!donation) {
      return responseUtil.notFound('Donation');
    }

    this._normalizeDates(donationData, ['receipt_sent_at']);
    const updated = await prisma.donations.update({
      where: { id: Number(id) },
      data: donationData
    });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async updateStatus(id, status) {
    const donation = await prisma.donations.findUnique({ where: { id: Number(id) } });

    if (!donation) {
      return responseUtil.notFound('Donation');
    }

    const updated = await prisma.donations.update({
      where: { id: Number(id) },
      data: { status }
    });

    if (status === 'completed' && donation.campaign_id) {
      await this.updateCampaignProgress(donation.campaign_id);
    }

    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async updateCampaignProgress(campaignId) {
    const campaign = await prisma.campaigns.findUnique({ where: { id: Number(campaignId) } });
    if (!campaign) return;

    const result = await prisma.donations.aggregate({
      _sum: { amount: true },
      where: { campaign_id: campaignId, status: 'completed' }
    });

    const total = Number(result._sum.amount) || 0;

    await prisma.campaigns.update({
      where: { id: Number(campaignId) },
      data: { raised_amount: total }
    });
  }

  async createCampaign(campaignData) {
    if (campaignData.name) {
      campaignData.slug = stringUtil.slugify(campaignData.name) + '-' + stringUtil.randomString(6);
    }
    this._normalizeDates(campaignData, ['start_date', 'end_date']);
    const campaign = await prisma.campaigns.create({ data: campaignData });
    return responseUtil.success(campaign, MESSAGES.CREATED);
  }

  async findAllCampaigns(options = {}) {
    const campaigns = await prisma.campaigns.findMany({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' }
    });
    return responseUtil.success(campaigns);
  }

  async getStats() {
    const totalDonations = await prisma.donations.count({ where: { status: 'completed' } });

    const totalAmountResult = await prisma.donations.aggregate({
      _sum: { amount: true },
      where: { status: 'completed' }
    });
    const totalAmount = Number(totalAmountResult._sum.amount) || 0;

    const pendingAmountResult = await prisma.donations.aggregate({
      _sum: { amount: true },
      where: { status: 'pending' }
    });
    const pendingAmount = Number(pendingAmountResult._sum.amount) || 0;

    const uniqueDonorRows = await prisma.donations.findMany({
      where: { status: 'completed' },
      select: { donor_id: true },
      distinct: ['donor_id']
    });
    const uniqueDonors = uniqueDonorRows.length;

    return responseUtil.success({
      totalDonations,
      totalAmount,
      pendingAmount,
      uniqueDonors,
      averageDonation: totalDonations > 0 ? (totalAmount / totalDonations).toFixed(2) : 0
    });
  }

  async getDonorStats(donorId) {
    const donor = await prisma.donors.findUnique({ where: { id: Number(donorId) } });
    if (!donor) {
      return responseUtil.notFound('Donor');
    }

    const totalDonations = await prisma.donations.count({ where: { donor_id: donorId, status: 'completed' } });

    const totalAmountResult = await prisma.donations.aggregate({
      _sum: { amount: true },
      where: { donor_id: donorId, status: 'completed' }
    });
    const totalAmount = Number(totalAmountResult._sum.amount) || 0;

    return responseUtil.success({
      donor,
      totalDonations,
      totalAmount,
      averageDonation: totalDonations > 0 ? (totalAmount / totalDonations).toFixed(2) : 0
    });
  }
}

export default DonationService;
