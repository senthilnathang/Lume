const { Op } = require('sequelize');
const { registry } = require('../hooks');

class RecordRuleService {
    constructor(db) {
        this._db = db;
    }

    async apply_rules(user_id, model_name, operation = 'read') {
        const rules = await this._get_applicable_rules(user_id, model_name);

        if (rules.length === 0) {
            return { domain: [], scope: 'all' };
        }

        let domain = [];
        let scope = 'all';

        for (const rule of rules) {
            const rule_domain = typeof rule.domain === 'string' 
                ? JSON.parse(rule.domain) 
                : rule.domain || [];

            if (rule.apply_read && operation === 'read') {
                domain = this._combine_domains(domain, rule_domain, 'or');
            }
            if (rule.apply_write && operation === 'write') {
                domain = this._combine_domains(domain, rule_domain, 'or');
            }
        }

        return { domain, scope: scope };
    }

    async _get_applicable_rules(user_id, model_name) {
        const { RecordRule, User, Profile, ProfilePermission } = this._db.models;

        const user = await User.findByPk(user_id, {
            include: [{ model: Profile, include: [ProfilePermission] }]
        });

        if (!user) return [];

        const profilePermissions = user.Profile?.ProfilePermissions || [];
        const hasAdmin = profilePermissions.some(p => 
            p.object === model_name && p.permission === 'admin'
        );

        if (hasAdmin) return [];

        return await RecordRule.findAll({
            where: {
                model_name,
                active: true,
                [Op.or]: [
                    { scope: 'all' },
                    { user_id },
                    { role_id: user.role_id }
                ]
            }
        });
    }

    _combine_domains(existing, new_domain, operator = 'and') {
        if (!new_domain || new_domain.length === 0) return existing;
        if (!existing || existing.length === 0) return new_domain;

        return [
            ...existing,
            [operator, ...new_domain]
        ];
    }

    parse_domain(domain, model) {
        if (!domain || domain.length === 0) return {};

        const conditions = {};

        for (const clause of domain) {
            if (Array.isArray(clause) && clause.length >= 3) {
                const [field, operator, value] = clause;
                conditions[field] = this._parse_operator(operator, value);
            } else if (Array.isArray(clause) && clause.length === 2 && clause[0] === '!') {
                const not_domain = clause[1];
                Object.assign(conditions, { [Symbol.for('not')]: this.parse_domain(not_domain, model) });
            }
        }

        return conditions;
    }

    _parse_operator(operator, value) {
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
            'contains': Op.contains
        };
        return operators[operator] || Op.eq;
    }
}

module.exports = { RecordRuleService };
