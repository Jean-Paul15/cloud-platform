/**
 * Middleware de gestion globale des erreurs
 * Catch toutes les erreurs et retourne une réponse standardisée
 */

const logger = require('../utils/logger');

/**
 * Middleware de gestion centralisée des erreurs
 * Doit être le dernier middleware de l'application
 */
const errorHandler = (err, req, res, next) => {
  // Log de l'erreur complète
  logger.error(`[ErrorHandler] ${err.stack || err.message}`);

  // Déterminer le code de statut
  const statusCode = err.statusCode || 500;

  // Structurer la réponse d'erreur
  const errorResponse = {
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Erreurs spécifiques MongoDB
  if (err.code === 11000) {
    errorResponse.message = 'Cette valeur existe déjà';
    return res.status(409).json(errorResponse);
  }

  // Pas de stack trace en production (sécurité)
  if (process.env.NODE_ENV === 'production') {
    delete errorResponse.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
