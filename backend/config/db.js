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
  try {
    // 1. Conectar al servidor MySQL (sin especificar DB todavía)
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado al servidor de bases de datos de XAMPP MySQL.');

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
    console.error('❌ Error de conexión con XAMPP MySQL:', error.message);
    console.log('💡 Sugerencia: Asegúrate de que XAMPP esté abierto y el módulo de MySQL esté activo (botón "Start").');
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
        \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'MarianGym',
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
        \`metodo_pago\` ENUM('efectivo', 'pago_movil', 'divisas', 'transferencia') NOT NULL DEFAULT 'pago_movil',
        \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'MarianGym',
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
        \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'MarianGym',
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
        \`role\` ENUM('admin', 'recepcionista') NOT NULL DEFAULT 'recepcionista',
        \`nombre\` VARCHAR(50) NOT NULL,
        \`apellido\` VARCHAR(50) NOT NULL,
        \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'MarianGym',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Configuración Global [NUEVA]
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`configuracion\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`gym_name\` VARCHAR(100) NOT NULL DEFAULT 'Marian Gym',
        \`tasa_cambio\` DECIMAL(10, 2) NOT NULL DEFAULT 114.00,
        \`logo_url\` VARCHAR(255) DEFAULT NULL,
        \`bcv_last_update\` TIMESTAMP NULL DEFAULT NULL
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
      await connection.query("INSERT INTO `configuracion` (gym_name, tasa_cambio) VALUES ('Marian Gym', 114.00)");
      console.log('✅ Configuración inicial de Marian Gym insertada.');
    }

    // MIGRACIONES AUTOMÁTICAS: Adaptar tipo de datos de gym_sede a VARCHAR si eran de tipo ENUM en base de datos previa
    const tablesToMigrate = ['socios', 'pagos', 'registro_asistencias', 'usuarios'];
    for (const table of tablesToMigrate) {
      try {
        await connection.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`gym_sede\` VARCHAR(50) NOT NULL DEFAULT 'MarianGym'`);
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

    console.log('✅ Estructura de tablas deportivas (Configuración, Socios, Gastos) verificada e inicializada correctamente en MySQL.');
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
