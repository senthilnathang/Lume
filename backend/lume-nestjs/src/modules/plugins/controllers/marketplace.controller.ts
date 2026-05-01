import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MarketplaceService } from '../services/marketplace.service';
import { CatalogSeederService } from '../services/catalog-seeder.service';
import { PolicyGuard, Policy } from '@core/permission/policy.guard';

@Controller('api/marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly catalogSeeder: CatalogSeederService,
  ) {
    // Seed catalog on module init
    this.initializeCatalog();
  }

  private async initializeCatalog() {
    try {
      await this.catalogSeeder.seed();
    } catch (error) {
      console.error('Failed to initialize catalog:', error);
    }
  }

  @Get('plugins')
  async listPlugins(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'downloads' | 'rating' | 'newest',
    @Query('pricing') pricing?: string,
  ) {
    try {
      const result = await this.marketplaceService.listAvailable({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        category,
        search,
        sortBy,
        pricing,
      });
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('categories')
  async getCategories() {
    try {
      const db = (this.marketplaceService as any).drizzle.getDrizzle();
      const schema = await import('../models/schema');
      const results = await db.select().from(schema.marketplaceCategories);
      return { success: true, data: results };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('plugins/featured')
  async getFeaturedPlugins(@Query('limit') limit?: string) {
    try {
      const result = await this.marketplaceService.getFeaturedPlugins(
        limit ? parseInt(limit, 10) : 10,
      );
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('plugins/trending')
  async getTrendingPlugins(@Query('limit') limit?: string) {
    try {
      const result = await this.marketplaceService.getTrendingPlugins(
        limit ? parseInt(limit, 10) : 10,
      );
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('plugins/:name')
  async getPluginDetail(@Param('name') name: string) {
    try {
      const result = await this.marketplaceService.getPlugin(name);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('plugins/:name/install')
  @HttpCode(201)
  @UseGuards(PolicyGuard)
  @Policy(['admin', 'super_admin'])
  async installPlugin(
    @Param('name') name: string,
    @Query('version') version?: string,
    @Req() req?: any,
  ) {
    try {
      const userId = req?.user?.sub;
      const result = await this.marketplaceService.installFromMarketplace(
        name,
        version,
        userId,
      );
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('plugins/:name/reviews')
  async getPluginReviews(
    @Param('name') name: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const db = (this.marketplaceService as any).drizzle.getDrizzle();
      const schema = await import('../models/schema');
      const pageNum = page ? parseInt(page, 10) : 1;
      const pageSize = Math.min(limit ? parseInt(limit, 10) : 20, 100);
      const offset = (pageNum - 1) * pageSize;

      const results = await db
        .select()
        .from(schema.marketplaceReviews)
        .where(
          (db.eq(schema.marketplaceReviews.pluginName, name) as any),
        )
        .limit(pageSize)
        .offset(offset);

      return {
        success: true,
        data: results,
        pagination: { page: pageNum, limit: pageSize },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('plugins/:name/reviews')
  @HttpCode(201)
  @UseGuards(PolicyGuard)
  async submitReview(
    @Param('name') name: string,
    @Body() body: { rating: number; title?: string; body?: string },
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const result = await this.marketplaceService.submitReview(
        name,
        userId,
        body.rating,
        body.title,
        body.body,
      );
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('plugins/:name/search')
  @HttpCode(200)
  async searchPlugins(
    @Param('name') query: string,
    @Body() filters?: any,
  ) {
    try {
      const result = await this.marketplaceService.searchPlugins(
        query,
        filters,
      );
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
