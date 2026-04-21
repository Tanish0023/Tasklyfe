const express = require('express');
const router = express.Router();

// 💡 Safe Middleware Import (Taaki crash na ho)
const authMiddleware = require('../middleware/authMiddleware'); 
const protectRoute = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware.auth || authMiddleware;

// Import all controllers, including the new getGlobalTasks
const {
  getGlobalTasks,
  getTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
} = require('../controllers/taskController');

// 🚨 CRITICAL ORDER: Specific routes ('/global/all') MUST come before dynamic routes ('/:workspaceId')

// ✅ Naya Global Tasks Route (Dashboard ke liye)
router.get('/global/all', protectRoute, getGlobalTasks);

// 📋 Workspace Specific Routes
router.get('/:workspaceId', protectRoute, getTasks);
router.post('/', protectRoute, createTask);
router.put('/:id', protectRoute, updateTask);
router.put('/:id/status', protectRoute, updateTaskStatus);
router.delete('/:id', protectRoute, deleteTask);

module.exports = router;