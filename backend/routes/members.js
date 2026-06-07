const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// Rutas de socios
router.get('/', memberController.getMembers);
router.post('/', memberController.createMember);
router.get('/:id/stats', memberController.getMemberStats);
router.get('/:id', memberController.getMemberById);
router.put('/:id/status', memberController.updateMemberStatus);
router.put('/:id', memberController.updateMember);
router.delete('/:id', memberController.deleteMember);

module.exports = router;
