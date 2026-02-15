import TeamService from './team.service.js';
import teamRoutes from './team.routes.js';
import { teamMembers } from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';

const teamMemberAdapter = new DrizzleAdapter(teamMembers);

export {
  TeamService,
  teamRoutes,
  teamMemberAdapter,
  teamMembers
};

export default {
  TeamService,
  teamRoutes,
  teamMemberAdapter,
  teamMembers
};
