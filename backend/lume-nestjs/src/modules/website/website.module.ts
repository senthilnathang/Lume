import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { PageController } from './controllers/page.controller';
import { MenuController } from './controllers/menu.controller';
import { MediaController } from './controllers/media.controller';
import { SettingsController } from './controllers/settings.controller';
import { FormsController } from './controllers/forms.controller';
import { ThemeTemplateController } from './controllers/theme-template.controller';
import { PopupController } from './controllers/popup.controller';
import { RedirectController } from './controllers/redirect.controller';
import { CategoryController } from './controllers/category.controller';
import { TagController } from './controllers/tag.controller';
import { PublicController } from './controllers/public.controller';
import { PageService } from './services/page.service';
import { MenuService } from './services/menu.service';
import { MediaService } from './services/media.service';
import { SettingsService } from './services/settings.service';
import { RevisionService } from './services/revision.service';
import { FormService, SubmissionService } from './services/form.service';
import { ThemeTemplateService } from './services/theme-template.service';
import { PopupService } from './services/popup.service';
import { FontService } from './services/font.service';
import { IconService } from './services/icon.service';
import { RedirectService } from './services/redirect.service';
import { CategoryService } from './services/category.service';
import { TagService } from './services/tag.service';
import { QueryService } from './services/query.service';

@Module({
  imports: [SharedModule],
  controllers: [
    PageController,
    MenuController,
    MediaController,
    SettingsController,
    FormsController,
    ThemeTemplateController,
    PopupController,
    RedirectController,
    CategoryController,
    TagController,
    PublicController,
  ],
  providers: [
    PageService,
    MenuService,
    MediaService,
    SettingsService,
    RevisionService,
    FormService,
    SubmissionService,
    ThemeTemplateService,
    PopupService,
    FontService,
    IconService,
    RedirectService,
    CategoryService,
    TagService,
    QueryService,
  ],
  exports: [
    PageService,
    MenuService,
    MediaService,
    SettingsService,
    RevisionService,
    FormService,
    SubmissionService,
    ThemeTemplateService,
    PopupService,
    FontService,
    IconService,
    RedirectService,
    CategoryService,
    TagService,
    QueryService,
  ],
})
export class WebsiteModule {}
