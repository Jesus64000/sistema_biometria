const { getPool } = require('../config/db');

// 1. Obtener la configuración actual del gimnasio
async function getConfig(req, res) {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM configuracion LIMIT 1');
    if (rows.length === 0) {
      // Auto-crear si no existe
      await db.query("INSERT INTO configuracion (gym_name, tasa_cambio) VALUES ('Marian Gym', 114.00)");
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
    const { gym_name, tasa_cambio, logo_url } = req.body;
    if (!gym_name || !tasa_cambio) {
      return res.status(400).json({ error: 'Nombre de gimnasio y tasa de cambio son requeridos.' });
    }

    const db = getPool();
    // Intentar actualizar el primer registro
    const [result] = await db.query(
      'UPDATE configuracion SET gym_name = ?, tasa_cambio = ?, logo_url = ? WHERE id = 1',
      [gym_name, parseFloat(tasa_cambio), logo_url || null]
    );

    res.json({ success: true, message: 'Configuración actualizada con éxito.' });
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
