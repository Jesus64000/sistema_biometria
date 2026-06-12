import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Calendar, CreditCard, Activity,
  CheckCircle, XCircle, Clock, Briefcase, Hash, DollarSign
} from 'lucide-react';

const API = 'http://localhost:3000';

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function PersonalProfileDrawer({ member, onClose, onEdit, tasaCambio = 114.00, isAdmin }) {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  const getHeaders = () => {
    const token = localStorage.getItem('jwt_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    if (!member) return;
    setLoadingPayments(true);
    setPayments([]);

    // Obtener los egresos del sistema para extraer el historial de nómina de este trabajador
    fetch(`${API}/api/expenses`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filtrar gastos de la categoría 'Nómina' que contengan el nombre y apellido del trabajador en su descripción
          const memberNomina = data.filter(g => 
            g.categoria === 'Nómina' && 
            g.descripcion.toLowerCase().includes(member.nombre.toLowerCase()) &&
            g.descripcion.toLowerCase().includes(member.apellido.toLowerCase())
          );
          setPayments(memberNomina);
        }
        setLoadingPayments(false);
      })
      .catch(() => setLoadingPayments(false));
  }, [member]);

  if (!member) return null;

  const isActivo = member.activo === 1;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 1200, backdropFilter: 'blur(4px)',
          animation: 'fade-in 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Modal Window */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '480px',
            height: '560px',
            maxHeight: '90vh',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            animation: 'modal-zoom-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px', borderBottom: '1px solid var(--border-color)',
            background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                {/* Avatar Icon */}
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', fontWeight: 800, color: '#fff', flexShrink: 0,
                  border: '3px solid var(--border-color)'
                }}>
                  {member.cargo.toLowerCase().includes('entrenador') ? '🏋️' : '🧹'}
                </div>

                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {member.nombre} {member.apellido}
                  </h2>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Hash size={9} /> {member.cedula}
                    </span>
                    <span className={`badge ${isActivo ? 'badge-success' : 'badge-danger'}`}
                      style={{ fontSize: '10px', padding: '2px 7px' }}>
                      {isActivo ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 7px' }}>
                      {member.cargo}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Edit action button */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12px', height: '34px', gap: '5px', color: 'var(--primary)' }}
                  onClick={() => { onClose(); onEdit(member); }}
                >
                  ✏️ Editar Datos del Trabajador
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border-color)',
            background: 'var(--surface-2)', flexShrink: 0
          }}>
            {[
              { id: 'info', label: 'Información', icon: <Briefcase size={13} /> },
              { id: 'payments', label: 'Historial de Nómina', icon: <CreditCard size={13} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '12px 6px', border: 'none', cursor: 'pointer',
                  background: activeTab === tab.id ? 'var(--surface-1)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                  fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '5px', transition: 'all .15s'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            {/* TAB: INFORMACIÓN */}
            {activeTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Salary card */}
                <div style={{
                  background: 'var(--surface-2)', borderRadius: '12px', padding: '14px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Remuneración Laboral
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <InfoItem icon={<DollarSign size={13} />} label="Sueldo Base (USD)" value={`$${parseFloat(member.sueldo || 0).toFixed(2)}`} valueStyle={{ color: '#38bdf8' }} />
                    <InfoItem 
                      icon={<Activity size={13} />} 
                      label="Sueldo en Bolívares (BCV)" 
                      value={`Bs. ${(parseFloat(member.sueldo || 0) * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      valueStyle={{ color: 'var(--success)', fontWeight: 700 }}
                    />
                  </div>
                </div>

                {/* Personal data */}
                <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Detalles Administrativos
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <Briefcase size={13} style={{ color: 'var(--primary)' }} />
                      <span>Cargo: <strong>{member.cargo}</strong></span>
                    </div>
                    {member.telefono && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <Phone size={13} style={{ color: 'var(--primary)' }} />
                        <span>Teléfono: {member.telefono}</span>
                      </div>
                    )}
                    {member.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <Mail size={13} style={{ color: 'var(--primary)' }} />
                        <span>Correo: {member.email}</span>
                      </div>
                    )}
                    {member.fecha_contratacion && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <Calendar size={13} style={{ color: 'var(--primary)' }} />
                        <span>Fecha Contratación: {fmtDate(member.fecha_contratacion)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Labor status */}
                <div style={{
                  background: isActivo ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  borderRadius: '12px', padding: '12px 14px',
                  border: `1px solid ${isActivo ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  {isActivo
                    ? <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                    : <XCircle size={20} style={{ color: 'var(--danger)' }} />
                  }
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: isActivo ? 'var(--success)' : 'var(--danger)' }}>
                      {isActivo ? 'Trabajador en activo' : 'Trabajador inactivo'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {isActivo
                        ? 'Habilitado para registrar horas y recibir cobros de nómina.'
                        : 'Acceso suspendido y nómina pausada.'
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HISTORIAL DE PAGOS */}
            {activeTab === 'payments' && (
              <div>
                {loadingPayments ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Cargando historial de nómina...
                  </div>
                ) : payments.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '40px', color: 'var(--text-muted)',
                    background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border-color)'
                  }}>
                    <CreditCard size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Sin pagos registrados</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>Aún no se registran egresos por nómina para este trabajador.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {payments.length} pago{payments.length !== 1 ? 's' : ''} registrado{payments.length !== 1 ? 's' : ''}
                    </div>
                    {payments.map((p, i) => (
                      <div key={p.id || i} style={{
                        background: 'var(--surface-2)', borderRadius: '10px', padding: '12px 14px',
                        border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                            $ {Number(p.monto).toFixed(2)} USD
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {p.descripcion}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtDateTime(p.fecha)}</div>
                          {i === 0 && (
                            <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 5px', marginTop: '2px' }}>Último</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-zoom-in {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}

function InfoItem({ icon, label, value, valueStyle = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', ...valueStyle }}>
        {value}
      </div>
    </div>
  );
}
