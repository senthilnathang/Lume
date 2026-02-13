import { useDB } from '../utils/db';
import { initializeModules } from '../modules/_loader';
import type { ModuleDefinition } from '../modules/_types';

// Core module definitions
import baseModule from '../modules/base/index';
import notificationModule from '../modules/notification/index';
import baseSecurityModule from '../modules/base_security/index';
import baseAutomationModule from '../modules/base_automation/index';
import baseCustomizationModule from '../modules/base_customization/index';

// HRMS & Business modules — uncomment when ready
// import hrmsBaseModule from '../modules/hrms_base/index';
// import employeeModule from '../modules/employee/index';
// import leaveModule from '../modules/leave/index';
// import attendanceModule from '../modules/attendance/index';
// import payrollModule from '../modules/payroll/index';
// import onboardingModule from '../modules/onboarding/index';
// import offboardingModule from '../modules/offboarding/index';
// import trainingModule from '../modules/training/index';
// import recruitmentModule from '../modules/recruitment/index';
// import pmsModule from '../modules/pms/index';
// import quizModule from '../modules/quiz/index';

/**
 * All module definitions — order doesn't matter, the loader resolves dependencies.
 */
const allModules: ModuleDefinition[] = [
  baseModule,
  notificationModule,
  baseSecurityModule,
  baseAutomationModule,
  baseCustomizationModule,
];

export default defineNitroPlugin(async (nitroApp) => {
  console.log('[Lume] Initializing module system...');

  try {
    const sequelize = useDB();
    await initializeModules(sequelize, allModules);

    // Sync module tables in development
    if (process.env.NODE_ENV === 'development') {
      // Sync only new module tables (don't alter existing)
      for (const mod of allModules) {
        if (mod.initModels) {
          // Models are already initialized; tables will be created by sequelize.sync()
        }
      }
    }

    console.log('[Lume] Module system initialized');
  } catch (error) {
    console.error('[Lume] Failed to initialize module system:', error);
  }
});
