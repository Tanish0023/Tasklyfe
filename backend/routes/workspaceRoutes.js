const express = require('express');
const router = express.Router();

// 💡 Middleware Import (For JWT verification)
const authMiddleware = require('../middleware/authMiddleware'); 
// Fallback logic incase your middleware function is named differently
const protectRoute = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware.auth || authMiddleware;

// Import all controllers, including the new Activity Radar functions
const {
  globalSearch,
  getUserWorkspaces,
  createWorkspace,
  getWorkspaceById,
  addMember,
  updateMemberRole,
  removeMember,
  deleteWorkspace,
  addManualFile,
  deleteFile,
  addNotice,
  deleteNotice,
  getGlobalActivities, 
  logActivity,
  deleteActivity,      // ✅ NAYA: Single activity delete karne ke liye
  clearAllActivities   // ✅ NAYA: Pura radar saaf karne ke liye
} = require('../controllers/workspaceController');

// 🚨 CRITICAL ORDER: Static routes MUST come before dynamic routes ('/:id')

// 🔍 Global Search Route (Command Palette ke liye)
router.get('/search', protectRoute, globalSearch);

// 🔔 Global Activity Radar Routes (NAYA SECTION - MUST BE HERE)
router.get('/activities/global', protectRoute, getGlobalActivities);
router.delete('/activities/global/clear', protectRoute, clearAllActivities); // ✅ NAYA ROUTE: Clear All

// 📋 Basic Workspace Routes
router.get('/', protectRoute, getUserWorkspaces);
router.post('/', protectRoute, createWorkspace);

// 📂 Specific Workspace Routes (Requires ID)
router.get('/:id', protectRoute, getWorkspaceById);
router.delete('/:id', protectRoute, deleteWorkspace);

// 👥 Workspace Members Routes (Admin controls)
router.post('/:id/members', protectRoute, addMember);
router.put('/:id/members/:memberId', protectRoute, updateMemberRole);
router.delete('/:id/members/:memberId', protectRoute, removeMember);

// 📁 Workspace Files/Resources Routes 
router.post('/:id/files', protectRoute, addManualFile);
router.delete('/:id/files/:fileId', protectRoute, deleteFile); 

// 📢 Notice Board Routes 
router.post('/:id/notices', protectRoute, addNotice);
router.delete('/:id/notices/:noticeId', protectRoute, deleteNotice);

// 🔔 Workspace Specific Activity Routes
router.post('/:id/activities', protectRoute, logActivity);
router.delete('/:id/activities/:activityId', protectRoute, deleteActivity); // ✅ NAYA ROUTE: Delete Single

module.exports = router;