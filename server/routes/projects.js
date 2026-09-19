const express = require('express');
const {
  listPublishedProjects,
  getPublishedProjectBySlug,
  listAllProjects,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const administratorOnly = [requireAuth, requireAdmin];

router.get('/', listPublishedProjects);
router.get('/admin/all', ...administratorOnly, listAllProjects);
router.post('/', ...administratorOnly, createProject);
router.patch('/:id', ...administratorOnly, updateProject);
router.delete('/:id', ...administratorOnly, deleteProject);
router.get('/:slug', getPublishedProjectBySlug);

module.exports = router;