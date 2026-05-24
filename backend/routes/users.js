const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../controllers/authController');

// Middleware para restringir accesos exclusivos a administradores
function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido. Se requieren privilegios de Administrador.' });
  }
  next();
}

// Rutas de administración de usuarios protegidas por Token y Rol Admin
router.use(verifyToken);
router.use(verifyAdmin);

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
