const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

const { verifyToken } = require('../controllers/authController');

// Middleware para restringir accesos exclusivos a administradores
function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido. Se requieren privilegios de Administrador.' });
  }
  next();
}

// Rutas de configuración públicas y protegidas
router.get('/', configController.getConfig);
router.put('/', verifyToken, verifyAdmin, configController.updateConfig);
router.post('/sync-bcv', configController.syncBcvRate);

// Rutas de Copias de Seguridad (Backup & Restore) protegidas
router.get('/backup', verifyToken, verifyAdmin, configController.exportBackup);
router.post('/restore', verifyToken, verifyAdmin, configController.importBackup);

module.exports = router;
