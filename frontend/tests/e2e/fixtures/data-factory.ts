import axios from 'axios';

/**
 * Test Data Factory
 *
 * Provides factory methods to create test data via API.
 * Handles users, pages, menus, forms, and other domain entities.
 */

interface FactoryOptions {
  baseURL?: string;
  authToken?: string;
}

interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: number;
}

interface PageData {
  title: string;
  slug: string;
  content: string;
  status?: 'draft' | 'published';
  authorId?: number;
}

interface MenuData {
  name: string;
  location: string;
  description?: string;
}

interface FormData {
  title: string;
  description?: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    label: string;
  }>;
}

export class DataFactory {
  private client: axios.AxiosInstance;

  constructor(options: FactoryOptions = {}) {
    const baseURL = options.baseURL || 'http://localhost:3001/api';

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(options.authToken && {
          Authorization: `Bearer ${options.authToken}`,
        }),
      },
    });
  }

  /**
   * Create a test user
   */
  async createUser(data: Partial<UserData> = {}): Promise<any> {
    const defaultData: UserData = {
      email: `test-${Date.now()}@example.com`,
      password: 'Test@1234',
      firstName: 'Test',
      lastName: 'User',
      roleId: 2, // Default user role
      ...data,
    };

    try {
      const response = await this.client.post('/users', defaultData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create user:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create a test page with TipTap content
   */
  async createPage(data: Partial<PageData> = {}): Promise<any> {
    const defaultData: PageData = {
      title: `Test Page ${Date.now()}`,
      slug: `test-page-${Date.now()}`,
      content: JSON.stringify(this.createTipTapContent('Test Page Content')),
      status: 'draft',
      ...data,
    };

    try {
      const response = await this.client.post('/website/pages', defaultData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create page:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create a test menu
   */
  async createMenu(data: Partial<MenuData> = {}): Promise<any> {
    const defaultData: MenuData = {
      name: `Test Menu ${Date.now()}`,
      location: `footer`,
      ...data,
    };

    try {
      const response = await this.client.post('/website/menus', defaultData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create menu:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create a test form
   */
  async createForm(data: Partial<FormData> = {}): Promise<any> {
    const defaultData: FormData = {
      title: `Test Form ${Date.now()}`,
      description: 'A test form for E2E testing',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Full Name',
        },
        {
          name: 'email',
          type: 'email',
          required: true,
          label: 'Email Address',
        },
        {
          name: 'message',
          type: 'textarea',
          required: false,
          label: 'Message',
        },
      ],
      ...data,
    };

    try {
      const response = await this.client.post('/website/forms', defaultData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create form:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete a user by ID
   */
  async deleteUser(userId: number): Promise<void> {
    try {
      await this.client.delete(`/users/${userId}`);
    } catch (error: any) {
      console.error('Failed to delete user:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete a page by ID
   */
  async deletePage(pageId: number): Promise<void> {
    try {
      await this.client.delete(`/website/pages/${pageId}`);
    } catch (error: any) {
      console.error('Failed to delete page:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete a menu by ID
   */
  async deleteMenu(menuId: number): Promise<void> {
    try {
      await this.client.delete(`/website/menus/${menuId}`);
    } catch (error: any) {
      console.error('Failed to delete menu:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete a form by ID
   */
  async deleteForm(formId: number): Promise<void> {
    try {
      await this.client.delete(`/website/forms/${formId}`);
    } catch (error: any) {
      console.error('Failed to delete form:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create a basic TipTap document structure
   */
  private createTipTapContent(text: string): object {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text,
            },
          ],
        },
      ],
    };
  }

  /**
   * Update auth token for subsequent requests
   */
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear auth token
   */
  clearAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }
}

/**
 * Singleton instance for use in tests
 */
export const dataFactory = new DataFactory();
