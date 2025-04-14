const express = require('express');
const router = express.Router();
const { 
  getTeams, 
  getTeamById, 
  createTeam, 
  updateTeam, 
  deleteTeam,
  addMember,
  removeMember
} = require('../controllers/teamController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Protect all team routes
router.use(authenticateToken);

// Team routes
router.get('/', getTeams);
router.get('/:id', getTeamById);
router.post('/', createTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;