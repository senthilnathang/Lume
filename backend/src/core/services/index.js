const { CRUDMixin } = require('./crud.mixin');
const { HookRegistry, registry, before_create, after_create, before_update, after_update, before_delete, after_delete, onchange, constrains } = require('./hooks');
const { RecordRuleService } = require('./record-rule.service');
const { SequenceService } = require('./sequence.service');
const { SecurityService } = require('./security.service');

module.exports = {
    CRUDMixin,
    HookRegistry,
    registry,
    before_create,
    after_create,
    before_update,
    after_update,
    before_delete,
    after_delete,
    onchange,
    constrains,
    RecordRuleService,
    SequenceService,
    SecurityService
};
