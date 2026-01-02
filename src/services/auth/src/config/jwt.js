/**
 * Configuration JWT pour les tokens d'authentification
 * Utilise les variables d'environnement pour les secrets
 */

module.exports = {
  // Secret pour signer les JWT (DOIT être en variable d'environnement)
  secret: process.env.JWT_SECRET,
  
  // Durée de vie du token d'accès (15 minutes)
  accessTokenExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  
  // Durée de vie du refresh token (7 jours)
  refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  
  // Algorithme de chiffrement
  algorithm: 'HS256',
  
  // Issuer du token
  issuer: 'dbaas-auth-service'
};
