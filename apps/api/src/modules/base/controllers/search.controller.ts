import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { resolveTenant } from '../../../graphql/tenant';
import { SearchService } from '../services/search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Req() req: any, @Query('q') query: unknown, @Query('limit') limit?: unknown) {
    const companyId = resolveTenant(req);
    const userId = req.user?.id;
    if (!companyId || !Number.isSafeInteger(userId) || userId < 1) throw new ForbiddenException('User and company identity required');
    return { success: true, data: await this.searchService.search(userId, companyId, query, limit) };
  }
}
