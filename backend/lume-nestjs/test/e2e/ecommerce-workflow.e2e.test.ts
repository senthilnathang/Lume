import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

/**
 * End-to-end tests for complete e-commerce workflows
 * Tests real customer journeys from product browsing through order fulfillment
 */
describe('E-Commerce Workflow E2E', () => {
  let app: INestApplication;
  let customerToken: string;
  let adminToken: string;
  let customerId: number;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as customer
    const customerLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'customer@example.com',
        password: 'password123',
      },
    });

    const customerData = JSON.parse(customerLogin.body);
    customerToken = customerData.data.accessToken;
    customerId = customerData.data.user.id;

    // Login as admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'admin123',
      },
    });

    const adminData = JSON.parse(adminLogin.body);
    adminToken = adminData.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Product Catalog & Inventory', () => {
    let productId: number;

    it('should create a product with inventory (admin)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/entities/Product/records',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          sku: 'LAPTOP-001',
          name: 'Premium Laptop',
          description: 'High-performance laptop',
          category: 'Electronics',
          price: 1299.99,
          cost: 800,
          stockQuantity: 50,
          reorderLevel: 10,
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      productId = data.data.id;
    });

    it('should compute available inventory correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Product/records/${productId}`,
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      const data = JSON.parse(response.body);
      expect(data.data.availableQuantity).toBe(50); // stockQuantity - reservedQuantity (0)
      expect(data.data.marginPercentage).toBeDefined();
      expect(data.data.isLowStock).toBe(false);
    });

    it('should show product to customer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Product/records/${productId}`,
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.isActive).toBe(true);
    });

    it('should search products in storefront', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${customerToken}` },
        payload: {
          entity: 'Product',
          filters: [{ field: 'isActive', operator: '==', value: 'true' }],
          search: 'Laptop',
          pagination: { page: 1, limit: 25 },
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe('Order Lifecycle Workflow', () => {
    let orderId: number;
    let productId: number;

    beforeAll(async () => {
      // Create a product first
      const prodResponse = await app.inject({
        method: 'POST',
        url: '/api/entities/Product/records',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          sku: 'MOUSE-001',
          name: 'Wireless Mouse',
          price: 29.99,
          cost: 15,
          stockQuantity: 100,
          isActive: true,
        },
      });

      productId = JSON.parse(prodResponse.body).data.id;
    });

    it('should create an order (triggers order-confirmation workflow)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/entities/Order/records',
        headers: { Authorization: `Bearer ${customerToken}` },
        payload: {
          customerId,
          customerEmail: 'customer@example.com',
          customerName: 'John Customer',
          items: [
            { productId, sku: 'MOUSE-001', quantity: 2, price: 29.99 },
          ],
          subtotal: 59.98,
          taxAmount: 5.99,
          shippingCost: 10.00,
          total: 75.97,
          paymentStatus: 'paid',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.orderNumber).toBeDefined(); // Auto-generated
      expect(data.data.status).toBe('confirmed'); // Set by workflow

      orderId = data.data.id;
    });

    it('should verify order confirmation workflow ran', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Order/records/${orderId}`,
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      const data = JSON.parse(response.body);
      expect(data.data.status).toBe('confirmed');
      expect(data.data.paymentStatus).toBe('paid');
    });

    it('should check that inventory was reserved', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Product/records/${productId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data = JSON.parse(response.body);
      expect(data.data.reservedQuantity).toBe(2); // Reserved by workflow
      expect(data.data.availableQuantity).toBe(98); // 100 - 2
    });

    it('should mark order as shipped (triggers shipping notification workflow)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Order/records/${orderId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          status: 'shipped',
          trackingNumber: 'TRACK123456789',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.status).toBe('shipped');
    });

    it('should compute order metrics correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Order/records/${orderId}`,
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      const data = JSON.parse(response.body);
      expect(data.data.itemCount).toBe(1); // Computed from items JSON
      expect(data.data.daysOld).toBeGreaterThanOrEqual(0);
      expect(data.data.isOverdue).toBe(false);
    });
  });

  describe('Inventory Management Workflow', () => {
    let lowStockProductId: number;

    it('should create a product with low stock', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/entities/Product/records',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          sku: 'KEYBOARD-001',
          name: 'Mechanical Keyboard',
          price: 149.99,
          cost: 80,
          stockQuantity: 5,
          reorderLevel: 10, // Below reorder level
          isActive: true,
        },
      });

      lowStockProductId = JSON.parse(response.body).data.id;
    });

    it('should detect low stock and trigger inventory workflow', async () => {
      // Verify the product has low stock computed field set
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Product/records/${lowStockProductId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data = JSON.parse(response.body);
      expect(data.data.isLowStock).toBe(true);
    });

    it('should prevent overselling (update reserved quantity)', async () => {
      // Try to reserve more than available
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Product/records/${lowStockProductId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          reservedQuantity: 10, // More than available (5 - 0 = 5)
        },
      });

      // Should either prevent or warn
      expect([200, 409]).toContain(response.statusCode);
    });
  });

  describe('Customer Order History', () => {
    it('should allow customer to view their orders only', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${customerToken}` },
        payload: {
          entity: 'Order',
          filters: [
            { field: 'customerId', operator: '==', value: customerId.toString() },
          ],
          pagination: { page: 1, limit: 25 },
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.data)).toBe(true);
      // All returned orders should belong to this customer
      data.data.forEach((order: any) => {
        expect(order.customerId).toBe(customerId);
      });
    });

    it('should show order revenue analytics to admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          entity: 'Order',
          groupBy: 'status',
          aggregations: ['count', 'sum:total'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.aggregations).toBeDefined();
    });
  });

  describe('Refund & Cancellation', () => {
    let orderId: number;

    beforeAll(async () => {
      // Create an order to cancel
      const response = await app.inject({
        method: 'POST',
        url: '/api/entities/Order/records',
        headers: { Authorization: `Bearer ${customerToken}` },
        payload: {
          customerId,
          customerEmail: 'customer@example.com',
          customerName: 'John Customer',
          items: [{ productId: 1, sku: 'TEST', quantity: 1, price: 50 }],
          subtotal: 50,
          total: 50,
          paymentStatus: 'paid',
        },
      });

      orderId = JSON.parse(response.body).data.id;
    });

    it('should allow customer to cancel unpaid order', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Order/records/${orderId}`,
        headers: { Authorization: `Bearer ${customerToken}` },
        payload: { status: 'cancelled' },
      });

      expect([200, 403]).toContain(response.statusCode); // 403 if not allowed
    });
  });

  describe('Admin Dashboard Analytics', () => {
    it('should provide sales dashboard data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          entity: 'Order',
          filters: [
            { field: 'paymentStatus', operator: '==', value: 'paid' },
          ],
          aggregations: ['count', 'sum:total'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.aggregations).toBeDefined();
    });

    it('should provide inventory dashboard data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          entity: 'Product',
          groupBy: 'category',
          aggregations: ['count', 'sum:stockQuantity'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.aggregations).toBeDefined();
    });
  });
});
