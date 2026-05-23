const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Rutas de estadísticas y analíticas
router.get('/stats', dashboardController.getStats);
router.get('/hours', dashboardController.getHourDistribution);
router.get('/recent', dashboardController.getRecentCheckins);
router.get('/analytics', dashboardController.getAnalytics);

module.exports = router;
