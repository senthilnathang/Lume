export class CreateFeatureFlagDto {
  name: string;
  key: string;
  description?: string;
  enabled?: boolean;
  enabledFor?: any[];
  disabledFor?: any[];
  config?: any;
  expiresAt?: Date;
  sequence?: number;
}

export class UpdateFeatureFlagDto {
  name?: string;
  description?: string;
  enabled?: boolean;
  enabledFor?: any[];
  disabledFor?: any[];
  config?: any;
  expiresAt?: Date;
  sequence?: number;
}

export class CreateDataImportDto {
  name: string;
  model: string;
  fileName?: string;
  filePath?: string;
  mapping?: any;
  totalRows?: number;
  processedRows?: number;
  successRows?: number;
  failedRows?: number;
  errors?: any[];
  status?: string;
  importedBy?: number;
}

export class UpdateDataImportDto {
  name?: string;
  fileName?: string;
  filePath?: string;
  mapping?: any;
  totalRows?: number;
  processedRows?: number;
  successRows?: number;
  failedRows?: number;
  errors?: any[];
  status?: string;
}

export class CreateDataExportDto {
  name: string;
  model: string;
  filters?: any;
  fields?: any[];
  format?: string;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  status?: string;
  exportedBy?: number;
}

export class UpdateDataExportDto {
  name?: string;
  filters?: any;
  fields?: any[];
  format?: string;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  status?: string;
}

export class ImportPreviewDto {
  model_name: string;
  file_content: string;
  file_name?: string;
  has_header?: boolean;
  delimiter?: string;
  max_preview_rows?: number;
}

export class ImportValidateDto {
  model_name: string;
  file_content: string;
  file_name?: string;
  has_header?: boolean;
  delimiter?: string;
  column_mappings: any[];
}

export class ImportExecuteDto {
  model_name: string;
  file_content: string;
  file_name?: string;
  has_header?: boolean;
  delimiter?: string;
  column_mappings: any[];
  update_existing?: boolean;
  skip_errors?: boolean;
}

export class ExportPreviewDto {
  model_name: string;
  fields?: string[];
  search?: string;
  format?: string;
}

export class ExportDownloadDto {
  model_name: string;
  fields?: string[];
  search?: string;
  limit?: number;
  format?: string;
}
