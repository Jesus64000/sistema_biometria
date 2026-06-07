import React, { useState, useEffect } from 'react';

export default function Users({ activeGym = 'RamosGym' }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modales y formularios
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null para Crear, objeto user para Editar
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'recepcionista',
    nombre: '',
    apellido: '',
    gym_sede: activeGym
  });

  // Cargar token del localStorage
  const getHeaders = () => {
    const token = localStorage.getItem('jwt_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/users', { headers: getHeaders() });
      if (res.status === 403) {
        setError('Acceso denegado. Este portal es exclusivo para Administradores.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Error de red al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'recepcionista',
      nombre: '',
      apellido: '',
      gym_sede: activeGym
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Se deja vacío para indicar que no se cambiará a menos que escriba
      role: user.role,
      nombre: user.nombre,
      apellido: user.apellido,
      gym_sede: user.gym_sede || activeGym
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.nombre || !formData.apellido) {
      alert('Por favor complete todos los campos obligatorios.');
      return;
    }
    if (!editingUser && !formData.password) {
      alert('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }

    try {
      const url = editingUser 
        ? `http://localhost:3000/api/users/${editingUser.id}` 
        : 'http://localhost:3000/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert(editingUser ? 'Usuario actualizado con éxito.' : 'Usuario creado con éxito.');
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Error en red al procesar el usuario.');
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar al usuario administrativo "${username}"?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const result = await res.json();
      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert('Usuario eliminado con éxito.');
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Error al conectar con el servidor.');
    }
  };

  if (error) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: 'rgba(239, 68, 68, 0.05)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '16px',
        margin: '40px auto',
        maxWidth: '600px',
        fontFamily: 'var(--font-main)'
      }}>
        <h2 style={{ color: '#ef4444', fontWeight: 800, fontSize: '24px', margin: 0 }}>🚫 ACCESO RESTRINGIDO</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '15px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'var(--font-main)', color: 'var(--text-primary)' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Cuentas y Usuarios Administrativos
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, marginTop: '4px' }}>
            Controla quién accede a la plataforma de {activeGym} y define sus permisos operativos.
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--btn-primary-shadow)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
        >
          ➕ Nuevo Usuario
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
          {[1, 2, 3].map(n => (
            <div key={n} className="skeleton" style={{ height: '70px', borderRadius: '12px', width: '100%' }}></div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-table-header)' }}>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nombre Completo</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nombre de Usuario</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rol asignado</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700 }}>
                    {user.nombre} {user.apellido}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    @{user.username}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      backgroundColor: user.role === 'admin' ? 'rgba(168, 85, 247, 0.1)' : user.role === 'kiosco' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      color: user.role === 'admin' ? '#c084fc' : user.role === 'kiosco' ? '#38bdf8' : '#eab308'
                    }}>
                      💼 {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => openEditModal(user)}
                        className="btn-action" 
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--text-primary)'
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id, user.username)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#ef4444'
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Satinado Crear/Editar */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '480px', padding: '28px', animation: 'scaleUp 0.2s ease-out' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 800 }}>
              {editingUser ? '✏️ Editar Datos de Usuario' : '➕ Crear Nuevo Usuario Administrativo'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input 
                    type="text" 
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '') }))}
                    className="form-control"
                    placeholder="Ej. Juan"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido *</label>
                  <input 
                    type="text" 
                    value={formData.apellido}
                    onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '') }))}
                    className="form-control"
                    placeholder="Ej. Pérez"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre de Usuario (Username) *</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                  className="form-control"
                  placeholder="Ej. juanperez"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rol del Sistema *</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="form-control"
                >
                  <option value="recepcionista">Recepcionista (Operaciones y Caja)</option>
                  <option value="admin">Administrador (Control Total y Finanzas)</option>
                  <option value="kiosco">Kiosco de Entrada (Escáner de Acceso Directo)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {editingUser ? 'Contraseña (Dejar vacío para mantener actual)' : 'Contraseña *'}
                </label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="form-control"
                  placeholder="********"
                  required={!editingUser}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    boxShadow: 'var(--btn-primary-shadow)'
                  }}
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Animaciones */}
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
