import type { ModuleDefinition } from '../_types';
import { manifest } from './__manifest__';

// Models
import { CustomField, CustomFieldValue } from './models/custom-field.model';
import { FormLayout, FormSection, FormFieldConfig } from './models/form-layout.model';
import { PrintFormat, PrintFormatField } from './models/print-format.model';
import { GlobalPicklist, PicklistValue, PicklistFieldMapping } from './models/picklist.model';
import { DuplicateRule, DuplicateMatch } from './models/duplicate-rule.model';
import { RecordType, RecordTypeFieldConfig } from './models/record-type.model';
import { EBEntity, EBField, EBView, EBMenu, EBAction } from './models/entity-builder.model';

export {
  CustomField,
  CustomFieldValue,
  FormLayout,
  FormSection,
  FormFieldConfig,
  PrintFormat,
  PrintFormatField,
  GlobalPicklist,
  PicklistValue,
  PicklistFieldMapping,
  DuplicateRule,
  DuplicateMatch,
  RecordType,
  RecordTypeFieldConfig,
  EBEntity,
  EBField,
  EBView,
  EBMenu,
  EBAction,
};

const baseCustomizationModule: ModuleDefinition = {
  manifest,
  initModels(sequelize) {
    CustomField.initModel(sequelize);
    CustomFieldValue.initModel(sequelize);
    FormLayout.initModel(sequelize);
    FormSection.initModel(sequelize);
    FormFieldConfig.initModel(sequelize);
    PrintFormat.initModel(sequelize);
    PrintFormatField.initModel(sequelize);
    GlobalPicklist.initModel(sequelize);
    PicklistValue.initModel(sequelize);
    PicklistFieldMapping.initModel(sequelize);
    DuplicateRule.initModel(sequelize);
    DuplicateMatch.initModel(sequelize);
    RecordType.initModel(sequelize);
    RecordTypeFieldConfig.initModel(sequelize);
    EBEntity.initModel(sequelize);
    EBField.initModel(sequelize);
    EBView.initModel(sequelize);
    EBMenu.initModel(sequelize);
    EBAction.initModel(sequelize);
  },
};

export default baseCustomizationModule;
