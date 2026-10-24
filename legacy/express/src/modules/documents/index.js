import DocumentService from './document.service.js';
import documentRoutes from './document.routes.js';
import { documents, documentVersions, documentAccess } from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { DocumentService as DocumentContentService } from './services/document.service.js';
import { DocumentVersioningService } from './services/document-versioning.js';

const documentAdapter = new DrizzleAdapter(documents);
const documentVersionAdapter = new DrizzleAdapter(documentVersions);
const documentAccessAdapter = new DrizzleAdapter(documentAccess);

export {
  DocumentService,
  DocumentContentService,
  DocumentVersioningService,
  documentRoutes,
  documentAdapter,
  documentVersionAdapter,
  documentAccessAdapter,
  documents,
  documentVersions,
  documentAccess
};

export default {
  DocumentService,
  DocumentContentService,
  DocumentVersioningService,
  documentRoutes,
  documentAdapter,
  documentVersionAdapter,
  documentAccessAdapter,
  documents,
  documentVersions,
  documentAccess
};
