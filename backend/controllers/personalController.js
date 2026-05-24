const { getPool } = require('../config/db');

// 1. Obtener todos los trabajadores y entrenadores
async function getPersonal(req, res) {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM personal ORDER BY activo DESC, nombre ASC, apellido ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. Registrar un nuevo trabajador
async function createPersonal(req, res) {
  try {
    const { cedula, nombre, apellido, cargo, telefono, email, sueldo, activo, fecha_contratacion } = req.body;

    if (!cedula || !nombre || !apellido) {
      return res.status(400).json({ error: 'Cédula, nombre y apellido son obligatorios.' });
    }

    const db = getPool();

    // Verificar si la cédula ya existe
    const [existing] = await db.query('SELECT id FROM personal WHERE cedula = ?', [cedula]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'La cédula ingresada ya está registrada para otro trabajador.' });
    }

    await db.query(
      `INSERT INTO personal (cedula, nombre, apellido, cargo, telefono, email, sueldo, activo, fecha_contratacion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cedula,
        nombre,
        apellido,
        cargo || 'Entrenador',
        telefono || null,
        email || null,
        parseFloat(sueldo || 0.00),
        activo === undefined ? 1 : (activo ? 1 : 0),
        fecha_contratacion || null
      ]
    );

    res.status(201).json({ success: true, message: 'Miembro del personal registrado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3. Actualizar datos de un trabajador
async function updatePersonal(req, res) {
  try {
    const { id } = req.params;
    const { cedula, nombre, apellido, cargo, telefono, email, sueldo, activo, fecha_contratacion } = req.body;

    if (!cedula || !nombre || !apellido) {
      return res.status(400).json({ error: 'Cédula, nombre y apellido son obligatorios.' });
    }

    const db = getPool();

    // Verificar si la cédula ya existe en otro registro
    const [existing] = await db.query('SELECT id FROM personal WHERE cedula = ? AND id != ?', [cedula, id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'La cédula ingresada ya está asignada a otro trabajador.' });
    }

    await db.query(
      `UPDATE personal 
       SET cedula = ?, nombre = ?, apellido = ?, cargo = ?, telefono = ?, email = ?, sueldo = ?, activo = ?, fecha_contratacion = ? 
       WHERE id = ?`,
      [
        cedula,
        nombre,
        apellido,
        cargo || 'Entrenador',
        telefono || null,
        email || null,
        parseFloat(sueldo || 0.00),
        activo ? 1 : 0,
        fecha_contratacion || null,
        id
      ]
    );

    res.json({ success: true, message: 'Registro de personal actualizado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. Eliminar un registro de personal
async function deletePersonal(req, res) {
  try {
    const { id } = req.params;
    const db = getPool();
    await db.query('DELETE FROM personal WHERE id = ?', [id]);
    res.json({ success: true, message: 'Miembro del personal eliminado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getPersonal,
  createPersonal,
  updatePersonal,
  deletePersonal
};
