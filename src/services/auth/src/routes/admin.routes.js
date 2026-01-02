// Routes Admin - Gestion complète de la plateforme
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/admin.middleware');

// Toutes les routes admin nécessitent authentification + rôle ADMIN
router.use(authMiddleware);
router.use(adminOnly);

// ==================== GESTION DES UTILISATEURS ====================

/**
 * @route   GET /admin/users
 * @desc    Liste tous les utilisateurs
 * @access  Admin
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   GET /admin/users/:id
 * @desc    Détails complets d'un utilisateur
 * @access  Admin
 */
router.get('/users/:id', adminController.getUserDetails);

/**
 * @route   PATCH /admin/users/:id/role
 * @desc    Changer le rôle d'un utilisateur
 * @access  Admin
 * @body    { "role": "ADMIN" | "DEVELOPER" | "VIEWER" }
 */
router.patch('/users/:id/role', adminController.changeUserRole);

/**
 * @route   PATCH /admin/users/:id/reset-password
 * @desc    Réinitialiser le mot de passe d'un utilisateur
 * @access  Admin
 * @body    { "newPassword": "<nouveau_mot_de_passe>" }
 */
router.patch('/users/:id/reset-password', adminController.resetUserPassword);

/**
 * @route   DELETE /admin/users/:id
 * @desc    Supprimer un utilisateur (cascade projets et tokens)
 * @access  Admin
 */
router.delete('/users/:id', adminController.deleteUser);

// ==================== GESTION DES PROJETS ====================

/**
 * @route   GET /admin/projects
 * @desc    Liste tous les projets de tous les utilisateurs
 * @access  Admin
 */
router.get('/projects', adminController.getAllProjects);

/**
 * @route   DELETE /admin/projects/:id
 * @desc    Supprimer n'importe quel projet
 * @access  Admin
 */
router.delete('/projects/:id', adminController.deleteProject);

// ==================== STATISTIQUES ====================

/**
 * @route   GET /admin/stats
 * @desc    Statistiques globales de la plateforme
 * @access  Admin
 */
router.get('/stats', adminController.getGlobalStats);

module.exports = router;
