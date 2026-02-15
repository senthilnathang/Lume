import prisma from '../db/prisma.js';

export class RecordRuleService {
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

            if (rule.applyRead && operation === 'read') {
                domain = this._combine_domains(domain, rule_domain, 'or');
            }
            if (rule.applyWrite && operation === 'write') {
                domain = this._combine_domains(domain, rule_domain, 'or');
            }
        }

        return { domain, scope: scope };
    }

    async _get_applicable_rules(user_id, model_name) {
        const user = await prisma.user.findUnique({
            where: { id: user_id },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        if (!user) return [];

        const permissions = user.role?.rolePermissions || [];
        const hasAdmin = permissions.some(rp =>
            rp.permission.category === model_name && rp.permission.name === 'admin'
        );

        if (hasAdmin) return [];

        return await prisma.recordRule.findMany({
            where: {
                modelName: model_name,
                active: true,
                OR: [
                    { scope: 'all' },
                    { userId: user_id },
                    { roleId: user.roleId }
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
        if (!domain || domain.length === 0) return [];

        const conditions = [];

        for (const clause of domain) {
            if (Array.isArray(clause) && clause.length >= 3) {
                const [field, operator, value] = clause;
                conditions.push({ field, operator, value });
            } else if (Array.isArray(clause) && clause.length === 2 && clause[0] === '!') {
                const not_domain = clause[1];
                conditions.push({ not: this.parse_domain(not_domain, model) });
            }
        }

        return conditions;
    }

    _parse_operator(operator, value) {
        return { operator, value };
    }
}

export default RecordRuleService;
