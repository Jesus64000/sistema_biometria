const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, fork } = require('child_process');
const net = require('net');
const http = require('http');

let mainWindow = null;
let nodeBackendProcess = null;
let pythonBiometricsProcess = null;
let mysqlProcess = null;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Verificar disponibilidad de un puerto TCP
function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true); // Puerto en uso (servicio activo)
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// Esperar a que el backend de Node.js responda en http://localhost:3000/api/health
function waitForBackend(url = 'http://localhost:3000/api/health', maxRetries = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };

    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        reject(new Error('Tiempo de espera agotado para el inicio del servidor Backend.'));
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

// 1. Iniciar Motor de Biometría Facial (Python)
function startPythonBiometrics() {
  return new Promise(async (resolve) => {
    const isPortOpen = await checkPort(5000);
    if (isPortOpen) {
      console.log('✅ Motor biométrico ya activo en puerto 5000.');
      return resolve();
    }

    let pythonExePath = null;
    let cwd = null;
    let args = [];

    const fs = require('fs');
    const packagedExe = path.join(process.resourcesPath, 'biometrics', 'biometrics.exe');
    const unpackedExe = path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), 'biometrics', 'biometrics.exe');
    const rootDistExe = path.join(__dirname, '..', 'dist', 'biometrics', 'biometrics.exe');
    const localDistExe = path.join(__dirname, '..', 'biometrics', 'dist', 'biometrics', 'biometrics.exe');
    const localScript = path.join(__dirname, '..', 'biometrics', 'app.py');

    if (fs.existsSync(packagedExe)) {
      pythonExePath = packagedExe;
      cwd = path.dirname(packagedExe);
    } else if (fs.existsSync(unpackedExe)) {
      pythonExePath = unpackedExe;
      cwd = path.dirname(unpackedExe);
    } else if (fs.existsSync(rootDistExe)) {
      pythonExePath = rootDistExe;
      cwd = path.dirname(rootDistExe);
    } else if (fs.existsSync(localDistExe)) {
      pythonExePath = localDistExe;
      cwd = path.dirname(localDistExe);
    } else if (fs.existsSync(localScript)) {
      pythonExePath = 'python';
      args = [localScript];
      cwd = path.dirname(localScript);
    }

    const biometricsDataDir = path.join(app.getPath('userData'), 'biometrics_data');
    if (!fs.existsSync(biometricsDataDir)) {
      fs.mkdirSync(biometricsDataDir, { recursive: true });
    }

    if (pythonExePath) {
      console.log(`🚀 Iniciando motor biométrico: ${pythonExePath}`);
      pythonBiometricsProcess = spawn(pythonExePath, args, {
        cwd,
        windowsHide: true,
        env: {
          ...process.env,
          BIOMETRICS_DATA_DIR: biometricsDataDir
        },
        stdio: 'pipe'
      });

      pythonBiometricsProcess.stdout.on('data', (data) => {
        console.log(`[Python Biometrics]: ${data}`);
      });

      pythonBiometricsProcess.stderr.on('data', (data) => {
        console.error(`[Python Biometrics Error]: ${data}`);
      });

      pythonBiometricsProcess.on('exit', (code) => {
        console.log(`[Python Biometrics] Finalizó con código: ${code}`);
      });
    }

    setTimeout(resolve, 2000);
  });
}

// 2. Iniciar Servidor Node.js Backend
function startNodeBackend() {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    let serverScript;

    if (app.isPackaged) {
      const unpackedDir = app.getAppPath().replace('app.asar', 'app.asar.unpacked');
      serverScript = path.join(unpackedDir, 'backend', 'server.js');
      if (!fs.existsSync(serverScript)) {
        serverScript = path.join(process.resourcesPath, 'backend', 'server.js');
      }
    } else {
      serverScript = path.join(__dirname, '..', 'backend', 'server.js');
    }

    console.log(`🚀 Iniciando Backend Express: ${serverScript}`);

    const backendCwd = path.dirname(serverScript);
    let backendLogs = [];

    const appPath = app.getAppPath();
    const unpackedDir = appPath.replace('app.asar', 'app.asar.unpacked');
    const nodePathEnv = [
      path.join(unpackedDir, 'backend', 'node_modules'),
      path.join(unpackedDir, 'node_modules'),
      path.join(appPath, 'node_modules'),
      process.env.NODE_PATH || ''
    ].filter(Boolean).join(path.delimiter);

    const uploadsDir = path.join(app.getPath('userData'), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    nodeBackendProcess = fork(serverScript, [], {
      cwd: backendCwd,
      env: {
        ...process.env,
        PORT: '3000',
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1',
        NODE_PATH: nodePathEnv,
        UPLOADS_DIR: uploadsDir
      },
      stdio: 'pipe'
    });

    nodeBackendProcess.stdout.on('data', (data) => {
      const msg = `[Node Backend]: ${data.toString().trim()}`;
      console.log(msg);
      backendLogs.push(msg);
      if (backendLogs.length > 50) backendLogs.shift();
    });

    nodeBackendProcess.stderr.on('data', (data) => {
      const msg = `[Node Backend Error]: ${data.toString().trim()}`;
      console.error(msg);
      backendLogs.push(msg);
      if (backendLogs.length > 50) backendLogs.shift();
    });

    nodeBackendProcess.on('exit', (code) => {
      const msg = `[Node Backend] Finalizó con código: ${code}`;
      console.log(msg);
      backendLogs.push(msg);
    });

    // Esperar a que el endpoint responda
    waitForBackend('http://localhost:3000/api/health')
      .then(resolve)
      .catch((err) => {
        const errorDetails = backendLogs.length > 0 ? backendLogs.join('\n') : err.message;
        reject(new Error(`${err.message}\n\nDetalles del servidor Node:\n${errorDetails}`));
      });
  });
}

