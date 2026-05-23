const express = require('express');
const router = express.Router();
const biometricsController = require('../controllers/biometricsController');

// Rutas de biometría
router.post('/register', biometricsController.registerFace);
router.post('/verify', biometricsController.verifyFace);

module.exports = router;
