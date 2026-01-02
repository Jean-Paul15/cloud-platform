/**
 * Routes des projets
 * Endpoints: POST/GET/DELETE /projects
 */

const { Router } = require('express');
const projectController = require('../controllers/project.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createProjectSchema } = require('../schemas/auth.schema');

const router = Router();

// Toutes les routes projets nécessitent l'authentification
router.use(authenticate);

// Créer un projet
router.post('/', validate(createProjectSchema), projectController.create);

// Lister les projets
router.get('/', projectController.list);

// Supprimer un projet
router.delete('/:id', projectController.remove);

module.exports = router;
