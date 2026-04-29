import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { CurrentUser, Public, Permissions } from '@core/decorators';
import { PageService } from '../services/page.service';
import { RevisionService } from '../services/revision.service';
import { CategoryService } from '../services/category.service';
import { TagService } from '../services/tag.service';
import { CreatePageDto, UpdatePageDto, VerifyPagePasswordDto, SetPageCategoriesDto, SetPageTagsDto } from '../dtos';

@Controller('api/website')
export class PageController {
  constructor(
    private pageService: PageService,
    private revisionService: RevisionService,
    private categoryService: CategoryService,
    private tagService: TagService,
  ) {}

  // Admin - get all pages
  @Get('pages')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.read')
  async findAll(@Query() query: any) {
    return this.pageService.findAll({
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
      search: query.search,
      status: query.status,
      pageType: query.pageType,
      categoryId: query.categoryId ? parseInt(query.categoryId) : undefined,
      tagId: query.tagId ? parseInt(query.tagId) : undefined,
    });
  }

  // Admin - get single page
  @Get('pages/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.read')
  async findById(@Param('id') id: string) {
    return this.pageService.findById(parseInt(id));
  }

  // Admin - create page
  @Post('pages')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.create')
  async create(@Body() dto: CreatePageDto, @CurrentUser() user: any) {
    return this.pageService.create(dto, user?.id);
  }

  // Admin - update page
  @Put('pages/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
    @CurrentUser() user: any,
  ) {
    return this.pageService.update(parseInt(id), dto, user?.id);
  }

  // Admin - delete page
  @Delete('pages/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.delete')
  async delete(@Param('id') id: string) {
    return this.pageService.delete(parseInt(id));
  }

  // Admin - publish page
  @Post('pages/:id/publish')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.publish')
  async publish(@Param('id') id: string) {
    return this.pageService.publish(parseInt(id));
  }

  // Admin - unpublish page
  @Post('pages/:id/unpublish')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.publish')
  async unpublish(@Param('id') id: string) {
    return this.pageService.unpublish(parseInt(id));
  }

  // Admin - export page
  @Get('pages/:id/export')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.read')
  async export(@Param('id') id: string) {
    const result = await this.pageService.findById(parseInt(id));
    if (!result.success) return result;

    const page = result.data;
    const exportData = {
      _version: '1.0',
      _type: 'lume_page_export',
      title: page.title,
      slug: page.slug,
      content: page.content,
      contentHtml: page.contentHtml,
      excerpt: page.excerpt,
      template: page.template,
      pageType: page.pageType,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      customCss: page.customCss,
      headScripts: page.headScripts,
      bodyScripts: page.bodyScripts,
    };

    return { success: true, data: exportData };
  }

  // Admin - import page
  @Post('pages/import')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.create')
  async import(@Body() importData: any, @CurrentUser() user: any) {
    if (!importData || importData._type !== 'lume_page_export') {
      return { success: false, error: 'Invalid import format' };
    }

    const { _version, _type, ...pageData } = importData;
    pageData.slug = pageData.slug
      ? `${pageData.slug}-imported-${Date.now()}`
      : `imported-${Date.now()}`;
    pageData.title = pageData.title
      ? `${pageData.title} (Imported)`
      : 'Imported Page';
    pageData.isPublished = false;

    return this.pageService.create(pageData, user?.id);
  }

  // Admin - page revisions
  @Get('pages/:id/revisions')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.read')
  async getRevisions(@Param('id') id: string, @Query() query: any) {
    return this.revisionService.findAll(parseInt(id), {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 50,
    });
  }

  // Admin - get specific revision
  @Get('pages/:id/revisions/:revId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.read')
  async getRevision(@Param('id') id: string, @Param('revId') revId: string) {
    return this.revisionService.findById(parseInt(revId));
  }

  // Admin - revert to revision
  @Post('pages/:id/revisions/:revId/revert')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.edit')
  async revertRevision(@Param('id') id: string, @Param('revId') revId: string) {
    return this.revisionService.revert(parseInt(id), parseInt(revId));
  }

  // Admin - autosave
  @Post('pages/:id/autosave')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.edit')
  async autosave(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.revisionService.create(parseInt(id), {
      content: body.content,
      contentHtml: body.contentHtml,
      createdBy: user?.id,
      isAutoSave: true,
      changeDescription: 'Auto-save',
    });
  }

  // Admin - page lock
  @Get('pages/:id/lock')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.read')
  async getLockStatus(@Param('id') id: string) {
    return this.pageService.getLockStatus(parseInt(id));
  }

  @Post('pages/:id/lock')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.edit')
  async lockPage(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pageService.lockPage(parseInt(id), user?.id);
  }

  @Post('pages/:id/unlock')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.edit')
  async unlockPage(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pageService.unlockPage(parseInt(id), user?.id);
  }

  // Admin - page taxonomy
  @Get('pages/:id/categories')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.read')
  async getPageCategories(@Param('id') id: string) {
    return this.categoryService.getPageCategories(parseInt(id));
  }

  @Put('pages/:id/categories')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.edit')
  async setPageCategories(@Param('id') id: string, @Body() dto: SetPageCategoriesDto) {
    return this.categoryService.setPageCategories(parseInt(id), dto.categoryIds);
  }

  @Get('pages/:id/tags')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.read')
  async getPageTags(@Param('id') id: string) {
    return this.tagService.getPageTags(parseInt(id));
  }

  @Put('pages/:id/tags')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.page.edit')
  async setPageTags(@Param('id') id: string, @Body() dto: SetPageTagsDto) {
    return this.tagService.setPageTags(parseInt(id), dto.tagIds);
  }
}
