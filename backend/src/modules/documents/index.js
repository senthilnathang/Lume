import DocumentService from './document.service.js';
import documentRoutes from './document.routes.js';
import { documents } from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';

const documentAdapter = new DrizzleAdapter(documents);

export {
  DocumentService,
  documentRoutes,
  documentAdapter,
  documents
};

export default {
  DocumentService,
  documentRoutes,
  documentAdapter,
  documents
};
