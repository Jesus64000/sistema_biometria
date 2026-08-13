import React, { useState, useEffect } from 'react';
import { Shield, Key, User, Dumbbell, LogIn, UserPlus, HelpCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

function Login({ onLoginSuccess, isKiosk }) {
  const [view, setView] = useState('login'); // 'login' | 'register' | 'recover'
  const [showPassword, setShowPassword] = useState(false);
  
  // Setup Status (Seguridad: Bloquear registro público si ya hay un usuario)
  const [setupRequired, setSetupRequired] = useState(false);

  const checkSetupStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/auth/setup-status');
      const data = await res.json();
      if (!data.error) {
        setSetupRequired(data.setupRequired);
      }
    } catch (e) {
      console.warn('Error al verificar el estado de configuración inicial:', e.message);
    }
  };

  useEffect(() => {
    checkSetupStatus();
  }, []);

  useEffect(() => {
    if (view === 'register' && !setupRequired) {
      setView('login');
    }
  }, [view, setupRequired]);
  
  // Login States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register States
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regRole, setRegRole] = useState('recepcionista');
  
  // Recovery States
  const [recUsername, setRecUsername] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');
  const [recKey, setRecKey] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, introduce usuario y contraseña.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.error || 'Credenciales de acceso incorrectas.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. ¿Está el backend y XAMPP MySQL activo?');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regNombre || !regApellido) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          nombre: regNombre,
          apellido: regApellido,
          role: regRole,
          gym_sede: 'RamosGym'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('✓ ¡Cuenta registrada con éxito! Ya puede iniciar sesión.');
        // Limpiar registro
        setRegUsername('');
        setRegPassword('');
        setRegNombre('');
        setRegApellido('');
        setView('login');
      } else {
        setError(data.error || 'Error al registrar la cuenta administrativa.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    if (!recUsername || !recNewPassword || !recKey) {
      setError('Complete todos los campos de restauración.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: recUsername,
          newPassword: recNewPassword,
          recoveryKey: recKey
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('✓ Contraseña restablecida con éxito. Inicie sesión.');
        setRecUsername('');
        setRecNewPassword('');
        setRecKey('');
        setView('login');
      } else {
        setError(data.error || 'No se pudo restablecer la contraseña.');
      }
    } catch (err) {
      setError('Error al comunicar con el servidor para reajuste de contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--bg-app)',
      backgroundImage: 'radial-gradient(circle at center, var(--bg-card) 0%, var(--bg-app) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'var(--font-main)'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '36px', border: '1px solid var(--border-color)' }}>
        
        {/* Cabecera del Portal */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="sidebar-logo-icon" style={{ margin: '0 auto 12px', width: '46px', height: '46px' }}>
            <Dumbbell size={24} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            {view === 'login' && (isKiosk ? 'AUTORIZACIÓN TÓTEM' : 'CONTROL BIOMÉTRICO')}
            {view === 'register' && 'CREAR CUENTA ADMINISTRATIVA'}
            {view === 'recover' && 'RECUPERAR ACCESO'}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {view === 'login' && (isKiosk ? 'Ingrese credenciales para iniciar escáner de entrada' : 'Sistema de Gestión y Acceso de Socios')}
            {view === 'register' && 'Regístrese para operar el control de RamosGym'}
            {view === 'recover' && 'Restablecer contraseña local mediante Llave Maestra'}
          </p>
        </div>

        {/* Feedback Flotante (Error / Éxito) */}
        {error && (
          <div className="badge badge-danger" style={{
            width: '100%',
            borderRadius: 'var(--border-radius-md)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left',
            whiteSpace: 'normal',
            lineHeight: '1.4'
          }}>
            <Shield size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="badge badge-success" style={{
            width: '100%',
            borderRadius: 'var(--border-radius-md)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left',
            whiteSpace: 'normal',
            lineHeight: '1.4',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <span>{success}</span>
          </div>
        )}

        {/* VISTA 1: INICIAR SESIÓN (LOGIN) */}
        {view === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} color="var(--primary)" /> Nombre de Usuario
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={13} color="var(--primary)" /> Contraseña
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '6px', gap: '6px', fontWeight: 800, height: '40px' }}
            >
              <LogIn size={15} />
              {loading ? 'Validando...' : 'Iniciar Sesión'}
            </button>

            {/* Enlaces de pie de login */}
            <div style={{ display: 'flex', justifyContent: setupRequired ? 'space-between' : 'flex-end', fontSize: '11px', marginTop: '14px', fontWeight: 600 }}>
              {setupRequired && (
                <span 
                  onClick={() => { setView('register'); setError(''); setSuccess(''); }}
                  style={{ color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <UserPlus size={12} /> Registrarse
                </span>
              )}
              <span 
                onClick={() => { setView('recover'); setError(''); setSuccess(''); }}
                style={{ color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <HelpCircle size={12} /> ¿Olvidó su clave?
              </span>
            </div>
          </form>
        )}

        {/* VISTA 2: REGISTRO DE NUEVAS CUENTAS (SIGN UP) */}
        {view === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Juan"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Apellido *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Gómez"
                  value={regApellido}
                  onChange={(e) => setRegApellido(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre de Usuario *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. juanperez"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rol Operativo *</label>
              <select
                className="form-control"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                disabled={loading}
              >
                <option value="recepcionista">Recepcionista (Operaciones front-desk)</option>
                <option value="admin">Administrador (Control total y finanzas)</option>
                <option value="kiosco">Tótem Kiosco (Solo escáner de portería)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Contraseña de Acceso *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Mínimo 6 caracteres"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '6px', fontWeight: 800, height: '40px', gap: '6px' }}
            >
              <UserPlus size={15} />
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>

            <span 
              onClick={() => { setView('login'); setError(''); setSuccess(''); }}
              style={{ color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, alignSelf: 'center', marginTop: '8px' }}
            >
              <ArrowLeft size={12} /> Volver al Inicio
            </span>
          </form>
        )}

        {/* VISTA 3: RECUPERACIÓN DE CUENTAS OFFLINE (PASSWORD RESET) */}
        {view === 'recover' && (
          <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre de Usuario a Recuperar *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. administrador"
                value={recUsername}
                onChange={(e) => setRecUsername(e.target.value.toLowerCase().trim())}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nueva Contraseña *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Escriba nueva clave"
                value={recNewPassword}
                onChange={(e) => setRecNewPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#c084fc' }}>Llave Maestra de Recuperación del Administrador *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Llave configurada en .env"
                value={recKey}
                onChange={(e) => setRecKey(e.target.value)}
                disabled={loading}
                required
                style={{ borderColor: 'rgba(168, 85, 247, 0.3)' }}
              />
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '4px', lineHeight: '1.3' }}>
                * Sistema local fuera de línea: requiere la llave maestra para autorizar cambios directos en MySQL. Por defecto: **Cabimas2026**.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '6px', fontWeight: 800, height: '40px', gap: '6px', backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' }}
            >
              🔄 Restablecer Contraseña
            </button>

            <span 
              onClick={() => { setView('login'); setError(''); setSuccess(''); }}
              style={{ color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, alignSelf: 'center', marginTop: '8px' }}
            >
              <ArrowLeft size={12} /> Volver al Inicio
            </span>
          </form>
        )}

      </div>
    </div>
  );
}

export default Login;
