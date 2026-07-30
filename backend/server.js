const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Permitir Base64 grandes de capturas de cámara
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Crear carpetas de almacenamiento para subida de fotos
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Inicialización de la Base de Datos
initDB()
  .then(async () => {
    console.log('🚀 Base de datos inicializada de forma segura.');
    
    // Sincronizar tasa BCV al inicio
    const { performBcvSyncInternal } = require('./controllers/configController');
    await performBcvSyncInternal();
    
    // Importación de rutas
    const memberRoutes = require('./routes/members');
    const paymentRoutes = require('./routes/payments');
    const dashboardRoutes = require('./routes/dashboard');
    const biometricsRoutes = require('./routes/biometrics');
    const authRoutes = require('./routes/auth');
    const configRoutes = require('./routes/config');
    const expenseRoutes = require('./routes/expenses');
    const asistenciasRoutes = require('./routes/asistencias');
    const userRoutes = require('./routes/users');
    const personalRoutes = require('./routes/personal');

    // Rutas de API
    app.use('/api/members', memberRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/biometrics', biometricsRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/config', configRoutes);
    app.use('/api/expenses', expenseRoutes);
    app.use('/api/asistencias', asistenciasRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/personal', personalRoutes);

    // Ruta de estado general
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'online',
        database: 'connected',
        timestamp: new Date()
      });
    });

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`📡 Servidor Backend corriendo en: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('💥 Error crítico al arrancar la aplicación:', error.message);
    process.exit(1);
  });
