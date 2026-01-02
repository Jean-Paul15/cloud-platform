/**
 * Repository de base pour MongoDB
 * Fournit getCollection pour réutilisation
 */

const { getDatabase } = require('../config/mongodb');
const logger = require('../utils/logger');

/**
 * Obtenir une collection MongoDB
 * @param {string} collectionName
 * @returns {Promise<Collection>}
 */
const getCollection = async (collectionName) => {
  const db = await getDatabase();
  return db.collection(collectionName);
};

/**
 * Wrapper pour les opérations avec logging
 */
const withLogging = async (operation, context, fn) => {
  try {
    return await fn();
  } catch (error) {
    logger.error(`[${context}] ${operation}: ${error.message}`);
    throw error;
  }
};

module.exports = { getCollection, withLogging };
