export class DocumentService {
  constructor(models) {
    this.models = models;
  }

  async createDocument(title, content, userId) {
    // Create initial version
    const version = await this.models.DocumentVersion.create({
      versionNumber: 1,
      content,
      changesSummary: 'Initial version',
      createdBy: userId,
    });

    // Create document
    const document = await this.models.Document.create({
      title,
      content,
      currentVersionId: version.id,
      status: 'draft',
      ownerId: userId,
    });

    return document;
  }

  async createVersion(documentId, content, userId, changesSummary) {
    // Get next version number
    const result = await this.models.DocumentVersion.findAll({
      where: [['documentId', '=', documentId]],
    });
    const versions = result && result.rows ? result.rows : [];
    const nextVersion =
      (versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) : 0) + 1;

    const version = await this.models.DocumentVersion.create({
      documentId,
      versionNumber: nextVersion,
      content,
      changesSummary,
      createdBy: userId,
    });

    // Update document content
    await this.models.Document.update(documentId, {
      content,
      currentVersionId: version.id,
    });

    return version;
  }

  async getVersionHistory(documentId) {
    const result = await this.models.DocumentVersion.findAll({
      where: [['documentId', '=', documentId]],
    });
    const versions = result && result.rows ? result.rows : [];
    return versions.sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async grantAccess(documentId, grantedTo, grantedToType, permission) {
    if (grantedToType === 'USER') {
      return await this.models.DocumentAccess.create({
        documentId,
        grantedToUserId: grantedTo,
        permission,
      });
    } else if (grantedToType === 'ROLE') {
      return await this.models.DocumentAccess.create({
        documentId,
        grantedToRole: grantedTo,
        permission,
      });
    }
  }

  async submitForApproval(documentId, approvalChainId) {
    return await this.models.Document.update(documentId, {
      status: 'pending_approval',
      approvalChainId,
    });
  }

  async publishDocument(documentId, userId) {
    return await this.models.Document.update(documentId, {
      status: 'published',
      publishedAt: new Date(),
    });
  }
}
