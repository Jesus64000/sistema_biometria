const { getPool } = require('../config/db');
const fs = require('fs');
const path = require('path');

// Helper para guardar imágenes en Base64 en el servidor
function saveBase64Image(base64Data, cedula) {
  try {
    // Limpiar cabecera del base64 (ej: "data:image/jpeg;base64,")
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Formato Base64 inválido');
    }

    const imageBuffer = Buffer.from(matches[2], 'base64');
    const extension = matches[1].split('/')[1] || 'jpg';
    const filename = `socio_${cedula}_${Date.now()}.${extension}`;
    const filePath = path.join(__dirname, '..', 'uploads', filename);

    fs.writeFileSync(filePath, imageBuffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error al guardar imagen Base64:', error.message);
    return null;
  }
}

// 1. Obtener todos los socios con los detalles de sus membresías (opcionalmente filtrados por sede)
async function getMembers(req, res) {
  try {
    const db = getPool();
    
    // Auto-desactivar socios insolventes por más de 3 meses (90 días)
    try {
      await db.query(`
        UPDATE socios s
        INNER JOIN membresias m ON s.id = m.socio_id
        SET s.status = 'inactivo'
        WHERE s.status = 'activo'
          AND m.solvencia = 0
          AND m.fecha_fin < DATE_SUB(NOW(), INTERVAL 3 MONTH)
      `);
    } catch (err) {
      console.warn('⚠️ Error al auto-desactivar socios insolventes:', err.message);
    }

    const { sede } = req.query;
    
    let query = `
      SELECT 
        s.*, 
        m.id as membresia_id, 
        m.tipo as membresia_tipo, 
        m.fecha_inicio as membresia_inicio, 
        m.fecha_fin as membresia_fin, 
        m.solvencia as membresia_solvencia
      FROM socios s
      LEFT JOIN membresias m ON s.id = m.socio_id
    `;
    
    const params = [];
    if (sede) {
      query += ` WHERE s.gym_sede = ?`;
      params.push(sede);
    }
    
    query += ` ORDER BY s.fecha_registro DESC`;
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. Crear un nuevo socio con membresía inicial asignada a la sede activa
async function createMember(req, res) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { cedula, nombre, apellido, telefono, email, foto_base64, tipo_membresia, gym_sede, genero, fecha_nacimiento } = req.body;

    if (!cedula || !nombre || !apellido) {
      return res.status(400).json({ error: 'Cédula, nombre y apellido son campos requeridos.' });
    }

    // Verificar si ya existe un socio con esa cédula
    const [existing] = await connection.query('SELECT id FROM socios WHERE cedula = ?', [cedula]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Ya existe un socio registrado con la Cédula ${cedula}.` });
    }

    // Guardar foto si se envió
    let fotoUrl = null;
    if (foto_base64) {
      fotoUrl = saveBase64Image(foto_base64, cedula);
    }

    // Insertar socio en su respectiva sede (incluyendo fecha de nacimiento)
    const [socioResult] = await connection.query(
      'INSERT INTO socios (cedula, nombre, apellido, telefono, email, foto_url, status, gym_sede, genero, fecha_nacimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [cedula, nombre, apellido, telefono || null, email || null, fotoUrl, 'activo', gym_sede || 'ExtremoGym', genero || 'Masculino', fecha_nacimiento || null]
    );

    const socioId = socioResult.insertId;

    // Calcular fechas para la membresía
    const fechaInicio = new Date();
    const fechaFin = new Date();
    
    const tipo = tipo_membresia || 'mensual';
    if (tipo === 'mensual') {
      fechaFin.setMonth(fechaFin.getMonth() + 1);
    } else if (tipo === 'trimestral') {
      fechaFin.setMonth(fechaFin.getMonth() + 3);
    } else if (tipo === 'anual') {
      fechaFin.setFullYear(fechaFin.getFullYear() + 1);
    }

    // Insertar membresía inicial (asumimos solvente al crearse por defecto en esta gestión escolar)
    await connection.query(
      'INSERT INTO membresias (socio_id, tipo, fecha_inicio, fecha_fin, solvencia) VALUES (?, ?, ?, ?, ?)',
      [socioId, tipo, fechaInicio, fechaFin, 1]
    );

    await connection.commit();
    res.status(201).json({
      message: 'Socio registrado con éxito.',
      socio: { id: socioId, cedula, nombre, apellido, foto_url: fotoUrl, gym_sede: gym_sede || 'ExtremoGym' }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
}

// 3. Obtener un socio por su ID
async function getMemberById(req, res) {
  try {
    const { id } = req.params;
    const db = getPool();
    const [rows] = await db.query(
      `SELECT s.*, m.tipo as membresia_tipo, m.fecha_inicio, m.fecha_fin, m.solvencia 
       FROM socios s 
       LEFT JOIN membresias m ON s.id = m.socio_id 
       WHERE s.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado.' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. Cambiar el estatus del socio (activo / inactivo)
async function updateMemberStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['activo', 'inactivo'].includes(status)) {
      return res.status(400).json({ error: 'Estatus inválido.' });
    }

    const db = getPool();
    await db.query('UPDATE socios SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Estatus del socio actualizado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 5. Actualizar los datos de un socio
async function updateMember(req, res) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { cedula, nombre, apellido, telefono, email, status, tipo_membresia, genero, fecha_nacimiento } = req.body;

    if (!cedula || !nombre || !apellido) {
      return res.status(400).json({ error: 'Cédula, nombre y apellido son campos requeridos.' });
    }

    // Verificar si la cédula ya la tiene otro socio
    const [existing] = await connection.query('SELECT id FROM socios WHERE cedula = ? AND id != ?', [cedula, id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `La Cédula ${cedula} ya está registrada por otro socio.` });
    }

    // Actualizar datos del socio (incluyendo fecha de nacimiento y foto si se envía)
    let querySocio = 'UPDATE socios SET cedula = ?, nombre = ?, apellido = ?, telefono = ?, email = ?, status = ?, genero = ?, fecha_nacimiento = ?';
    const queryParams = [cedula, nombre, apellido, telefono || null, email || null, status || 'activo', genero || 'Masculino', fecha_nacimiento || null];

    const { foto_base64 } = req.body;
    if (foto_base64) {
      const fotoUrl = saveBase64Image(foto_base64, cedula);
      if (fotoUrl) {
        querySocio += ', foto_url = ?';
        queryParams.push(fotoUrl);
      }
    }

    querySocio += ' WHERE id = ?';
    queryParams.push(id);

    await connection.query(querySocio, queryParams);

    // Si se especificó el tipo de membresía, actualizar en la tabla membresias
    if (tipo_membresia) {
      const [memberships] = await connection.query(
        'SELECT id FROM membresias WHERE socio_id = ?',
        [id]
      );
      if (memberships.length > 0) {
        await connection.query(
          'UPDATE membresias SET tipo = ? WHERE socio_id = ?',
          [tipo_membresia, id]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Socio actualizado con éxito.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
}

// 6. Eliminar un socio físicamente
async function deleteMember(req, res) {
  try {
    const { id } = req.params;
    const db = getPool();
    await db.query('DELETE FROM socios WHERE id = ?', [id]);
    res.json({ success: true, message: 'Socio eliminado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getMembers,
  createMember,
  getMemberById,
  updateMemberStatus,
  updateMember,
  deleteMember
};
