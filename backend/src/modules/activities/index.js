import ActivityService from './activity.service.js';
import activityRoutes from './activity.routes.js';
import { activities } from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';

const activityAdapter = new DrizzleAdapter(activities);

export {
  ActivityService,
  activityRoutes,
  activityAdapter,
  activities
};

export default {
  ActivityService,
  activityRoutes,
  activityAdapter,
  activities
};
