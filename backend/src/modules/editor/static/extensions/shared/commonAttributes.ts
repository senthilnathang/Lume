/**
 * Common block attributes shared across all widget types.
 * Phase 2A: Universal Block Attributes — CSS, Animation, Responsive, Conditions
 *
 * Usage in TipTap extensions:
 *   import { commonTipTapAttributes } from './shared/commonAttributes'
 *   addAttributes() { return { ...commonTipTapAttributes, ...myOwnAttrs } }
 *
 * Usage in registry:
 *   import { commonAdvancedSchema } from './shared/commonAttributes'
 *   // Auto-injected by injectCommonAttributes()
 */

import type { AttrSchema } from '../widgets/registry';

/**
 * TipTap node attribute defaults — spread into every extension's addAttributes()
 */
export const commonTipTapAttributes = {
  blockId: { default: '' },
  cssClass: { default: '' },
  customCss: { default: '' },
  entranceAnimation: { default: 'none' },
  animationDelay: { default: 0 },
  animationDuration: { default: 600 },
  responsiveOverrides: { default: '{}' },
  displayConditions: { default: '{}' },
  motionFx: { default: '{}' },
  stickyPosition: { default: 'none' },
  stickyOffset: { default: 0 },
  stickyZIndex: { default: 100 },
  interactions: { default: '[]' },
};

/**
 * Registry attribute schemas for the "advanced" section
 */
export const commonAdvancedSchema: AttrSchema[] = [
  {
    key: 'blockId',
    label: 'Block ID',
    type: 'text',
    section: 'advanced',
    default: '',
    placeholder: 'unique-block-id',
    helpText: 'CSS ID for targeting this block',
  },
  {
    key: 'cssClass',
    label: 'CSS Classes',
    type: 'text',
    section: 'advanced',
    default: '',
    placeholder: 'class-one class-two',
    helpText: 'Space-separated CSS class names',
  },
  {
    key: 'customCss',
    label: 'Custom CSS',
    type: 'textarea',
    section: 'advanced',
    default: '',
    placeholder: '/* styles for this block */\ncolor: red;',
  },
  {
    key: 'entranceAnimation',
    label: 'Entrance Animation',
    type: 'select',
    section: 'advanced',
    default: 'none',
    options: [
      { value: 'none', label: 'None' },
      { value: 'fadeIn', label: 'Fade In' },
      { value: 'slideUp', label: 'Slide Up' },
      { value: 'slideDown', label: 'Slide Down' },
      { value: 'slideLeft', label: 'Slide Left' },
      { value: 'slideRight', label: 'Slide Right' },
      { value: 'zoomIn', label: 'Zoom In' },
      { value: 'bounceIn', label: 'Bounce In' },
    ],
  },
  {
    key: 'animationDuration',
    label: 'Animation Duration (ms)',
    type: 'slider',
    section: 'advanced',
    default: 600,
    min: 100,
    max: 2000,
    step: 100,
  },
  {
    key: 'animationDelay',
    label: 'Animation Delay (ms)',
    type: 'slider',
    section: 'advanced',
    default: 0,
    min: 0,
    max: 2000,
    step: 100,
  },
  {
    key: 'stickyPosition',
    label: 'Sticky Position',
    type: 'select',
    section: 'advanced',
    default: 'none',
    options: [
      { value: 'none', label: 'None' },
      { value: 'top', label: 'Stick to Top' },
      { value: 'bottom', label: 'Stick to Bottom' },
    ],
  },
  {
    key: 'stickyOffset',
    label: 'Sticky Offset (px)',
    type: 'slider',
    section: 'advanced',
    default: 0,
    min: 0,
    max: 200,
    step: 5,
  },
];

/**
 * Default values for common attributes (merged into widget defaults)
 */
export const commonDefaults: Record<string, any> = {
  blockId: '',
  cssClass: '',
  customCss: '',
  entranceAnimation: 'none',
  animationDelay: 0,
  animationDuration: 600,
  responsiveOverrides: '{}',
  displayConditions: '{}',
  motionFx: '{}',
  stickyPosition: 'none',
  stickyOffset: 0,
  stickyZIndex: 100,
  interactions: '[]',
};
