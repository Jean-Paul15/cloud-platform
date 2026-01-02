/**
 * Middleware de vérification du rôle Admin
 *
 * Vérifie que l'utilisateur authentifié a le rôle ADMIN
 * À utiliser après authMiddleware
 */

const logger = require('../utils/logger');

/**
 * Middleware pour restreindre l'accès aux administrateurs uniquement
 * @param {Object} req - Request object (doit contenir req.user défini par authMiddleware)
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
const adminOnly = (req, res, next) => {
  // Vérifier que l'utilisateur est authentifié (devrait l'être via authMiddleware)
  if (!req.user) {
    logger.warn('[Admin] Tentative d\'accès sans authentification');
    return res.status(401).json({
      success: false,
      message: 'Authentification requise'
    });
  }

  // Vérifier que l'utilisateur a le rôle ADMIN
  if (req.user.role !== 'ADMIN') {
    logger.warn(`[Admin] Accès refusé pour ${req.user.email} (rôle: ${req.user.role})`);
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Rôle administrateur requis.'
    });
  }

  // L'utilisateur est bien admin, on continue
  logger.info(`[Admin] Accès autorisé pour ${req.user.email}`);
  next();
};

module.exports = { adminOnly };
