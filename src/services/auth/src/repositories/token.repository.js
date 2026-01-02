/**
 * Repository pour les refresh tokens
 * CRUD tokens PostgreSQL via Prisma
 */

const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Créer un refresh token
 * @param {Object} data - {userId, token, expiresAt}
 * @returns {Promise<Object>}
 */
const create = async (data) => {
  try {
    return await prisma.refreshToken.create({ data });
  } catch (error) {
    logger.error(`[TokenRepo] Erreur création: ${error.message}`);
    throw error;
  }
};

/**
 * Trouver par token
 * @param {string} token
 * @returns {Promise<Object|null>}
 */
const findByToken = async (token) => {
  try {
    return await prisma.refreshToken.findUnique({ where: { token } });
  } catch (error) {
    logger.error(`[TokenRepo] Erreur findByToken: ${error.message}`);
    throw error;
  }
};

/**
 * Supprimer un token
 * @param {string} token
 */
const deleteByToken = async (token) => {
  try {
    await prisma.refreshToken.delete({ where: { token } });
  } catch (error) {
    if (error.code !== 'P2025') {
      logger.error(`[TokenRepo] Erreur suppression: ${error.message}`);
      throw error;
    }
  }
};

/**
 * Supprimer tous les tokens d'un utilisateur
 * @param {string} userId
 */
const deleteAllByUserId = async (userId) => {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  } catch (error) {
    logger.error(`[TokenRepo] Erreur deleteAll: ${error.message}`);
    throw error;
  }
};

module.exports = { create, findByToken, deleteByToken, deleteAllByUserId };
