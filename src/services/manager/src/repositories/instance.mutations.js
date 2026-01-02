/**
 * Repository Mutations Instances
 * Opérations: update, delete, deleteByProject
 */

const { getCollection, withLogging } = require('./base.repository');
const logger = require('../utils/logger');

const COLLECTION = 'instances';
const CONTEXT = 'InstanceRepo';

/**
 * Mettre à jour une instance
 */
const update = async (id, data) => {
  return withLogging('update', CONTEXT, async () => {
    const collection = await getCollection(COLLECTION);

    const updateData = { ...data, updated_at: new Date() };

    const result = await collection.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      const error = new Error('Instance non trouvée');
      error.statusCode = 404;
      throw error;
    }

    logger.info(`[${CONTEXT}] Instance mise à jour: ${id}`);
    return result.value;
  });
};

/**
 * Supprimer une instance
 */
const remove = async (id) => {
  return withLogging('remove', CONTEXT, async () => {
    const collection = await getCollection(COLLECTION);
    const result = await collection.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      const error = new Error('Instance non trouvée');
      error.statusCode = 404;
      throw error;
    }

    logger.info(`[${CONTEXT}] Instance supprimée: ${id}`);
    return true;
  });
};

/**
 * Supprimer toutes les instances d'un projet
 */
const removeByProjectId = async (projectId) => {
  return withLogging('removeByProjectId', CONTEXT, async () => {
    const collection = await getCollection(COLLECTION);
    const result = await collection.deleteMany({ project_id: projectId });
    logger.info(`[${CONTEXT}] ${result.deletedCount} instances supprimées pour projet ${projectId}`);
    return result.deletedCount;
  });
};

/**
 * Obtenir le statut du cluster
 */
const getClusterStatus = async () => {
  return withLogging('getClusterStatus', CONTEXT, async () => {
    const { getDatabase } = require('../config/mongodb');
    const db = await getDatabase();
    const admin = db.admin();
    const status = await admin.serverStatus();
    return {
      shardingEnabled: !!status.sharding,
      version: status.version,
      uptime: status.uptime
    };
  });
};

module.exports = { update, remove, removeByProjectId, getClusterStatus };
