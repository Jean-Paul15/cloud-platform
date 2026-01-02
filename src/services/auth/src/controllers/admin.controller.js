// Contrôleur Admin - Gestion complète de la plateforme
const prisma = require('../config/database');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

// ==================== GESTION DES UTILISATEURS ====================

/**
 * GET /admin/users
 * Liste tous les utilisateurs
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            refreshTokens: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    logger.info(`[Admin] Liste de ${users.length} utilisateurs récupérée par ${req.user.email}`);

    res.json({
      success: true,
      data: {
        users,
        total: users.length
      }
    });
  } catch (error) {
    logger.error('[Admin] Erreur récupération utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * GET /admin/users/:id
 * Détails complets d'un utilisateur
 */
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            projects: true,
            refreshTokens: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Masquer le hash du mot de passe
    delete user.passwordHash;

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('[Admin] Erreur récupération détails utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * PATCH /admin/users/:id/role
 * Changer le rôle d'un utilisateur
 */
const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validation
    if (!['ADMIN', 'DEVELOPER', 'VIEWER'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide. Valeurs acceptées: ADMIN, DEVELOPER, VIEWER'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });

    logger.info(`[Admin] Rôle de ${user.email} changé en ${role} par ${req.user.email}`);

    res.json({
      success: true,
      message: `Rôle mis à jour en ${role}`,
      data: { user }
    });
  } catch (error) {
    logger.error('[Admin] Erreur changement de rôle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * PATCH /admin/users/:id/reset-password
 * Réinitialiser le mot de passe d'un utilisateur
 */
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Validation
    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 12 caractères'
      });
    }

    // Hash du nouveau mot de passe
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const user = await prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: {
        id: true,
        email: true
      }
    });

    // Révoquer tous les refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: id }
    });

    logger.warn(`[Admin] Mot de passe réinitialisé pour ${user.email} par ${req.user.email}`);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé. Tous les tokens ont été révoqués.',
      data: { userId: user.id, email: user.email }
    });
  } catch (error) {
    logger.error('[Admin] Erreur réinitialisation mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * DELETE /admin/users/:id
 * Supprimer un utilisateur (cascade: projets, tokens)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier qu'on ne se supprime pas soi-même
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Récupérer les infos avant suppression
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        email: true,
        _count: {
          select: {
            projects: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Supprimer (cascade automatique via Prisma)
    await prisma.user.delete({
      where: { id }
    });

    logger.warn(`[Admin] Utilisateur ${user.email} supprimé par ${req.user.email} (${user._count.projects} projets supprimés)`);

    res.json({
      success: true,
      message: `Utilisateur ${user.email} supprimé avec succès`,
      data: {
        deletedProjects: user._count.projects
      }
    });
  } catch (error) {
    logger.error('[Admin] Erreur suppression utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ==================== GESTION DES PROJETS ====================

/**
 * GET /admin/projects
 * Liste tous les projets de tous les utilisateurs
 */
const getAllProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    logger.info(`[Admin] Liste de ${projects.length} projets récupérée par ${req.user.email}`);

    res.json({
      success: true,
      data: {
        projects,
        total: projects.length
      }
    });
  } catch (error) {
    logger.error('[Admin] Erreur récupération projets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * DELETE /admin/projects/:id
 * Supprimer n'importe quel projet
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    await prisma.project.delete({
      where: { id }
    });

    logger.warn(`[Admin] Projet "${project.name}" de ${project.user.email} supprimé par ${req.user.email}`);

    res.json({
      success: true,
      message: `Projet "${project.name}" supprimé avec succès`
    });
  } catch (error) {
    logger.error('[Admin] Erreur suppression projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ==================== STATISTIQUES ====================

/**
 * GET /admin/stats
 * Statistiques globales de la plateforme
 */
const getGlobalStats = async (req, res) => {
  try {
    // Stats PostgreSQL
    const totalUsers = await prisma.user.count();
    const totalProjects = await prisma.project.count();
    const totalAdmins = await prisma.user.count({
      where: { role: 'ADMIN' }
    });
    const totalDevelopers = await prisma.user.count({
      where: { role: 'DEVELOPER' }
    });
    const totalViewers = await prisma.user.count({
      where: { role: 'VIEWER' }
    });

    // Utilisateurs récents (7 derniers jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    const recentProjects = await prisma.project.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    logger.info(`[Admin] Statistiques globales consultées par ${req.user.email}`);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: {
            admins: totalAdmins,
            developers: totalDevelopers,
            viewers: totalViewers
          },
          recentSignups: recentUsers
        },
        projects: {
          total: totalProjects,
          recentCreations: recentProjects
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('[Admin] Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

module.exports = {
  // Utilisateurs
  getAllUsers,
  getUserDetails,
  changeUserRole,
  resetUserPassword,
  deleteUser,
  // Projets
  getAllProjects,
  deleteProject,
  // Stats
  getGlobalStats
};
