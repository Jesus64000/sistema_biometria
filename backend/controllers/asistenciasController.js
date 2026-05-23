const { getPool } = require('../config/db');

// 1. Obtener la bitácora de asistencias histórica con filtros avanzados
async function getAsistencias(req, res) {
  try {
    const db = getPool();
    const { status, metodo, fecha, search } = req.query;

    let query = `
      SELECT 
        r.*, 
        s.nombre, s.apellido, s.cedula, s.foto_url
      FROM registro_asistencias r
      JOIN socios s ON r.socio_id = s.id
      WHERE 1=1
    `;
    const params = [];

    // Filtro por estatus de acceso (permitido/denegado)
    if (status && status !== 'all') {
      query += ` AND r.status_acceso = ?`;
      params.push(status);
    }

    // Filtro por método de acceso (facial/manual)
    if (metodo && metodo !== 'all') {
      query += ` AND r.metodo = ?`;
      params.push(metodo);
    }

    // Filtro por fecha exacta (DATE())
    if (fecha) {
      query += ` AND DATE(r.fecha_hora) = ?`;
      params.push(fecha);
    }

    // Buscador por Nombre, Apellido o Cédula
    if (search) {
      query += ` AND (s.nombre LIKE ? OR s.apellido LIKE ? OR s.cedula LIKE ?)`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard);
    }

    query += ` ORDER BY r.fecha_hora DESC LIMIT 500`;

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAsistencias
};
