/**
 * Controller des Projets
 * Routes: create, list, delete
 */

const projectRepo = require('../repositories/project.repository');

/** POST /projects */
const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;
    const project = await projectRepo.create({ userId, name });
    res.status(201).json({
      success: true,
      message: 'Projet créé avec succès',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

/** GET /projects */
const list = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const projects = await projectRepo.findByUserId(userId);
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

/** DELETE /projects/:id */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await projectRepo.findById(id);
    if (!project || project.userId !== userId) {
      const error = new Error('Projet non trouvé');
      error.statusCode = 404;
      throw error;
    }

    await projectRepo.deleteById(id);
    res.status(200).json({ success: true, message: 'Projet supprimé' });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, list, remove };
