import { Op } from 'sequelize';

export class CRUDMixin {
    constructor(model, db, context = {}) {
        this._model = model;
        this._db = db;
        this._context = context;
        this._soft_delete = true;
        this._audit_enabled = true;
        this._company_scoped = true;
    }

    withContext(kwargs = {}) {
        return new this.constructor(this._model, this._db, { ...this._context, ...kwargs });
    }

    async _apply_soft_delete(query) {
        if (this._soft_delete && this._model.attributesDeletedAt) {
            query.where.deleted_at = null;
        }
        return query;
    }

    async _apply_company_scope(query) {
        if (this._company_scoped && this._context.company_id && this._model.attributesCompanyId) {
            query.where.company_id = this._context.company_id;
        }
        return query;
    }

    async search(options = {}) {
        const {
            page = 1,
            limit = 20,
            order_by = 'created_at',
            order = 'DESC',
            domain = [],
            fields = ['*']
        } = options;

        const query = { where: {}, limit, offset: (page - 1) * limit };

        for (const [field, operator, value] of domain) {
            query.where[field] = { [this._get_operator(operator)]: value };
        }

        await this._apply_soft_delete(query);
        await this._apply_company_scope(query);

        query.order = [[order_by, order]];

        const { count, rows } = await this._model.findAndCountAll(query);
        return { data: rows, total: count, page, limit };
    }

    async search_count(domain = []) {
        const query = { where: {} };
        for (const [field, operator, value] of domain) {
            query.where[field] = { [this._get_operator(operator)]: value };
        }
        await this._apply_soft_delete(query);
        await this._apply_company_scope(query);
        return await this._model.count(query);
    }

    async browse(options = {}) {
        const { domain = [], fields = ['*'], limit = 100 } = options;
        const query = { where: {}, limit };

        for (const [field, operator, value] of domain) {
            query.where[field] = { [this._get_operator(operator)]: value };
        }

        await this._apply_soft_delete(query);
        await this._apply_company_scope(query);

        return await this._model.findAll(query);
    }

    async read(id, options = {}) {
        const query = { where: { id } };
        await this._apply_soft_delete(query);
        await this._apply_company_scope(query);
        return await this._model.findOne(query);
    }

    async create(vals, options = {}) {
        if (this._audit_enabled && this._context.user_id) {
            vals.created_by = this._context.user_id;
        }
        if (this._context.company_id) {
            vals.company_id = this._context.company_id;
        }
        return await this._model.create(vals);
    }

    async write(id, vals, options = {}) {
        if (this._audit_enabled && this._context.user_id) {
            vals.updated_by = this._context.user_id;
        }
        vals.updated_at = new Date();
        await this._model.update(vals, { where: { id } });
        return await this.read(id);
    }

    async unlink(id, options = {}) {
        if (this._soft_delete) {
            return await this.write(id, { deleted_at: new Date() });
        }
        return await this._model.destroy({ where: { id } });
    }

    async delete(id, options = {}) {
        return await this._model.destroy({ where: { id } });
    }

    _get_operator(operator) {
        const operators = {
            '=': Op.eq,
            '!=': Op.ne,
            '>': Op.gt,
            '>=': Op.gte,
            '<': Op.lt,
            '<=': Op.lte,
            'like': Op.like,
            'ilike': Op.like,
            'in': Op.in,
            'not in': Op.notIn,
            'contains': Op.contains,
            'startswith': Op.startsWith,
            'endswith': Op.endsWith
        };
        return operators[operator] || Op.eq;
    }
}

export default CRUDMixin;
