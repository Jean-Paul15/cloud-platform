/**
 * Routes des instances
 * Endpoints: CRUD instances + cluster status
 */

const { Router } = require('express');
const instanceController = require('../controllers/instance.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createInstanceSchema, updateInstanceSchema } = require('../schemas/instance.schema');

const router = Router();

// Routes publiques
router.get('/health', instanceController.health);
router.get('/cluster-status', instanceController.clusterStatus);

// Routes protégées
router.post('/instances', authenticate, validate(createInstanceSchema), instanceController.create);
router.get('/instances', authenticate, instanceController.list);
router.get('/instances/:id', authenticate, instanceController.getById);
router.patch('/instances/:id', authenticate, validate(updateInstanceSchema), instanceController.update);
router.delete('/instances/:id', authenticate, instanceController.remove);

module.exports = router;
