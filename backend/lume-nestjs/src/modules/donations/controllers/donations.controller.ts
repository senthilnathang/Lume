import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { DonationsService } from '../services/donations.service';
import {
  CreateDonationDto,
  UpdateDonationDto,
  CreateDonorDto,
  UpdateDonorDto,
  CreateCampaignDto,
  QueryDonationsDto,
  QueryDonorsDto,
} from '../dtos';
import { Public, Permissions } from '@core/decorators';

@Controller('api/donations')
export class DonationsController {
  constructor(private donationsService: DonationsService) {}

  // Donation Stats
  @Get('stats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.read')
  async getStats() {
    return this.donationsService.getStats();
  }

  // Donor Management
  @Get('donors')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.read')
  async getAllDonors(@Query() query: QueryDonorsDto) {
    return this.donationsService.findAllDonors(query);
  }

  @Get('donors/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.read')
  async getDonor(@Param('id') id: string) {
    return this.donationsService.findDonorById(parseInt(id, 10));
  }

  @Get('donors/:id/stats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.read')
  async getDonorStats(@Param('id') id: string) {
    return this.donationsService.getDonorStats(parseInt(id, 10));
  }

  @Post('donors')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.write')
  async createDonor(@Body() dto: CreateDonorDto) {
    return this.donationsService.createDonor(dto);
  }

  // Campaign Management
  @Get('campaigns')
  @Public()
  async getAllCampaigns() {
    return this.donationsService.findAllCampaigns();
  }

  @Post('campaigns')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.write')
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return this.donationsService.createCampaign(dto);
  }

  // Donation CRUD
  @Get()
  @Public()
  async findAll(@Query() query: QueryDonationsDto) {
    return this.donationsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.read')
  async findById(@Param('id') id: string) {
    return this.donationsService.findById(parseInt(id, 10));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.write')
  async create(@Body() dto: CreateDonationDto) {
    return this.donationsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.write')
  async update(@Param('id') id: string, @Body() dto: UpdateDonationDto) {
    return this.donationsService.update(parseInt(id, 10), dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.write')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.donationsService.updateStatus(parseInt(id, 10), status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('donations.delete')
  async delete(@Param('id') id: string) {
    return this.donationsService.delete(parseInt(id, 10));
  }
}
