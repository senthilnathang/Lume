/**
 * @fileoverview File Storage Manager
 * Handles file uploads, downloads, and storage management
 */

import logger from '../services/logger.js';
import crypto from 'crypto';

class FileStorage {
  /**
   * @param {Object} config - Storage configuration
   * @param {string} config.storagePath - Base storage directory
   * @param {number} config.maxFileSize - Max file size in bytes (default 50MB)
   * @param {string[]} config.allowedMimes - Allowed MIME types
   * @param {Object} config.storage - Storage backend (fs, s3, etc.)
   */
  constructor(config = {}) {
    this.storagePath = config.storagePath || './storage';
    this.maxFileSize = config.maxFileSize || 52428800; // 50MB
    this.allowedMimes = config.allowedMimes || [];
    this.storage = config.storage; // Injected backend
    this.files = new Map(); // fileId -> FileMetadata
  }

  /**
   * Upload a file
   * @param {Object} file - File object { buffer, originalname, mimetype, size }
   * @param {Object} options - Upload options
   * @param {string} options.entity - Entity slug for organization
   * @param {number} options.recordId - Record ID for linking
   * @param {string} options.userId - User ID for ownership
   * @returns {Promise<Object>} File metadata
   */
  async upload(file, options = {}) {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate file ID and path
    const fileId = this.generateFileId();
    const path = this.buildFilePath(fileId, options.entity, file.originalname);

    // Create metadata
    const metadata = {
      id: fileId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      entity: options.entity || 'general',
      recordId: options.recordId || null,
      userId: options.userId,
      uploadedAt: new Date(),
      path,
      hash: this.hashFile(file.buffer),
    };

    // Store file
    if (this.storage) {
      await this.storage.save(path, file.buffer);
    }

    // Save metadata
    this.files.set(fileId, metadata);

    logger.info(`[FileStorage] File uploaded: ${fileId} (${file.originalname})`);

    return metadata;
  }

  /**
   * Download a file
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} File data { buffer, metadata }
   */
  async download(fileId) {
    const metadata = this.files.get(fileId);
    if (!metadata) {
      throw new Error(`File not found: ${fileId}`);
    }

    if (this.storage) {
      const buffer = await this.storage.read(metadata.path);
      return { buffer, metadata };
    }

    throw new Error('Storage backend not configured');
  }

  /**
   * Delete a file
   * @param {string} fileId - File ID
   * @returns {Promise<void>}
   */
  async delete(fileId) {
    const metadata = this.files.get(fileId);
    if (!metadata) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Delete from storage
    if (this.storage) {
      await this.storage.delete(metadata.path);
    }

    // Remove metadata
    this.files.delete(fileId);

    logger.info(`[FileStorage] File deleted: ${fileId}`);
  }

  /**
   * Get file metadata
   * @param {string} fileId - File ID
   * @returns {Object} File metadata
   */
  getMetadata(fileId) {
    return this.files.get(fileId);
  }

  /**
   * List files for entity/record
   * @param {string} entity - Entity slug
   * @param {number} recordId - Record ID (optional)
   * @returns {Object[]} Array of file metadata
   */
  listFiles(entity, recordId = null) {
    const results = [];

    for (const metadata of this.files.values()) {
      if (metadata.entity === entity) {
        if (recordId === null || metadata.recordId === recordId) {
          results.push(metadata);
        }
      }
    }

    return results;
  }

  /**
   * Get storage statistics
   * @returns {Object}
   */
  getStats() {
    let totalSize = 0;
    const byMimeType = {};

    for (const metadata of this.files.values()) {
      totalSize += metadata.size;

      if (!byMimeType[metadata.mimeType]) {
        byMimeType[metadata.mimeType] = { count: 0, size: 0 };
      }

      byMimeType[metadata.mimeType].count++;
      byMimeType[metadata.mimeType].size += metadata.size;
    }

    return {
      totalFiles: this.files.size,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      byMimeType,
    };
  }

  /**
   * Generate unique file ID
   * @private
   * @returns {string}
   */
  generateFileId() {
    return `file_${crypto.randomBytes(12).toString('hex')}_${Date.now()}`;
  }

  /**
   * Build file path
   * @private
   * @param {string} fileId - File ID
   * @param {string} entity - Entity slug
   * @param {string} filename - Original filename
   * @returns {string}
   */
  buildFilePath(fileId, entity, filename) {
    const ext = filename.split('.').pop();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    return `${this.storagePath}/${entity}/${year}/${month}/${fileId}.${ext}`;
  }

  /**
   * Validate file before upload
   * @private
   * @param {Object} file - File object
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateFile(file) {
    // Check size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File too large (${file.size} > ${this.maxFileSize})`,
      };
    }

    // Check MIME type
    if (this.allowedMimes.length > 0 && !this.allowedMimes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type not allowed: ${file.mimetype}`,
      };
    }

    // Check filename
    if (!file.originalname) {
      return {
        valid: false,
        error: 'Filename required',
      };
    }

    return { valid: true };
  }

  /**
   * Hash file for integrity checking
   * @private
   * @param {Buffer} buffer - File buffer
   * @returns {string}
   */
  hashFile(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verify file integrity
   * @param {string} fileId - File ID
   * @param {Buffer} buffer - File buffer
   * @returns {boolean}
   */
  verifyIntegrity(fileId, buffer) {
    const metadata = this.files.get(fileId);
    if (!metadata) {
      return false;
    }

    const hash = this.hashFile(buffer);
    return hash === metadata.hash;
  }

  /**
   * Clear all files
   */
  clear() {
    this.files.clear();
    logger.info('[FileStorage] All files cleared');
  }
}

export default FileStorage;
