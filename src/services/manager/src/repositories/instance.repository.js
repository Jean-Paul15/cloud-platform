/**
 * Repository Instances - Point d'entree unifie
 * Reexporte toutes les fonctions des modules specialises
 */

const crud = require('./instance.crud');
const mutations = require('./instance.mutations');

module.exports = {
  // CRUD
  createInstance: crud.create,
  findInstanceById: crud.findById,
  findInstancesByUserId: crud.findByUserId,
  findInstancesByProjectId: crud.findByProjectId,

  // Mutations
  updateInstance: mutations.update,
  deleteInstance: mutations.remove,
  deleteInstancesByProjectId: mutations.removeByProjectId,
  getClusterStatus: mutations.getClusterStatus
};
