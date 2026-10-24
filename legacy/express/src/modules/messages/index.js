import MessageService from './message.service.js';
import messageRoutes from './message.routes.js';
import { messages } from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';

const messageAdapter = new DrizzleAdapter(messages);

export {
  MessageService,
  messageRoutes,
  messageAdapter,
  messages
};

export default {
  MessageService,
  messageRoutes,
  messageAdapter,
  messages
};
