const express = require('express');
const router = express.Router();
const asistenciasController = require('../controllers/asistenciasController');

// Ruta principal para el historial de accesos
router.get('/', asistenciasController.getAsistencias);

module.exports = router;
