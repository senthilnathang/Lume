/**
 * E-Commerce Module Example
 *
 * Demonstrates an e-commerce system with:
 * - Product and Order entities with inventory tracking
 * - Computed fields for pricing and totals
 * - Automated workflows for order processing
 * - Stock management workflows
 * - Customer-facing views (storefront)
 * - Admin management views
 */

import { defineModule } from '@core/module/define-module';
import { defineEntity } from '@core/entity/define-entity';
import { defineWorkflow } from '@core/workflow/define-workflow';
import { definePolicy } from '@core/permission/define-policy';
import { defineView } from '@core/view/define-view';

// ============ ENTITIES ============

export const ProductEntity = defineEntity('Product', {
  name: 'Product',
  label: 'Product',
  description: 'Sellable products in the catalog with pricing, inventory, and metadata',
  icon: 'box',
  fields: {
    id: { name: 'id', type: 'int', required: true },
    sku: { name: 'sku', type: 'string', required: true, isIndexed: true },
    name: { name: 'name', type: 'string', required: true },
    description: { name: 'description', type: 'text' },
    category: { name: 'category', type: 'string', isIndexed: true },
    price: { name: 'price', type: 'decimal', required: true },
    cost: { name: 'cost', type: 'decimal' },
    currency: { name: 'currency', type: 'string', defaultValue: 'USD' },
    stockQuantity: { name: 'stockQuantity', type: 'int', defaultValue: 0 },
    reservedQuantity: { name: 'reservedQuantity', type: 'int', defaultValue: 0 },
    reorderLevel: { name: 'reorderLevel', type: 'int', defaultValue: 10 },
    isActive: { name: 'isActive', type: 'boolean', defaultValue: true },
    image: { name: 'image', type: 'string' }, // URL to product image
    tags: { name: 'tags', type: 'json' }, // Array of tag strings
    ratings: { name: 'ratings', type: 'decimal' }, // Average rating 0-5
    reviewCount: { name: 'reviewCount', type: 'int', defaultValue: 0 },
    createdAt: { name: 'createdAt', type: 'datetime' },
    updatedAt: { name: 'updatedAt', type: 'datetime' },
  },
  computed: {
    availableQuantity: {
      formula: 'stockQuantity - reservedQuantity',
      type: 'int',
      label: 'Available Quantity',
    },
    marginPercentage: {
      formula: 'ROUND((price - cost) / price * 100, 2)',
      type: 'decimal',
      label: 'Margin %',
    },
    isLowStock: {
      formula: 'IF(stockQuantity <= reorderLevel, TRUE, FALSE)',
      type: 'boolean',
      label: 'Low Stock Alert',
    },
    displayPrice: {
      formula: "CONCAT('$', ROUND(price, 2))",
      type: 'string',
      label: 'Display Price',
    },
  },
  aiMetadata: {
    description: 'Products available for sale with inventory levels, pricing, and customer ratings',
    sensitiveFields: ['cost'],
    summarizeWith: 'Summary: [name] (SKU: [sku]), Price: [displayPrice], Stock: [availableQuantity], Rating: [ratings]/5',
  },
});

