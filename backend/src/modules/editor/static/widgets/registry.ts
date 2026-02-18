/**
 * Widget Registry - Core data-driven architecture for Lume Visual Page Builder
 * Defines all 29 widgets with their schemas, attributes, and defaults
 */

export type AttrType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'slider'
  | 'color'
  | 'select'
  | 'switch'
  | 'image'
  | 'url'
  | 'alignment'
  | 'spacing'
  | 'repeater'
  | 'date'
  // Phase 13 — Advanced control types
  | 'gradient'       // Linear/radial gradient builder
  | 'typography'     // Font family + size + weight + style + line-height + tracking
  | 'border'         // Border width + style + color + radius
  | 'shadow'         // Box-shadow builder with preview
  | 'icon'           // Icon picker modal (lucide / custom SVG)
  | 'link-builder'   // URL + title + target + nofollow
  | 'font'           // Google/custom font picker
  | 'code-editor';   // Monospace textarea with expand toggle

export type AttrSection = 'content' | 'style' | 'advanced';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface AttrSchema {
  key: string;
  label: string;
  type: AttrType;
  section: AttrSection;
  default?: any;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  children?: AttrSchema[];
  placeholder?: string;
  helpText?: string;
  /** Conditionally show this field only when another field has a specific value */
  dependsOn?: { key: string; value: any | any[] };
}

export type WidgetCategory = 'layout' | 'content' | 'media' | 'interactive' | 'commercial' | 'utility' | 'social' | 'navigation' | 'global';

export interface WidgetDef {
  type: string; // TipTap node name
  name: string; // Display name
  category: WidgetCategory;
  icon: string; // Lucide icon name
  description: string;
  attributes: AttrSchema[];
  defaults: Record<string, any>;
  isContainer?: boolean;
}

/**
 * All 29 Widget Definitions
 */
