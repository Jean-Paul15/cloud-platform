/**
 * Routes d'authentification
 * Endpoints: register, login, refresh, logout, verify, health
 */

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const {
  registerSchema,
  loginSchema,
  verifyTokenSchema,
  refreshTokenSchema
} = require('../schemas/auth.schema');

const router = Router();

// Health check
router.get('/health', authController.health);

// Inscription
router.post('/register', validate(registerSchema), authController.register);

// Connexion
router.post('/login', validate(loginSchema), authController.login);

// Rafraîchir token
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// Déconnexion
router.post('/logout', validate(refreshTokenSchema), authController.logout);

// Vérification token
router.post('/verify', validate(verifyTokenSchema), authController.verifyToken);

module.exports = router;
