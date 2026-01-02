/**
 * Controller d'Authentification
 * Routes: register, login, refresh, logout, verify
 */

const authService = require('../services/auth.service');

/** POST /register */
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/** POST /login */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/** POST /refresh */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    res.status(200).json({
      success: true,
      message: 'Token rafraîchi',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/** POST /logout */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.status(200).json({ success: true, message: 'Déconnexion réussie' });
  } catch (error) {
    next(error);
  }
};

/** POST /verify */
const verifyToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await authService.verify(token);
    res.status(200).json({ success: true, message: 'Token valide', data: result });
  } catch (error) {
    next(error);
  }
};

/** GET /health */
const health = (req, res) => {
  res.status(200).json({
    success: true,
    service: 'auth-service',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
};

module.exports = { register, login, refresh, logout, verifyToken, health };
