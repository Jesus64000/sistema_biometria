import React, { useState } from 'react';
import { Shield, Key, User, Dumbbell, LogIn } from 'lucide-react';

function Login({ onLoginSuccess, isKiosk }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e, customUser = null, customPass = null) => {
    if (e) e.preventDefault();
    
    const u = customUser || username;
    const p = customPass || password;

    if (!u || !p) {
      setError('Por favor, introduce usuario y contraseña.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
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

  const handleQuickDemoLogin = (role) => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
      handleLogin(null, 'admin', 'admin123');
    } else {
      setUsername('recep');
      setPassword('recep123');
      handleLogin(null, 'recep', 'recep123');
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--bg-app)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '36px' }}>
        
        {/* Cabecera del Portal */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="sidebar-logo-icon" style={{ margin: '0 auto 12px', width: '46px', height: '46px' }}>
            <Dumbbell size={24} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {isKiosk ? 'AUTORIZACIÓN TOTEM' : 'CONTROL BIOMÉTRICO'}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {isKiosk ? 'Ingrese credenciales para iniciar escáner de entrada' : 'Tesis de Grado • Gestión Administrativa y de Acceso'}
          </p>
        </div>

        {/* Banner de error */}
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

        {/* Formulario */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={13} color="var(--primary)" /> Usuario
            </label>
            <input
              type="text"
              id="login-username"
              className="form-control"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={13} color="var(--primary)" /> Contraseña
            </label>
            <input
              type="password"
              id="login-password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            id="btn-login-submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '6px', gap: '6px', fontWeight: 800, height: '40px' }}
          >
            <LogIn size={15} />
            {loading ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Línea divisoria */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '24px 0 14px',
          color: 'var(--text-muted)',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase'
        }}>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border-color)' }} />
          <span>Acceso Rápido Demo Tesis</span>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        {/* Panel de simulación rápida en 1 clic */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            id="btn-demo-admin"
            className="btn btn-secondary"
            onClick={() => handleQuickDemoLogin('admin')}
            disabled={loading}
            style={{ fontSize: '11px', padding: '6px 10px', flexDirection: 'column', gap: '2px', height: '44px' }}
          >
            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>Luis Ramos</span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Administrador</span>
          </button>

          <button
            type="button"
            id="btn-demo-recep"
            className="btn btn-secondary"
            onClick={() => handleQuickDemoLogin('recep')}
            disabled={loading}
            style={{ fontSize: '11px', padding: '6px 10px', flexDirection: 'column', gap: '2px', height: '44px' }}
          >
            <span style={{ fontWeight: 800, color: 'var(--success)' }}>María Gómez</span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Recepcionista</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;
