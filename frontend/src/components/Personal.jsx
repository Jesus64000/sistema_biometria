import React, { useState, useEffect } from 'react';
import DatePicker from './DatePicker';
import PersonalProfileDrawer from './PersonalProfileDrawer';

export default function Personal({ activeGym = 'RamosGym', tasaCambio = 114.00 }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(true);

  // Modales
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingMember, setPayingMember] = useState(null);

  const [cedulaPrefix, setCedulaPrefix] = useState('V-');

  // Ficha de Personal (Drawer)
  const [profilePersonal, setProfilePersonal] = useState(null);

  // Formularios
  const [formData, setFormData] = useState({
    cedula: '',
    nombre: '',
    apellido: '',
    cargo: 'Entrenador',
    telefono: '',
    email: '',
    sueldo: '0.00',
    activo: true,
    fecha_contratacion: ''
  });

  const [payFormData, setPayFormData] = useState({
    descripcion: '',
    monto: '0.00',
    metodo: 'pago_movil'
  });

  // Cargar token del localStorage
  const getHeaders = () => {
    const token = localStorage.getItem('jwt_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const checkRole = () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'admin');
      }
    } catch (e) {
      setIsAdmin(false);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/personal', { headers: getHeaders() });
      if (res.status === 403) {
        setError('Acceso denegado. Este portal es exclusivo para Personal Autorizado.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStaff(data);
    } catch (err) {
      setError(err.message || 'Error de red al cargar el personal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRole();
    fetchStaff();
  }, []);

  const openCreateModal = () => {
    setEditingMember(null);
    setCedulaPrefix('V-');
    setFormData({
      cedula: '',
      nombre: '',
      apellido: '',
      cargo: 'Entrenador',
      telefono: '',
      email: '',
      sueldo: '0.00',
      activo: true,
      fecha_contratacion: new Date().toISOString().split('T')[0]
    });
    setShowStaffModal(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    
    let prefix = 'V-';
    let number = member.cedula;
    if (member.cedula.includes('-')) {
      const parts = member.cedula.split('-');
      prefix = parts[0] + '-';
      number = parts[1];
    } else if (member.cedula.startsWith('V') || member.cedula.startsWith('E')) {
      prefix = member.cedula.substring(0, 1) + '-';
      number = member.cedula.substring(1);
    }
    setCedulaPrefix(prefix);

    setFormData({
      cedula: number,
      nombre: member.nombre,
      apellido: member.apellido,
      cargo: member.cargo,
      telefono: member.telefono || '',
      email: member.email || '',
      sueldo: (member.sueldo ?? 0).toString(),
      activo: member.activo === 1,
      fecha_contratacion: member.fecha_contratacion ? member.fecha_contratacion.split('T')[0] : ''
    });
    setShowStaffModal(true);
  };

  const openPayModal = (member) => {
    setPayingMember(member);
    setPayFormData({
      descripcion: `Pago de Nómina - ${member.nombre} ${member.apellido} (${member.cargo})`,
      monto: (member.sueldo ?? 0).toString(),
      metodo: 'pago_movil'
    });
    setShowPayModal(true);
  };

  const handleSubmitStaff = async (e) => {
    e.preventDefault();
    if (!formData.cedula || !formData.nombre || !formData.apellido) {
      alert('Por favor llene los campos obligatorios.');
      return;
    }

    if (formData.cedula.length < 6 || formData.cedula.length > 8) {
      alert('La cédula de identidad debe tener entre 6 y 8 números.');
      return;
    }

    const fullCedula = `${cedulaPrefix}${formData.cedula.trim()}`;
    const payload = { ...formData, cedula: fullCedula };

    try {
      const url = editingMember 
        ? `http://localhost:3000/api/personal/${editingMember.id}` 
        : 'http://localhost:3000/api/personal';
      const method = editingMember ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert(editingMember ? 'Trabajador actualizado con éxito.' : 'Trabajador registrado con éxito.');
      setShowStaffModal(false);
      fetchStaff();
    } catch (err) {
      console.error(err);
      alert('Error en red al procesar personal.');
    }
  };

  // Registrar el pago de nómina como un egreso a la tabla de Gastos
  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payFormData.monto || parseFloat(payFormData.monto) <= 0) {
      alert('El monto del pago debe ser mayor a cero.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          descripcion: payFormData.descripcion,
          monto: parseFloat(payFormData.monto),
          categoria: 'Nómina',
          metodo_pago: payFormData.metodo // Metodo de egreso informativo
        })
      });
      const result = await res.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert('Pago de nómina manual registrado exitosamente en la sección de Gastos.');
      setShowPayModal(false);
    } catch (err) {
      console.error(err);
      alert('Error al registrar egreso en el servidor.');
    }
  };

  const handleDeleteStaff = async (id, nombre) => {
    if (!window.confirm(`¿Está seguro de eliminar a "${nombre}" de la nómina de trabajadores? Esta acción borrará su historial.`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/personal/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const result = await res.json();
      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert('Trabajador eliminado del sistema.');
      fetchStaff();
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
        <h2 style={{ color: '#ef4444', fontWeight: 800 }}>🚫 ACCESO DENEGADO</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'var(--font-main)', color: 'var(--text-primary)' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Nómina y Personal del Gimnasio
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, marginTop: '4px' }}>
            Gestiona a los entrenadores, personal de limpieza y personal administrativo de {activeGym}.
          </p>
        </div>
        {isAdmin && (
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
            💪 Contratar Personal
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(n => (
            <div key={n} className="skeleton" style={{ height: '75px', borderRadius: '12px', width: '100%' }}></div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-table-header)' }}>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nombre Trabajador</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cédula de Identidad</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cargo / Función</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sueldo base (USD)</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estatus laboral</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No hay personal registrado en el sistema.
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr 
                    key={member.id} 
                    onClick={() => setProfilePersonal(member)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} 
                    className="table-row-hover"
                  >
                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: member.activo === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100,116,139,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px'
                        }}>
                          {member.cargo.toLowerCase().includes('entrenador') ? '🏋️' : '🧹'}
                        </div>
                        <div>
                          {member.nombre} {member.apellido}
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 500 }}>
                            {member.telefono || 'Sin teléfono'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {member.cedula}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700 }}>
                      {member.cargo}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                      ${parseFloat(member.sueldo || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: member.activo === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: member.activo === 1 ? '#34d399' : '#ef4444'
                      }}>
                        {member.activo === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {isAdmin && member.activo === 1 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); openPayModal(member); }}
                            style={{
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.2)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#38bdf8'
                            }}
                          >
                            💰 Pagar Nómina
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); openEditModal(member); }}
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
                              onClick={(e) => { e.stopPropagation(); handleDeleteStaff(member.id, `${member.nombre} ${member.apellido}`); }}
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ficha de Detalles de Personal (Drawer) */}
      {profilePersonal && (
        <PersonalProfileDrawer 
          member={profilePersonal} 
          onClose={() => setProfilePersonal(null)} 
          onEdit={openEditModal}
          tasaCambio={tasaCambio}
          isAdmin={isAdmin}
        />
      )}

      {/* Modal Contratar/Editar Personal */}
      {showStaffModal && (
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
          <div className="card" style={{ width: '90%', maxWidth: '520px', padding: '28px', animation: 'scaleUp 0.2s ease-out' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 800 }}>
              {editingMember ? '✏️ Editar Registro de Personal' : '🏋️ Registro de Contratación de Personal'}
            </h3>

            <form onSubmit={handleSubmitStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    placeholder="Ej. Gómez"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Cédula de Identidad *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select 
                      value={cedulaPrefix}
                      onChange={(e) => setCedulaPrefix(e.target.value)}
                      className="form-control"
                      style={{ width: '70px', padding: '10px', flexShrink: 0 }}
                    >
                      <option value="V-">V-</option>
                      <option value="E-">E-</option>
                    </select>
                    <input 
                      type="text" 
                      value={formData.cedula}
                      onChange={(e) => setFormData(prev => ({ ...prev, cedula: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                      className="form-control"
                      placeholder="12345678"
                      required
                      style={{ flexGrow: 1 }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cargo asignado *</label>
                  <select 
                    value={formData.cargo}
                    onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                    className="form-control"
                  >
                    <option value="Entrenador">Entrenador Físico</option>
                    <option value="Entrenador Personal">Entrenador Personal (Personalizado)</option>
                    <option value="Recepcionista">Recepcionista / Cajero</option>
                    <option value="Limpieza">Mantenimiento y Limpieza</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input 
                    type="text" 
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                    className="form-control"
                    placeholder="04121234567"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sueldo Base Mensual (USD) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.sueldo}
                    onChange={(e) => setFormData(prev => ({ ...prev, sueldo: e.target.value }))}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="form-control"
                  placeholder="personal@gmail.com"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div className="form-group">
                  <label className="form-label">Fecha de contratación</label>
                  <DatePicker 
                    value={formData.fecha_contratacion}
                    onChange={(val) => setFormData(prev => ({ ...prev, fecha_contratacion: val }))}
                    placeholder="Seleccionar fecha"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px' }}>
                  <input 
                    type="checkbox" 
                    id="activo_check"
                    checked={formData.activo}
                    onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="activo_check" style={{ fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Estatus Activo</label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowStaffModal(false)}
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
                  {editingMember ? 'Guardar Cambios' : 'Contratar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pago de Nómina (MANUAL, CON FILOSOFÍA DINÁMICA DEL BCV) */}
      {showPayModal && payingMember && (
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
          <div className="card" style={{ width: '90%', maxWidth: '480px', padding: '28px', border: '2px solid #38bdf8', boxShadow: '0 0 30px rgba(56, 189, 248, 0.15)', animation: 'scaleUp 0.2s ease-out' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>
              💵 Registro de Pago de Nómina Manual
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '0 0 20px 0' }}>
              El pago se registrará como egreso y quedará grabado a la tasa oficial del día sin cambios posteriores.
            </p>

            <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Descripción del Egreso *</label>
                <input 
                  type="text" 
                  value={payFormData.descripcion}
                  onChange={(e) => setPayFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="form-control"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Importe a Pagar (USD) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={payFormData.monto}
                    onChange={(e) => setPayFormData(prev => ({ ...prev, monto: e.target.value }))}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Método de Pago *</label>
                  <select 
                    value={payFormData.metodo}
                    onChange={(e) => setPayFormData(prev => ({ ...prev, metodo: e.target.value }))}
                    className="form-control"
                  >
                    <option value="pago_movil">Pago Móvil</option>
                    <option value="divisas">Divisas (Efectivo $)</option>
                    <option value="efectivo">Efectivo Bs.</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>

              {/* Caja de Conversión de BCV en vivo */}
              <div style={{
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.5px' }}>CONVERSIÓN TASA OFICIAL BCV</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Bs. {(parseFloat(payFormData.monto || 0) * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Tasa: Bs. {tasaCambio.toFixed(2)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPayModal(false)}
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
                    backgroundColor: '#38bdf8',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 800,
                    boxShadow: '0 0 15px rgba(56, 189, 248, 0.25)'
                  }}
                >
                  Confirmar Pago y Registrar Egreso
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
