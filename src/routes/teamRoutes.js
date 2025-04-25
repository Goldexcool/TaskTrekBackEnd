const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const teamController = require('../controllers/teamController');

router.route('/')
  .post(authMiddleware.authenticateToken, teamController.createTeam)
  .get(authMiddleware.authenticateToken, teamController.getTeams);

router.get('/search', authMiddleware.authenticateToken, teamController.searchTeams);

router.get('/exists/:teamId', teamController.checkTeamExists);

router.get('/me', authMiddleware.authenticateToken, teamController.getUserTeams);

router.route('/:id')
  .get(authMiddleware.authenticateToken, teamController.getTeamById)
  .put(authMiddleware.authenticateToken, teamController.updateTeam) 
  .delete(authMiddleware.authenticateToken, teamController.deleteTeam);

router.get('/:id/members', authMiddleware.authenticateToken, teamController.getTeamMembers);

router.post('/:id/members', authMiddleware.authenticateToken, teamController.addMember);

router.delete('/:id/members/:userId', authMiddleware.authenticateToken, teamController.removeMember);

module.exports = router;