export const OrderEntity = defineEntity('Order', {
  name: 'Order',
  label: 'Order',
  description: 'Customer orders with items, pricing, and fulfillment status',
  icon: 'shopping-cart',
  fields: {
    id: { name: 'id', type: 'int', required: true },
    orderNumber: { name: 'orderNumber', type: 'string', required: true, isIndexed: true },
    customerId: { name: 'customerId', type: 'int', required: true, isIndexed: true },
    customerEmail: { name: 'customerEmail', type: 'email', required: true },
    customerName: { name: 'customerName', type: 'string', required: true },
    items: { name: 'items', type: 'json', required: true }, // [{productId, sku, quantity, price}]
    subtotal: { name: 'subtotal', type: 'decimal', required: true },
    taxAmount: { name: 'taxAmount', type: 'decimal', defaultValue: 0 },
    shippingCost: { name: 'shippingCost', type: 'decimal', defaultValue: 0 },
    discountAmount: { name: 'discountAmount', type: 'decimal', defaultValue: 0 },
    total: { name: 'total', type: 'decimal', required: true },
    currency: { name: 'currency', type: 'string', defaultValue: 'USD' },
    status: { name: 'status', type: 'string', required: true }, // pending, confirmed, shipped, delivered, cancelled
    paymentStatus: { name: 'paymentStatus', type: 'string' }, // pending, paid, failed, refunded
    shippingAddress: { name: 'shippingAddress', type: 'json' },
    trackingNumber: { name: 'trackingNumber', type: 'string' },
    shippedAt: { name: 'shippedAt', type: 'datetime' },
    deliveredAt: { name: 'deliveredAt', type: 'datetime' },
    notes: { name: 'notes', type: 'text' },
    createdAt: { name: 'createdAt', type: 'datetime' },
    updatedAt: { name: 'updatedAt', type: 'datetime' },
  },
  computed: {
    daysOld: {
      formula: 'DATEDIFF(NOW(), createdAt)',
      type: 'int',
      label: 'Days Old',
    },
    isOverdue: {
      formula: "IF(status NOT IN ('delivered', 'cancelled') AND DATEDIFF(NOW(), createdAt) > 7, TRUE, FALSE)",
      type: 'boolean',
      label: 'Overdue',
    },
    itemCount: {
      formula: 'JSON_LENGTH(items)',
      type: 'int',
      label: 'Item Count',
    },
  },
  hooks: {
    beforeCreate: async (data, ctx) => {
      // Auto-generate order number
      if (!data.orderNumber) {
        const date = new Date();
        const timestamp = date.getTime();
        data.orderNumber = `ORD-${date.getFullYear()}-${String(timestamp).slice(-6)}`;
      }
      return data;
    },
    afterCreate: async (record, ctx) => {
      // Emit order created event for email notification workflow
      await ctx.eventBus.emit({
        type: 'order.created',
        data: { orderId: record.id, customerEmail: record.customerEmail },
      });
    },
  },
  aiMetadata: {
    description: 'Customer orders with line items, pricing breakdown, payment status, and fulfillment tracking',
    sensitiveFields: ['shippingAddress'],
  },
});

// ============ WORKFLOWS ============

export const OrderConfirmationWorkflow = defineWorkflow({
  name: 'order-confirmation',
  version: '1.0.0',
  entity: 'Order',
  trigger: { type: 'record.created' },
  steps: [
    {
      type: 'condition',
      if: { field: 'paymentStatus', operator: '==', value: 'paid' },
      then: [
        { type: 'set_field', field: 'status', value: 'confirmed' },
        {
          type: 'send_notification',
          to: '$customerEmail',
          template: 'order_confirmation_email',
        },
        {
          type: 'custom',
          handler: 'reserve_inventory',
        },
      ],
    },
    {
      type: 'condition',
      if: { field: 'paymentStatus', operator: '!=', value: 'paid' },
      then: [
        { type: 'set_field', field: 'status', value: 'pending' },
        {
          type: 'send_notification',
          to: '$customerEmail',
          template: 'order_pending_payment',
        },
      ],
    },
  ],
  onError: 'continue',
  maxRetries: 2,
});

export const InventoryManagementWorkflow = defineWorkflow({
  name: 'inventory-management',
  version: '1.0.0',
  entity: 'Product',
  trigger: { type: 'field_changed', field: 'stockQuantity' },
  steps: [
    {
      type: 'condition',
      if: { field: 'isLowStock', operator: '==', value: true },
      then: [
        {
          type: 'send_notification',
          to: 'inventory_manager',
          template: 'low_stock_alert',
        },
        {
          type: 'custom',
          handler: 'create_purchase_order',
        },
      ],
    },
  ],
  onError: 'continue',
});

export const ShippingNotificationWorkflow = defineWorkflow({
  name: 'shipping-notification',
  version: '1.0.0',
  entity: 'Order',
  trigger: { type: 'field_changed', field: 'status', to: 'shipped' },
  steps: [
    {
      type: 'send_notification',
      to: '$customerEmail',
      template: 'order_shipped_notification',
    },
    {
      type: 'condition',
      if: { field: 'trackingNumber', operator: '!=', value: null },
      then: [
        {
          type: 'send_notification',
          to: '$customerEmail',
          template: 'tracking_number_email',
        },
      ],
    },
  ],
  onError: 'continue',
});

// ============ POLICIES ============

export const CustomerProductViewPolicy = definePolicy({
  name: 'customer-product-view',
  entity: 'Product',
  actions: ['read'],
  conditions: [
    // Customers can only see active products
    { field: 'isActive', operator: '==', value: true },
  ],
  roles: ['customer'],
  deny: false,
});

