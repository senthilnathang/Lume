import prisma from '../db/prisma.js';

export class SecurityService {
    async check_access(user_id, model, operation, record = null) {
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

        if (!user) return false;

        if (user.isAdmin) return true;

        const rolePermissions = user.role?.rolePermissions || [];

        const hasPermission = rolePermissions.some(rp =>
            rp.permission.category === model && (rp.permission.name === operation || rp.permission.name === 'admin')
        );

        if (!hasPermission) return false;

        if (record && this._has_record_restrictions(user, model)) {
            return await this._check_record_access(user, record, model, operation);
        }

        return true;
    }

    _has_record_restrictions(user, model) {
        const rolePermissions = user.role?.rolePermissions || [];
        return rolePermissions.some(rp =>
            rp.permission.category === model && rp.permission.description?.includes('restrict_domain')
        );
    }

    async _check_record_access(user, record, model, operation) {
        const rules = await prisma.recordRule.findMany({
            where: {
                modelName: model,
                active: true,
                OR: [
                    { userId: user.id },
                    { roleId: user.roleId }
                ]
            }
        });

        if (rules.length === 0) return true;

        for (const rule of rules) {
            if (this._matches_domain(record, rule.domain)) {
                return operation === 'read' ? rule.applyRead : rule.applyWrite;
            }
        }

        return false;
    }

    _matches_domain(record, domain) {
        if (!domain || domain.length === 0) return true;

        for (const clause of domain) {
            if (Array.isArray(clause) && clause.length >= 3) {
                const [field, operator, value] = clause;
                const recordValue = record[field];

                if (!this._compare_values(recordValue, operator, value)) {
                    return false;
                }
            }
        }

        return true;
    }

    _compare_values(recordValue, operator, expectedValue) {
        switch (operator) {
            case '=':
                return recordValue === expectedValue;
            case '!=':
                return recordValue !== expectedValue;
            case '>':
                return recordValue > expectedValue;
            case '>=':
                return recordValue >= expectedValue;
            case '<':
                return recordValue < expectedValue;
            case '<=':
                return recordValue <= expectedValue;
            case 'in':
                return Array.isArray(expectedValue) && expectedValue.includes(recordValue);
            case 'not in':
                return Array.isArray(expectedValue) && !expectedValue.includes(recordValue);
            case 'like':
                return String(recordValue).includes(expectedValue);
            default:
                return recordValue === expectedValue;
        }
    }

    async check_ip_restriction(user) {
        if (!user.lastIp) return false;

        // No Profile model in Prisma — IP range restrictions
        // can be enhanced later with a dedicated config model.
        // For now, allow access if user has a lastIp recorded.
        return true;
    }

    _ip_in_ranges(ip, ranges) {
        return ranges.some(range => this._ip_matches_range(ip, range));
    }

    _ip_matches_range(ip, range) {
        const [start, end] = range.split('-');
        if (!end) return ip === start;

        return ip >= start && ip <= end;
    }

    async check_time_restriction(user) {
        // No Profile model in Prisma — time-based restrictions
        // can be enhanced later with a dedicated config model.
        return true;
    }

    async get_user_permissions(user_id) {
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

        const rolePermissions = user.role?.rolePermissions || [];

        return rolePermissions.map(rp => ({
            object: rp.permission.category,
            permission: rp.permission.name
        }));
    }
}

export default SecurityService;
