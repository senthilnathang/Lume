export class CreateCustomFieldDto {
  name: string;
  label: string;
  model: string;
  fieldType?: string;
  options?: any;
  defaultValue?: string;
  required?: boolean;
  uniqueField?: boolean;
  helpText?: string;
  placeholder?: string;
  sequence?: number;
  groupName?: string;
  status?: string;
}

export class UpdateCustomFieldDto {
  name?: string;
  label?: string;
  fieldType?: string;
  options?: any;
  defaultValue?: string;
  required?: boolean;
  uniqueField?: boolean;
  helpText?: string;
  placeholder?: string;
  sequence?: number;
  groupName?: string;
  status?: string;
}

export class CreateCustomViewDto {
  name: string;
  model: string;
  viewType?: string;
  config?: any;
  filters?: any[];
  sortBy?: any[];
  columns?: any[];
  isDefault?: boolean;
  isShared?: boolean;
  createdBy?: number;
  status?: string;
}

export class UpdateCustomViewDto {
  name?: string;
  viewType?: string;
  config?: any;
  filters?: any[];
  sortBy?: any[];
  columns?: any[];
  isDefault?: boolean;
  isShared?: boolean;
  status?: string;
}

export class CreateFormLayoutDto {
  name: string;
  model: string;
  layout?: any;
  isDefault?: boolean;
  status?: string;
}

export class UpdateFormLayoutDto {
  name?: string;
  layout?: any;
  isDefault?: boolean;
  status?: string;
}

export class CreateListConfigDto {
  name: string;
  model: string;
  columns?: any[];
  defaultSort?: any;
  defaultFilters?: any[];
  pageSize?: number;
  isDefault?: boolean;
  createdBy?: number;
  status?: string;
}

export class UpdateListConfigDto {
  name?: string;
  columns?: any[];
  defaultSort?: any;
  defaultFilters?: any[];
  pageSize?: number;
  isDefault?: boolean;
  status?: string;
}

export class CreateDashboardWidgetDto {
  name: string;
  widgetType?: string;
  model?: string;
  config?: any;
  position?: any;
  refreshInterval?: number;
  roles?: any[];
  status?: string;
}

export class UpdateDashboardWidgetDto {
  name?: string;
  widgetType?: string;
  model?: string;
  config?: any;
  position?: any;
  refreshInterval?: number;
  roles?: any[];
  status?: string;
}
