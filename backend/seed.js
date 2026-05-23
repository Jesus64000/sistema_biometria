const { initDB, getPool } = require('./config/db');
const bcrypt = require('bcryptjs');

const demoSocios = [
  { cedula: '25123456', nombre: 'Luis', apellido: 'Ramos', telefono: '0414-1234567', email: 'luis.ramos@gimnasio.com', status: 'activo', tipo: 'mensual', solvencia: 1, pago: 30.00, metodo: 'pago_movil', genero: 'Masculino' },
  { cedula: '26987654', nombre: 'María', apellido: 'Gómez', telefono: '0424-9876543', email: 'maria.gomez@gmail.com', status: 'activo', tipo: 'trimestral', solvencia: 1, pago: 80.00, metodo: 'divisas', genero: 'Femenino' },
  { cedula: '22345678', nombre: 'Carlos', apellido: 'Mendoza', telefono: '0412-5556677', email: 'carlos.mendoza@yahoo.com', status: 'activo', tipo: 'mensual', solvencia: 0, pago: 30.00,  metodo: 'efectivo', genero: 'Masculino', dias_vencido: 105 },
  { cedula: '19456123', nombre: 'Ana', apellido: 'Sánchez', telefono: '0416-8889900', email: 'ana.sanchez@hotmail.com', status: 'inactivo', tipo: 'mensual', solvencia: 0, pago: 30.00, metodo: 'transferencia', genero: 'Femenino', dias_vencido: 5 },
  { cedula: '28111222', nombre: 'José', apellido: 'Chirinos', telefono: '0414-2223344', email: 'jose.chirinos@gimnasio.com', status: 'activo', tipo: 'anual', solvencia: 1, pago: 300.00, metodo: 'divisas', genero: 'Masculino' }
];

const demoUsuarios = [
  { username: 'admin', password: 'admin123', role: 'admin', nombre: 'Luis', apellido: 'Ramos' },
  { username: 'recep', password: 'recep123', role: 'recepcionista', nombre: 'María', apellido: 'Gómez' }
];

const demoGastos = [
  { descripcion: 'Factura de Electricidad Corpoelec', monto: 15.00, categoria: 'Servicios' },
  { descripcion: 'Mantenimiento preventivo de máquinas', monto: 45.00, categoria: 'Mantenimiento' },
  { descripcion: 'Sueldo de Entrenador (Quincenal)', monto: 120.00, categoria: 'Personal' },
  { descripcion: 'Compra de desinfectante y toallas', monto: 12.50, categoria: 'Limpieza' }
];

async function seed() {
  console.log('🌱 Iniciando sembrado de datos en XAMPP MySQL para Marian Gym...');
  try {
    await initDB();
    const db = getPool();

    // Limpiar base de datos primero para evitar claves duplicadas al re-ejecutar
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('TRUNCATE TABLE registro_asistencias');
    await db.query('TRUNCATE TABLE pagos');
    await db.query('TRUNCATE TABLE membresias');
    await db.query('TRUNCATE TABLE socios');
    await db.query('TRUNCATE TABLE usuarios');
    await db.query('TRUNCATE TABLE configuracion');
    await db.query('TRUNCATE TABLE gastos');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🗑️ Base de datos limpiada con éxito.');

    // 1. Sembrar Configuración Inicial
    console.log('⚙️ Sembrando configuración global de Marian Gym...');
    await db.query("INSERT INTO configuracion (id, gym_name, tasa_cambio) VALUES (1, 'Marian Gym', 114.00)");
    console.log('✅ Configuración global inicializada.');

    // 2. Sembrar Gastos Operacionales
    console.log('💸 Sembrando gastos del gimnasio...');
    for (const gasto of demoGastos) {
      await db.query(
        'INSERT INTO gastos (descripcion, monto, categoria, fecha) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))',
        [gasto.descripcion, gasto.monto, gasto.categoria, Math.floor(Math.random() * 5)]
      );
    }
    console.log(`✅ ${demoGastos.length} gastos sembrados.`);

    // 3. Sembrar Usuarios Administrativos
    console.log('👥 Sembrando usuarios administrativos...');
    for (const usuario of demoUsuarios) {
      const hashedPassword = bcrypt.hashSync(usuario.password, 10);
      await db.query(
        'INSERT INTO usuarios (username, password, role, nombre, apellido) VALUES (?, ?, ?, ?, ?)',
        [usuario.username, hashedPassword, usuario.role, usuario.nombre, usuario.apellido]
      );
    }
    console.log(`✅ ${demoUsuarios.length} usuarios administrativos sembrados.`);

    // 4. Sembrar Socios
    console.log('🏋️ Sembrando socios demo...');
    for (const socio of demoSocios) {
      // Insertar Socio
      const [sResult] = await db.query(
        'INSERT INTO socios (cedula, nombre, apellido, telefono, email, status, genero) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [socio.cedula, socio.nombre, socio.apellido, socio.telefono, socio.email, socio.status, socio.genero || 'Masculino']
      );
      const socioId = sResult.insertId;

      // Calcular fechas de membresía
      const inicio = new Date();
      const fin = new Date();
      // Si es insolvente, hacemos que la membresía haya vencido hace unos días
      if (socio.solvencia === 0) {
        const offset = socio.dias_vencido || 5;
        inicio.setDate(inicio.getDate() - (offset + 30));
        fin.setDate(fin.getDate() - offset);
      } else {
        if (socio.tipo === 'mensual') fin.setMonth(fin.getMonth() + 1);
        else if (socio.tipo === 'trimestral') fin.setMonth(fin.getMonth() + 3);
        else if (socio.tipo === 'anual') fin.setFullYear(fin.getFullYear() + 1);
      }

      // Insertar Membresía
      await db.query(
        'INSERT INTO membresias (socio_id, tipo, fecha_inicio, fecha_fin, solvencia) VALUES (?, ?, ?, ?, ?)',
        [socioId, socio.tipo, inicio, fin, socio.solvencia]
      );

      // Insertar Pago (sólo si ha pagado algo alguna vez)
      await db.query(
        'INSERT INTO pagos (socio_id, monto, metodo_pago, fecha_pago) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL 5 DAY))',
        [socioId, socio.pago, socio.metodo]
      );

      // Sembrar historial de asistencias ficticias para las gráficas analíticas por hora
      // Creamos un hermoso histograma (7 AM y 6 PM son las horas pico con más asistencias)
      const horasDemo = [7, 7, 8, 8, 9, 12, 17, 18, 18, 18, 19, 19, 20];
      for (let i = 0; i < horasDemo.length; i++) {
        const fechaAsistencia = new Date();
        fechaAsistencia.setDate(fechaAsistencia.getDate() - (i % 3)); // 3 días atrás
        fechaAsistencia.setHours(horasDemo[i], Math.floor(Math.random() * 60), 0);

        const statusAcceso = (socio.solvencia === 1 && socio.status === 'activo') ? 'permitido' : 'denegado';
        const razon = statusAcceso === 'denegado' ? (socio.status === 'inactivo' ? 'Socio desactivado por administración.' : 'Socio insolvente. Registro de pago pendiente.') : null;

        await db.query(
          'INSERT INTO registro_asistencias (socio_id, fecha_hora, metodo, status_acceso, razon_denegacion) VALUES (?, ?, ?, ?, ?)',
          [socioId, fechaAsistencia, 'facial', statusAcceso, razon]
        );
      }
    }

    console.log('✅ Sembrado completado exitosamente. Marian Gym está configurado con datos deportivos limpios y listos.');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error durante el sembrado de datos:', error.message);
    process.exit(1);
  }
}

seed();
