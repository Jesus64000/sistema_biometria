const { getPool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tesis_luis_ramos_biometria_2026_cabimas';

// 1. Registro de usuarios administrativos
async function register(req, res) {
  try {
    const { username, password, role, nombre, apellido, gym_sede } = req.body;

    if (!username || !password || !nombre || !apellido) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (username, password, nombre, apellido).' });
    }

    const db = getPool();

    // Verificar si el usuario ya existe
    const [existing] = await db.query('SELECT id FROM usuarios WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
    }

    // Encriptar contraseña
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insertar en base de datos
    await db.query(
      'INSERT INTO usuarios (username, password, role, nombre, apellido, gym_sede) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, role || 'recepcionista', nombre, apellido, gym_sede || 'ExtremoGym']
    );

    res.status(201).json({
      success: true,
      message: 'Usuario administrativo registrado exitosamente.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. Inicio de Sesión (Login)
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan credenciales.' });
    }

    const db = getPool();

    // Buscar usuario en base de datos
    const [rows] = await db.query('SELECT * FROM usuarios WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const user = rows[0];

    // Verificar contraseña
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Generar Token JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        gym_sede: user.gym_sede
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nombre: user.nombre,
        apellido: user.apellido,
        gym_sede: user.gym_sede
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3. Obtener el perfil del usuario activo (Validando Token)
async function getProfile(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Token de autorización ausente.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token de autorización con formato incorrecto.' });
    }

    // Verificar token
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Token de autorización inválido o vencido.' });
      }

      const db = getPool();
      const [rows] = await db.query(
        'SELECT id, username, role, nombre, apellido, gym_sede, created_at FROM usuarios WHERE id = ?',
        [decoded.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      res.json(rows[0]);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Middleware para proteger rutas REST API
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado. Token ausente.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Formato de token inválido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token vencido o inválido.' });
    }
    req.user = decoded; // Adjuntar datos desencriptados del usuario
    next();
  });
}

module.exports = {
  register,
  login,
  getProfile,
  verifyToken
};
