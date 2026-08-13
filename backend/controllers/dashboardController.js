const { getPool } = require('../config/db');

// 1. Obtener contadores estadísticos globales y contabilidad (Ingresos y Gastos)
async function getStats(req, res) {
  try {
    const db = getPool();
    
    // Contar socios totales
    const [[{ total_socios }]] = await db.query('SELECT COUNT(*) as total_socios FROM socios');
    
    // Contar socios activos (status = 'activo')
    const [[{ activos }]] = await db.query("SELECT COUNT(*) as activos FROM socios WHERE status = 'activo'");
    
    // Contar socios solventes (membresía activa y solvente = 1)
    const [[{ solventes }]] = await db.query(
      'SELECT COUNT(*) as solventes FROM membresias m JOIN socios s ON m.socio_id = s.id WHERE m.solvencia = 1 AND s.status = \'activo\''
    );
    
    // Contar socios insolventes (membresía vencida o solvente = 0)
    const [[{ insolventes }]] = await db.query(
      'SELECT COUNT(*) as insolventes FROM membresias m JOIN socios s ON m.socio_id = s.id WHERE (m.solvencia = 0 OR m.fecha_fin < CURRENT_DATE()) AND s.status = \'activo\''
    );
    
    // Contar asistencias de hoy
    const [[{ asistencias_hoy }]] = await db.query(
      'SELECT COUNT(*) as asistencias_hoy FROM registro_asistencias WHERE DATE(fecha_hora) = CURRENT_DATE()'
    );
    
    // Calcular ingresos acumulados totales
    const [[{ ingresos_totales }]] = await db.query('SELECT COALESCE(SUM(monto), 0) as ingresos_totales FROM pagos');

    // Calcular gastos acumulados totales [NUEVO]
    const [[{ gastos_totales }]] = await db.query('SELECT COALESCE(SUM(monto), 0) as gastos_totales FROM gastos');

    // Contar socios que vencen en los próximos 3 días
    const [[{ vencen_pronto }]] = await db.query(
      "SELECT COUNT(*) as vencen_pronto FROM membresias m JOIN socios s ON m.socio_id = s.id WHERE m.fecha_fin >= CURRENT_DATE() AND m.fecha_fin <= DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY) AND s.status = 'activo'"
    );

    res.json({
      total_socios,
      activos,
      solventes,
      insolventes,
      asistencias_hoy,
      vencen_pronto,
      ingresos_totales: parseFloat(ingresos_totales).toFixed(2),
      gastos_totales: parseFloat(gastos_totales).toFixed(2),
      balance_neto: (parseFloat(ingresos_totales) - parseFloat(gastos_totales)).toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. Distribución de asistencias por horas (horas pico) global
async function getHourDistribution(req, res) {
  try {
    const db = getPool();

    // Agrupa accesos por hora del día en los últimos 30 días
    const query = `
      SELECT HOUR(fecha_hora) as hora, COUNT(*) as cantidad 
      FROM registro_asistencias 
      WHERE fecha_hora >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY HOUR(fecha_hora) 
      ORDER BY hora
    `;
    const [rows] = await db.query(query);

    // Formatear para que contenga todas las horas operativas por defecto (de 6 AM a 10 PM)
    const hourMap = {};
    for (let h = 6; h <= 22; h++) {
      hourMap[h] = 0;
    }
    rows.forEach(row => {
      if (row.hora >= 6 && row.hora <= 22) {
        hourMap[row.hora] = row.cantidad;
      }
    });

    const formattedData = Object.keys(hourMap).map(hora => ({
      hora: `${hora.padStart(2, '0')}:00`,
      cantidad: hourMap[hora]
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3. Obtener el feed de accesos recientes (últimos 10 ingresos)
async function getRecentCheckins(req, res) {
  try {
    const db = getPool();

    const query = `
      SELECT 
        ra.id, 
        ra.fecha_hora, 
        ra.metodo, 
        ra.status_acceso, 
        ra.razon_denegacion,
        s.nombre, 
        s.apellido, 
        s.cedula, 
        s.foto_url,
        m.solvencia
      FROM registro_asistencias ra
      JOIN socios s ON ra.socio_id = s.id
      LEFT JOIN membresias m ON s.id = m.socio_id
      ORDER BY ra.id DESC
      LIMIT 10
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. Obtener datos analíticos avanzados consolidando demografía, tendencias e indicadores de retención
async function getAnalytics(req, res) {
  try {
    const db = getPool();

    // A. Distribución por Género
    const [generoData] = await db.query(`
      SELECT COALESCE(genero, 'Masculino') as label, COUNT(*) as value 
      FROM socios 
      GROUP BY genero
    `);

    // B. Tendencias de Inscripciones por Mes
    const [inscripcionesMes] = await db.query(`
      SELECT DATE_FORMAT(fecha_registro, '%Y-%m') as mes, COUNT(*) as cantidad 
      FROM socios 
      GROUP BY mes 
      ORDER BY mes ASC 
      LIMIT 12
    `);

    // C. Tendencias de Inscripciones por Día de la Semana (0 = Lunes, 6 = Domingo)
    const [inscripcionesDia] = await db.query(`
      SELECT WEEKDAY(fecha_registro) as dia_index, COUNT(*) as cantidad 
      FROM socios 
      GROUP BY dia_index 
      ORDER BY dia_index
    `);

    // D. Tendencias de Asistencia por Mes
    const [asistenciasMes] = await db.query(`
      SELECT DATE_FORMAT(fecha_hora, '%Y-%m') as mes, COUNT(*) as cantidad 
      FROM registro_asistencias 
      WHERE status_acceso = 'permitido' 
      GROUP BY mes 
      ORDER BY mes ASC 
      LIMIT 12
    `);

    // E. Tendencias de Asistencia por Día de la Semana (0 = Lunes, 6 = Domingo)
    const [asistenciasDia] = await db.query(`
      SELECT WEEKDAY(fecha_hora) as dia_index, COUNT(*) as cantidad 
      FROM registro_asistencias 
      WHERE status_acceso = 'permitido' 
      GROUP BY dia_index 
      ORDER BY dia_index
    `);

    // F. Métricas de Retención y Auditoría
    const [[{ total_socios }]] = await db.query('SELECT COUNT(*) as total_socios FROM socios');
    const [[{ activos }]] = await db.query("SELECT COUNT(*) as activos FROM socios WHERE status = 'activo'");
    const [[{ solventes_activos }]] = await db.query(`
      SELECT COUNT(*) as solventes_activos 
      FROM membresias m 
      JOIN socios s ON m.socio_id = s.id 
      WHERE m.solvencia = 1 AND s.status = 'activo'
    `);

    // Socios activos sin asistencias en los últimos 30 días (En Riesgo de Fuga)
    const [[{ en_riesgo }]] = await db.query(`
      SELECT COUNT(*) as en_riesgo 
      FROM socios s 
      WHERE s.status = 'activo' 
        AND s.id NOT IN (
          SELECT DISTINCT socio_id 
          FROM registro_asistencias 
          WHERE fecha_hora >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        )
    `);

    // Socios activos recurrentes (mínimo 5 accesos en los últimos 30 días)
    const [[{ recurrentes }]] = await db.query(`
      SELECT COUNT(*) as recurrentes 
      FROM (
        SELECT socio_id, COUNT(*) as cnt 
        FROM registro_asistencias 
        WHERE status_acceso = 'permitido' 
          AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
        GROUP BY socio_id 
        HAVING cnt >= 5
      ) as t
    `);

    // G. Distribución de asistencias por hora (horas pico) para analíticas
    const [rowsHoras] = await db.query(`
      SELECT HOUR(fecha_hora) as hora, COUNT(*) as cantidad 
      FROM registro_asistencias 
      WHERE fecha_hora >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY HOUR(fecha_hora) 
      ORDER BY hora
    `);

    const hourMap = {};
    for (let h = 6; h <= 22; h++) {
      hourMap[h] = 0;
    }
    rowsHoras.forEach(row => {
      if (row.hora >= 6 && row.hora <= 22) {
        hourMap[row.hora] = row.cantidad;
      }
    });

    const asistenciasHoras = Object.keys(hourMap).map(h => ({
      hora: `${h.padStart(2, '0')}:00`,
      afluencia: hourMap[h]
    }));

    const retencionRate = total_socios > 0 ? ((activos / total_socios) * 100).toFixed(1) : 100.0;

    res.json({
      generoData,
      inscripcionesMes,
      inscripcionesDia,
      asistenciasMes,
      asistenciasDia,
      asistenciasHoras,
      metricasRetencion: {
        total_socios,
        activos,
        solventes_activos,
        en_riesgo,
        recurrentes,
        tasa_retencion: parseFloat(retencionRate)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getStats,
  getHourDistribution,
  getRecentCheckins,
  getAnalytics
};
