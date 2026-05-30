import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ScanFace, 
  CreditCard, 
  DollarSign, 
  FileText, 
  Dumbbell, 
  Settings as SettingsIcon, 
  LogOut, 
  Sun, 
  Moon, 
  UserCheck,
  TrendingUp,
  Maximize2,
  BarChart2
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import Members from './components/Members';
import BiometricAccess from './components/BiometricAccess';
import Login from './components/Login';
import Analytics from './components/Analytics';

// Módulos auxiliares simplificados e incrustados para velocidad y portabilidad
import Expenses from './components/Expenses';
import Notes from './components/Notes';
import Personal from './components/Personal';
import UsersManager from './components/Users';
import KioskStatus from './components/KioskStatus';
import Settings from './components/Settings';

function App() {

  // Cargar sesión inicial desde localStorage si existe
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || '');
  const [user, setUser] = useState(
    localStorage.getItem('active_user') ? JSON.parse(localStorage.getItem('active_user')) : null
  );

  // Evaluar modo Kiosco al arrancar (Soporta rol 'kiosco' directo)
  const isKioskInit = window.location.search.includes('kiosk=true') || window.location.hash === '#kiosk' || (user && user.role === 'kiosco');
  const [currentView, setCurrentView] = useState(isKioskInit ? 'kiosk' : 'dashboard');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('dark_mode') === 'true');
  
  // Variables globales de configuración dinámicas
  const [gymName, setGymName] = useState('Marian Gym');
  const [tasaCambio, setTasaCambio] = useState(114.00);

  // Cargar configuración global al montar o al ingresar
  const fetchGlobalConfig = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/config');
      const data = await res.json();
      if (!data.error) {
        setGymName(data.gym_name);
        setTasaCambio(parseFloat(data.tasa_cambio) || 114.00);
      }
    } catch (error) {
      console.warn('Error al conectar con la API de configuración:', error.message);
    }
  };

  const [nodeStatus, setNodeStatus] = useState('checking');
  const [pythonStatus, setPythonStatus] = useState('checking');

  const checkTelemetry = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/config');
      if (res.ok) setNodeStatus('online');
      else setNodeStatus('offline');
    } catch (e) {
      setNodeStatus('offline');
    }

    try {
      await fetch('http://localhost:5000/', { mode: 'no-cors' });
      setPythonStatus('online');
    } catch (e) {
      setPythonStatus('offline');
    }
  };

  useEffect(() => {
    checkTelemetry();
    const interval = setInterval(checkTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  // Manejar el toggle de modo Claro/Oscuro
  useEffect(() => {
    const htmlEl = document.documentElement;
    if (darkMode) {
      htmlEl.classList.add('dark-mode');
      localStorage.setItem('dark_mode', 'true');
    } else {
      htmlEl.classList.remove('dark-mode');
      localStorage.setItem('dark_mode', 'false');
    }
  }, [darkMode]);

  // Manejador de Login Exitoso
  const handleLoginSuccess = (newToken, loggedUser) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem('jwt_token', newToken);
    localStorage.setItem('active_user', JSON.stringify(loggedUser));
    
    const isKioskMode = window.location.search.includes('kiosk=true') || window.location.hash === '#kiosk';
    if (isKioskMode) {
      setCurrentView('kiosk');
    } else {
      setCurrentView('dashboard');
    }
  };

  // Manejador de Logout
  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('active_user');
    
    const isKioskMode = window.location.search.includes('kiosk=true') || window.location.hash === '#kiosk';
    setCurrentView(isKioskMode ? 'kiosk' : 'dashboard');
  };

  const verifyTokenOnServer = async (tokenToCheck) => {
    try {
      const res = await fetch('http://localhost:3000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${tokenToCheck}` }
      });
      if (res.status === 401 || res.status === 403) {
        console.warn('Sesión expirada o inválida. Cerrando sesión automáticamente.');
        handleLogout();
      }
    } catch (e) {
      console.error('Error al verificar sesión en el servidor:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchGlobalConfig();
      verifyTokenOnServer(token);
    }
  }, [token]);

  // Menú lateral de módulos principales
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'members', label: 'Clientes', icon: Users },
    { id: 'payments', label: 'Control de pagos', icon: CreditCard },
  ];

  const auxiliaryItems = [
    { id: 'analytics', label: 'Analíticas', icon: BarChart2 },
    { id: 'expenses', label: 'Gastos', icon: DollarSign },
    { id: 'notes', label: 'Notas', icon: FileText },
    { id: 'trainers', label: 'Personal y Staff', icon: Dumbbell },
    { id: 'users', label: 'Usuarios', icon: UserCheck },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon },
  ];

  // 📺 ESCENARIO ESPECIAL: Pantalla secundaria de Kiosco/Escáner Completo en Pantalla 2
  const isKioskStatusPage = window.location.pathname.includes('/kiosk-status') || window.location.hash.includes('kiosk-status');
  if (isKioskStatusPage) {
    return (
      <div className="kiosk-viewport-container">
        <BiometricAccess 
          activeGym={gymName} 
          isKiosk={true} 
          exitKiosk={() => {
            window.location.href = '/';
          }} 
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Si no está autenticado, redirigir a la compuerta de login
  if (!token || !user) {
    const isKioskMode = window.location.search.includes('kiosk=true') || window.location.hash === '#kiosk' || isKioskStatusPage;
    return <Login onLoginSuccess={handleLoginSuccess} isKiosk={isKioskMode} />;
  }

  // 📺 ESCENARIO ESPECIAL: Modo Kiosco (Pantalla de entrada a pantalla completa)
  if (currentView === 'kiosk') {
    return (
      <div className="kiosk-viewport-container">
        <BiometricAccess 
          activeGym={gymName} 
          isKiosk={true} 
          exitKiosk={() => {
            if (window.location.search.includes('kiosk=true') || window.location.hash === '#kiosk') {
              window.history.pushState({}, '', window.location.pathname);
            }
            setCurrentView('dashboard');
          }} 
          onLogout={handleLogout}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 1. Barra Lateral */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Dumbbell size={18} strokeWidth={2.5} />
          </div>
          <span className="sidebar-logo-text">{gymName}</span>
        </div>

        {/* Sección de Módulos Principales */}
        <span className="sidebar-label">Módulos</span>
        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li 
                key={item.id}
                id={`menu-item-${item.id}`}
                className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>

        {/* Sección de Gestión Auxiliar */}
        <span className="sidebar-label">Administración</span>
        <ul className="sidebar-menu">
          {auxiliaryItems.map((item) => {
            // Si el rol es recepcionista, bloqueamos configuración, gastos, analíticas y usuarios del sistema
            if ((item.id === 'settings' || item.id === 'expenses' || item.id === 'analytics' || item.id === 'users') && user.role !== 'admin') return null;
            const Icon = item.icon;
            return (
              <li 
                key={item.id}
                id={`menu-item-${item.id}`}
                className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>

        {/* Footer de la Barra Lateral con Perfil y Logout */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '0 4px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(15, 98, 254, 0.08)',
              border: '1px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              flexShrink: 0
            }}>
              <UserCheck size={16} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.nombre}
              </p>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {user.role === 'admin' ? 'Administrador' : 'Recepcionista'}
              </span>
            </div>
          </div>

          <button 
            id="btn-logout"
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              padding: '8px 12px', 
              fontSize: '11px', 
              justifyContent: 'center', 
              gap: '6px',
              borderColor: 'rgba(230, 57, 70, 0.15)',
              color: 'var(--danger)'
            }}
          >
            <LogOut size={12} />
            Cerrar Sesión
          </button>
          
          <p style={{ marginTop: '14px', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>
            Tesis Luis Ramos • Cabimas
          </p>
        </div>
      </aside>

      {/* 2. Área de Contenido Principal */}
      <main className="main-content">
        {/* Encabezado Principal */}
        <header className="header">
          <div className="header-title-container">
            <h1 className="header-title">
              {currentView === 'dashboard' && 'Inicio'}
              {currentView === 'members' && 'Clientes'}
              {currentView === 'analytics' && 'Auditoría y Analíticas de Negocio'}
              {currentView === 'access' && 'Control de Acceso'}
              {currentView === 'payments' && 'Control de Pagos'}
              {currentView === 'expenses' && 'Registro de Gastos'}
              {currentView === 'notes' && 'Bloc de Notas'}
              {currentView === 'trainers' && 'Personal y Staff Técnico'}
              {currentView === 'users' && 'Cuentas de Usuarios'}
              {currentView === 'settings' && 'Configuración del Sistema'}
            </h1>
            <p className="header-subtitle">
              {currentView === 'dashboard' && 'Inicio / Panel principal'}
              {currentView === 'members' && 'Clientes / Directorio de afiliados'}
              {currentView === 'analytics' && 'Analíticas / Indicadores estadísticos de afluencia'}
              {currentView === 'access' && 'Control de acceso / Escáner de recepción'}
              {currentView === 'payments' && 'Membresías / Control de mensualidades'}
              {currentView === 'expenses' && 'Administración / Egresos del establecimiento'}
              {currentView === 'notes' && 'Herramientas / Notas rápidas administrativas'}
              {currentView === 'trainers' && 'Personal / Staff técnico y entrenadores'}
              {currentView === 'users' && 'Seguridad / Cuentas operativas del sistema'}
              {currentView === 'settings' && 'Parámetros / Tasa de cambio y precios dinámicos'}
            </p>
          </div>

          <div className="header-actions">
            {/* Telemetría Offline de Conexión */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginRight: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '5px 12px', borderRadius: '20px' }}>
              {/* LED MySQL DB */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={nodeStatus === 'online' ? 'Base de Datos MySQL (XAMPP): CONECTADO' : 'Base de Datos MySQL (XAMPP): DESCONECTADO (Verifique XAMPP)'}>
                <div style={{ 
                  width: '7px', 
                  height: '7px', 
                  borderRadius: '50%', 
                  backgroundColor: nodeStatus === 'online' ? '#10b981' : nodeStatus === 'offline' ? '#ef4444' : '#eab308',
                  boxShadow: nodeStatus === 'online' ? '0 0 8px #10b981' : nodeStatus === 'offline' ? '0 0 8px #ef4444' : '0 0 8px #eab308',
                  transition: 'all 0.3s ease'
                }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '9px', fontWeight: 800 }}>DB Local</span>
              </div>

              {/* LED Python Biometrics */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={pythonStatus === 'online' ? 'Servicio Facial IA (Python Flask): CONECTADO' : 'Servicio Facial IA (Python Flask): DESCONECTADO (Ejecute iniciar_sistema.bat)'}>
                <div style={{ 
                  width: '7px', 
                  height: '7px', 
                  borderRadius: '50%', 
                  backgroundColor: pythonStatus === 'online' ? '#10b981' : pythonStatus === 'offline' ? '#ef4444' : '#eab308',
                  boxShadow: pythonStatus === 'online' ? '0 0 8px #10b981' : pythonStatus === 'offline' ? '0 0 8px #ef4444' : '0 0 8px #eab308',
                  transition: 'all 0.3s ease'
                }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '9px', fontWeight: 800 }}>IA Facial</span>
              </div>
            </div>

            {/* Tasa del día dinámico */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              backgroundColor: 'rgba(15, 98, 254, 0.05)', 
              padding: '6px 14px', 
              borderRadius: '9999px',
              border: '1px solid rgba(15, 98, 254, 0.1)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--primary)'
            }}>
              <TrendingUp size={14} />
              <span>Tasa: Bs. {Number(tasaCambio).toFixed(2)}</span>
            </div>

            {/* Toggle de Modo Claro / Modo Oscuro */}
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 10px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Modo Claro' : 'Modo Oscuro'}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Botón para abrir Kiosco en pantalla completa */}
            <button
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '8px 14px', gap: '6px' }}
              onClick={() => setCurrentView('kiosk')}
            >
              <Maximize2 size={13} />
              <span>Kiosco Entrada</span>
            </button>
          </div>
        </header>

        {/* Vista Renderizada */}
        <div className="view-container">
          {currentView === 'dashboard' && (
            <Dashboard 
              activeGym={gymName} 
              tasaCambio={tasaCambio} 
              onNavigate={(view) => setCurrentView(view)} 
              user={user}
            />
          )}
          {currentView === 'members' && <Members activeGym={gymName} user={user} />}
          {currentView === 'analytics' && <Analytics />}
          {currentView === 'access' && <BiometricAccess activeGym={gymName} isKiosk={false} />}
          {currentView === 'payments' && <Members activeGym={gymName} initialTab="payments" user={user} />}
          {currentView === 'expenses' && <Expenses user={user} />}
          {currentView === 'notes' && <Notes />}
          {currentView === 'trainers' && <Personal tasaCambio={tasaCambio} />}
          {currentView === 'users' && <UsersManager />}
          {currentView === 'settings' && (
            <Settings 
              gymName={gymName} 
              tasaCambio={tasaCambio} 
              onUpdate={() => {
                fetchGlobalConfig();
              }} 
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
