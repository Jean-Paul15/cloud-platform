/**
 * Service d'Authentification
 * Orchestre les opérations d'auth (register, login, refresh, logout)
 */

const userRepo = require('../repositories/user.repository');
const tokenRepo = require('../repositories/token.repository');
const tokenService = require('./token.service');
const { hashPassword, verifyPassword } = require('./password.service');
const logger = require('../utils/logger');

/**
 * Inscription d'un utilisateur
 */
const register = async (email, password) => {
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    const error = new Error('Cet email est déjà utilisé');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepo.create({ email, passwordHash, role: 'DEVELOPER' });

  const accessToken = tokenService.generateAccessToken(user);
  const { token, expiresAt } = tokenService.generateRefreshToken();
  await tokenRepo.create({ userId: user.id, token, expiresAt });

  logger.info(`[Auth] Inscription: ${email}`);
  return { user, accessToken, refreshToken: token };
};

/**
 * Connexion d'un utilisateur
 */
const login = async (email, password) => {
  const user = await userRepo.findByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    const error = new Error('Email ou mot de passe incorrect');
    error.statusCode = 401;
    throw error;
  }

  const accessToken = tokenService.generateAccessToken(user);
  const { token, expiresAt } = tokenService.generateRefreshToken();
  await tokenRepo.create({ userId: user.id, token, expiresAt });

  delete user.passwordHash;
  logger.info(`[Auth] Connexion: ${email}`);
  return { user, accessToken, refreshToken: token };
};

/**
 * Rafraîchir les tokens
 */
const refresh = async (refreshToken) => {
  const stored = await tokenRepo.findByToken(refreshToken);
  if (!stored || new Date() > stored.expiresAt) {
    if (stored) await tokenRepo.deleteByToken(refreshToken);
    const error = new Error('Refresh token invalide ou expiré');
    error.statusCode = 401;
    throw error;
  }

  const user = await userRepo.findById(stored.userId);
  if (!user) {
    const error = new Error('Utilisateur non trouvé');
    error.statusCode = 404;
    throw error;
  }

  await tokenRepo.deleteByToken(refreshToken);
  const accessToken = tokenService.generateAccessToken(user);
  const { token, expiresAt } = tokenService.generateRefreshToken();
  await tokenRepo.create({ userId: user.id, token, expiresAt });

  logger.info(`[Auth] Token rafraîchi: ${user.email}`);
  return { accessToken, refreshToken: token };
};

/**
 * Déconnexion
 */
const logout = async (refreshToken) => {
  await tokenRepo.deleteByToken(refreshToken);
  logger.info('[Auth] Déconnexion');
};

/**
 * Vérifier un access token
 */
const verify = async (token) => {
  const decoded = tokenService.verifyAccessToken(token);
  const user = await userRepo.findById(decoded.userId);
  if (!user) {
    const error = new Error('Utilisateur non trouvé');
    error.statusCode = 404;
    throw error;
  }
  return { userId: user.id, email: user.email, role: user.role };
};

module.exports = { register, login, refresh, logout, verify };
