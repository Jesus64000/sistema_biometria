import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Calendar, CreditCard, Activity,
  CheckCircle, XCircle, Clock, TrendingUp, User,
  ChevronRight, Award, Hash
} from 'lucide-react';

const API = 'http://localhost:3000';

const MEMBERSHIP_LABELS = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' };
const METHOD_LABELS = {
  pago_movil: 'Pago Móvil',
  efectivo: 'Efectivo USD',
  efectivo_usd: 'Efectivo USD',
  transferencia: 'Transferencia',
  zelle: 'Zelle',
  punto_de_venta: 'Punto de Venta',
};

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function daysUntil(str) {
  if (!str) return null;
  const diff = Math.ceil((new Date(str) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function MemberProfileDrawer({ member, onClose, onPay, onEdit, isAdmin }) {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (!member) return;
    setLoadingPayments(true);
    setLoadingStats(true);
    setPayments([]);
    setStats(null);

    fetch(`${API}/api/payments/member/${member.id}`)
      .then(r => r.json())
      .then(data => { setPayments(Array.isArray(data) ? data : []); setLoadingPayments(false); })
      .catch(() => setLoadingPayments(false));

    fetch(`${API}/api/members/${member.id}/stats`)
      .then(r => r.json())
      .then(data => { setStats(data); setLoadingStats(false); })
      .catch(() => setLoadingStats(false));
  }, [member]);

  if (!member) return null;

  const daysLeft = daysUntil(member.membresia_fin);
  const isSolvente = member.membresia_solvencia === 1;

  const urgencyColor = daysLeft === null
    ? 'var(--text-muted)'
    : daysLeft < 0
      ? 'var(--danger)'
      : daysLeft <= 5
        ? '#f59e0b'
        : 'var(--success)';

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
            height: '580px',
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
                {/* Avatar */}
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 800, color: '#fff', flexShrink: 0,
                  border: '3px solid var(--border-color)', overflow: 'hidden'
                }}>
                  {member.foto_url
                    ? <img src={`${API}${member.foto_url}`} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : member.nombre[0]
                  }
                </div>

                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {member.nombre} {member.apellido}
                  </h2>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Hash size={9} /> {member.cedula}
                    </span>
                    <span className={`badge ${member.status === 'activo' ? 'badge-success' : 'badge-danger'}`}
                      style={{ fontSize: '10px', padding: '2px 7px' }}>
                      {member.status === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className={`badge ${isSolvente ? 'badge-success' : 'badge-danger'}`}
                      style={{ fontSize: '10px', padding: '2px 7px' }}>
                      {isSolvente ? 'Solvente' : 'Insolvente'}
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

            {/* Quick action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: '12px', height: '34px', gap: '5px' }}
                onClick={() => { onClose(); onPay(member); }}
              >
                <CreditCard size={13} /> Registrar Cobro
              </button>
              {isAdmin && (
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12px', height: '34px', gap: '5px', color: 'var(--primary)' }}
                  onClick={() => { onClose(); onEdit(member); }}
                >
                  Editar Datos <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border-color)',
            background: 'var(--surface-2)', flexShrink: 0
          }}>
            {[
              { id: 'info', label: 'Información', icon: <User size={13} /> },
              { id: 'payments', label: 'Historial', icon: <CreditCard size={13} /> },
              { id: 'stats', label: 'Asistencia', icon: <Activity size={13} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '11px 6px', border: 'none', cursor: 'pointer',
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

                {/* Membresía card */}
                <div style={{
                  background: 'var(--surface-2)', borderRadius: '12px', padding: '14px',
                  border: `1px solid ${urgencyColor}30`
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Membresía
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <InfoItem icon={<Award size={13} />} label="Tipo" value={MEMBERSHIP_LABELS[member.membresia_tipo] || member.membresia_tipo || '—'} />
                    <InfoItem icon={<Calendar size={13} />} label="Inicio" value={fmtDate(member.membresia_inicio)} />
                    <InfoItem
                      icon={<Clock size={13} style={{ color: urgencyColor }} />}
                      label="Vencimiento"
                      value={fmtDate(member.membresia_fin)}
                      valueStyle={{ color: urgencyColor, fontWeight: 700 }}
                    />
                    <InfoItem
                      icon={<TrendingUp size={13} style={{ color: urgencyColor }} />}
                      label={daysLeft !== null && daysLeft < 0 ? 'Vencida hace' : 'Días restantes'}
                      value={daysLeft !== null ? `${Math.abs(daysLeft)} días` : '—'}
                      valueStyle={{ color: urgencyColor, fontWeight: 700 }}
                    />
                  </div>
                </div>

                {/* Personal data */}
                <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Datos Personales
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {member.telefono && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <Phone size={13} style={{ color: 'var(--primary)' }} />
                        <span>{member.telefono}</span>
                      </div>
                    )}
                    {member.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <Mail size={13} style={{ color: 'var(--primary)' }} />
                        <span>{member.email}</span>
                      </div>
                    )}
                    {member.fecha_nacimiento && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <Calendar size={13} style={{ color: 'var(--primary)' }} />
                        <span>Nacimiento: {fmtDate(member.fecha_nacimiento)}</span>
                      </div>
                    )}
                    {member.genero && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <User size={13} style={{ color: 'var(--primary)' }} />
                        <span>{member.genero}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <Calendar size={13} style={{ color: 'var(--primary)' }} />
                      <span>Inscrito: {fmtDate(member.fecha_registro)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <Activity size={13} style={{ color: 'var(--primary)' }} />
                      <span>Sede: {member.gym_sede}</span>
                    </div>
                  </div>
                </div>

                {/* Solvency status */}
                <div style={{
                  background: isSolvente ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  borderRadius: '12px', padding: '12px 14px',
                  border: `1px solid ${isSolvente ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  {isSolvente
                    ? <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                    : <XCircle size={20} style={{ color: 'var(--danger)' }} />
                  }
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: isSolvente ? 'var(--success)' : 'var(--danger)' }}>
                      {isSolvente ? 'Membresía al día' : 'Membresía vencida'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {isSolvente
                        ? `Próximo vencimiento: ${fmtDate(member.membresia_fin)}`
                        : 'Requiere renovación inmediata'
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
                    Cargando historial...
                  </div>
                ) : payments.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '40px', color: 'var(--text-muted)',
                    background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border-color)'
                  }}>
                    <CreditCard size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Sin pagos registrados</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>Este socio aún no tiene cobros en el sistema.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {payments.length} pago{payments.length !== 1 ? 's' : ''} registrado{payments.length !== 1 ? 's' : ''}
                    </div>
                    {payments.map((p, i) => {
                      const isBs = ['pago_movil', 'transferencia', 'punto_de_venta'].includes(p.metodo_pago);
                      const tasa = Number(p.tasa_cambio || 114.00);
                      const totalBs = Number(p.monto) * tasa;
                      
                      return (
                        <div key={p.id || i} style={{
                          background: 'var(--surface-2)', borderRadius: '10px', padding: '12px 14px',
                          border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {isBs ? (
                                <>Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                              ) : (
                                <>$ {Number(p.monto).toFixed(2)}</>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {METHOD_LABELS[p.metodo_pago] || p.metodo_pago}
                              {isBs && ` · Tasa: Bs. ${tasa} ($${Number(p.monto).toFixed(0)})`}
                              {p.referencia ? ` · Ref: ${p.referencia}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtDateTime(p.fecha_pago)}</div>
                            {i === 0 && (
                              <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 5px', marginTop: '2px' }}>Último</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ESTADÍSTICAS DE ASISTENCIA */}
            {activeTab === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {loadingStats ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Cargando estadísticas...
                  </div>
                ) : (
                  <>
                    {/* Stats cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <StatCard label="Total visitas" value={stats?.total ?? 0} icon={<Activity size={18} />} color="var(--primary)" />
                      <StatCard label="Este mes" value={stats?.este_mes ?? 0} icon={<TrendingUp size={18} />} color="var(--success)" />
                      <StatCard label="Mes anterior" value={stats?.mes_anterior ?? 0} icon={<Clock size={18} />} color="#f59e0b" />
                      <StatCard
                        label="Última visita"
                        value={stats?.ultima_visita ? fmtDate(stats.ultima_visita) : 'Sin registro'}
                        icon={<CheckCircle size={18} />}
                        color="var(--text-secondary)"
                        small
                      />
                    </div>

                    {/* Attendance insight */}
                    {stats && stats.total > 0 && (
                      <div style={{
                        background: 'var(--surface-2)', borderRadius: '12px', padding: '14px',
                        border: '1px solid var(--border-color)', marginTop: '4px'
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Actividad
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'var(--border-color)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '99px',
                              background: 'linear-gradient(90deg, var(--primary), var(--success))',
                              width: `${Math.min(100, (stats.este_mes / Math.max(stats.mes_anterior, 1)) * 100)}%`,
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {stats.este_mes > stats.mes_anterior
                              ? `↑ +${stats.este_mes - stats.mes_anterior} vs mes ant.`
                              : stats.este_mes < stats.mes_anterior
                                ? `↓ ${stats.mes_anterior - stats.este_mes} menos vs mes ant.`
                                : `= igual que mes ant.`
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    {stats && stats.total === 0 && (
                      <div style={{
                        textAlign: 'center', padding: '40px', color: 'var(--text-muted)',
                        background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border-color)'
                      }}>
                        <Activity size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>Sin asistencias registradas</div>
                      </div>
                    )}
                  </>
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

function StatCard({ label, value, icon, color, small = false }) {
  return (
    <div style={{
      background: 'var(--surface-2)', borderRadius: '10px', padding: '12px',
      border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px'
    }}>
      <div style={{ color, opacity: 0.8 }}>{icon}</div>
      <div style={{ fontSize: small ? '13px' : '22px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export default MemberProfileDrawer;
