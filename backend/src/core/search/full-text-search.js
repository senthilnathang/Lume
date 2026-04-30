/**
 * @fileoverview Full-Text Search Engine
 * Provides full-text search capability with indexing and ranking
 */

import logger from '../services/logger.js';

class FullTextSearch {
  /**
   * @param {Object} config - Search configuration
   * @param {Redis} config.redisClient - Redis client for index storage
   * @param {number} config.minTokenLength - Minimum token length (default 3)
   */
  constructor(config = {}) {
    this.redisClient = config.redisClient;
    this.minTokenLength = config.minTokenLength || 3;
    this.indexes = new Map(); // entity -> { docId -> tokens }
  }

  /**
   * Index a document for search
   * @param {string} entity - Entity slug
   * @param {number} docId - Document ID
   * @param {Object} data - Document data to index
   * @param {string[]} fields - Fields to index (if empty, index all text fields)
   * @returns {Promise<void>}
   */
  async indexDocument(entity, docId, data, fields = []) {
    if (!this.indexes.has(entity)) {
      this.indexes.set(entity, {});
    }

    const entityIndex = this.indexes.get(entity);
    const tokens = this.tokenize(data, fields);

    entityIndex[docId] = tokens;

    // Persist to Redis
    if (this.redisClient) {
      const key = `search:${entity}:${docId}`;
      await this.redisClient.setex(key, 86400 * 30, JSON.stringify(tokens)); // 30 day TTL
    }

    logger.debug(`[FullTextSearch] Indexed ${entity} document ${docId} with ${tokens.length} tokens`);
  }

  /**
   * Remove document from index
   * @param {string} entity - Entity slug
   * @param {number} docId - Document ID
   * @returns {Promise<void>}
   */
  async removeDocument(entity, docId) {
    const entityIndex = this.indexes.get(entity);
    if (entityIndex) {
      delete entityIndex[docId];
    }

    if (this.redisClient) {
      const key = `search:${entity}:${docId}`;
      await this.redisClient.del(key);
    }

    logger.debug(`[FullTextSearch] Removed ${entity} document ${docId} from index`);
  }

