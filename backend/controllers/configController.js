const { getPool } = require('../config/db');

// 1. Obtener la configuración actual del gimnasio
async function getConfig(req, res) {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM configuracion LIMIT 1');
    if (rows.length === 0) {
      // Auto-crear si no existe
      await db.query("INSERT INTO configuracion (gym_name, tasa_cambio) VALUES ('RamosGym', 114.00)");
      const [newRows] = await db.query('SELECT * FROM configuracion LIMIT 1');
      return res.json(newRows[0]);
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. Actualizar la configuración del gimnasio
async function updateConfig(req, res) {
  try {
    const { 
      gym_name, 
      tasa_cambio, 
      logo_url,
      cuota_mensual,
      cuota_trimestral,
      cuota_anual,
      cobra_inscripcion,
      cuota_inscripcion,
      cuota_reactivacion,
      umbral_biometrico,
      solo_mensual
    } = req.body;

    if (!gym_name || !tasa_cambio) {
      return res.status(400).json({ error: 'Nombre de gimnasio y tasa de cambio son requeridos.' });
    }

    const db = getPool();
    // Actualizar todas las columnas de configuración en el registro id = 1
    const [result] = await db.query(
      `UPDATE configuracion SET 
        gym_name = ?, 
        tasa_cambio = ?, 
        logo_url = ?, 
        cuota_mensual = ?, 
        cuota_trimestral = ?, 
        cuota_anual = ?, 
        cobra_inscripcion = ?, 
        cuota_inscripcion = ?, 
        cuota_reactivacion = ?, 
        umbral_biometrico = ?,
        solo_mensual = ?
       WHERE id = 1`,
      [
        gym_name, 
        parseFloat(tasa_cambio), 
        logo_url || null,
        parseFloat(cuota_mensual || 30.00),
        parseFloat(cuota_trimestral || 80.00),
        parseFloat(cuota_anual || 300.00),
        parseInt(cobra_inscripcion ? 1 : 0),
        parseFloat(cuota_inscripcion || 10.00),
        parseFloat(cuota_reactivacion || 5.00),
        parseFloat(umbral_biometrico || 73.00),
        parseInt(solo_mensual ? 1 : 0)
      ]
    );

    res.json({ success: true, message: 'Configuración y tarifas actualizadas con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3. Función Interna para Sincronizar Tasa BCV (Usada por CRON o Ruta manual)
const performBcvSyncInternal = async () => {
  try {
    let newRate = null;

    // INTENTO 1: API pública dolarapi.com
    try {
      const response1 = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (response1.ok) {
        const text = await response1.text();
        try {
          const data1 = JSON.parse(text);
          newRate = data1.promedio; 
        } catch (e) {
          console.log("Error parseando JSON de dolarapi.com", e);
        }
      }
    } catch (err) {
      console.log("Intento 1 falló (dolarapi.com). Probando respaldo...");
    }

    // INTENTO 2: API de respaldo (pydolarve.org)
    if (!newRate) {
      try {
        const response2 = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv');
        if (response2.ok) {
          const text = await response2.text();
          try {
            const data2 = JSON.parse(text);
            newRate = data2.monitors.bcv?.price || data2.monitors.usd?.price; 
          } catch(e) {
            console.log("Error parseando JSON de pydolarve.org", e);
          }
        }
      } catch (err) {
        console.log("Intento 2 falló (pydolarve.org).");
      }
    }

    // Si ambas APIs fallan o devuelven valores nulos
    if (!newRate || isNaN(newRate)) {
      throw new Error('Las APIs de consulta están caídas en este momento.');
    }

    const db = getPool();
    // Guardamos la tasa correcta (> 400 Bs) en la Base de Datos
    await db.query(
      'UPDATE configuracion SET tasa_cambio = ?, bcv_last_update = NOW() WHERE id = 1',
      [newRate]
    );
    
    console.log(`[BCV Sync] Tasa BCV sincronizada automáticamente: Bs. ${newRate}`);
    return { success: true, rate: newRate };

  } catch (error) {
    console.error("[BCV Sync] Error sincronizando BCV:", error.message || error);
    return { success: false, error: 'Falló la conexión automática con el Banco Central.' };
  }
};

// 4. Sincronización Automática con la API (Ruta Invocada Manualmente)
async function syncBcvRate(req, res) {
  const result = await performBcvSyncInternal();
  if (result.success) {
    res.json({ 
      success: true,
      message: 'Tasa BCV sincronizada con éxito 🇻🇪', 
      tasa_cambio: result.rate 
    });
  } else {
    res.status(500).json({ 
      error: result.error + ' Por favor, actualice la tasa manualmente.' 
    });
  }
}

module.exports = {
  getConfig,
  updateConfig,
  syncBcvRate,
  performBcvSyncInternal
};

// 5. Exportar copia de seguridad de la base de datos (Dump JSON)
async function exportBackup(req, res) {
  try {
    const db = getPool();
    const tables = ['configuracion', 'socios', 'membresias', 'pagos', 'registro_asistencias', 'usuarios', 'personal', 'gastos'];
    const backupData = {
      backup_date: new Date().toISOString(),
      gym_name: 'RamosGym',
      tables: {}
    };

    // Consultar secuencialmente todas las tablas
    for (const table of tables) {
      const [rows] = await db.query(`SELECT * FROM \`${table}\``);
      backupData.tables[table] = rows;
    }

    res.setHeader('Content-disposition', `attachment; filename=ramosgym_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.setHeader('Content-type', 'application/json');
    res.json(backupData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 6. Restaurar base de datos desde copia de seguridad JSON
async function importBackup(req, res) {
  const connection = await getPool().getConnection();
  try {
    const { backupData } = req.body;
    if (!backupData || !backupData.tables) {
      return res.status(400).json({ error: 'Formato de copia de seguridad inválido.' });
    }

    await connection.beginTransaction();
    
    // Limpiar tablas en orden inverso de claves foráneas
    const tablesToClean = ['gastos', 'personal', 'registro_asistencias', 'pagos', 'membresias', 'socios', 'usuarios', 'configuracion'];
    for (const table of tablesToClean) {
      await connection.query(`DELETE FROM \`${table}\``);
      try {
        await connection.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
      } catch (err) {
        // Ignorar si no soporta AUTO_INCREMENT
      }
    }

    // Repoblar las tablas en orden de dependencias
    const populateOrder = ['configuracion', 'usuarios', 'socios', 'membresias', 'pagos', 'registro_asistencias', 'personal', 'gastos'];

    for (const table of populateOrder) {
      const rows = backupData.tables[table];
      if (!rows || rows.length === 0) continue;

      // Obtener columnas de la primera fila
      const columns = Object.keys(rows[0]);
      const columnNames = columns.map(c => `\`${c}\``).join(', ');
      const placeholders = columns.map(() => '?').join(', ');

      for (const row of rows) {
        const values = columns.map(col => {
          const val = row[col];
          // Formatear fechas de forma segura para MySQL
          if (val && (col.startsWith('fecha') || col.endsWith('_at') || col === 'bcv_last_update')) {
            return new Date(val);
          }
          return val;
        });
        
        await connection.query(
          `INSERT INTO \`${table}\` (${columnNames}) VALUES (${placeholders})`,
          values
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: '✓ Base de datos restaurada al 100% con éxito.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: `Error de restauración: ${error.message}` });
  } finally {
    connection.release();
  }
}

module.exports = {
  getConfig,
  updateConfig,
  syncBcvRate,
  performBcvSyncInternal,
  exportBackup,
  importBackup
};
