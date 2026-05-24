const express = require('express');
const router = express.Router();
const personalController = require('../controllers/personalController');
const { verifyToken } = require('../controllers/authController');

// Middleware para restringir escrituras exclusivas a administradores
function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido. Se requieren privilegios de Administrador para realizar esta acción.' });
  }
  next();
}

// Todas las rutas de personal requieren estar autenticado
router.use(verifyToken);

// Listar personal (Disponible para admin y recepcionista)
router.get('/', personalController.getPersonal);

// Modificar personal (Exclusivo para admin)
router.post('/', verifyAdmin, personalController.createPersonal);
router.put('/:id', verifyAdmin, personalController.updatePersonal);
router.delete('/:id', verifyAdmin, personalController.deletePersonal);

module.exports = router;
