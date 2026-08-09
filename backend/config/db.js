const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuración de conexión por defecto apuntando a XAMPP MySQL
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306')
};

const databaseName = process.env.DB_NAME || 'sistema_biometria';

let pool;

async function initDB() {
  const maxRetries = 5;
  let attempt = 0;
  let connection;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`📡 Intentando conectar a MySQL (Intento ${attempt}/${maxRetries})...`);
      connection = await mysql.createConnection(dbConfig);
      console.log('✅ Conectado al servidor de bases de datos MySQL.');
      break;
    } catch (error) {
      console.warn(`⚠️ Intento ${attempt} fallido al conectar con MySQL (${dbConfig.host}:${dbConfig.port}): ${error.message}`);
      if (attempt >= maxRetries) {
        console.error('❌ Error fatal de conexión con MySQL tras varios intentos.');
        console.log('💡 Sugerencia: Asegúrate de que XAMPP esté abierto y el módulo de MySQL esté activo (botón "Start").');
        throw error;
      }
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  try {
    // 2. Crear base de datos si no existe
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Base de datos \`${databaseName}\` verificada/creada.`);
    await connection.end();

    // 3. Conectar al pool usando la base de datos
    pool = mysql.createPool({
      ...dbConfig,
      database: databaseName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 4. Crear tablas de forma automática ejecutando sentencias del esquema
    await checkAndCreateTables();

    return pool;
  } catch (error) {
    console.error('❌ Error inicializando tablas o base de datos:', error.message);
    throw error;
  }
}

async function checkAndCreateTables() {
  const connection = await pool.getConnection();
  try {
    // Definimos las sentencias para crear las tablas
    
    // Tabla socios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`socios\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`cedula\` VARCHAR(20) NOT NULL UNIQUE,
        \`nombre\` VARCHAR(50) NOT NULL,
        \`apellido\` VARCHAR(50) NOT NULL,
        \`telefono\` VARCHAR(20) DEFAULT NULL,
        \`email\` VARCHAR(100) DEFAULT NULL,
        \`foto_url\` VARCHAR(255) DEFAULT NULL,
        \`genero\` VARCHAR(20) DEFAULT 'Masculino',
        \`fecha_registro\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`status\` ENUM('activo', 'inactivo') DEFAULT 'activo',
        \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'RamosGym',
        INDEX \`idx_cedula\` (\`cedula\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla membresias
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`membresias\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`socio_id\` INT NOT NULL,
        \`tipo\` ENUM('mensual', 'trimestral', 'anual') NOT NULL DEFAULT 'mensual',
        \`fecha_inicio\` DATE NOT NULL,
        \`fecha_fin\` DATE NOT NULL,
        \`solvencia\` TINYINT(1) NOT NULL DEFAULT 1,
        FOREIGN KEY (\`socio_id\`) REFERENCES \`socios\`(\`id\`) ON DELETE CASCADE,
        INDEX \`idx_socio_id\` (\`socio_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla pagos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`pagos\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`socio_id\` INT NOT NULL,
        \`monto\` DECIMAL(10, 2) NOT NULL,
        \`fecha_pago\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`metodo_pago\` VARCHAR(50) NOT NULL DEFAULT 'pago_movil',
        \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'RamosGym',
        \`referencia\` VARCHAR(50) DEFAULT NULL,
        \`tasa_cambio\` DECIMAL(10, 2) NOT NULL DEFAULT 114.00,
        FOREIGN KEY (\`socio_id\`) REFERENCES \`socios\`(\`id\`) ON DELETE CASCADE,
        INDEX \`idx_pago_socio\` (\`socio_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla registro_asistencias
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`registro_asistencias\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`socio_id\` INT NOT NULL,
        \`fecha_hora\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`metodo\` ENUM('facial', 'manual') DEFAULT 'facial',
        \`status_acceso\` ENUM('permitido', 'denegado') NOT NULL,
        \`razon_denegacion\` VARCHAR(255) DEFAULT NULL,
        \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'RamosGym',
        FOREIGN KEY (\`socio_id\`) REFERENCES \`socios\`(\`id\`) ON DELETE CASCADE,
        INDEX \`idx_asistencia_socio\` (\`socio_id\`),
        INDEX \`idx_fecha_hora\` (\`fecha_hora\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla usuarios (Acceso y Seguridad administrativa)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`usuarios\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(50) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` ENUM('admin', 'recepcionista', 'kiosco') NOT NULL DEFAULT 'recepcionista',
        \`nombre\` VARCHAR(50) NOT NULL,
        \`apellido\` VARCHAR(50) NOT NULL,
        \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'RamosGym',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Auto-crear usuario administrador por defecto si la tabla usuarios está vacía
    const [userRows] = await connection.query("SELECT COUNT(*) as count FROM `usuarios`");
    if (userRows[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin123', 10);
      await connection.query(
        "INSERT INTO `usuarios` (username, password, role, nombre, apellido, gym_sede) VALUES ('admin', ?, 'admin', 'Luis', 'Ramos', 'RamosGym')",
        [hash]
      );
      console.log('✅ Usuario Administrador por defecto auto-creado: (admin / admin123)');
    }

    // Tabla de Configuración Global [NUEVA]
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`configuracion\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`gym_name\` VARCHAR(100) NOT NULL DEFAULT 'RamosGym',
        \`tasa_cambio\` DECIMAL(10, 2) NOT NULL DEFAULT 114.00,
        \`logo_url\` VARCHAR(255) DEFAULT NULL,
        \`bcv_last_update\` TIMESTAMP NULL DEFAULT NULL,
        \`cuota_semanal\` DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
        \`cuota_mensual\` DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
        \`cuota_trimestral\` DECIMAL(10, 2) NOT NULL DEFAULT 80.00,
        \`cuota_anual\` DECIMAL(10, 2) NOT NULL DEFAULT 300.00,
        \`cobra_inscripcion\` TINYINT(1) NOT NULL DEFAULT 1,
        \`cuota_inscripcion\` DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
        \`cuota_reactivacion\` DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
        \`umbral_biometrico\` DECIMAL(5, 2) NOT NULL DEFAULT 73.00,
        \`solo_mensual\` TINYINT(1) NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Personal / Entrenadores [NUEVA]
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`personal\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`cedula\` VARCHAR(20) NOT NULL UNIQUE,
        \`nombre\` VARCHAR(50) NOT NULL,
        \`apellido\` VARCHAR(50) NOT NULL,
        \`cargo\` VARCHAR(50) NOT NULL DEFAULT 'Entrenador',
        \`telefono\` VARCHAR(20) DEFAULT NULL,
        \`email\` VARCHAR(100) DEFAULT NULL,
        \`sueldo\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        \`activo\` TINYINT(1) NOT NULL DEFAULT 1,
        \`fecha_contratacion\` DATE DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Gastos [NUEVA]
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`gastos\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`descripcion\` VARCHAR(255) NOT NULL,
        \`monto\` DECIMAL(10, 2) NOT NULL,
        \`categoria\` VARCHAR(100) NOT NULL DEFAULT 'Servicios',
        \`fecha\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_gastos_fecha\` (\`fecha\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Insertar configuración inicial por defecto si está vacía
    const [configRows] = await connection.query("SELECT COUNT(*) as count FROM `configuracion`");
    if (configRows[0].count === 0) {
      await connection.query("INSERT INTO `configuracion` (gym_name, tasa_cambio) VALUES ('RamosGym', 114.00)");
      console.log('✅ Configuración inicial de RamosGym insertada.');
    }

    // MIGRACIONES AUTOMÁTICAS: Adaptar tipo de datos de gym_sede a VARCHAR si eran de tipo ENUM en base de datos previa
    const tablesToMigrate = ['socios', 'pagos', 'registro_asistencias', 'usuarios'];
    for (const table of tablesToMigrate) {
      try {
        await connection.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'RamosGym'`);
      } catch (err) {
        // Ignorar si ya está modificado o no existe
      }
    }

    // MIGRACIÓN: Añadir columna genero a socios si no existe
    try {
      const [columns] = await connection.query("SHOW COLUMNS FROM `socios` LIKE 'genero'");
      if (columns.length === 0) {
        await connection.query("ALTER TABLE `socios` ADD COLUMN `genero` VARCHAR(20) DEFAULT 'Masculino'");
        console.log('✅ Migración: Columna `genero` añadida a la tabla `socios`.');
      }
    } catch (err) {
      console.warn('⚠️ Error al migrar columna genero:', err.message);
    }

    // MIGRACIÓN: Añadir columna fecha_nacimiento a socios si no existe
    try {
      const [columns] = await connection.query("SHOW COLUMNS FROM `socios` LIKE 'fecha_nacimiento'");
      if (columns.length === 0) {
        await connection.query("ALTER TABLE `socios` ADD COLUMN `fecha_nacimiento` DATE DEFAULT NULL");
        console.log('✅ Migración: Columna `fecha_nacimiento` añadida a la tabla `socios`.');
      }
    } catch (err) {
      console.warn('⚠️ Error al migrar columna fecha_nacimiento:', err.message);
    }

    // MIGRACIÓN: Añadir columna bcv_last_update a configuracion si no existe
    try {
      const [columns] = await connection.query("SHOW COLUMNS FROM `configuracion` LIKE 'bcv_last_update'");
      if (columns.length === 0) {
        await connection.query("ALTER TABLE `configuracion` ADD COLUMN `bcv_last_update` TIMESTAMP NULL DEFAULT NULL");
        console.log('✅ Migración: Columna `bcv_last_update` añadida a la tabla `configuracion`.');
      }
    } catch (err) {
      console.warn('⚠️ Error al migrar columna bcv_last_update:', err.message);
    }

    // MIGRACIÓN: Añadir columnas de tarifas a configuracion si no existen (Migración automática incremental)
    const configPriceColumns = [
      { name: 'cuota_semanal', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 10.00' },
      { name: 'cuota_mensual', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 30.00' },
      { name: 'cuota_trimestral', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 80.00' },
      { name: 'cuota_anual', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 300.00' },
      { name: 'cobra_inscripcion', type: 'TINYINT(1) NOT NULL DEFAULT 1' },
      { name: 'cuota_inscripcion', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 10.00' },
      { name: 'cuota_reactivacion', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 5.00' },
      { name: 'umbral_biometrico', type: 'DECIMAL(5, 2) NOT NULL DEFAULT 73.00' },
      { name: 'solo_mensual', type: 'TINYINT(1) NOT NULL DEFAULT 0' }
    ];
    for (const col of configPriceColumns) {
      try {
        const [cols] = await connection.query(`SHOW COLUMNS FROM \`configuracion\` LIKE '${col.name}'`);
        if (cols.length === 0) {
          await connection.query(`ALTER TABLE \`configuracion\` ADD COLUMN \`${col.name}\` ${col.type}`);
          console.log(`✅ Migración: Columna \`${col.name}\` añadida a la tabla \`configuracion\`.`);
        }
      } catch (err) {
        console.warn(`⚠️ Error al migrar columna ${col.name}:`, err.message);
      }
    }

    // MIGRACIÓN: Añadir columna referencia a pagos si no existe (Auditoría de Pago Móvil en Venezuela)
    try {
      const [columns] = await connection.query("SHOW COLUMNS FROM `pagos` LIKE 'referencia'");
      if (columns.length === 0) {
        await connection.query("ALTER TABLE `pagos` ADD COLUMN `referencia` VARCHAR(50) DEFAULT NULL");
        console.log('✅ Migración: Columna `referencia` añadida a la tabla `pagos`.');
      }
    } catch (err) {
      console.warn('⚠️ Error al migrar columna referencia:', err.message);
    }

    // MIGRACIÓN: Añadir columna tasa_cambio a pagos si no existe
    try {
      const [columns] = await connection.query("SHOW COLUMNS FROM `pagos` LIKE 'tasa_cambio'");
      if (columns.length === 0) {
        await connection.query("ALTER TABLE `pagos` ADD COLUMN `tasa_cambio` DECIMAL(10, 2) NOT NULL DEFAULT 114.00");
        console.log('✅ Migración: Columna `tasa_cambio` añadida a la tabla `pagos`.');
      }
    } catch (err) {
      console.warn('⚠️ Error al migrar columna tasa_cambio en pagos:', err.message);
    }

    // MIGRACIÓN: Cambiar metodo_pago a VARCHAR(50) en pagos para soportar Zelle y otros métodos nuevos sin restricciones de ENUM
    try {
      await connection.query("ALTER TABLE `pagos` MODIFY COLUMN `metodo_pago` VARCHAR(50) NOT NULL DEFAULT 'pago_movil'");
      console.log('✅ Migración: Columna `metodo_pago` en la tabla `pagos` modificada a VARCHAR.');
    } catch (err) {
      console.warn('⚠️ Error al migrar columna metodo_pago en pagos:', err.message);
    }

    // MIGRACIÓN: Modificar rol en usuarios para incluir 'kiosco'
    try {
      await connection.query("ALTER TABLE `usuarios` MODIFY COLUMN `role` ENUM('admin', 'recepcionista', 'kiosco') NOT NULL DEFAULT 'recepcionista'");
      console.log('✅ Migración: Columna `role` de la tabla `usuarios` actualizada para incluir el rol `kiosco`.');
    } catch (err) {
      console.warn('⚠️ Error al migrar columna role en usuarios:', err.message);
    }

    console.log('✅ Estructura de tablas deportivas (Configuración, Socios, Personal, Gastos) verificada e inicializada correctamente en MySQL.');
  } catch (error) {
    console.error('❌ Error al inicializar las tablas de la base de datos:', error.message);
  } finally {
    connection.release();
  }
}

// Retorna el pool para realizar consultas
function getPool() {
  if (!pool) {
    throw new Error('❌ Base de datos no inicializada. Llama a initDB() primero.');
  }
  return pool;
}

module.exports = {
  initDB,
  getPool
};
