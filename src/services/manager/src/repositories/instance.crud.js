/**
 * Repository CRUD Instances
 * Opérations de base: create, findById, findByUserId
 */

const { v4: uuidv4 } = require('uuid');
const { getCollection, withLogging } = require('./base.repository');
const logger = require('../utils/logger');

const COLLECTION = 'instances';
const CONTEXT = 'InstanceRepo';

/**
 * Créer une nouvelle instance
 */
const create = async (data) => {
  return withLogging('create', CONTEXT, async () => {
    const collection = await getCollection(COLLECTION);

    const instance = {
      _id: uuidv4(),
      project_id: data.projectId,
      user_id: data.userId,
      name: data.name,
      status: 'RUNNING',
      connection_string: `mongodb://mongo-router:27017/userdata_${uuidv4()}`,
      created_at: new Date(),
      updated_at: new Date()
    };

    await collection.insertOne(instance);
    logger.info(`[${CONTEXT}] Instance créée: ${instance._id}`);
    return instance;
  });
};

/**
 * Trouver une instance par ID
 */
const findById = async (id) => {
  return withLogging('findById', CONTEXT, async () => {
    const collection = await getCollection(COLLECTION);
    return collection.findOne({ _id: id });
  });
};

/**
 * Trouver les instances d'un utilisateur
 */
const findByUserId = async (userId) => {
  return withLogging('findByUserId', CONTEXT, async () => {
    const collection = await getCollection(COLLECTION);
    return collection.find({ user_id: userId }).toArray();
  });
};

/**
 * Trouver les instances d'un projet
 */
const findByProjectId = async (projectId) => {
  return withLogging('findByProjectId', CONTEXT, async () => {
    const collection = await getCollection(COLLECTION);
    return collection.find({ project_id: projectId }).toArray();
  });
};

module.exports = { create, findById, findByUserId, findByProjectId };
