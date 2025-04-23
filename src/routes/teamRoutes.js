const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const teamController = require('../controllers/teamController');
// Comment out or remove this line until you create the file:
// const membershipController = require('../controllers/membershipController');

// Team routes
router.route('/')
  .post(authMiddleware.authenticateToken, teamController.createTeam)
  .get(authMiddleware.authenticateToken, teamController.getTeams);

// Search teams - place before the ID routes to avoid conflicts
router.get('/search', authMiddleware.authenticateToken, teamController.searchTeams);

// Check if team exists (public route - no auth required)
router.get('/exists/:teamId', teamController.checkTeamExists);

// Get teams for authenticated user
router.get('/me', authMiddleware.authenticateToken, teamController.getUserTeams);

router.route('/:id')
  .get(authMiddleware.authenticateToken, teamController.getTeamById)
  .put(authMiddleware.authenticateToken, teamController.updateTeam) 
  .delete(authMiddleware.authenticateToken, teamController.deleteTeam);

router.get('/:id/members', authMiddleware.authenticateToken, teamController.getTeamMembers);

router.post('/:id/members', authMiddleware.authenticateToken, teamController.addMember);

router.delete('/:id/members/:userId', authMiddleware.authenticateToken, teamController.removeMember);

// Export the router
module.exports = router;