/**
 * Widget system barrel export
 */
export {
  widgetRegistry,
  allWidgets,
  getWidget,
  getWidgetsByCategory,
  widgetCategories,
} from './registry';

export type {
  AttrSchema,
  AttrType,
  AttrSection,
  SelectOption,
  WidgetDef,
  WidgetCategory,
} from './registry';
