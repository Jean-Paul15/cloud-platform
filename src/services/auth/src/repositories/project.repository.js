/**
 * Repository pour les projets
 * CRUD projets PostgreSQL via Prisma
 */

const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Créer un projet
 * @param {Object} data - {userId, name}
 * @returns {Promise<Object>}
 */
const create = async (data) => {
  try {
    return await prisma.project.create({ data });
  } catch (error) {
    logger.error(`[ProjectRepo] Erreur création: ${error.message}`);
    throw error;
  }
};

/**
 * Trouver les projets d'un utilisateur
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const findByUserId = async (userId) => {
  try {
    return await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    logger.error(`[ProjectRepo] Erreur findByUserId: ${error.message}`);
    throw error;
  }
};

/**
 * Trouver par ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
const findById = async (id) => {
  try {
    return await prisma.project.findUnique({ where: { id } });
  } catch (error) {
    logger.error(`[ProjectRepo] Erreur findById: ${error.message}`);
    throw error;
  }
};

/**
 * Supprimer un projet
 * @param {string} id
 */
const deleteById = async (id) => {
  try {
    await prisma.project.delete({ where: { id } });
  } catch (error) {
    logger.error(`[ProjectRepo] Erreur suppression: ${error.message}`);
    throw error;
  }
};

module.exports = { create, findByUserId, findById, deleteById };
