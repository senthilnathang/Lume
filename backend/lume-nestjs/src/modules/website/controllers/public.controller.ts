import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  Req,
} from '@nestjs/common';
import { Public } from '@core/decorators';
import { PageService } from '../services/page.service';
import { MenuService } from '../services/menu.service';
import { SettingsService } from '../services/settings.service';
import { ThemeTemplateService } from '../services/theme-template.service';
import { PopupService } from '../services/popup.service';
import { SubmissionService } from '../services/form.service';
import { QueryService } from '../services/query.service';
import { VerifyPagePasswordDto, SubmitFormDto } from '../dtos';

@Controller('api/website')
@Public()
export class PublicController {
  constructor(
    private pageService: PageService,
    private menuService: MenuService,
    private settingsService: SettingsService,
    private themeTemplateService: ThemeTemplateService,
    private popupService: PopupService,
    private submissionService: SubmissionService,
    private queryService: QueryService,
  ) {}

  // Get published pages
  @Get('public/pages')
  async getPublishedPages() {
    return this.pageService.getPublishedPages();
  }

  // Get page by slug
  @Get('public/pages/:slug')
  async getPageBySlug(@Param('slug') slug: string, @Query() query: any) {
    return this.pageService.findBySlug(slug, {
      passwordToken: query.password_token,
    });
  }

  // Verify page password
  @Post('public/pages/:slug/verify-password')
  async verifyPagePassword(
    @Param('slug') slug: string,
    @Body() dto: VerifyPagePasswordDto,
  ) {
    return this.pageService.verifyPagePassword(slug, dto.password);
  }

  // Get breadcrumbs
  @Get('public/pages/:slug/breadcrumbs')
  async getBreadcrumbs(@Param('slug') slug: string) {
    return this.pageService.getBreadcrumbs(slug);
  }

  // Get menu by location
  @Get('public/menus/:location')
  async getMenuByLocation(@Param('location') location: string) {
    return this.menuService.getByLocation(location);
  }

  // Get website settings
  @Get('public/settings')
  async getSettings() {
    return this.settingsService.getAll();
  }

  // Get theme template
  @Get('public/theme/:type')
  async getThemeTemplate(@Param('type') type: string, @Query() query: any) {
    if (query.preview_id) {
      return this.themeTemplateService.findById(parseInt(query.preview_id));
    }

    const context = {
      pageType: query.pageType || null,
      slug: query.slug || null,
      pageId: query.pageId ? parseInt(query.pageId) : null,
      authorId: query.authorId ? parseInt(query.authorId) : null,
      taxonomy: query.taxonomy || null,
    };

    return this.themeTemplateService.getActiveTemplate(type, context);
  }

  // Get active popups
  @Get('public/popups')
  async getActivePopups() {
    return this.popupService.getActivePopups();
  }

  // Get sitemap (JSON)
  @Get('public/sitemap')
  async getSitemap() {
    const pages = await this.pageService.getSitemap();
    return { success: true, data: pages };
  }

  // Get sitemap.xml
  @Get('public/sitemap.xml')
  async getSitemapXml(@Res() res: any) {
    const pages = await this.pageService.getSitemap();
    const siteUrl = process.env.SITE_URL || 'http://localhost:3100';

    const urlEntries = pages
      .map((p) => {
        const priority = p.slug === '' || p.slug === 'home' ? '1.0' : p.parentId ? '0.6' : '0.8';
        const loc = siteUrl + '/' + p.slug;
        const lastmod = (
          p.updatedAt ||
          p.createdAt ||
          new Date()
        )
          .toISOString()
          .split('T')[0];
        return (
          '  <url>\n    <loc>' +
          loc +
          '</loc>\n    <lastmod>' +
          lastmod +
          '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>' +
          priority +
          '</priority>\n  </url>'
        );
      })
      .join('\n');

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urlEntries +
      '\n</urlset>';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  }

  // Get robots.txt
  @Get('public/robots.txt')
  async getRobotsTxt(@Res() res: any) {
    const settings = await this.settingsService.getAll();
    const s = settings.success ? settings.data : {};
    const siteUrl = process.env.SITE_URL || 'http://localhost:3100';
    const robotsTxt =
      s['robots_txt'] ||
      'User-agent: *\nAllow: /\nSitemap: ' + siteUrl + '/sitemap.xml';

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(robotsTxt);
  }

  // Get design tokens CSS
  @Get('public/styles.css')
  async getStylesCss(@Res() res: any) {
    const settings = await this.settingsService.getAll();
    const s = settings.success ? settings.data : {};

    const primary = s['color_primary'] || '#1677ff';
    const secondary = s['color_secondary'] || '#0050b3';
    const accent = s['color_accent'] || '#faad14';
    const neutral = s['color_neutral'] || '#6b7280';
    const fontHeading = s['font_heading'] || "'Inter', sans-serif";
    const fontBody = s['font_body'] || "'Inter', sans-serif";

    let tokens = { colors: {}, typography: {} };
    try {
      tokens = {
        colors: {},
        typography: {},
        ...JSON.parse(s['design_tokens'] || '{}'),
      };
    } catch {}

    const tokenLines = [];
    for (const [k, v] of Object.entries(tokens.colors || {})) {
      tokenLines.push(`  --lume-color-${k}: ${v};`);
    }
    for (const [k, v] of Object.entries(tokens.typography || {})) {
      const kebab = k.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
      tokenLines.push(
        `  --lume-type-${kebab}: ${v}${typeof v === 'number' ? 'px' : ''};`,
      );
    }

    const css =
      `:root {
  --lume-primary: ${tokens.colors?.primary || primary};
  --lume-secondary: ${tokens.colors?.secondary || secondary};
  --lume-accent: ${tokens.colors?.accent || accent};
  --lume-neutral: ${tokens.colors?.neutral || neutral};
  --lume-font-heading: ${fontHeading};
  --lume-font-body: ${fontBody};
${tokenLines.join('\n')}
}`;

    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(css);
  }

  // Dynamic content query (Loop blocks)
  @Get('public/query')
  async query(@Query() queryParams: any) {
    const results = await this.queryService.execute(queryParams);
    return { success: true, data: results };
  }

  // Submit form
  @Post('public/forms/:id/submit')
  async submitForm(
    @Param('id') id: string,
    @Body() dto: SubmitFormDto,
    @Req() req: any,
  ) {
    return this.submissionService.submit(parseInt(id), dto, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      pageSlug: dto._pageSlug,
    });
  }

  // Contact form (deprecated - use form submission)
  @Post('public/contact')
  async postContact(@Body() body: any) {
    console.log(
      `[Contact Form] From: ${body.name} <${body.email}>, Subject: ${body.subject}`,
    );
    return {
      success: true,
      data: { received: true },
      message: 'Message received successfully. We will get back to you shortly.',
    };
  }
}
