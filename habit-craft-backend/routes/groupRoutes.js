const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    createGroup, 
    getMyGroups, 
    searchUsers, 
    addMember, 
    getGroupLeaderboard 
} = require('../controllers/groupController');
const { deleteGroup, removeMember } = require('../controllers/groupController');

// All group routes must be protected
router.use(protect);

router.get('/search', searchUsers); // Must be above /:id
router.route('/').post(createGroup).get(getMyGroups);
router.post('/:id/members', addMember);
router.get('/:id/leaderboard', getGroupLeaderboard);
router.delete('/:id', deleteGroup);
router.delete('/:id/members/:memberId', removeMember);

module.exports = router;