export class DocumentVersioningService {
  constructor(models) {
    this.models = models;
  }

  async compareVersions(versionId1, versionId2) {
    const v1 = await this.models.DocumentVersion.findById(versionId1);
    const v2 = await this.models.DocumentVersion.findById(versionId2);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    return {
      versionId1,
      versionId2,
      v1Content: v1.content,
      v2Content: v2.content,
      changes: this._getDifferences(v1.content, v2.content),
    };
  }

  async rollbackToVersion(documentId, versionNumber, userId) {
    const result = await this.models.DocumentVersion.findAll({
      where: [
        ['documentId', '=', documentId],
        ['versionNumber', '=', versionNumber],
      ],
    });

    const versions = result && result.rows ? result.rows : [];
    if (versions.length === 0) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    const targetVersion = versions[0];

    // Create new version with rolled-back content
    return await this.models.DocumentVersion.create({
      documentId,
      versionNumber: versionNumber + 1,
      content: targetVersion.content,
      changesSummary: `Rolled back from version ${versionNumber}`,
      createdBy: userId,
    });
  }

  _getDifferences(content1, content2) {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');

    const differences = [];
    const maxLength = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLength; i++) {
      if (lines1[i] !== lines2[i]) {
        differences.push({
          lineNumber: i + 1,
          old: lines1[i] || '',
          new: lines2[i] || '',
        });
      }
    }

    return differences;
  }
}