export const widgetRegistry: WidgetDef[] = [
  // ========================================
  // EXISTING 9 WIDGETS
  // ========================================

  {
    type: 'sectionBlock',
    name: 'Section',
    category: 'layout',
    icon: 'layout',
    description: 'Container section with background and spacing controls',
    isContainer: true,
    attributes: [
      {
        key: 'backgroundType',
        label: 'Background Type',
        type: 'select',
        section: 'style',
        default: 'solid',
        options: [
          { value: 'solid', label: 'Solid Color' },
          { value: 'gradient', label: 'Gradient' },
          { value: 'image', label: 'Image' },
          { value: 'none', label: 'None' },
        ],
      },
      {
        key: 'backgroundColor',
        label: 'Background Color',
        type: 'color',
        section: 'style',
        default: 'transparent',
        dependsOn: { key: 'backgroundType', value: 'solid' },
      },
      {
        key: 'backgroundGradient',
        label: 'Background Gradient',
        type: 'gradient',
        section: 'style',
        default: '',
        dependsOn: { key: 'backgroundType', value: 'gradient' },
      },
      {
        key: 'backgroundImage',
        label: 'Background Image',
        type: 'image',
        section: 'style',
        default: '',
        dependsOn: { key: 'backgroundType', value: 'image' },
      },
      {
        key: 'paddingTop',
        label: 'Padding Top (px)',
        type: 'slider',
        section: 'style',
        default: 40,
        min: 0,
        max: 200,
        step: 5,
      },
      {
        key: 'paddingBottom',
        label: 'Padding Bottom (px)',
        type: 'slider',
        section: 'style',
        default: 40,
        min: 0,
        max: 200,
        step: 5,
      },
      {
        key: 'maxWidth',
        label: 'Max Width (px)',
        type: 'slider',
        section: 'style',
        default: 1200,
        min: 600,
        max: 1600,
        step: 50,
      },
    ],
    defaults: {
      backgroundColor: 'transparent',
      backgroundImage: '',
      paddingTop: 40,
      paddingBottom: 40,
      maxWidth: 1200,
    },
  },

  {
    type: 'columnsBlock',
    name: 'Columns',
    category: 'layout',
    icon: 'columns-3',
    description: 'Multi-column responsive layout',
    isContainer: true,
    attributes: [
      {
        key: 'columns',
        label: 'Number of Columns',
        type: 'slider',
        section: 'content',
        default: 2,
        min: 1,
        max: 6,
        step: 1,
      },
      {
        key: 'gap',
        label: 'Gap Between Columns (px)',
        type: 'slider',
        section: 'style',
        default: 24,
        min: 0,
        max: 60,
        step: 4,
      },
      {
        key: 'layout',
        label: 'Layout',
        type: 'select',
        section: 'style',
        default: 'equal',
        options: [
          { value: 'equal', label: 'Equal Width' },
          { value: '2-1', label: '2:1 (66% / 33%)' },
          { value: '1-2', label: '1:2 (33% / 66%)' },
          { value: '3-1', label: '3:1 (75% / 25%)' },
          { value: '1-3', label: '1:3 (25% / 75%)' },
        ],
      },
    ],
    defaults: {
      columns: 2,
      gap: 24,
      layout: 'equal',
    },
  },

  {
    type: 'columnBlock',
    name: 'Column',
    category: 'layout',
    icon: 'columns-3',
    description: 'Single column (nested in Columns block)',
    isContainer: true,
    attributes: [
      {
        key: 'width',
        label: 'Width',
        type: 'text',
        section: 'style',
        default: '',
        placeholder: 'e.g., 50%, 33.33%',
      },
    ],
    defaults: {
      width: '',
    },
  },

  {
    type: 'imageBlock',
    name: 'Image',
    category: 'media',
    icon: 'image',
    description: 'Image with caption and link support',
    attributes: [
      {
        key: 'src',
        label: 'Image Source',
        type: 'image',
        section: 'content',
        default: '',
        placeholder: 'Upload or enter image URL',
      },
      {
        key: 'alt',
        label: 'Alt Text',
        type: 'text',
        section: 'content',
        default: '',
        placeholder: 'Describe the image',
      },
      {
        key: 'caption',
        label: 'Caption',
        type: 'text',
        section: 'content',
        default: '',
      },
      {
        key: 'alignment',
        label: 'Alignment',
        type: 'alignment',
        section: 'style',
        default: 'center',
      },
      {
        key: 'width',
        label: 'Width',
        type: 'select',
        section: 'style',
        default: '100%',
        options: [
          { value: '100%', label: 'Full Width' },
          { value: '75%', label: '75%' },
          { value: '50%', label: '50%' },
          { value: '25%', label: '25%' },
        ],
      },
      {
        key: 'link',
        label: 'Link URL',
        type: 'url',
        section: 'advanced',
        default: '',
      },
    ],
    defaults: {
      src: '',
      alt: '',
      caption: '',
      alignment: 'center',
      width: '100%',
      link: '',
    },
  },

  {
    type: 'buttonBlock',
    name: 'Button',
    category: 'interactive',
    icon: 'mouse-pointer-click',
    description: 'Call-to-action button',
    attributes: [
      {
        key: 'text',
        label: 'Button Text',
        type: 'text',
        section: 'content',
        default: 'Click Me',
        placeholder: 'Enter button text',
      },
      {
        key: 'link',
        label: 'Link',
        type: 'link-builder',
        section: 'content',
        default: '',
      },
      {
        key: 'variant',
        label: 'Style Variant',
        type: 'select',
        section: 'style',
        default: 'primary',
        options: [
          { value: 'primary', label: 'Primary' },
          { value: 'outline', label: 'Outline' },
          { value: 'ghost', label: 'Ghost' },
          { value: 'danger', label: 'Danger' },
        ],
      },
      {
        key: 'size',
        label: 'Size',
        type: 'select',
        section: 'style',
        default: 'md',
        options: [
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ],
      },
      {
        key: 'alignment',
        label: 'Alignment',
        type: 'alignment',
        section: 'style',
        default: 'left',
      },
      {
        key: 'fullWidth',
        label: 'Full Width',
        type: 'switch',
        section: 'style',
        default: false,
      },
      {
        key: 'border',
        label: 'Border',
        type: 'border',
        section: 'style',
        default: '',
      },
      {
        key: 'shadow',
        label: 'Shadow',
        type: 'shadow',
        section: 'style',
        default: '',
      },
    ],
    defaults: {
      text: 'Click Me',
      link: '',
      variant: 'primary',
      size: 'md',
      alignment: 'left',
      fullWidth: false,
      border: '',
      shadow: '',
    },
  },

  {
    type: 'spacerBlock',
    name: 'Spacer',
    category: 'layout',
    icon: 'move-vertical',
    description: 'Vertical spacing element',
    attributes: [
      {
        key: 'height',
        label: 'Height',
        type: 'slider',
        section: 'style',
        default: 40,
        min: 10,
        max: 200,
        step: 10,
      },
    ],
    defaults: {
      height: 40,
    },
  },

  {
    type: 'videoBlock',
    name: 'Video',
    category: 'media',
    icon: 'video',
    description: 'Video embed player',
    attributes: [
      {
        key: 'src',
        label: 'Video URL',
        type: 'url',
        section: 'content',
        default: '',
        placeholder: 'YouTube, Vimeo, or direct video URL',
      },
      {
        key: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        section: 'style',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9 (Widescreen)' },
          { value: '4:3', label: '4:3 (Standard)' },
          { value: '1:1', label: '1:1 (Square)' },
        ],
      },
      {
        key: 'autoplay',
        label: 'Autoplay',
        type: 'switch',
        section: 'advanced',
        default: false,
      },
    ],
    defaults: {
      src: '',
      aspectRatio: '16:9',
      autoplay: false,
    },
  },

  {
    type: 'calloutBlock',
    name: 'Callout',
    category: 'content',
    icon: 'alert-triangle',
    description: 'Alert or notice box',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        section: 'style',
        default: 'info',
        options: [
          { value: 'info', label: 'Info' },
          { value: 'warning', label: 'Warning' },
          { value: 'success', label: 'Success' },
          { value: 'error', label: 'Error' },
        ],
      },
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        section: 'content',
        default: '',
        placeholder: 'Callout title',
      },
    ],
    defaults: {
      type: 'info',
      title: '',
    },
  },

  {
    type: 'htmlBlock',
    name: 'HTML',
    category: 'utility',
    icon: 'file-code-2',
    description: 'Raw HTML embed',
    attributes: [
      {
        key: 'content',
        label: 'HTML Content',
        type: 'code-editor',
        section: 'content',
        default: '',
        placeholder: '<div>Your HTML here</div>',
      },
    ],
    defaults: {
      content: '',
    },
  },

  // ========================================
  // NEW 20 WIDGETS
  // ========================================

  {
    type: 'advancedHeading',
    name: 'Advanced Heading',
    category: 'content',
    icon: 'heading',
    description: 'Heading with separator and style controls',
    attributes: [
      {
        key: 'text',
        label: 'Text',
        type: 'text',
        section: 'content',
        default: 'Heading',
        placeholder: 'Enter heading text',
      },
      {
        key: 'tag',
        label: 'HTML Tag',
        type: 'select',
        section: 'content',
        default: 'h2',
        options: [
          { value: 'h1', label: 'H1' },
          { value: 'h2', label: 'H2' },
          { value: 'h3', label: 'H3' },
          { value: 'h4', label: 'H4' },
          { value: 'h5', label: 'H5' },
          { value: 'h6', label: 'H6' },
        ],
      },
      {
        key: 'alignment',
        label: 'Alignment',
        type: 'alignment',
        section: 'style',
        default: 'left',
      },
      {
        key: 'color',
        label: 'Text Color',
        type: 'color',
        section: 'style',
        default: '#000000',
      },
      {
        key: 'fontSize',
        label: 'Font Size',
        type: 'slider',
        section: 'style',
        default: 32,
        min: 12,
        max: 72,
        step: 2,
      },
      {
        key: 'fontWeight',
        label: 'Font Weight',
        type: 'select',
        section: 'style',
        default: '600',
        options: [
          { value: '400', label: 'Normal' },
          { value: '500', label: 'Medium' },
          { value: '600', label: 'Semi-Bold' },
          { value: '700', label: 'Bold' },
        ],
      },
      {
        key: 'separator',
        label: 'Separator',
        type: 'select',
        section: 'style',
        default: 'none',
        options: [
          { value: 'none', label: 'None' },
          { value: 'solid', label: 'Solid' },
          { value: 'dashed', label: 'Dashed' },
          { value: 'dotted', label: 'Dotted' },
        ],
      },
      {
        key: 'separatorColor',
        label: 'Separator Color',
        type: 'color',
        section: 'style',
        default: '#e5e7eb',
      },
      {
        key: 'separatorWidth',
        label: 'Separator Width',
        type: 'slider',
        section: 'style',
        default: 60,
        min: 20,
        max: 100,
        step: 10,
      },
    ],
    defaults: {
      text: 'Heading',
      tag: 'h2',
      alignment: 'left',
      color: '#000000',
      fontSize: 32,
      fontWeight: '600',
      separator: 'none',
      separatorColor: '#e5e7eb',
      separatorWidth: 60,
    },
  },

  {
    type: 'dualHeading',
    name: 'Dual Heading',
    category: 'content',
    icon: 'type',
    description: 'Heading with two different colored parts',
    attributes: [
      {
        key: 'firstText',
        label: 'First Text',
        type: 'text',
        section: 'content',
        default: 'Welcome to',
        placeholder: 'First part',
      },
      {
        key: 'secondText',
        label: 'Second Text',
        type: 'text',
        section: 'content',
        default: 'Our Website',
        placeholder: 'Second part',
      },
      {
        key: 'tag',
        label: 'HTML Tag',
        type: 'select',
        section: 'content',
        default: 'h1',
        options: [
          { value: 'h1', label: 'H1' },
          { value: 'h2', label: 'H2' },
          { value: 'h3', label: 'H3' },
          { value: 'h4', label: 'H4' },
          { value: 'h5', label: 'H5' },
          { value: 'h6', label: 'H6' },
        ],
      },
      {
        key: 'firstColor',
        label: 'First Text Color',
        type: 'color',
        section: 'style',
        default: '#000000',
      },
      {
        key: 'secondColor',
        label: 'Second Text Color',
        type: 'color',
        section: 'style',
        default: '#3b82f6',
      },
      {
        key: 'alignment',
        label: 'Alignment',
        type: 'alignment',
        section: 'style',
        default: 'center',
      },
    ],
    defaults: {
      firstText: 'Welcome to',
      secondText: 'Our Website',
      tag: 'h1',
      firstColor: '#000000',
      secondColor: '#3b82f6',
      alignment: 'center',
    },
  },

  {
    type: 'infoBox',
    name: 'Info Box',
    category: 'content',
    icon: 'info',
    description: 'Information card with icon',
    attributes: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        section: 'content',
        default: 'Info Box Title',
        placeholder: 'Enter title',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        section: 'content',
        default: 'Your description here',
        placeholder: 'Enter description',
      },
      {
        key: 'icon',
        label: 'Icon Name',
        type: 'text',
        section: 'content',
        default: 'info',
        placeholder: 'Lucide icon name',
        helpText: 'Use any Lucide icon name (e.g., check-circle, star, bell)',
      },
      {
        key: 'iconPosition',
        label: 'Icon Position',
        type: 'select',
        section: 'style',
        default: 'top',
        options: [
          { value: 'top', label: 'Top' },
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ],
      },
      {
        key: 'iconColor',
        label: 'Icon Color',
        type: 'color',
        section: 'style',
        default: '#3b82f6',
      },
      {
        key: 'iconBgColor',
        label: 'Icon Background',
        type: 'color',
        section: 'style',
        default: '#dbeafe',
      },
      {
        key: 'linkUrl',
        label: 'Link URL',
        type: 'url',
        section: 'advanced',
        default: '',
      },
      {
        key: 'linkText',
        label: 'Link Text',
        type: 'text',
        section: 'advanced',
        default: 'Learn More',
      },
    ],
    defaults: {
      title: 'Info Box Title',
      description: 'Your description here',
      icon: 'info',
      iconPosition: 'top',
      iconColor: '#3b82f6',
      iconBgColor: '#dbeafe',
      linkUrl: '',
      linkText: 'Learn More',
    },
  },

  {
    type: 'imageGallery',
    name: 'Image Gallery',
    category: 'media',
    icon: 'grid-3x3',
    description: 'Grid or masonry image gallery',
    attributes: [
      {
        key: 'images',
        label: 'Images',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'src',
            label: 'Image URL',
            type: 'image',
            section: 'content',
            default: '',
          },
          {
            key: 'alt',
            label: 'Alt Text',
            type: 'text',
            section: 'content',
            default: '',
          },
          {
            key: 'caption',
            label: 'Caption',
            type: 'text',
            section: 'content',
            default: '',
          },
        ],
      },
      {
        key: 'columns',
        label: 'Columns',
        type: 'slider',
        section: 'style',
        default: 3,
        min: 2,
        max: 6,
        step: 1,
      },
      {
        key: 'gap',
        label: 'Gap',
        type: 'spacing',
        section: 'style',
        default: '16px',
      },
      {
        key: 'lightbox',
        label: 'Enable Lightbox',
        type: 'switch',
        section: 'advanced',
        default: true,
      },
      {
        key: 'style',
        label: 'Gallery Style',
        type: 'select',
        section: 'style',
        default: 'grid',
        options: [
          { value: 'grid', label: 'Grid' },
          { value: 'masonry', label: 'Masonry' },
        ],
      },
    ],
    defaults: {
      images: [],
      columns: 3,
      gap: '16px',
      lightbox: true,
      style: 'grid',
    },
  },

  {
    type: 'faq',
    name: 'FAQ',
    category: 'content',
    icon: 'help-circle',
    description: 'Frequently asked questions accordion',
    attributes: [
      {
        key: 'items',
        label: 'FAQ Items',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'question',
            label: 'Question',
            type: 'text',
            section: 'content',
            default: '',
            placeholder: 'Enter question',
          },
          {
            key: 'answer',
            label: 'Answer',
            type: 'textarea',
            section: 'content',
            default: '',
            placeholder: 'Enter answer',
          },
        ],
      },
      {
        key: 'style',
        label: 'Style',
        type: 'select',
        section: 'style',
        default: 'accordion',
        options: [
          { value: 'accordion', label: 'Accordion' },
          { value: 'toggle', label: 'Toggle' },
        ],
      },
      {
        key: 'iconPosition',
        label: 'Icon Position',
        type: 'select',
        section: 'style',
        default: 'right',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ],
      },
      {
        key: 'activeColor',
        label: 'Active Color',
        type: 'color',
        section: 'style',
        default: '#3b82f6',
      },
    ],
    defaults: {
      items: [],
      style: 'accordion',
      iconPosition: 'right',
      activeColor: '#3b82f6',
    },
  },

  {
    type: 'priceTable',
    name: 'Price Table',
    category: 'commercial',
    icon: 'credit-card',
    description: 'Pricing table card',
    attributes: [
      {
        key: 'title',
        label: 'Plan Title',
        type: 'text',
        section: 'content',
        default: 'Basic Plan',
        placeholder: 'e.g., Pro, Enterprise',
      },
      {
        key: 'price',
        label: 'Price',
        type: 'text',
        section: 'content',
        default: '$29',
        placeholder: 'e.g., $29, Free',
      },
      {
        key: 'period',
        label: 'Period',
        type: 'text',
        section: 'content',
        default: '/month',
        placeholder: 'e.g., /month, /year',
      },
      {
        key: 'features',
        label: 'Features',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'text',
            label: 'Feature Text',
            type: 'text',
            section: 'content',
            default: '',
          },
          {
            key: 'included',
            label: 'Included',
            type: 'switch',
            section: 'content',
            default: true,
          },
        ],
      },
      {
        key: 'ctaText',
        label: 'CTA Button Text',
        type: 'text',
        section: 'content',
        default: 'Get Started',
      },
      {
        key: 'ctaUrl',
        label: 'CTA URL',
        type: 'url',
        section: 'content',
        default: '',
      },
      {
        key: 'highlighted',
        label: 'Highlight This Plan',
        type: 'switch',
        section: 'style',
        default: false,
      },
      {
        key: 'ribbonText',
        label: 'Ribbon Text',
        type: 'text',
        section: 'style',
        default: '',
        placeholder: 'e.g., Popular, Best Value',
      },
    ],
    defaults: {
      title: 'Basic Plan',
      price: '$29',
      period: '/month',
      features: [],
      ctaText: 'Get Started',
      ctaUrl: '',
      highlighted: false,
      ribbonText: '',
    },
  },

  {
    type: 'priceList',
    name: 'Price List',
    category: 'commercial',
    icon: 'list',
    description: 'List of items with prices',
    attributes: [
      {
        key: 'items',
        label: 'Items',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'title',
            label: 'Item Title',
            type: 'text',
            section: 'content',
            default: '',
          },
          {
            key: 'description',
            label: 'Description',
            type: 'textarea',
            section: 'content',
            default: '',
          },
          {
            key: 'price',
            label: 'Price',
            type: 'text',
            section: 'content',
            default: '',
          },
          {
            key: 'image',
            label: 'Image',
            type: 'image',
            section: 'content',
            default: '',
          },
        ],
      },
      {
        key: 'separator',
        label: 'Show Separators',
        type: 'switch',
        section: 'style',
        default: true,
      },
    ],
    defaults: {
      items: [],
      separator: true,
    },
  },

  {
    type: 'teamMember',
    name: 'Team Member',
    category: 'content',
    icon: 'user-circle',
    description: 'Team member profile card',
    attributes: [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        section: 'content',
        default: 'John Doe',
        placeholder: 'Member name',
      },
      {
        key: 'role',
        label: 'Role',
        type: 'text',
        section: 'content',
        default: 'Team Member',
        placeholder: 'Job title',
      },
      {
        key: 'image',
        label: 'Profile Image',
        type: 'image',
        section: 'content',
        default: '',
      },
      {
        key: 'bio',
        label: 'Bio',
        type: 'textarea',
        section: 'content',
        default: '',
        placeholder: 'Short biography',
      },
      {
        key: 'socialLinks',
        label: 'Social Links',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'platform',
            label: 'Platform',
            type: 'select',
            section: 'content',
            default: 'twitter',
            options: [
              { value: 'twitter', label: 'Twitter' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'github', label: 'GitHub' },
              { value: 'facebook', label: 'Facebook' },
              { value: 'instagram', label: 'Instagram' },
            ],
          },
          {
            key: 'url',
            label: 'URL',
            type: 'url',
            section: 'content',
            default: '',
          },
        ],
      },
    ],
    defaults: {
      name: 'John Doe',
      role: 'Team Member',
      image: '',
      bio: '',
      socialLinks: [],
    },
  },

  {
    type: 'testimonial',
    name: 'Testimonial',
    category: 'content',
    icon: 'quote',
    description: 'Customer testimonial or review',
    attributes: [
      {
        key: 'quote',
        label: 'Quote',
        type: 'textarea',
        section: 'content',
        default: 'This is an amazing product!',
        placeholder: 'Testimonial text',
      },
      {
        key: 'authorName',
        label: 'Author Name',
        type: 'text',
        section: 'content',
        default: 'Jane Smith',
        placeholder: 'Customer name',
      },
      {
        key: 'authorRole',
        label: 'Author Role',
        type: 'text',
        section: 'content',
        default: 'CEO, Company',
        placeholder: 'Job title and company',
      },
      {
        key: 'authorImage',
        label: 'Author Image',
        type: 'image',
        section: 'content',
        default: '',
      },
      {
        key: 'rating',
        label: 'Rating',
        type: 'slider',
        section: 'content',
        default: 5,
        min: 0,
        max: 5,
        step: 1,
      },
      {
        key: 'style',
        label: 'Style',
        type: 'select',
        section: 'style',
        default: 'card',
        options: [
          { value: 'card', label: 'Card' },
          { value: 'minimal', label: 'Minimal' },
          { value: 'bubble', label: 'Bubble' },
        ],
      },
    ],
    defaults: {
      quote: 'This is an amazing product!',
      authorName: 'Jane Smith',
      authorRole: 'CEO, Company',
      authorImage: '',
      rating: 5,
      style: 'card',
    },
  },

  {
    type: 'countdown',
    name: 'Countdown',
    category: 'interactive',
    icon: 'timer',
    description: 'Countdown timer to a specific date',
    attributes: [
      {
        key: 'targetDate',
        label: 'Target Date',
        type: 'date',
        section: 'content',
        default: '',
        placeholder: 'Select date and time',
      },
      {
        key: 'showLabels',
        label: 'Show Labels',
        type: 'switch',
        section: 'style',
        default: true,
      },
      {
        key: 'style',
        label: 'Style',
        type: 'select',
        section: 'style',
        default: 'simple',
        options: [
          { value: 'flip', label: 'Flip Clock' },
          { value: 'simple', label: 'Simple' },
          { value: 'circle', label: 'Circle' },
        ],
      },
      {
        key: 'expiredMessage',
        label: 'Expired Message',
        type: 'text',
        section: 'content',
        default: 'Event has ended',
        placeholder: 'Message to show after countdown ends',
      },
    ],
    defaults: {
      targetDate: '',
      showLabels: true,
      style: 'simple',
      expiredMessage: 'Event has ended',
    },
  },

  {
    type: 'contentToggle',
    name: 'Content Toggle',
    category: 'interactive',
    icon: 'toggle-left',
    description: 'Toggle between two content sections',
    attributes: [
      {
        key: 'primaryLabel',
        label: 'Primary Label',
        type: 'text',
        section: 'content',
        default: 'Option A',
        placeholder: 'First option label',
      },
      {
        key: 'secondaryLabel',
        label: 'Secondary Label',
        type: 'text',
        section: 'content',
        default: 'Option B',
        placeholder: 'Second option label',
      },
      {
        key: 'primaryContent',
        label: 'Primary Content',
        type: 'textarea',
        section: 'content',
        default: 'Content for option A',
      },
      {
        key: 'secondaryContent',
        label: 'Secondary Content',
        type: 'textarea',
        section: 'content',
        default: 'Content for option B',
      },
      {
        key: 'style',
        label: 'Style',
        type: 'select',
        section: 'style',
        default: 'switch',
        options: [
          { value: 'switch', label: 'Switch' },
          { value: 'tabs', label: 'Tabs' },
        ],
      },
    ],
    defaults: {
      primaryLabel: 'Option A',
      secondaryLabel: 'Option B',
      primaryContent: 'Content for option A',
      secondaryContent: 'Content for option B',
      style: 'switch',
    },
  },

  {
    type: 'marketingButton',
    name: 'Marketing Button',
    category: 'interactive',
    icon: 'zap',
    description: 'Advanced button with icon and subtext',
    attributes: [
      {
        key: 'text',
        label: 'Button Text',
        type: 'text',
        section: 'content',
        default: 'Get Started',
        placeholder: 'Main button text',
      },
      {
        key: 'subtext',
        label: 'Subtext',
        type: 'text',
        section: 'content',
        default: '',
        placeholder: 'Optional small text below',
      },
      {
        key: 'url',
        label: 'Link URL',
        type: 'url',
        section: 'content',
        default: '',
      },
      {
        key: 'icon',
        label: 'Icon Name',
        type: 'text',
        section: 'content',
        default: '',
        placeholder: 'Lucide icon name (optional)',
      },
      {
        key: 'size',
        label: 'Size',
        type: 'select',
        section: 'style',
        default: 'md',
        options: [
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ],
      },
      {
        key: 'variant',
        label: 'Variant',
        type: 'select',
        section: 'style',
        default: 'primary',
        options: [
          { value: 'primary', label: 'Primary' },
          { value: 'gradient', label: 'Gradient' },
          { value: 'outline', label: 'Outline' },
        ],
      },
      {
        key: 'hoverEffect',
        label: 'Hover Effect',
        type: 'select',
        section: 'style',
        default: 'grow',
        options: [
          { value: 'grow', label: 'Grow' },
          { value: 'shadow', label: 'Shadow' },
          { value: 'glow', label: 'Glow' },
        ],
      },
    ],
    defaults: {
      text: 'Get Started',
      subtext: '',
      url: '',
      icon: '',
      size: 'md',
      variant: 'primary',
      hoverEffect: 'grow',
    },
  },

  {
    type: 'modalPopup',
    name: 'Modal Popup',
    category: 'interactive',
    icon: 'maximize-2',
    description: 'Button that opens a modal dialog',
    attributes: [
      {
        key: 'triggerText',
        label: 'Trigger Button Text',
        type: 'text',
        section: 'content',
        default: 'Open Modal',
      },
      {
        key: 'triggerVariant',
        label: 'Trigger Button Style',
        type: 'select',
        section: 'style',
        default: 'primary',
        options: [
          { value: 'primary', label: 'Primary' },
          { value: 'outline', label: 'Outline' },
          { value: 'ghost', label: 'Ghost' },
        ],
      },
      {
        key: 'modalTitle',
        label: 'Modal Title',
        type: 'text',
        section: 'content',
        default: 'Modal Title',
      },
      {
        key: 'modalContent',
        label: 'Modal Content',
        type: 'textarea',
        section: 'content',
        default: 'Your modal content here',
      },
      {
        key: 'modalWidth',
        label: 'Modal Width',
        type: 'select',
        section: 'style',
        default: 'md',
        options: [
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ],
      },
    ],
    defaults: {
      triggerText: 'Open Modal',
      triggerVariant: 'primary',
      modalTitle: 'Modal Title',
      modalContent: 'Your modal content here',
      modalWidth: 'md',
    },
  },

  {
    type: 'googleMap',
    name: 'Google Map',
    category: 'utility',
    icon: 'map-pin',
    description: 'Embedded Google Map',
    attributes: [
      {
        key: 'lat',
        label: 'Latitude',
        type: 'number',
        section: 'content',
        default: 37.7749,
        placeholder: 'e.g., 37.7749',
      },
      {
        key: 'lng',
        label: 'Longitude',
        type: 'number',
        section: 'content',
        default: -122.4194,
        placeholder: 'e.g., -122.4194',
      },
      {
        key: 'zoom',
        label: 'Zoom Level',
        type: 'slider',
        section: 'style',
        default: 12,
        min: 1,
        max: 20,
        step: 1,
      },
      {
        key: 'height',
        label: 'Height',
        type: 'slider',
        section: 'style',
        default: 400,
        min: 200,
        max: 800,
        step: 50,
      },
      {
        key: 'markerTitle',
        label: 'Marker Title',
        type: 'text',
        section: 'content',
        default: '',
        placeholder: 'Optional marker label',
      },
      {
        key: 'style',
        label: 'Map Style',
        type: 'select',
        section: 'style',
        default: 'roadmap',
        options: [
          { value: 'roadmap', label: 'Roadmap' },
          { value: 'satellite', label: 'Satellite' },
          { value: 'terrain', label: 'Terrain' },
        ],
      },
    ],
    defaults: {
      lat: 37.7749,
      lng: -122.4194,
      zoom: 12,
      height: 400,
      markerTitle: '',
      style: 'roadmap',
    },
  },

  {
    type: 'contactForm',
    name: 'Contact Form',
    category: 'utility',
    icon: 'mail',
    description: 'Customizable contact form',
    attributes: [
      {
        key: 'fields',
        label: 'Form Fields',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'label',
            label: 'Label',
            type: 'text',
            section: 'content',
            default: '',
          },
          {
            key: 'type',
            label: 'Field Type',
            type: 'select',
            section: 'content',
            default: 'text',
            options: [
              { value: 'text', label: 'Text' },
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
              { value: 'textarea', label: 'Textarea' },
            ],
          },
          {
            key: 'required',
            label: 'Required',
            type: 'switch',
            section: 'content',
            default: false,
          },
          {
            key: 'placeholder',
            label: 'Placeholder',
            type: 'text',
            section: 'content',
            default: '',
          },
        ],
      },
      {
        key: 'submitText',
        label: 'Submit Button Text',
        type: 'text',
        section: 'content',
        default: 'Send Message',
      },
      {
        key: 'successMessage',
        label: 'Success Message',
        type: 'text',
        section: 'content',
        default: 'Thank you! Your message has been sent.',
      },
    ],
    defaults: {
      fields: [],
      submitText: 'Send Message',
      successMessage: 'Thank you! Your message has been sent.',
    },
  },

  {
    type: 'businessHours',
    name: 'Business Hours',
    category: 'utility',
    icon: 'clock',
    description: 'Display business hours schedule',
    attributes: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        section: 'content',
        default: 'Business Hours',
      },
      {
        key: 'days',
        label: 'Days',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'day',
            label: 'Day',
            type: 'text',
            section: 'content',
            default: '',
            placeholder: 'e.g., Monday',
          },
          {
            key: 'hours',
            label: 'Hours',
            type: 'text',
            section: 'content',
            default: '',
            placeholder: 'e.g., 9:00 AM - 5:00 PM',
          },
          {
            key: 'closed',
            label: 'Closed',
            type: 'switch',
            section: 'content',
            default: false,
          },
        ],
      },
      {
        key: 'highlightToday',
        label: 'Highlight Today',
        type: 'switch',
        section: 'style',
        default: true,
      },
      {
        key: 'closedLabel',
        label: 'Closed Label',
        type: 'text',
        section: 'content',
        default: 'Closed',
      },
    ],
    defaults: {
      title: 'Business Hours',
      days: [],
      highlightToday: true,
      closedLabel: 'Closed',
    },
  },

  {
    type: 'socialShare',
    name: 'Social Share',
    category: 'social',
    icon: 'share-2',
    description: 'Social media share buttons',
    attributes: [
      {
        key: 'platforms',
        label: 'Platforms',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'name',
            label: 'Platform',
            type: 'select',
            section: 'content',
            default: 'facebook',
            options: [
              { value: 'facebook', label: 'Facebook' },
              { value: 'twitter', label: 'Twitter' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'email', label: 'Email' },
            ],
          },
          {
            key: 'enabled',
            label: 'Enabled',
            type: 'switch',
            section: 'content',
            default: true,
          },
        ],
      },
      {
        key: 'style',
        label: 'Style',
        type: 'select',
        section: 'style',
        default: 'icon',
        options: [
          { value: 'icon', label: 'Icon Only' },
          { value: 'button', label: 'Button with Label' },
        ],
      },
      {
        key: 'size',
        label: 'Size',
        type: 'select',
        section: 'style',
        default: 'md',
        options: [
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ],
      },
      {
        key: 'alignment',
        label: 'Alignment',
        type: 'alignment',
        section: 'style',
        default: 'left',
      },
    ],
    defaults: {
      platforms: [],
      style: 'icon',
      size: 'md',
      alignment: 'left',
    },
  },

  {
    type: 'postsGrid',
    name: 'Posts Grid',
    category: 'content',
    icon: 'layout-grid',
    description: 'Dynamic grid of website pages/posts',
    attributes: [
      {
        key: 'pageType',
        label: 'Page Type',
        type: 'select',
        section: 'content',
        default: 'all',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'blog', label: 'Blog Posts' },
          { value: 'page', label: 'Pages' },
          { value: 'landing', label: 'Landing Pages' },
        ],
      },
      {
        key: 'count',
        label: 'Number of Posts',
        type: 'slider',
        section: 'content',
        default: 6,
        min: 1,
        max: 12,
        step: 1,
      },
      {
        key: 'columns',
        label: 'Columns',
        type: 'slider',
        section: 'style',
        default: 3,
        min: 1,
        max: 4,
        step: 1,
      },
      {
        key: 'showExcerpt',
        label: 'Show Excerpt',
        type: 'switch',
        section: 'content',
        default: true,
      },
      {
        key: 'showImage',
        label: 'Show Featured Image',
        type: 'switch',
        section: 'content',
        default: true,
      },
      {
        key: 'showDate',
        label: 'Show Date',
        type: 'switch',
        section: 'content',
        default: true,
      },
      {
        key: 'orderBy',
        label: 'Order By',
        type: 'select',
        section: 'content',
        default: 'newest',
        options: [
          { value: 'newest', label: 'Newest First' },
          { value: 'oldest', label: 'Oldest First' },
          { value: 'title', label: 'Title (A-Z)' },
        ],
      },
    ],
    defaults: {
      pageType: 'all',
      count: 6,
      columns: 3,
      showExcerpt: true,
      showImage: true,
      showDate: true,
      orderBy: 'newest',
    },
  },

  {
    type: 'iconList',
    name: 'Icon List',
    category: 'content',
    icon: 'list-checks',
    description: 'List with icons and optional links',
    attributes: [
      {
        key: 'items',
        label: 'List Items',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'text',
            label: 'Text',
            type: 'text',
            section: 'content',
            default: '',
          },
          {
            key: 'icon',
            label: 'Icon',
            type: 'text',
            section: 'content',
            default: 'check',
            placeholder: 'Lucide icon name',
          },
          {
            key: 'link',
            label: 'Link (Optional)',
            type: 'url',
            section: 'content',
            default: '',
          },
        ],
      },
      {
        key: 'iconColor',
        label: 'Icon Color',
        type: 'color',
        section: 'style',
        default: '#3b82f6',
      },
      {
        key: 'iconSize',
        label: 'Icon Size',
        type: 'slider',
        section: 'style',
        default: 20,
        min: 12,
        max: 32,
        step: 2,
      },
      {
        key: 'layout',
        label: 'Layout',
        type: 'select',
        section: 'style',
        default: 'vertical',
        options: [
          { value: 'vertical', label: 'Vertical' },
          { value: 'horizontal', label: 'Horizontal' },
        ],
      },
      {
        key: 'connector',
        label: 'Show Connector Lines',
        type: 'switch',
        section: 'style',
        default: false,
      },
    ],
    defaults: {
      items: [],
      iconColor: '#3b82f6',
      iconSize: 20,
      layout: 'vertical',
      connector: false,
    },
  },

  {
    type: 'progressBar',
    name: 'Progress Bar',
    category: 'interactive',
    icon: 'bar-chart-2',
    description: 'Progress indicators with labels',
    attributes: [
      {
        key: 'items',
        label: 'Progress Items',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          {
            key: 'label',
            label: 'Label',
            type: 'text',
            section: 'content',
            default: '',
          },
          {
            key: 'percentage',
            label: 'Percentage',
            type: 'slider',
            section: 'content',
            default: 50,
            min: 0,
            max: 100,
            step: 5,
          },
          {
            key: 'color',
            label: 'Color',
            type: 'color',
            section: 'content',
            default: '#3b82f6',
          },
        ],
      },
      {
        key: 'style',
        label: 'Style',
        type: 'select',
        section: 'style',
        default: 'bar',
        options: [
          { value: 'bar', label: 'Bar' },
          { value: 'circle', label: 'Circle' },
        ],
      },
      {
        key: 'animated',
        label: 'Animated',
        type: 'switch',
        section: 'style',
        default: true,
      },
      {
        key: 'showPercentage',
        label: 'Show Percentage',
        type: 'switch',
        section: 'style',
        default: true,
      },
    ],
    defaults: {
      items: [],
      style: 'bar',
      animated: true,
      showPercentage: true,
    },
  },
  // ========================================
  // PHASE 4: 6 NEW BLOCK TYPES
  // ========================================

  {
    type: 'carouselBlock',
    name: 'Carousel',
    category: 'interactive',
    icon: 'layout-grid',
    description: 'Image/content carousel slider',
    attributes: [
      {
        key: 'slides',
        label: 'Slides',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          { key: 'image', label: 'Image', type: 'image', section: 'content', default: '' },
          { key: 'title', label: 'Title', type: 'text', section: 'content', default: '' },
          { key: 'description', label: 'Description', type: 'textarea', section: 'content', default: '' },
          { key: 'link', label: 'Link', type: 'url', section: 'content', default: '' },
        ],
      },
      { key: 'effect', label: 'Effect', type: 'select', section: 'style', default: 'slide', options: [{ value: 'slide', label: 'Slide' }, { value: 'fade', label: 'Fade' }, { value: 'cube', label: 'Cube 3D' }] },
      { key: 'autoplay', label: 'Autoplay', type: 'switch', section: 'style', default: true },
      { key: 'loop', label: 'Loop', type: 'switch', section: 'style', default: true },
      { key: 'interval', label: 'Interval (ms)', type: 'slider', section: 'style', default: 3000, min: 1000, max: 10000, step: 500 },
      { key: 'navigation', label: 'Show Arrows', type: 'switch', section: 'style', default: true },
      { key: 'pagination', label: 'Show Dots', type: 'switch', section: 'style', default: true },
      { key: 'slidesPerView', label: 'Slides Per View', type: 'slider', section: 'style', default: 1, min: 1, max: 4, step: 1 },
    ],
    defaults: { slides: [], effect: 'slide', autoplay: true, loop: true, interval: 3000, navigation: true, pagination: true, slidesPerView: 1 },
  },

  {
    type: 'flipBox',
    name: 'Flip Box',
    category: 'interactive',
    icon: 'toggle-left',
    description: 'Card that flips on hover to reveal back content',
    attributes: [
      { key: 'frontTitle', label: 'Front Title', type: 'text', section: 'content', default: 'Front Side' },
      { key: 'frontDescription', label: 'Front Description', type: 'textarea', section: 'content', default: 'Hover to flip' },
      { key: 'frontIcon', label: 'Front Icon', type: 'text', section: 'content', default: 'layers', helpText: 'Lucide icon name' },
      { key: 'frontBgColor', label: 'Front Background', type: 'color', section: 'style', default: '#ffffff' },
      { key: 'backTitle', label: 'Back Title', type: 'text', section: 'content', default: 'Back Side' },
      { key: 'backDescription', label: 'Back Description', type: 'textarea', section: 'content', default: 'More details here' },
      { key: 'backBgColor', label: 'Back Background', type: 'color', section: 'style', default: '#3b82f6' },
      { key: 'backTextColor', label: 'Back Text Color', type: 'color', section: 'style', default: '#ffffff' },
      { key: 'flipDirection', label: 'Flip Direction', type: 'select', section: 'style', default: 'horizontal', options: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }] },
      { key: 'height', label: 'Height (px)', type: 'slider', section: 'style', default: 280, min: 150, max: 500, step: 10 },
      { key: 'backLinkUrl', label: 'Back Link URL', type: 'url', section: 'advanced', default: '' },
      { key: 'backLinkText', label: 'Back Link Text', type: 'text', section: 'advanced', default: 'Learn More' },
    ],
    defaults: { frontTitle: 'Front Side', frontDescription: 'Hover to flip', frontIcon: 'layers', frontBgColor: '#ffffff', backTitle: 'Back Side', backDescription: 'More details here', backBgColor: '#3b82f6', backTextColor: '#ffffff', flipDirection: 'horizontal', height: 280, backLinkUrl: '', backLinkText: 'Learn More' },
  },

  {
    type: 'animatedHeadline',
    name: 'Animated Headline',
    category: 'content',
    icon: 'type',
    description: 'Headline with rotating animated text',
    attributes: [
      { key: 'beforeText', label: 'Before Text', type: 'text', section: 'content', default: 'This is' },
      { key: 'rotatingTexts', label: 'Rotating Texts', type: 'textarea', section: 'content', default: '["Amazing","Creative","Beautiful"]', helpText: 'JSON array of strings' },
      { key: 'afterText', label: 'After Text', type: 'text', section: 'content', default: '' },
      { key: 'effect', label: 'Animation Effect', type: 'select', section: 'style', default: 'typing', options: [{ value: 'typing', label: 'Typing' }, { value: 'fade', label: 'Fade' }, { value: 'slide', label: 'Slide' }, { value: 'clip', label: 'Clip' }, { value: 'rotate', label: 'Rotate 3D' }] },
      { key: 'speed', label: 'Speed (ms)', type: 'slider', section: 'style', default: 2000, min: 500, max: 5000, step: 250 },
      { key: 'tag', label: 'HTML Tag', type: 'select', section: 'content', default: 'h2', options: [{ value: 'h1', label: 'H1' }, { value: 'h2', label: 'H2' }, { value: 'h3', label: 'H3' }, { value: 'h4', label: 'H4' }] },
      { key: 'color', label: 'Accent Color', type: 'color', section: 'style', default: '#3b82f6' },
      { key: 'alignment', label: 'Alignment', type: 'alignment', section: 'style', default: 'center' },
    ],
    defaults: { beforeText: 'This is', rotatingTexts: '["Amazing","Creative","Beautiful"]', afterText: '', effect: 'typing', speed: 2000, tag: 'h2', color: '#3b82f6', alignment: 'center' },
  },

  {
    type: 'hotspotBlock',
    name: 'Hotspot Image',
    category: 'media',
    icon: 'image',
    description: 'Image with interactive hotspot markers',
    attributes: [
      { key: 'image', label: 'Image', type: 'image', section: 'content', default: '' },
      {
        key: 'hotspots',
        label: 'Hotspots',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          { key: 'x', label: 'X Position (%)', type: 'slider', section: 'content', default: 50, min: 0, max: 100, step: 1 },
          { key: 'y', label: 'Y Position (%)', type: 'slider', section: 'content', default: 50, min: 0, max: 100, step: 1 },
          { key: 'title', label: 'Title', type: 'text', section: 'content', default: '' },
          { key: 'description', label: 'Description', type: 'textarea', section: 'content', default: '' },
          { key: 'link', label: 'Link', type: 'url', section: 'content', default: '' },
        ],
      },
      { key: 'tooltipStyle', label: 'Tooltip Style', type: 'select', section: 'style', default: 'dark', options: [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'colored', label: 'Colored' }] },
      { key: 'pulseAnimation', label: 'Pulse Animation', type: 'switch', section: 'style', default: true },
      { key: 'tooltipPosition', label: 'Tooltip Position', type: 'select', section: 'style', default: 'auto', options: [{ value: 'auto', label: 'Auto' }, { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }] },
    ],
    defaults: { image: '', hotspots: [], tooltipStyle: 'dark', pulseAnimation: true, tooltipPosition: 'auto' },
  },

  {
    type: 'tocBlock',
    name: 'Table of Contents',
    category: 'utility',
    icon: 'list',
    description: 'Auto-generated table of contents from headings',
    attributes: [
      { key: 'title', label: 'Title', type: 'text', section: 'content', default: 'Table of Contents' },
      { key: 'maxDepth', label: 'Max Heading Depth', type: 'slider', section: 'content', default: 3, min: 1, max: 6, step: 1 },
      { key: 'displayStyle', label: 'Style', type: 'select', section: 'style', default: 'list', options: [{ value: 'list', label: 'Bullet List' }, { value: 'numbered', label: 'Numbered' }, { value: 'dots', label: 'Dot Markers' }] },
      { key: 'sticky', label: 'Sticky Position', type: 'switch', section: 'advanced', default: false },
      { key: 'smoothScroll', label: 'Smooth Scroll', type: 'switch', section: 'advanced', default: true },
      { key: 'collapsible', label: 'Collapsible', type: 'switch', section: 'advanced', default: false },
    ],
    defaults: { title: 'Table of Contents', maxDepth: 3, displayStyle: 'list', sticky: false, smoothScroll: true, collapsible: false },
  },

  {
    type: 'offCanvasBlock',
    name: 'Off-Canvas Panel',
    category: 'interactive',
    icon: 'maximize-2',
    description: 'Button that opens a slide-out panel',
    attributes: [
      { key: 'triggerText', label: 'Trigger Text', type: 'text', section: 'content', default: 'Open Panel' },
      { key: 'triggerVariant', label: 'Trigger Style', type: 'select', section: 'style', default: 'primary', options: [{ value: 'primary', label: 'Primary' }, { value: 'outline', label: 'Outline' }, { value: 'ghost', label: 'Ghost' }] },
      { key: 'direction', label: 'Slide Direction', type: 'select', section: 'style', default: 'right', options: [{ value: 'left', label: 'From Left' }, { value: 'right', label: 'From Right' }] },
      { key: 'width', label: 'Panel Width (px)', type: 'slider', section: 'style', default: 400, min: 250, max: 800, step: 50 },
      { key: 'panelTitle', label: 'Panel Title', type: 'text', section: 'content', default: 'Panel' },
      { key: 'panelContent', label: 'Panel Content', type: 'textarea', section: 'content', default: 'Your content here' },
      { key: 'overlayColor', label: 'Overlay Color', type: 'text', section: 'style', default: 'rgba(0,0,0,0.5)', placeholder: 'rgba(0,0,0,0.5)' },
      { key: 'showCloseButton', label: 'Show Close Button', type: 'switch', section: 'style', default: true },
    ],
    defaults: { triggerText: 'Open Panel', triggerVariant: 'primary', direction: 'right', width: 400, panelTitle: 'Panel', panelContent: 'Your content here', overlayColor: 'rgba(0,0,0,0.5)', showCloseButton: true },
  },

  // ========================================
  // PHASE 9: 15 NEW CONTENT BLOCK WIDGETS
  // ========================================

  {
    type: 'tabsBlock',
    name: 'Tabs',
    category: 'interactive',
    icon: 'layout-list',
    description: 'Tabbed content panels',
    attributes: [
      {
        key: 'tabs',
        label: 'Tabs',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          { key: 'title', label: 'Title', type: 'text', section: 'content', default: '' },
          { key: 'content', label: 'Content', type: 'textarea', section: 'content', default: '' },
        ],
      },
      { key: 'defaultActive', label: 'Default Active Tab', type: 'number', section: 'content', default: 0 },
      { key: 'style', label: 'Style', type: 'select', section: 'style', default: 'default', options: [{ value: 'default', label: 'Default' }, { value: 'pills', label: 'Pills' }, { value: 'underline', label: 'Underline' }] },
      { key: 'position', label: 'Tab Position', type: 'select', section: 'style', default: 'top', options: [{ value: 'top', label: 'Top' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
    ],
    defaults: { tabs: '[]', defaultActive: 0, style: 'default', position: 'top' },
  },

  {
    type: 'accordionBlock',
    name: 'Accordion',
    category: 'interactive',
    icon: 'chevrons-up-down',
    description: 'Expandable content sections',
    attributes: [
      {
        key: 'items',
        label: 'Items',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          { key: 'title', label: 'Title', type: 'text', section: 'content', default: '' },
          { key: 'content', label: 'Content', type: 'textarea', section: 'content', default: '' },
          { key: 'icon', label: 'Icon', type: 'text', section: 'content', default: '' },
        ],
      },
      { key: 'allowMultiple', label: 'Allow Multiple Open', type: 'switch', section: 'content', default: false },
      { key: 'defaultOpen', label: 'Default Open Index', type: 'number', section: 'content', default: 0 },
      { key: 'style', label: 'Style', type: 'select', section: 'style', default: 'default', options: [{ value: 'default', label: 'Default' }, { value: 'bordered', label: 'Bordered' }, { value: 'minimal', label: 'Minimal' }] },
    ],
    defaults: { items: '[]', allowMultiple: false, defaultOpen: 0, style: 'default' },
  },

  {
    type: 'counterBlock',
    name: 'Counter',
    category: 'content',
    icon: 'hash',
    description: 'Animated number counter',
    attributes: [
      { key: 'startValue', label: 'Start Value', type: 'number', section: 'content', default: 0 },
      { key: 'endValue', label: 'End Value', type: 'number', section: 'content', default: 100 },
      { key: 'prefix', label: 'Prefix', type: 'text', section: 'content', default: '', placeholder: 'e.g., $' },
      { key: 'suffix', label: 'Suffix', type: 'text', section: 'content', default: '', placeholder: 'e.g., +, %' },
      { key: 'duration', label: 'Duration (ms)', type: 'slider', section: 'style', default: 2000, min: 500, max: 5000, step: 250 },
      { key: 'separator', label: 'Thousand Separator', type: 'switch', section: 'style', default: true },
      { key: 'tag', label: 'HTML Tag', type: 'select', section: 'style', default: 'h2', options: [{ value: 'h1', label: 'H1' }, { value: 'h2', label: 'H2' }, { value: 'h3', label: 'H3' }, { value: 'h4', label: 'H4' }, { value: 'span', label: 'Span' }] },
      { key: 'color', label: 'Color', type: 'color', section: 'style', default: '#1677ff' },
    ],
    defaults: { startValue: 0, endValue: 100, prefix: '', suffix: '', duration: 2000, separator: true, tag: 'h2', color: '#1677ff' },
  },

  {
    type: 'starRatingBlock',
    name: 'Star Rating',
    category: 'content',
    icon: 'star',
    description: 'Visual star rating display',
    attributes: [
      { key: 'rating', label: 'Rating', type: 'slider', section: 'content', default: 4.5, min: 0, max: 5, step: 0.5 },
      { key: 'scale', label: 'Scale', type: 'slider', section: 'content', default: 5, min: 3, max: 10, step: 1 },
      { key: 'icon', label: 'Icon', type: 'select', section: 'style', default: 'star', options: [{ value: 'star', label: 'Star' }] },
      { key: 'size', label: 'Size (px)', type: 'slider', section: 'style', default: 24, min: 12, max: 48, step: 2 },
      { key: 'color', label: 'Color', type: 'color', section: 'style', default: '#f59e0b' },
      { key: 'title', label: 'Title', type: 'text', section: 'content', default: '', placeholder: 'Optional title above stars' },
    ],
    defaults: { rating: 4.5, scale: 5, icon: 'star', size: 24, color: '#f59e0b', title: '' },
  },

  {
    type: 'blockquoteBlock',
    name: 'Blockquote',
    category: 'content',
    icon: 'quote',
    description: 'Styled quote with author info',
    attributes: [
      { key: 'content', label: 'Quote Text', type: 'textarea', section: 'content', default: 'Quote text...', placeholder: 'Enter the quote' },
      { key: 'author', label: 'Author', type: 'text', section: 'content', default: '', placeholder: 'Author name' },
      { key: 'authorTitle', label: 'Author Title', type: 'text', section: 'content', default: '', placeholder: 'Role or title' },
      { key: 'authorImage', label: 'Author Image', type: 'image', section: 'content', default: '' },
      { key: 'borderColor', label: 'Border Color', type: 'color', section: 'style', default: '#1677ff' },
      { key: 'style', label: 'Style', type: 'select', section: 'style', default: 'default', options: [{ value: 'default', label: 'Default' }, { value: 'modern', label: 'Modern' }, { value: 'minimal', label: 'Minimal' }] },
    ],
    defaults: { content: 'Quote text...', author: '', authorTitle: '', authorImage: '', borderColor: '#1677ff', style: 'default' },
  },

  {
    type: 'codeHighlightBlock',
    name: 'Code Highlight',
    category: 'utility',
    icon: 'code-2',
    description: 'Syntax-highlighted code block',
    attributes: [
      { key: 'code', label: 'Code', type: 'textarea', section: 'content', default: '', placeholder: 'Paste your code here' },
      { key: 'language', label: 'Language', type: 'select', section: 'content', default: 'javascript', options: [{ value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' }, { value: 'html', label: 'HTML' }, { value: 'css', label: 'CSS' }, { value: 'python', label: 'Python' }, { value: 'php', label: 'PHP' }, { value: 'bash', label: 'Bash' }, { value: 'json', label: 'JSON' }, { value: 'sql', label: 'SQL' }] },
      { key: 'theme', label: 'Theme', type: 'select', section: 'style', default: 'dark', options: [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }] },
      { key: 'lineNumbers', label: 'Line Numbers', type: 'switch', section: 'style', default: true },
      { key: 'copyButton', label: 'Copy Button', type: 'switch', section: 'style', default: true },
      { key: 'maxHeight', label: 'Max Height (px)', type: 'slider', section: 'style', default: 400, min: 100, max: 800, step: 50 },
    ],
    defaults: { code: '', language: 'javascript', theme: 'dark', lineNumbers: true, copyButton: true, maxHeight: 400 },
  },

  {
    type: 'audioBlock',
    name: 'Audio Player',
    category: 'media',
    icon: 'volume-2',
    description: 'HTML5 audio player with custom UI',
    attributes: [
      { key: 'src', label: 'Audio URL', type: 'url', section: 'content', default: '', placeholder: 'Enter audio file URL' },
      { key: 'title', label: 'Title', type: 'text', section: 'content', default: '', placeholder: 'Track title' },
      { key: 'artist', label: 'Artist', type: 'text', section: 'content', default: '', placeholder: 'Artist name' },
      { key: 'cover', label: 'Cover Image', type: 'image', section: 'content', default: '' },
      { key: 'autoplay', label: 'Autoplay', type: 'switch', section: 'advanced', default: false },
      { key: 'loop', label: 'Loop', type: 'switch', section: 'advanced', default: false },
    ],
    defaults: { src: '', title: '', artist: '', cover: '', autoplay: false, loop: false },
  },

  {
    type: 'beforeAfterBlock',
    name: 'Before/After',
    category: 'media',
    icon: 'columns-2',
    description: 'Image comparison slider',
    attributes: [
      { key: 'beforeImage', label: 'Before Image', type: 'image', section: 'content', default: '' },
      { key: 'afterImage', label: 'After Image', type: 'image', section: 'content', default: '' },
      { key: 'beforeLabel', label: 'Before Label', type: 'text', section: 'content', default: 'Before' },
      { key: 'afterLabel', label: 'After Label', type: 'text', section: 'content', default: 'After' },
      { key: 'orientation', label: 'Orientation', type: 'select', section: 'style', default: 'horizontal', options: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }] },
      { key: 'handleColor', label: 'Handle Color', type: 'color', section: 'style', default: '#ffffff' },
      { key: 'handleWidth', label: 'Handle Width (px)', type: 'slider', section: 'style', default: 4, min: 2, max: 10, step: 1 },
      { key: 'startPosition', label: 'Start Position (%)', type: 'slider', section: 'style', default: 50, min: 10, max: 90, step: 5 },
    ],
    defaults: { beforeImage: '', afterImage: '', beforeLabel: 'Before', afterLabel: 'After', orientation: 'horizontal', handleColor: '#ffffff', handleWidth: 4, startPosition: 50 },
  },

  {
    type: 'lottieBlock',
    name: 'Lottie Animation',
    category: 'media',
    icon: 'sparkles',
    description: 'Lottie JSON animation player',
    attributes: [
      { key: 'jsonUrl', label: 'Animation JSON URL', type: 'url', section: 'content', default: '', placeholder: 'URL to Lottie JSON file' },
      { key: 'trigger', label: 'Trigger', type: 'select', section: 'content', default: 'none', options: [{ value: 'none', label: 'Auto / None' }, { value: 'hover', label: 'On Hover' }, { value: 'scroll', label: 'On Scroll' }, { value: 'viewport', label: 'In Viewport' }] },
      { key: 'loop', label: 'Loop', type: 'switch', section: 'style', default: true },
      { key: 'speed', label: 'Speed', type: 'slider', section: 'style', default: 1, min: 0.1, max: 3, step: 0.1 },
      { key: 'width', label: 'Width', type: 'text', section: 'style', default: '100%', placeholder: 'e.g., 100%, 300px' },
      { key: 'height', label: 'Height', type: 'text', section: 'style', default: '300px', placeholder: 'e.g., 300px, auto' },
      { key: 'autoplay', label: 'Autoplay', type: 'switch', section: 'style', default: true },
    ],
    defaults: { jsonUrl: '', trigger: 'none', loop: true, speed: 1, width: '100%', height: '300px', autoplay: true },
  },

  {
    type: 'navMenuBlock',
    name: 'Navigation Menu',
    category: 'navigation',
    icon: 'menu',
    description: 'Dynamic navigation menu from website menus',
    attributes: [
      { key: 'menuLocation', label: 'Menu Location', type: 'text', section: 'content', default: 'main', placeholder: 'e.g., main, footer' },
      { key: 'layout', label: 'Layout', type: 'select', section: 'style', default: 'horizontal', options: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }, { value: 'dropdown', label: 'Dropdown' }] },
      { key: 'hamburgerBreakpoint', label: 'Hamburger Breakpoint (px)', type: 'slider', section: 'style', default: 768, min: 480, max: 1200, step: 40 },
      { key: 'mobileLayout', label: 'Mobile Layout', type: 'select', section: 'style', default: 'dropdown', options: [{ value: 'dropdown', label: 'Dropdown' }, { value: 'fullscreen', label: 'Fullscreen' }, { value: 'offcanvas', label: 'Off-Canvas' }] },
      { key: 'fontSize', label: 'Font Size (px)', type: 'slider', section: 'style', default: 14, min: 12, max: 20, step: 1 },
      { key: 'color', label: 'Text Color', type: 'color', section: 'style', default: '#374151' },
      { key: 'hoverColor', label: 'Hover Color', type: 'color', section: 'style', default: '#1677ff' },
    ],
    defaults: { menuLocation: 'main', layout: 'horizontal', hamburgerBreakpoint: 768, mobileLayout: 'dropdown', fontSize: 14, color: '#374151', hoverColor: '#1677ff' },
  },

  {
    type: 'breadcrumbsBlock',
    name: 'Breadcrumbs',
    category: 'navigation',
    icon: 'chevron-right',
    description: 'Breadcrumb navigation trail',
    attributes: [
      { key: 'separator', label: 'Separator', type: 'text', section: 'content', default: '/', placeholder: 'e.g., /, >, -' },
      { key: 'homeLabel', label: 'Home Label', type: 'text', section: 'content', default: 'Home' },
      { key: 'showCurrent', label: 'Show Current Page', type: 'switch', section: 'content', default: true },
      { key: 'fontSize', label: 'Font Size (px)', type: 'slider', section: 'style', default: 14, min: 10, max: 20, step: 1 },
      { key: 'color', label: 'Text Color', type: 'color', section: 'style', default: '#6b7280' },
    ],
    defaults: { separator: '/', homeLabel: 'Home', showCurrent: true, fontSize: 14, color: '#6b7280' },
  },

  {
    type: 'searchFormBlock',
    name: 'Search Form',
    category: 'utility',
    icon: 'search',
    description: 'Site search form',
    attributes: [
      { key: 'placeholder', label: 'Placeholder', type: 'text', section: 'content', default: 'Search...', placeholder: 'Search placeholder text' },
      { key: 'style', label: 'Style', type: 'select', section: 'style', default: 'default', options: [{ value: 'default', label: 'Default' }, { value: 'rounded', label: 'Rounded' }, { value: 'minimal', label: 'Minimal' }] },
      { key: 'buttonText', label: 'Button Text', type: 'text', section: 'content', default: 'Search' },
      { key: 'showButton', label: 'Show Button', type: 'switch', section: 'style', default: true },
    ],
    defaults: { placeholder: 'Search...', style: 'default', buttonText: 'Search', showButton: true },
  },

  {
    type: 'slidesBlock',
    name: 'Hero Slides',
    category: 'media',
    icon: 'presentation',
    description: 'Full-screen hero slides with overlay',
    attributes: [
      {
        key: 'slides',
        label: 'Slides',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          { key: 'bgImage', label: 'Background Image', type: 'image', section: 'content', default: '' },
          { key: 'heading', label: 'Heading', type: 'text', section: 'content', default: '' },
          { key: 'description', label: 'Description', type: 'textarea', section: 'content', default: '' },
          { key: 'buttonText', label: 'Button Text', type: 'text', section: 'content', default: '' },
          { key: 'buttonUrl', label: 'Button URL', type: 'url', section: 'content', default: '' },
        ],
      },
      { key: 'autoplay', label: 'Autoplay', type: 'switch', section: 'style', default: true },
      { key: 'effect', label: 'Effect', type: 'select', section: 'style', default: 'fade', options: [{ value: 'fade', label: 'Fade' }, { value: 'slide', label: 'Slide' }] },
      { key: 'height', label: 'Height (px)', type: 'slider', section: 'style', default: 500, min: 300, max: 900, step: 50 },
      { key: 'overlayColor', label: 'Overlay Color', type: 'text', section: 'style', default: 'rgba(0,0,0,0.3)', placeholder: 'rgba(0,0,0,0.3)' },
      { key: 'interval', label: 'Interval (ms)', type: 'slider', section: 'style', default: 5000, min: 2000, max: 10000, step: 500 },
    ],
    defaults: { slides: '[]', autoplay: true, effect: 'fade', height: 500, overlayColor: 'rgba(0,0,0,0.3)', interval: 5000 },
  },

  {
    type: 'progressTrackerBlock',
    name: 'Reading Progress',
    category: 'utility',
    icon: 'loader',
    description: 'Scroll-based reading progress bar',
    attributes: [
      { key: 'height', label: 'Height (px)', type: 'slider', section: 'style', default: 4, min: 2, max: 12, step: 1 },
      { key: 'color', label: 'Color', type: 'color', section: 'style', default: '#1677ff' },
      { key: 'backgroundColor', label: 'Background Color', type: 'color', section: 'style', default: '#e5e7eb' },
      { key: 'position', label: 'Position', type: 'select', section: 'style', default: 'top', options: [{ value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }] },
      { key: 'style', label: 'Style', type: 'select', section: 'style', default: 'bar', options: [{ value: 'bar', label: 'Solid Bar' }, { value: 'gradient', label: 'Gradient' }] },
    ],
    defaults: { height: 4, color: '#1677ff', backgroundColor: '#e5e7eb', position: 'top', style: 'bar' },
  },

  {
    type: 'floatingButtonsBlock',
    name: 'Floating Buttons',
    category: 'interactive',
    icon: 'message-circle',
    description: 'Fixed-position action buttons',
    attributes: [
      {
        key: 'buttons',
        label: 'Buttons',
        type: 'repeater',
        section: 'content',
        default: [],
        children: [
          { key: 'type', label: 'Type', type: 'select', section: 'content', default: 'custom', options: [{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'phone', label: 'Phone' }, { value: 'email', label: 'Email' }, { value: 'messenger', label: 'Messenger' }, { value: 'custom', label: 'Custom' }] },
          { key: 'label', label: 'Label', type: 'text', section: 'content', default: '' },
          { key: 'url', label: 'URL / Number', type: 'text', section: 'content', default: '' },
          { key: 'icon', label: 'Icon', type: 'text', section: 'content', default: '' },
          { key: 'color', label: 'Color', type: 'color', section: 'content', default: '#1677ff' },
        ],
      },
      { key: 'position', label: 'Position', type: 'select', section: 'style', default: 'bottom-right', options: [{ value: 'bottom-right', label: 'Bottom Right' }, { value: 'bottom-left', label: 'Bottom Left' }] },
      { key: 'style', label: 'Button Style', type: 'select', section: 'style', default: 'circle', options: [{ value: 'circle', label: 'Circle' }, { value: 'pill', label: 'Pill' }] },
      { key: 'showLabels', label: 'Show Labels', type: 'switch', section: 'style', default: false },
    ],
    defaults: { buttons: '[]', position: 'bottom-right', style: 'circle', showLabels: false },
  },

  // ========================================
  // PHASE 10: DYNAMIC CONTENT LOOP BLOCKS
  // ========================================

  {
    type: 'loopGridBlock',
    name: 'Loop Grid',
    category: 'content',
    icon: 'layout-grid',
    description: 'Dynamic grid of pages/posts from a query',
    attributes: [
      {
        key: 'query',
        label: 'Query (JSON)',
        type: 'textarea',
        section: 'content',
        default: '{}',
        placeholder: '{"source":"all","limit":6}',
        helpText: 'JSON query object for dynamic content',
      },
      {
        key: 'columns',
        label: 'Columns',
        type: 'slider',
        section: 'style',
        default: 3,
        min: 1,
        max: 6,
        step: 1,
      },
      {
        key: 'gap',
        label: 'Gap (px)',
        type: 'slider',
        section: 'style',
        default: 24,
        min: 0,
        max: 60,
        step: 4,
      },
      {
        key: 'pagination',
        label: 'Enable Pagination',
        type: 'switch',
        section: 'advanced',
        default: false,
      },
    ],
    defaults: {
      query: '{}',
      columns: 3,
      gap: 24,
      cardTemplate: '{}',
      pagination: false,
    },
  },

  // ========================================
  // PHASE 11: GLOBAL WIDGET BLOCK
  // ========================================

  {
    type: 'globalWidgetBlock',
    name: 'Global Widget',
    category: 'global',
    icon: 'globe',
    description: 'Reusable global block that syncs across all pages',
    attributes: [
      {
        key: 'globalWidgetId',
        label: 'Widget ID',
        type: 'number',
        section: 'content',
        default: null,
        placeholder: 'Select from Global tab',
      },
      {
        key: 'name',
        label: 'Widget Name',
        type: 'text',
        section: 'content',
        default: 'Global Widget',
        placeholder: 'Display name',
      },
    ],
    defaults: {
      globalWidgetId: null,
      name: 'Global Widget',
    },
  },

  {
    type: 'loopCarouselBlock',
    name: 'Loop Carousel',
    category: 'content',
    icon: 'gallery-horizontal',
    description: 'Dynamic carousel of pages/posts from a query',
    attributes: [
      {
        key: 'query',
        label: 'Query (JSON)',
        type: 'textarea',
        section: 'content',
        default: '{}',
        placeholder: '{"source":"all","limit":4}',
        helpText: 'JSON query object for dynamic content',
      },
      {
        key: 'effect',
        label: 'Slide Effect',
        type: 'select',
        section: 'style',
        default: 'slide',
        options: [
          { value: 'slide', label: 'Slide' },
          { value: 'fade', label: 'Fade' },
        ],
      },
      {
        key: 'autoplay',
        label: 'Autoplay',
        type: 'switch',
        section: 'style',
        default: false,
      },
      {
        key: 'height',
        label: 'Height (px)',
        type: 'slider',
        section: 'style',
        default: 400,
        min: 200,
        max: 800,
        step: 50,
      },
      {
        key: 'pagination',
        label: 'Show Dots',
        type: 'switch',
        section: 'style',
        default: false,
      },
    ],
    defaults: {
      query: '{}',
      effect: 'slide',
      autoplay: false,
      height: 400,
      cardTemplate: '{}',
      pagination: false,
    },
  },
  // Phase 18: Chart widget
  {
    type: 'chartBlock',
    name: 'Chart',
    category: 'media',
    icon: 'bar-chart-2',
    description: 'Data visualization chart (bar, line, pie, doughnut)',
    attributes: [
      { key: 'chartType', label: 'Chart Type', type: 'select', section: 'content', default: 'bar', options: [{ value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }, { value: 'pie', label: 'Pie' }, { value: 'doughnut', label: 'Doughnut' }] },
      { key: 'labels', label: 'Labels (JSON array)', type: 'textarea', section: 'content', default: '["Jan","Feb","Mar","Apr","May","Jun"]', placeholder: '["Jan","Feb","Mar"]' },
      { key: 'datasets', label: 'Datasets (JSON array)', type: 'textarea', section: 'content', default: '[{"label":"Dataset 1","data":[12,19,3,5,2,3],"backgroundColor":"#1677ff"}]' },
      { key: 'showLegend', label: 'Show Legend', type: 'switch', section: 'style', default: true },
      { key: 'showGrid', label: 'Show Grid', type: 'switch', section: 'style', default: true },
      { key: 'aspectRatio', label: 'Aspect Ratio', type: 'slider', section: 'style', default: 2, min: 1, max: 4, step: 0.5 },
      { key: 'height', label: 'Height', type: 'text', section: 'style', default: '300px', placeholder: '300px' },
    ],
    defaults: { chartType: 'bar', labels: '["Jan","Feb","Mar","Apr","May","Jun"]', datasets: '[{"label":"Dataset 1","data":[12,19,3,5,2,3],"backgroundColor":"#1677ff"}]', showLegend: true, showGrid: true, aspectRatio: 2, height: '300px' },
  },
];

/**
 * Common advanced attributes — auto-injected into all widgets
 */
import { commonAdvancedSchema, commonDefaults } from '../extensions/shared/commonAttributes';

// Auto-inject common advanced attributes into every widget
widgetRegistry.forEach((widget) => {
  // Add common advanced schema entries (skip duplicates)
  const existingKeys = new Set(widget.attributes.map((a) => a.key));
  commonAdvancedSchema.forEach((attr) => {
    if (!existingKeys.has(attr.key)) {
      widget.attributes.push(attr);
    }
  });

  // Merge common defaults
  Object.entries(commonDefaults).forEach(([key, value]) => {
    if (!(key in widget.defaults)) {
      widget.defaults[key] = value;
    }
  });
});

/**
 * Utility functions
 */

export function getWidget(type: string): WidgetDef | undefined {
  return widgetRegistry.find((widget) => widget.type === type);
}

export function getWidgetsByCategory(category: WidgetCategory): WidgetDef[] {
  return widgetRegistry.filter((widget) => widget.category === category);
}

export const allWidgets = widgetRegistry;

export const widgetCategories: WidgetCategory[] = [
  'layout',
  'content',
  'media',
  'interactive',
  'commercial',
  'utility',
  'social',
  'navigation',
  'global',
];
