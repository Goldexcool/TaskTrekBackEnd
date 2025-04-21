const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const teamController = require('../controllers/teamController');
const membershipController = require('../controllers/membershipController');

// Team routes
router.route('/')
  .post(authMiddleware.authenticateToken, teamController.createTeam)
  .get(authMiddleware.authenticateToken, teamController.getTeams);

// Search teams - place before the ID routes to avoid conflicts
router.get('/search', authMiddleware.authenticateToken, teamController.searchTeams);

// Check if team exists (public route - no auth required)
router.get('/exists/:teamId', teamController.checkTeamExists);

// Team CRUD operations
router.route('/:id')
  .get(authMiddleware.authenticateToken, teamController.getTeamById)
  .put(authMiddleware.authenticateToken, teamController.updateTeam)
  .delete(authMiddleware.authenticateToken, teamController.deleteTeam);

// Member management - use either teamController.addMember OR membershipController.addTeamMembers, not both
router.get('/:id/members', authMiddleware.authenticateToken, teamController.getTeamMembers);
router.post('/:id/members', authMiddleware.authenticateToken, membershipController.addTeamMembers);  // Use the enhanced version
router.delete('/:id/members/:userId', authMiddleware.authenticateToken, teamController.removeMember);

// Role management
router.put('/:id/members/:userId/role', authMiddleware.authenticateToken, teamController.changeRole);
router.put('/:id/transfer-ownership', authMiddleware.authenticateToken, teamController.transferOwnership);

module.exports = router;