export const CustomerOrderViewPolicy = definePolicy({
  name: 'customer-order-view',
  entity: 'Order',
  actions: ['read'],
  conditions: [
    // Customers can only see their own orders
    { field: 'customerId', operator: '==', value: '$userId' },
  ],
  roles: ['customer'],
  deny: false,
});

export const AdminInventoryEditPolicy = definePolicy({
  name: 'admin-inventory-edit',
  entity: 'Product',
  actions: ['write', 'update'],
  roles: ['admin', 'inventory_manager'],
  deny: false,
});

// ============ VIEWS ============

export const ProductStorefrontView = defineView({
  name: 'products-storefront',
  entity: 'Product',
  type: 'grid',
  label: 'Shop Products',
  isDefault: true,
  config: {
    columns: [
      { field: 'image', label: '', type: 'image', width: 80 },
      { field: 'name', label: 'Product', sortable: true, filterable: true },
      { field: 'category', label: 'Category', sortable: true, filterable: true },
      { field: 'displayPrice', label: 'Price' },
      { field: 'ratings', label: 'Rating', type: 'number' },
      { field: 'availableQuantity', label: 'In Stock' },
    ],
    filters: [
      { field: 'isActive', operator: '==', value: true },
      { field: 'availableQuantity', operator: '>', value: 0 },
    ],
    sortBy: [{ field: 'ratings', order: 'desc' }],
  },
});

export const OrderAdminView = defineView({
  name: 'orders-admin',
  entity: 'Order',
  type: 'table',
  label: 'Orders Management',
  config: {
    columns: [
      { field: 'orderNumber', label: 'Order #', sortable: true, filterable: true },
      { field: 'customerName', label: 'Customer', sortable: true },
      { field: 'total', label: 'Total', type: 'currency' },
      { field: 'status', label: 'Status', sortable: true, filterable: true },
      { field: 'paymentStatus', label: 'Payment', filterable: true },
      { field: 'createdAt', label: 'Date', type: 'date', sortable: true },
      { field: 'trackingNumber', label: 'Tracking' },
    ],
    pageSize: 50,
  },
});

export const OrdersDashboard = defineView({
  name: 'orders-dashboard',
  entity: 'Order',
  type: 'dashboard',
  label: 'Orders Dashboard',
  config: {
    widgets: [
      {
        type: 'counter',
        field: 'id',
        aggregation: 'count',
        label: 'Total Orders',
        filter: { status: { $ne: 'cancelled' } },
      },
      {
        type: 'counter',
        field: 'total',
        aggregation: 'sum',
        label: 'Total Revenue',
        filter: { paymentStatus: 'paid' },
      },
      {
        type: 'chart',
        chartType: 'pie',
        field: 'status',
        aggregation: 'count',
        label: 'Orders by Status',
      },
      {
        type: 'chart',
        chartType: 'line',
        field: 'createdAt',
        aggregation: 'sum:total',
        timeInterval: 'day',
        label: 'Daily Revenue Trend',
      },
    ],
  },
});

// ============ MODULE DEFINITION ============

export const ECommerceModule = defineModule({
  name: 'ecommerce',
  version: '2.0.0',
  description: 'Complete e-commerce platform with product catalog, shopping cart, orders, and fulfillment',
  depends: ['base'],

  entities: [ProductEntity, OrderEntity],

  workflows: [
    OrderConfirmationWorkflow,
    InventoryManagementWorkflow,
    ShippingNotificationWorkflow,
  ],

  views: [
    ProductStorefrontView,
    OrderAdminView,
    OrdersDashboard,
  ],

  permissions: [
    'ecommerce.products.read',
    'ecommerce.products.write',
    'ecommerce.orders.read',
    'ecommerce.orders.write',
    'ecommerce.inventory.manage',
  ],

  hooks: {
    onInstall: async (db) => {
      console.log('Installing e-commerce module...');
    },
    onLoad: async () => {
      console.log('E-Commerce module loaded');
    },
  },

  frontend: {
    routes: [
      { path: '/shop', component: 'StorefrontPage' },
      { path: '/orders', component: 'OrdersPage' },
    ],
    menu: [
      { label: 'Shop', path: '/shop', icon: 'shopping-bag' },
      { label: 'My Orders', path: '/orders', icon: 'package' },
    ],
  },
});

export default ECommerceModule;
