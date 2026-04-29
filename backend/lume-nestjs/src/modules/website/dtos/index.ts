export class CreatePageDto {
  title: string;
  slug?: string;
  content?: string;
  contentHtml?: string;
  excerpt?: string;
  template?: string;
  pageType?: string;
  featuredImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  focusKeyword?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  parentId?: number;
  sequence?: number;
  showInMenu?: boolean;
  customCss?: string;
  headScripts?: string;
  bodyScripts?: string;
  publishAt?: Date;
  expireAt?: Date;
  visibility?: 'public' | 'private' | 'password' | 'members';
  passwordHash?: string;
}

export class UpdatePageDto {
  title?: string;
  slug?: string;
  content?: string;
  contentHtml?: string;
  excerpt?: string;
  template?: string;
  pageType?: string;
  featuredImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  focusKeyword?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  parentId?: number;
  sequence?: number;
  showInMenu?: boolean;
  customCss?: string;
  headScripts?: string;
  bodyScripts?: string;
  isPublished?: boolean;
  publishAt?: Date;
  expireAt?: Date;
  visibility?: 'public' | 'private' | 'password' | 'members';
  passwordHash?: string;
}

export class CreateMenuDto {
  name: string;
  location?: string;
  isActive?: boolean;
}

export class UpdateMenuDto {
  name?: string;
  location?: string;
  isActive?: boolean;
}

export class CreateMenuItemDto {
  label: string;
  url?: string;
  pageId?: number;
  target?: string;
  icon?: string;
  parentId?: number;
  sequence?: number;
  isActive?: boolean;
  cssClass?: string;
  description?: string;
}

export class UpdateMenuItemDto {
  label?: string;
  url?: string;
  pageId?: number;
  target?: string;
  icon?: string;
  parentId?: number;
  sequence?: number;
  isActive?: boolean;
  cssClass?: string;
  description?: string;
}

export class ReorderMenuItemsDto {
  items: Array<{
    id: number;
    parentId?: number;
    sequence: number;
  }>;
}

export class CreateWebsiteSettingDto {
  key: string;
  value: any;
  type?: 'string' | 'number' | 'json' | 'boolean';
}

export class UpdateWebsiteSettingDto {
  value: any;
  type?: 'string' | 'number' | 'json' | 'boolean';
}

export class CreateFormDto {
  name: string;
  fields?: any[];
  settings?: Record<string, any>;
  isActive?: boolean;
}

export class UpdateFormDto {
  name?: string;
  fields?: any[];
  settings?: Record<string, any>;
  isActive?: boolean;
}

export class SubmitFormDto {
  [key: string]: any;
}

export class CreateThemeTemplateDto {
  name: string;
  type?: string;
  content?: string;
  contentHtml?: string;
  conditions?: any[];
  priority?: number;
  isActive?: boolean;
}

export class UpdateThemeTemplateDto {
  name?: string;
  type?: string;
  content?: string;
  contentHtml?: string;
  conditions?: any[];
  priority?: number;
  isActive?: boolean;
}

export class CreatePopupDto {
  name: string;
  content?: string;
  contentHtml?: string;
  triggerType?: string;
  triggerValue?: string;
  position?: string;
  width?: string;
  overlayClose?: boolean;
  showOnce?: boolean;
  conditions?: any[];
  isActive?: boolean;
}

export class UpdatePopupDto {
  name?: string;
  content?: string;
  contentHtml?: string;
  triggerType?: string;
  triggerValue?: string;
  position?: string;
  width?: string;
  overlayClose?: boolean;
  showOnce?: boolean;
  conditions?: any[];
  isActive?: boolean;
}

export class CreateRedirectDto {
  sourcePath: string;
  targetPath: string;
  statusCode?: number;
  isActive?: boolean;
}

export class UpdateRedirectDto {
  sourcePath?: string;
  targetPath?: string;
  statusCode?: number;
  isActive?: boolean;
}

export class CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  parentId?: number;
  sequence?: number;
}

export class UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: number;
  sequence?: number;
}

export class ReorderCategoriesDto {
  items: Array<{
    id: number;
    sequence: number;
  }>;
}

export class CreateTagDto {
  name: string;
  slug?: string;
}

export class UpdateTagDto {
  name?: string;
  slug?: string;
}

export class CreateFontDto {
  name: string;
  family: string;
  weight?: number;
  style?: string;
  fileUrl: string;
  format?: string;
}

export class UpdateFontDto {
  name?: string;
  family?: string;
  weight?: number;
  style?: string;
  fileUrl?: string;
  format?: string;
}

export class CreateIconDto {
  name: string;
  setName?: string;
  svgContent: string;
  tags?: string;
}

export class UpdateIconDto {
  name?: string;
  setName?: string;
  svgContent?: string;
  tags?: string;
}

export class VerifyPagePasswordDto {
  password: string;
}

export class SetPageCategoriesDto {
  categoryIds: number[];
}

export class SetPageTagsDto {
  tagIds: number[];
}
