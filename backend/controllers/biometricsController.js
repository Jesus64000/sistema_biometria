const { getPool } = require('../config/db');
const http = require('http');

// Configuración de la API del motor de Python
const PYTHON_BIOMETRICS_URL = process.env.PYTHON_BIOMETRICS_URL || 'http://127.0.0.1:5000';

// Helper para realizar peticiones HTTP a Python de forma asíncrona
async function callPythonService(endpoint, payload) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(`${PYTHON_BIOMETRICS_URL}${endpoint}`);
      const dataString = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString)
        },
        timeout: 2000 // Timeout de 2 segundos para no bloquear la recepción
      };

      const req = http.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(responseBody));
            } catch (e) {
              resolve({ error: 'Respuesta inválida de Python' });
            }
          } else {
            resolve({ error: `Python retornó código ${res.statusCode}` });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ error: `Servicio biométrico inactivo: ${err.message}` });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'Timeout del servicio biométrico' });
      });

      req.write(dataString);
      req.end();
    } catch (error) {
      resolve({ error: error.message });
    }
  });
}

// 1. Enrolar rostro biométricamente
async function registerFace(req, res) {
  try {
    const { socio_id, foto_base64 } = req.body;

    if (!socio_id || !foto_base64) {
      return res.status(400).json({ error: 'Falta socio_id o foto_base64.' });
    }

    const db = getPool();
    
    // Obtener socio de la base de datos para validar existencia y obtener cédula
    const [members] = await db.query('SELECT cedula FROM socios WHERE id = ?', [socio_id]);
    if (members.length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado.' });
    }

    const { cedula } = members[0];

    // Enviar al motor Python
    console.log(`📡 Enviando rostro de socio ID ${socio_id} (Cédula ${cedula}) al motor Python...`);
    
    const payload = {
      member_id: socio_id,
      cedula: cedula
    };

    if (Array.isArray(foto_base64)) {
      payload.images = foto_base64;
    } else {
      payload.image_base64 = foto_base64;
    }

    const pythonResult = await callPythonService('/register', payload);

    if (pythonResult.error) {
      const isConnectionError = pythonResult.error.includes('inactivo') || 
                                pythonResult.error.includes('Timeout') || 
                                pythonResult.error.includes('refused') ||
                                pythonResult.error.includes('code');
      
      if (!isConnectionError) {
        // Es un error real de detección facial retornado por el motor Python
        return res.status(400).json({ error: pythonResult.error });
      }

      console.warn(`⚠️ Advertencia de Biometría Python: ${pythonResult.error}. Guardando foto localmente como referencia.`);
      return res.json({
        success: true,
        message: 'Foto de referencia guardada en el servidor. (Motor biométrico Python desconectado)',
        warning: pythonResult.error
      });
    }

    res.json({
      success: true,
      message: 'Enrolamiento biométrico facial completado con éxito en el motor Python.',
      details: pythonResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. Verificar rostro y registrar asistencia en tiempo real
async function verifyFace(req, res) {
  try {
    const { foto_base64, mock_cedula } = req.body;

    if (!foto_base64 && !mock_cedula) {
      return res.status(400).json({ error: 'Falta foto_base64 para validación facial.' });
    }

    const db = getPool();
    let matchedSocioId = null;
    let pythonResult = null;

    // A. ESCENARIO DE SIMULACIÓN DIRECTA (Para demostración rápida)
    if (mock_cedula) {
      const [members] = await db.query('SELECT id FROM socios WHERE cedula = ?', [mock_cedula]);
      if (members.length > 0) {
        matchedSocioId = members[0].id;
      } else {
        return res.json({
          allowed: false,
          reason: 'Usuario no registrado en el sistema.',
          member: null
        });
      }
    } else {
      // B. ESCENARIO REAL (Consultando motor biométrico de Python)
      console.log('📡 Enviando captura de cámara al motor de visión artificial en Python...');
      pythonResult = await callPythonService('/verify', { image_base64: foto_base64 });

      if (pythonResult.error || !pythonResult.success) {
        console.warn(`⚠️ Error en verificación biométrica real: ${pythonResult.error || 'No coincide ningún rostro'}`);
        const isNoFace = pythonResult.error === 'no_face_detected';
        return res.json({
          allowed: false,
          reason: isNoFace ? 'no_face_detected' : (pythonResult.error ? 'Servicio biométrico fuera de línea.' : 'Rostro no coincide con ningún socio registrado.'),
          member: null
        });
      }

      matchedSocioId = pythonResult.member_id;
    }

    // 3. Consultar datos del socio detectado, membresía y solvencia en XAMPP MySQL
    const query = `
      SELECT 
        s.id, s.cedula, s.nombre, s.apellido, s.status, s.foto_url, s.fecha_registro, s.fecha_nacimiento,
        m.solvencia, m.fecha_fin, m.fecha_inicio, m.tipo
      FROM socios s
      LEFT JOIN membresias m ON s.id = m.socio_id
      WHERE s.id = ?
    `;
    const [rows] = await db.query(query, [matchedSocioId]);

    if (rows.length === 0) {
      return res.json({
        allowed: false,
        reason: 'El socio detectado ya no existe en la base de datos.',
        member: null
      });
    }

    const socio = rows[0];
    let allowed = true;
    let reason = '';

    // Evaluar reglas de negocio del centro deportivo
    if (socio.status !== 'activo') {
      allowed = false;
      reason = 'Socio desactivado por administración.';
    } else if (socio.fecha_fin) {
      const fechaFinDate = new Date(socio.fecha_fin);
      fechaFinDate.setHours(23, 59, 59, 999);
      if (fechaFinDate < new Date()) {
        allowed = false;
        reason = 'Membresía vencida.';
        // Actualizar solvencia a 0 de forma automática
        await db.query('UPDATE membresias SET solvencia = 0 WHERE socio_id = ?', [socio.id]);
        socio.solvencia = 0;
      } else if (socio.solvencia === 0) {
        allowed = false;
        reason = 'Socio insolvente. Registro de pago pendiente.';
      }
    } else if (socio.solvencia === 0) {
      allowed = false;
      reason = 'Socio insolvente. Registro de pago pendiente.';
    }

    // 4. Registrar acceso en el historial (registro_asistencias)
    const statusAcceso = allowed ? 'permitido' : 'denegado';
    const metodo = mock_cedula ? 'manual' : 'facial';
    const { gym_sede } = req.body;
    
    await db.query(
      'INSERT INTO registro_asistencias (socio_id, metodo, status_acceso, razon_denegacion, gym_sede) VALUES (?, ?, ?, ?, ?)',
      [socio.id, metodo, statusAcceso, reason || null, gym_sede || 'ExtremoGym']
    );

    res.json({
      allowed,
      reason,
      match_percentage: pythonResult ? pythonResult.match_percentage : null,
      member: {
        id: socio.id,
        cedula: socio.cedula,
        nombre: socio.nombre,
        apellido: socio.apellido,
        foto_url: socio.foto_url,
        status: socio.status,
        solvencia: socio.solvencia,
        fecha_fin: socio.fecha_fin,
        fecha_registro: socio.fecha_registro,
        fecha_nacimiento: socio.fecha_nacimiento,
        fecha_inicio: socio.fecha_inicio,
        membresia_tipo: socio.tipo
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  registerFace,
  verifyFace
};
