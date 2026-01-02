/**
 * Controller Instances
 * Endpoints: CRUD instances + cluster status
 */

const instanceService = require('../services/instance.service');

/** POST /instances */
const create = async (req, res, next) => {
  try {
    const { name, projectId } = req.body;
    const userId = req.user.userId;
    const instance = await instanceService.provision(name, projectId, userId);
    res.status(201).json({ success: true, message: 'Instance creee', data: instance });
  } catch (error) { next(error); }
};

/** GET /instances */
const list = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const userId = req.user.userId;
    let instances = projectId
      ? (await instanceService.listByProject(projectId)).filter(i => i.user_id === userId)
      : await instanceService.listByUser(userId);
    res.status(200).json({ success: true, count: instances.length, data: instances });
  } catch (error) { next(error); }
};

/** GET /instances/:id */
const getById = async (req, res, next) => {
  try {
    const instance = await instanceService.getById(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: instance });
  } catch (error) { next(error); }
};

/** PATCH /instances/:id */
const update = async (req, res, next) => {
  try {
    const instance = await instanceService.update(req.params.id, req.user.userId, req.body);
    res.status(200).json({ success: true, message: 'Instance mise a jour', data: instance });
  } catch (error) { next(error); }
};

/** DELETE /instances/:id */
const remove = async (req, res, next) => {
  try {
    await instanceService.remove(req.params.id, req.user.userId);
    res.status(200).json({ success: true, message: 'Instance supprimee' });
  } catch (error) { next(error); }
};

/** GET /cluster-status */
const clusterStatus = async (req, res, next) => {
  try {
    const status = await instanceService.getClusterStatus();
    res.status(200).json({ success: true, data: status });
  } catch (error) { next(error); }
};

/** GET /health */
const health = (req, res) => {
  res.status(200).json({
    success: true,
    service: 'manager-service',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
};

module.exports = { create, list, getById, update, remove, clusterStatus, health };
