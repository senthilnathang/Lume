import MediaService from './media.service.js';
import mediaRoutes from './media.routes.js';
import { mediaLibrary } from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';

const mediaAdapter = new DrizzleAdapter(mediaLibrary);

export {
  MediaService,
  mediaRoutes,
  mediaAdapter,
  mediaLibrary
};

export default {
  MediaService,
  mediaRoutes,
  mediaAdapter,
  mediaLibrary
};
