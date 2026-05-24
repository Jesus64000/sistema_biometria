const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/setup-status', authController.getSetupStatus);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authController.getProfile);

module.exports = router;
