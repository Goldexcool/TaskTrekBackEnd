const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const teamController = require('../controllers/teamController');

// Team routes
router.route('/')
  .post(authMiddleware.authenticateToken, teamController.createTeam)
  .get(authMiddleware.authenticateToken, teamController.getTeams);

router.route('/:id')
  .get(authMiddleware.authenticateToken, teamController.getTeamById)
  .put(authMiddleware.authenticateToken, teamController.updateTeam)
  .delete(authMiddleware.authenticateToken, teamController.deleteTeam);

router.post('/:id/members', authMiddleware.authenticateToken, teamController.addMember);

module.exports = router;