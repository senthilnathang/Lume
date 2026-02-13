import type { ModuleDefinition } from '../_types';
import { manifest } from './__manifest__';
import { RecordRule } from './models/record-rule.model';
import { Sequence } from './models/sequence.model';
import { ScheduledAction } from './models/scheduled-action.model';
import { ModuleInfo } from './models/module-info.model';

export { RecordRule, Sequence, ScheduledAction, ModuleInfo };

const baseModule: ModuleDefinition = {
  manifest,

  initModels(sequelize) {
    RecordRule.initModel(sequelize);
    Sequence.initModel(sequelize);
    ScheduledAction.initModel(sequelize);
    ModuleInfo.initModel(sequelize);
  },

  setupAssociations() {
    // RecordRule belongs to Company
    // Sequence belongs to Company
    // ScheduledAction belongs to Company
    // (FK references already defined in model init)
  },

  async seedData(sequelize) {
    // Seed default sequences
    const defaults = [
      { name: 'Employee ID', code: 'employee.id', prefix: 'EMP-', padding: 5, step: 1 },
      { name: 'Invoice Number', code: 'invoice.number', prefix: 'INV-{YYYY}{MM}-', padding: 5, step: 1 },
      { name: 'Leave Request', code: 'leave.request', prefix: 'LR-', padding: 6, step: 1 },
      { name: 'Payslip Number', code: 'payslip.number', prefix: 'PS-{YYYY}{MM}-', padding: 5, step: 1 },
      { name: 'Recruitment Job', code: 'recruitment.job', prefix: 'JOB-', padding: 4, step: 1 },
      { name: 'Ticket Number', code: 'helpdesk.ticket', prefix: 'TKT-', padding: 6, step: 1 },
    ];

    for (const seq of defaults) {
      await Sequence.findOrCreate({
        where: { code: seq.code },
        defaults: seq as any,
      });
    }
  },
};

export default baseModule;