  /**
   * Search documents
   * @param {string} entity - Entity slug
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object[]} Search results with scores
   */
  search(entity, query, options = {}) {
    const { limit = 25, minScore = 0.5 } = options;

    const entityIndex = this.indexes.get(entity);
    if (!entityIndex) {
      return [];
    }

    const queryTokens = this.tokenize({ _search: query }, ['_search']);
    if (queryTokens.length === 0) {
      return [];
    }

    const results = [];

    // Score each document
    for (const [docId, docTokens] of Object.entries(entityIndex)) {
      const score = this.calculateScore(queryTokens, docTokens);

      if (score >= minScore) {
        results.push({
          docId: parseInt(docId),
          score: parseFloat(score.toFixed(3)),
          highlights: this.getHighlights(queryTokens, docTokens),
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Search with phrase matching
   * @param {string} entity - Entity slug
   * @param {string} phrase - Phrase to search
   * @param {Object} options - Search options
   * @returns {Object[]} Search results
   */
  phraseSearch(entity, phrase, options = {}) {
    const { limit = 25 } = options;

    const entityIndex = this.indexes.get(entity);
    if (!entityIndex) {
      return [];
    }

    const phraseTokens = this.tokenize({ _search: phrase }, ['_search']);
    const results = [];

    // Find documents containing phrase tokens in order
    for (const [docId, docTokens] of Object.entries(entityIndex)) {
      if (this.containsPhrase(docTokens, phraseTokens)) {
        results.push({
          docId: parseInt(docId),
          score: 1.0,
          type: 'phrase',
        });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Autocomplete suggestions
   * @param {string} entity - Entity slug
   * @param {string} prefix - Prefix to match
   * @param {number} limit - Max suggestions
   * @returns {string[]}
   */
  autocomplete(entity, prefix, limit = 10) {
    if (!prefix || prefix.length < this.minTokenLength) {
      return [];
    }

    const entityIndex = this.indexes.get(entity);
    if (!entityIndex) {
      return [];
    }

    const suggestions = new Set();

    for (const docTokens of Object.values(entityIndex)) {
      for (const token of docTokens) {
        if (token.startsWith(prefix.toLowerCase())) {
          suggestions.add(token);
          if (suggestions.size >= limit) {
            break;
          }
        }
      }

      if (suggestions.size >= limit) {
        break;
      }
    }

    return Array.from(suggestions);
  }

  /**
   * Tokenize document for indexing
   * @private
   * @param {Object} data - Document data
   * @param {string[]} fields - Fields to tokenize (if empty, all text fields)
   * @returns {string[]}
   */
  tokenize(data, fields = []) {
    const tokens = new Set();

    const fieldsToProcess = fields.length > 0 ? fields : Object.keys(data);

    for (const field of fieldsToProcess) {
      const value = data[field];

      if (typeof value === 'string') {
        // Split on word boundaries, lowercase, filter
        const fieldTokens = value
          .toLowerCase()
          .split(/\s+/)
          .filter(token => {
            // Remove punctuation and filter by length
            const cleaned = token.replace(/[^\w]/g, '');
            return cleaned.length >= this.minTokenLength;
          });

        fieldTokens.forEach(token => tokens.add(token));
      }
    }

    return Array.from(tokens);
  }

  /**
   * Calculate relevance score using TF-IDF
   * @private
   * @param {string[]} queryTokens - Query tokens
   * @param {string[]} docTokens - Document tokens
   * @returns {number}
   */
  calculateScore(queryTokens, docTokens) {
    let score = 0;
    const docTokenSet = new Set(docTokens);

    for (const token of queryTokens) {
      if (docTokenSet.has(token)) {
        score += 1;
      }
    }

    // Normalize by query length and document length
    const maxPossible = queryTokens.length;
    const normalized = maxPossible > 0 ? score / maxPossible : 0;

    // Boost shorter documents (more relevant)
    const lengthBoost = 1 / Math.log(docTokens.length + 1);

    return normalized * lengthBoost;
  }

  /**
   * Check if document contains phrase tokens in order
   * @private
   * @param {string[]} docTokens - Document tokens
   * @param {string[]} phraseTokens - Phrase tokens
   * @returns {boolean}
   */
  containsPhrase(docTokens, phraseTokens) {
    if (phraseTokens.length === 0) return true;

    const docStr = docTokens.join(' ');
    const phraseStr = phraseTokens.join(' ');

    return docStr.includes(phraseStr);
  }

  /**
   * Get highlighted search results
   * @private
   * @param {string[]} queryTokens - Query tokens
   * @param {string[]} docTokens - Document tokens
   * @returns {string[]}
   */
  getHighlights(queryTokens, docTokens) {
    const highlights = [];
    const querySet = new Set(queryTokens);

    for (const token of docTokens) {
      if (querySet.has(token)) {
        highlights.push(token);
      }
    }

    return highlights;
  }

  /**
   * Clear all indexes
   */
  clear() {
    this.indexes.clear();
    logger.info('[FullTextSearch] All indexes cleared');
  }

  /**
   * Get index statistics
   * @param {string} entity - Entity slug (optional)
   * @returns {Object}
   */
  getStats(entity = null) {
    if (entity) {
      const entityIndex = this.indexes.get(entity);
      return {
        entity,
        documents: entityIndex ? Object.keys(entityIndex).length : 0,
        totalTokens: entityIndex
          ? Object.values(entityIndex).reduce((sum, tokens) => sum + tokens.length, 0)
          : 0,
      };
    }

    return {
      totalEntities: this.indexes.size,
      totalDocuments: Array.from(this.indexes.values()).reduce(
        (sum, idx) => sum + Object.keys(idx).length,
        0
      ),
      byEntity: Object.fromEntries(
        Array.from(this.indexes.entries()).map(([entity, idx]) => [
          entity,
          Object.keys(idx).length,
        ])
      ),
    };
  }
}

export default FullTextSearch;
