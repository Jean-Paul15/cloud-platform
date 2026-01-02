/**
 * Service de gestion des Instances
 * Logique metier pour le provisionnement
 */

const instanceRepository = require('../repositories/instance.repository');
const logger = require('../utils/logger');

/**
 * Provisionner une nouvelle instance
 */
const provision = async (name, projectId, userId) => {
  const existing = await instanceRepository.findInstancesByProjectId(projectId);

  if (existing.find(i => i.name === name)) {
    const error = new Error('Instance avec ce nom existe deja');
    error.statusCode = 409;
    throw error;
  }

  const instance = await instanceRepository.createInstance({ name, projectId, userId });
  logger.info(`[InstanceService] Instance provisionnee: ${name}`);
  return instance;
};

/**
 * Lister les instances par projet
 */
const listByProject = async (projectId) => {
  return instanceRepository.findInstancesByProjectId(projectId);
};

/**
 * Lister les instances par utilisateur
 */
const listByUser = async (userId) => {
  return instanceRepository.findInstancesByUserId(userId);
};

/**
 * Obtenir une instance avec verification
 */
const getById = async (instanceId, userId) => {
  const instance = await instanceRepository.findInstanceById(instanceId);

  if (!instance) {
    const error = new Error('Instance non trouvee');
    error.statusCode = 404;
    throw error;
  }

  if (instance.user_id !== userId) {
    const error = new Error('Acces non autorise');
    error.statusCode = 403;
    throw error;
  }

  return instance;
};

/**
 * Mettre a jour une instance
 */
const update = async (instanceId, userId, data) => {
  await getById(instanceId, userId);
  return instanceRepository.updateInstance(instanceId, data);
};

/**
 * Supprimer une instance
 */
const remove = async (instanceId, userId) => {
  await getById(instanceId, userId);
  await instanceRepository.deleteInstance(instanceId);
  logger.info(`[InstanceService] Instance ${instanceId} supprimee`);
  return true;
};

/**
 * Statut du cluster MongoDB
 */
const getClusterStatus = () => instanceRepository.getClusterStatus();

module.exports = { provision, listByProject, listByUser, getById, update, remove, getClusterStatus };
