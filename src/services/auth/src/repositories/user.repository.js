/**
 * Repository pour les utilisateurs
 * CRUD utilisateurs PostgreSQL via Prisma
 */

const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Créer un utilisateur
 * @param {Object} data - {email, passwordHash, role}
 * @returns {Promise<Object>}
 */
const create = async (data) => {
  try {
    return await prisma.user.create({
      data,
      select: { id: true, email: true, role: true, createdAt: true }
    });
  } catch (error) {
    logger.error(`[UserRepo] Erreur création: ${error.message}`);
    throw error;
  }
};

/**
 * Trouver par email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
const findByEmail = async (email) => {
  try {
    return await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    logger.error(`[UserRepo] Erreur findByEmail: ${error.message}`);
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
    return await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, createdAt: true }
    });
  } catch (error) {
    logger.error(`[UserRepo] Erreur findById: ${error.message}`);
    throw error;
  }
};

module.exports = { create, findByEmail, findById };
