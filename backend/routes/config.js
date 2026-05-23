const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// Rutas de configuración
router.get('/', configController.getConfig);
router.put('/', configController.updateConfig);
router.post('/sync-bcv', configController.syncBcvRate);

module.exports = router;
