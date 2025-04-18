const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const teamController = require('../controllers/teamController');

// Team routes
router.route('/')
  .post(authMiddleware.authenticateToken, teamController.createTeam)
  .get(authMiddleware.authenticateToken, teamController.getTeams);

// Check if team exists (public route - no auth required)
router.get('/exists/:teamId', teamController.checkTeamExists);

// Keep this BEFORE the route with the ID parameter to avoid conflicts
router.route('/:id')
  .get(authMiddleware.authenticateToken, teamController.getTeamById)
  .put(authMiddleware.authenticateToken, teamController.updateTeam)
  .delete(authMiddleware.authenticateToken, teamController.deleteTeam);

// Member management
router.get('/:id/members', authMiddleware.authenticateToken, teamController.getTeamMembers);
router.post('/:id/members', authMiddleware.authenticateToken, teamController.addMember);
router.delete('/:id/members/:userId', authMiddleware.authenticateToken, teamController.removeMember);

// Role management
router.put('/:id/members/:userId/role', authMiddleware.authenticateToken, teamController.changeRole);
router.put('/:id/transfer-ownership', authMiddleware.authenticateToken, teamController.transferOwnership);

module.exports = router;