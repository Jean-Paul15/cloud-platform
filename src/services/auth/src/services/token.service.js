/**
 * Service de gestion des tokens JWT
 * Génération et vérification des access/refresh tokens
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtConfig = require('../config/jwt');

/**
 * Générer un access token JWT
 * @param {Object} user - {id, email, role}
 * @returns {string}
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.accessTokenExpiration,
      issuer: jwtConfig.issuer,
      algorithm: jwtConfig.algorithm
    }
  );
};

/**
 * Générer un refresh token aléatoire
 * @returns {{token: string, expiresAt: Date}}
 */
const generateRefreshToken = () => {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours
  return { token, expiresAt };
};

/**
 * Vérifier et décoder un access token
 * @param {string} token
 * @returns {Object} - Payload décodé
 * @throws {Error} - Si token invalide ou expiré
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret, { issuer: jwtConfig.issuer });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Token expiré');
      err.statusCode = 401;
      throw err;
    }
    const err = new Error('Token invalide');
    err.statusCode = 401;
    throw err;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken
};
