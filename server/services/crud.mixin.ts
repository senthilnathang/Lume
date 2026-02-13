import { Model, ModelStatic, WhereOptions, FindOptions, Op } from 'sequelize';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CrudOptions {
  searchFields?: string[];
  defaultSort?: string;
  defaultOrder?: 'ASC' | 'DESC';
  includes?: any[];
  attributes?: string[];
  companyScoped?: boolean;
}

/**
 * Generic CRUD service mixin.
 * Provides list/get/create/update/delete with pagination, search, and company scoping.
 */
export function createCrudService<T extends Model>(
  model: ModelStatic<T>,
  options: CrudOptions = {},
) {
  const {
    searchFields = ['name'],
    defaultSort = 'created_at',
    defaultOrder = 'DESC',
    includes = [],
    attributes,
    companyScoped = false,
  } = options;

  return {
    /**
     * List records with pagination, search, and filtering.
     */
    async list(params: {
      page?: number;
      pageSize?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      companyId?: number | null;
      filters?: WhereOptions;
    }): Promise<PaginatedResult<T>> {
      const {
        page = 1,
        pageSize = 20,
        search = '',
        sortBy = defaultSort,
        sortOrder = defaultOrder,
        companyId,
        filters = {},
      } = params;

      const where: any = { ...filters };

      // Company scoping
      if (companyScoped && companyId) {
        where.company_id = companyId;
      }

      // Search across configured fields
      if (search && searchFields.length > 0) {
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.like]: `%${search}%` },
        }));
      }

      const findOptions: FindOptions = {
        where,
        order: [[sortBy, sortOrder]],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        include: includes,
      };

      if (attributes) {
        findOptions.attributes = attributes;
      }

      const { count, rows } = await model.findAndCountAll(findOptions);

      return {
        items: rows,
        total: count as number,
        page,
        pageSize,
        totalPages: Math.ceil((count as number) / pageSize),
      };
    },

    /**
     * Get a single record by ID.
     */
    async getById(id: number, include?: any[]): Promise<T | null> {
      return model.findByPk(id, {
        include: include || includes,
        ...(attributes ? { attributes } : {}),
      }) as Promise<T | null>;
    },

    /**
     * Create a new record.
     */
    async create(data: Partial<T['_creationAttributes']>): Promise<T> {
      return model.create(data as any) as Promise<T>;
    },

    /**
     * Update a record by ID.
     */
    async update(id: number, data: Partial<T['_creationAttributes']>): Promise<T | null> {
      const record = await model.findByPk(id);
      if (!record) return null;
      await record.update(data as any);
      return record;
    },

    /**
     * Soft delete a record by ID (sets is_deleted = true).
     */
    async softDelete(id: number, userId?: number): Promise<boolean> {
      const record = await model.findByPk(id);
      if (!record) return false;

      const updateData: any = {
        is_deleted: true,
        deleted_at: new Date(),
      };
      if (userId) {
        updateData.updated_by = userId;
      }

      await record.update(updateData);
      return true;
    },

    /**
     * Hard delete a record by ID.
     */
    async hardDelete(id: number): Promise<boolean> {
      const deleted = await model.destroy({ where: { id } as any });
      return deleted > 0;
    },

    /**
     * Restore a soft-deleted record.
     */
    async restore(id: number): Promise<T | null> {
      const record = await (model as any).scope('withDeleted').findByPk(id);
      if (!record) return null;

      await record.update({
        is_deleted: false,
        deleted_at: null,
      });
      return record;
    },

    /**
     * Count records with optional filters.
     */
    async count(filters?: WhereOptions, companyId?: number | null): Promise<number> {
      const where: any = { ...filters };
      if (companyScoped && companyId) {
        where.company_id = companyId;
      }
      return model.count({ where });
    },

    /**
     * Find one record by criteria.
     */
    async findOne(where: WhereOptions, include?: any[]): Promise<T | null> {
      return model.findOne({
        where,
        include: include || includes,
      }) as Promise<T | null>;
    },

    /**
     * Bulk create records.
     */
    async bulkCreate(records: Partial<T['_creationAttributes']>[]): Promise<T[]> {
      return model.bulkCreate(records as any[]) as Promise<T[]>;
    },
  };
}
