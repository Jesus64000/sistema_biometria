-- Esquema SQL para el Sistema de Biometría Facial y Gestión de Centros Deportivos "Marian Gym"
-- Diseñado para MySQL (compatible con XAMPP)

-- Creación de la base de datos si no existe
CREATE DATABASE IF NOT EXISTS `sistema_biometria` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sistema_biometria`;

-- 1. Tabla de Socios
CREATE TABLE IF NOT EXISTS `socios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `cedula` VARCHAR(20) NOT NULL UNIQUE,
    `nombre` VARCHAR(50) NOT NULL,
    `apellido` VARCHAR(50) NOT NULL,
    `telefono` VARCHAR(20) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `foto_url` VARCHAR(255) DEFAULT NULL,
    `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('activo', 'inactivo') DEFAULT 'activo',
    `gym_sede` VARCHAR(50) NOT NULL DEFAULT 'RamosGym',
    INDEX `idx_cedula` (`cedula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Membresías
CREATE TABLE IF NOT EXISTS `membresias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `socio_id` INT NOT NULL,
    `tipo` ENUM('mensual', 'trimestral', 'anual') NOT NULL DEFAULT 'mensual',
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,
    `solvencia` TINYINT(1) NOT NULL DEFAULT 1, -- 1 = Solvente, 0 = Insolvente
    FOREIGN KEY (`socio_id`) REFERENCES `socios`(`id`) ON DELETE CASCADE,
    INDEX `idx_socio_id` (`socio_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Pagos
CREATE TABLE IF NOT EXISTS `pagos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `socio_id` INT NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `fecha_pago` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `metodo_pago` ENUM('efectivo', 'pago_movil', 'divisas', 'transferencia') NOT NULL DEFAULT 'pago_movil',
    `gym_sede` VARCHAR(50) NOT NULL DEFAULT 'RamosGym',
    FOREIGN KEY (`socio_id`) REFERENCES `socios`(`id`) ON DELETE CASCADE,
    INDEX `idx_pago_socio` (`socio_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Registro de Asistencias (Historial de Accesos)
CREATE TABLE IF NOT EXISTS `registro_asistencias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `socio_id` INT NOT NULL,
    `fecha_hora` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `metodo` ENUM('facial', 'manual') DEFAULT 'facial',
    `status_acceso` ENUM('permitido', 'denegado') NOT NULL,
    `razon_denegacion` VARCHAR(255) DEFAULT NULL, -- Ej: 'Insolvente', 'Membresía Vencida', etc.
    `gym_sede` VARCHAR(50) NOT NULL DEFAULT 'RamosGym',
    FOREIGN KEY (`socio_id`) REFERENCES `socios`(`id`) ON DELETE CASCADE,
    INDEX `idx_asistencia_socio` (`socio_id`),
    INDEX `idx_fecha_hora` (`fecha_hora`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de Usuarios Administrativos (Acceso y Seguridad)
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'recepcionista') NOT NULL DEFAULT 'recepcionista',
    `nombre` VARCHAR(50) NOT NULL,
    `apellido` VARCHAR(50) NOT NULL,
    `gym_sede` VARCHAR(50) NOT NULL DEFAULT '',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla de Configuración Global [NUEVA]
CREATE TABLE IF NOT EXISTS `configuracion` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `gym_name` VARCHAR(100) NOT NULL DEFAULT 'RamosGym',
    `tasa_cambio` DECIMAL(10, 2) NOT NULL DEFAULT 114.00,
    `logo_url` VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla de Gastos [NUEVA]
CREATE TABLE IF NOT EXISTS `gastos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `descripcion` VARCHAR(255) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `categoria` VARCHAR(100) NOT NULL DEFAULT 'Servicios',
    `fecha` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_gastos_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
