const { getPool } = require('../config/db');

// 1. Registrar un pago y renovar solvencia de membresía
async function registerPayment(req, res) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { socio_id, monto, metodo_pago, tipo_membresia, gym_sede, referencia } = req.body;

    if (!socio_id || !monto) {
      return res.status(400).json({ error: 'Socio e importe son campos obligatorios.' });
    }

    // 1. Insertar el pago en la sede activa (incluyendo auditoría de referencia bancaria)
    await connection.query(
      'INSERT INTO pagos (socio_id, monto, metodo_pago, gym_sede, referencia) VALUES (?, ?, ?, ?, ?)',
      [socio_id, monto, metodo_pago || 'pago_movil', gym_sede || 'MarianGym', referencia || null]
    );

    // 2. Obtener la membresía actual
    const [memberships] = await connection.query(
      'SELECT id, fecha_fin, tipo FROM membresias WHERE socio_id = ?',
      [socio_id]
    );

    const tipo = tipo_membresia || 'mensual';
    const hoy = new Date();

    if (memberships.length > 0) {
      // Si ya tiene membresía, la actualizamos
      const current = memberships[0];
      let nuevaFechaInicio = new Date();
      let nuevaFechaFin = new Date();

      const finActual = new Date(current.fecha_fin);
      if (finActual > hoy) {
        // Si aún está activa, se extiende a partir de la fecha de fin actual
        nuevaFechaInicio = finActual;
        nuevaFechaFin = new Date(finActual);
      }

      if (tipo === 'mensual') {
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);
      } else if (tipo === 'trimestral') {
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 3);
      } else if (tipo === 'anual') {
        nuevaFechaFin.setFullYear(nuevaFechaFin.getFullYear() + 1);
      }

      await connection.query(
        'UPDATE membresias SET tipo = ?, fecha_inicio = ?, fecha_fin = ?, solvencia = 1 WHERE socio_id = ?',
        [tipo, nuevaFechaInicio, nuevaFechaFin, socio_id]
      );
    } else {
      // Si por alguna razón no tiene membresía asociada (caso de seguridad)
      let nuevaFechaFin = new Date();
      if (tipo === 'mensual') {
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);
      } else if (tipo === 'trimestral') {
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 3);
      } else if (tipo === 'anual') {
        nuevaFechaFin.setFullYear(nuevaFechaFin.getFullYear() + 1);
      }

      await connection.query(
        'INSERT INTO membresias (socio_id, tipo, fecha_inicio, fecha_fin, solvencia) VALUES (?, ?, ?, ?, 1)',
        [socio_id, tipo, hoy, nuevaFechaFin]
      );
    }

    // 3. Reactivar automáticamente al socio a "activo" al recibir un pago
    await connection.query(
      'UPDATE socios SET status = "activo" WHERE id = ?',
      [socio_id]
    );

    await connection.commit();
    res.status(201).json({ message: 'Pago registrado y membresía solventada con éxito.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
}

// 2. Obtener lista de todos los pagos registrados
async function getPayments(req, res) {
  try {
    const db = getPool();
    const query = `
      SELECT p.*, s.nombre, s.apellido, s.cedula
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      ORDER BY p.fecha_pago DESC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  registerPayment,
  getPayments
};
