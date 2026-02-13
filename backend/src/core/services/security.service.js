const { Op } = require('sequelize');

class SecurityService {
    constructor(db) {
        this._db = db;
    }

    async check_access(user_id, model, operation, record = null) {
        const { User, Profile, Permission, ProfilePermission, RecordRule } = this._db.models;

        const user = await User.findByPk(user_id, {
            include: [
                { model: Profile, include: [ProfilePermission] }
            ]
        });

        if (!user) return false;

        if (user.is_admin) return true;

        const profilePermissions = user.Profile?.ProfilePermissions || [];

        const hasPermission = profilePermissions.some(p =>
            p.object === model && (p.permission === operation || p.permission === 'admin')
        );

        if (!hasPermission) return false;

        if (record && this._has_record_restrictions(user, model)) {
            return await this._check_record_access(user, record, model, operation);
        }

        return true;
    }

    _has_record_restrictions(user, model) {
        return user.Profile?.ProfilePermissions?.some(p =>
            p.object === model && p.restrict_domain
        );
    }

    async _check_record_access(user, record, model, operation) {
        const { RecordRule } = this._db.models;

        const rules = await RecordRule.findAll({
            where: {
                model_name: model,
                active: true,
                [Op.or]: [
                    { user_id: user.id },
                    { role_id: user.role_id }
                ]
            }
        });

        if (rules.length === 0) return true;

        for (const rule of rules) {
            if (this._matches_domain(record, rule.domain)) {
                return operation === 'read' ? rule.apply_read : rule.apply_write;
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
        const { Profile } = this._db.models;

        if (!user.Profile?.login_ip_ranges?.length) return true;

        const clientIp = user.last_ip;
        if (!clientIp) return false;

        const ipRanges = user.Profile.login_ip_ranges;
        return this._ip_in_ranges(clientIp, ipRanges);
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
        const { Profile } = this._db.models;

        if (!user.Profile?.login_hours_start) return true;

        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const startTime = user.Profile.login_hours_start;
        const endTime = user.Profile.login_hours_end;

        if (!endTime) return true;

        return currentTime >= startTime && currentTime <= endTime;
    }

    async get_user_permissions(user_id) {
        const { User, Profile, ProfilePermission } = this._db.models;

        const user = await User.findByPk(user_id, {
            include: [
                {
                    model: Profile,
                    include: [ProfilePermission]
                }
            ]
        });

        if (!user) return [];

        const permissions = user.Profile?.ProfilePermissions || [];

        return permissions.map(p => ({
            object: p.object,
            permission: p.permission
        }));
    }
}

module.exports = { SecurityService };
