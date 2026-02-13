/**
 * Base Features Data Services
 */

export class FeaturesDataService {
  constructor(models) {
    this.models = models;
  }

  async getFeatureFlags(userId = null) {
    const flags = await this.models.FeatureFlag.findAll({
      order: [['sequence', 'ASC']]
    });
    
    return flags.map(flag => {
      if (!flag.enabled) return { ...flag.toJSON(), active: false };
      
      if (flag.enabledFor && flag.enabledFor.length > 0) {
        const active = userId && flag.enabledFor.includes(userId);
        return { ...flag.toJSON(), active };
      }
      
      if (flag.disabledFor && flag.disabledFor.includes(userId)) {
        return { ...flag.toJSON(), active: false };
      }
      
      const now = new Date();
      if (flag.expiresAt && new Date(flag.expiresAt) < now) {
        return { ...flag.toJSON(), active: false };
      }
      
      return { ...flag.toJSON(), active: true };
    });
  }

  async isFeatureEnabled(key, userId = null) {
    const flag = await this.models.FeatureFlag.findOne({ where: { key } });
    if (!flag || !flag.enabled) return false;
    
    if (flag.enabledFor && flag.enabledFor.length > 0) {
      return userId && flag.enabledFor.includes(userId);
    }
    
    if (flag.disabledFor && flag.disabledFor.includes(userId)) {
      return false;
    }
    
    const now = new Date();
    if (flag.expiresAt && new Date(flag.expiresAt) < now) {
      return false;
    }
    
    return true;
  }

  async toggleFeature(key, enabled) {
    const flag = await this.models.FeatureFlag.findOne({ where: { key } });
    if (flag) {
      await flag.update({ enabled });
    }
    return flag;
  }

  async createFeature(data) {
    return this.models.FeatureFlag.create(data);
  }

  async updateFeature(id, data) {
    const flag = await this.models.FeatureFlag.findByPk(id);
    if (flag) {
      await flag.update(data);
    }
    return flag;
  }

  async deleteFeature(id) {
    const flag = await this.models.FeatureFlag.findByPk(id);
    if (flag) {
      await flag.destroy();
    }
    return flag;
  }

  async createImport(data) {
    return this.models.DataImport.create(data);
  }

  async updateImportProgress(id, processed, success, failed, errors = []) {
    const imp = await this.models.DataImport.findByPk(id);
    if (imp) {
      await imp.update({
        processedRows: processed,
        successRows: success,
        failedRows: failed,
        errors: errors.slice(0, 100)
      });
    }
    return imp;
  }

  async completeImport(id, status) {
    const imp = await this.models.DataImport.findByPk(id);
    if (imp) {
      await imp.update({ status });
    }
    return imp;
  }

  async getImports(limit = 20) {
    return this.models.DataImport.findAll({
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  async createExport(data) {
    return this.models.DataExport.create(data);
  }

  async completeExport(id, filePath, fileSize, recordCount) {
    const exp = await this.models.DataExport.findByPk(id);
    if (exp) {
      await exp.update({
        status: 'completed',
        filePath,
        fileSize,
        recordCount
      });
    }
    return exp;
  }

  async getExports(limit = 20) {
    return this.models.DataExport.findAll({
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  async createBackup(data) {
    return this.models.Backup.create(data);
  }

  async completeBackup(id, filePath, fileSize) {
    const backup = await this.models.Backup.findByPk(id);
    if (backup) {
      await backup.update({
        status: 'completed',
        filePath,
        fileSize
      });
    }
    return backup;
  }

  async getBackups(limit = 20) {
    return this.models.Backup.findAll({
      order: [['createdAt', 'DESC']],
      limit
    });
  }
}

export default { FeaturesDataService };