// Crear la ventana de la aplicación
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'Ramos Gym - Gestión Deportiva y Biometría Facial',
    backgroundColor: '#0a0d14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Permitir acceso local a recursos y cámaras
    },
    autoHideMenuBar: true,
    show: false
  });

  // Maximizar por defecto para experiencia inmersiva
  mainWindow.maximize();

  // Otorgar permisos de cámara automáticamente a la UI
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return true;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') return callback(true);
    callback(true);
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 0. Detección y arranque automático de MySQL / MariaDB Portable si el puerto 3306 no responde
async function startMySQLIfNeeded() {
  const isPort3306Open = await checkPort(3306);
  if (isPort3306Open) {
    console.log('✅ Servicio MySQL activo detectado en el puerto 3306.');
    return;
  }

  console.log('⚠️ No se detectó servicio MySQL en puerto 3306. Intentando arranque automático de MySQL...');

  const fs = require('fs');
  const userDataDir = app.getPath('userData');
  const mysqlDataDir = path.join(userDataDir, 'mysql_data');

  if (!fs.existsSync(mysqlDataDir)) {
    fs.mkdirSync(mysqlDataDir, { recursive: true });
  }

  let mysqldExe = null;
  let args = [];

  const bundledMysql = path.join(process.resourcesPath, 'mysql', 'bin', 'mysqld.exe');
  const unpackedMysql = path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), 'database', 'mysql', 'bin', 'mysqld.exe');
  const xamppMysql = 'C:\\xampp\\mysql\\bin\\mysqld.exe';

  if (fs.existsSync(bundledMysql)) {
    mysqldExe = bundledMysql;
    args = [`--datadir=${mysqlDataDir}`, `--port=3306`, `--standalone`];
  } else if (fs.existsSync(unpackedMysql)) {
    mysqldExe = unpackedMysql;
    args = [`--datadir=${mysqlDataDir}`, `--port=3306`, `--standalone`];
  } else if (fs.existsSync(xamppMysql)) {
    mysqldExe = xamppMysql;
    const xamppIni = 'C:\\xampp\\mysql\\bin\\my.ini';
    if (fs.existsSync(xamppIni)) {
      args = [`--defaults-file=${xamppIni}`];
    } else {
      args = [`--datadir=${mysqlDataDir}`, `--port=3306`, `--standalone`];
    }
  }

  if (mysqldExe) {
    console.log(`🚀 Arrancando motor MySQL en segundo plano: ${mysqldExe}`);
    mysqlProcess = spawn(mysqldExe, args, {
      windowsHide: true,
      stdio: 'ignore'
    });

    mysqlProcess.on('exit', (code) => {
      console.log(`[MySQL Process] Finalizó con código: ${code}`);
    });

    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const active = await checkPort(3306);
      if (active) {
        console.log('✅ Servicio MySQL iniciado y respondiendo en el puerto 3306.');
        return;
      }
    }
  }
}

// Inicialización de la aplicación Electron
app.whenReady().then(async () => {
  try {
    console.log('⚡ Inicializando subsistemas de Ramos Gym...');
    
    // Iniciar MySQL automático si no está activo
    await startMySQLIfNeeded();

    // Iniciar Python y Node en paralelo/secuencia
    await startPythonBiometrics();
    await startNodeBackend();

    createMainWindow();
  } catch (error) {
    console.error('💥 Error crítico al inicializar la aplicación:', error);
    dialog.showErrorBox(
      'Error de Inicialización',
      `No se pudo iniciar el servidor local:\n${error.message}\n\nAsegúrate de que MySQL esté activo en el puerto 3306.`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Limpieza de procesos al cerrar la app
function cleanupProcesses() {
  console.log('🛑 Cerrando subsistemas de Ramos Gym...');
  
  if (nodeBackendProcess) {
    nodeBackendProcess.kill('SIGTERM');
    nodeBackendProcess = null;
  }
  
  if (pythonBiometricsProcess) {
    pythonBiometricsProcess.kill('SIGTERM');
    pythonBiometricsProcess = null;
  }

  if (mysqlProcess) {
    mysqlProcess.kill('SIGTERM');
    mysqlProcess = null;
  }
}

app.on('before-quit', cleanupProcesses);
app.on('window-all-closed', () => {
  cleanupProcesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
