/**
 * Middleware d'authentification
 * Vérifie le JWT en appelant le service auth
 */

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Middleware d'authentification JWT
 * Vérifie le token via le auth-service
 */
const authenticate = async (req, res, next) => {
  try {
    // Récupérer le token de l'header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Token manquant ou format invalide');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(' ')[1];

    // Vérifier le token via le auth-service
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://dbaas-auth:3000';
    
    const response = await axios.post(`${AUTH_SERVICE_URL}/verify`, {
      token
    }, {
      timeout: 5000
    });

    if (!response.data.success) {
      const error = new Error('Token invalide');
      error.statusCode = 401;
      throw error;
    }

    // Attacher les données de l'utilisateur à la requête
    req.user = response.data.data;

    logger.info(`[Auth] Utilisateur authentifié: ${req.user.email}`);

    next();
  } catch (error) {
    // Erreurs axios (appel au auth-service)
    if (error.response) {
      const err = new Error(error.response.data.message || 'Authentification échouée');
      err.statusCode = error.response.status;
      return next(err);
    }

    // Erreur de timeout
    if (error.code === 'ECONNABORTED') {
      const err = new Error('Service d\'authentification indisponible');
      err.statusCode = 503;
      return next(err);
    }

    next(error);
  }
};

module.exports = authenticate;
