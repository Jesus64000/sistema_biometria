const { getPool } = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Obtener lista de todos los usuarios
async function getUsers(req, res) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      'SELECT id, username, role, nombre, apellido, gym_sede, created_at FROM usuarios ORDER BY role ASC, username ASC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. Crear un nuevo usuario administrativo
async function createUser(req, res) {
  try {
    const { username, password, role, nombre, apellido, gym_sede } = req.body;

    if (!username || !password || !role || !nombre || !apellido) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (username, password, role, nombre, apellido).' });
    }

    const db = getPool();

    // Verificar si el usuario ya existe
    const [existing] = await db.query('SELECT id FROM usuarios WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
    }

    // Encriptar contraseña
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insertar usuario
    await db.query(
      'INSERT INTO usuarios (username, password, role, nombre, apellido, gym_sede) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, role, nombre, apellido, gym_sede || 'MarianGym']
    );

    res.status(201).json({ success: true, message: 'Usuario administrativo creado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3. Actualizar un usuario administrativo
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { username, password, role, nombre, apellido, gym_sede } = req.body;

    if (!username || !role || !nombre || !apellido) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (username, role, nombre, apellido).' });
    }

    const db = getPool();

    // Verificar si el nombre de usuario ya está tomado por otro ID
    const [existing] = await db.query('SELECT id FROM usuarios WHERE username = ? AND id != ?', [username, id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso por otra cuenta.' });
    }

    let query = 'UPDATE usuarios SET username = ?, role = ?, nombre = ?, apellido = ?, gym_sede = ?';
    let params = [username, role, nombre, apellido, gym_sede || 'MarianGym'];

    // Si se envía una nueva contraseña, la encriptamos y la agregamos al update
    if (password && password.trim() !== '') {
      const hashedPassword = bcrypt.hashSync(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);

    res.json({ success: true, message: 'Usuario administrativo actualizado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. Eliminar un usuario administrativo
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Prevenir que el usuario se elimine a sí mismo
    if (req.user && parseInt(req.user.id) === parseInt(id)) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de usuario activo.' });
    }

    const db = getPool();

    // Prevenir eliminar el último administrador
    const [rows] = await db.query('SELECT COUNT(*) as count FROM usuarios WHERE role = "admin"');
    const [target] = await db.query('SELECT role FROM usuarios WHERE id = ?', [id]);
    
    if (target.length > 0 && target[0].role === 'admin' && rows[0].count <= 1) {
      return res.status(400).json({ error: 'No se puede eliminar la cuenta. Debe existir al menos un usuario administrador en el sistema.' });
    }

    await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ success: true, message: 'Usuario eliminado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
