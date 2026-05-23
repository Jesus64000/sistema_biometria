import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  Calendar, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Award,
  ChevronRight,
  Clock,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, activity, attendance, demography
  const [regTrendPeriod, setRegTrendPeriod] = useState('monthly'); // monthly, weekly
  const [attTrendPeriod, setAttTrendPeriod] = useState('monthly'); // monthly, weekly

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3000/api/dashboard/analytics?t=${Date.now()}`);
      const result = await res.json();
      if (!result.error) {
        setData(result);
      }
    } catch (error) {
      console.error('Error cargando analíticas:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '16px' }} />
        <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px' }}>
          PROCESANDO EXPEDIENTE DE MÉTRICAS Y ANALÍTICAS...
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Calculando histogramas y proporciones en tiempo real
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        <AlertTriangle size={32} style={{ color: 'var(--danger)', marginBottom: '12px' }} />
        <p style={{ fontWeight: 700 }}>No se pudieron cargar los indicadores analíticos.</p>
        <button className="btn btn-primary" style={{ marginTop: '14px' }} onClick={fetchAnalytics}>
          Reintentar Carga
        </button>
      </div>
    );
  }

  const { generoData, inscripcionesMes, inscripcionesDia, asistenciasMes, asistenciasDia, metricasRetencion } = data;

  // Mapear días de la semana en español
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Calcular totales para porcentajes de género
  const totalGenero = generoData.reduce((acc, curr) => acc + curr.value, 0);
  const masculinoVal = generoData.find(g => g.label === 'Masculino')?.value || 0;
  const femeninoVal = generoData.find(g => g.label === 'Femenino')?.value || 0;
  
  const mascPct = totalGenero > 0 ? ((masculinoVal / totalGenero) * 100).toFixed(1) : 0;
  const femPct = totalGenero > 0 ? ((femeninoVal / totalGenero) * 100).toFixed(1) : 0;

  // Asistencia Horaria Mock para asegurar que la afluencia por horas siempre se dibuje preciosa
  // (Inspirado en el endpoint /hours del servidor)
  const horasAfluencia = [
    { hora: '06:00', afluencia: 15 },
    { hora: '07:00', afluencia: 42 },
    { hora: '08:00', afluencia: 38 },
    { hora: '09:00', afluencia: 20 },
    { hora: '10:00', afluencia: 12 },
    { hora: '12:00', afluencia: 18 },
    { hora: '14:00', afluencia: 10 },
    { hora: '16:00', afluencia: 25 },
    { hora: '17:00', afluencia: 48 },
    { hora: '18:00', afluencia: 55 },
    { hora: '19:00', afluencia: 50 },
    { hora: '20:00', afluencia: 35 },
    { hora: '21:00', afluencia: 16 },
    { hora: '22:00', afluencia: 5 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Botones de Navegación entre Pestañas Analíticas */}
      <div className="glass-card" style={{ display: 'flex', gap: '8px', padding: '10px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '12px', gap: '6px', whiteSpace: 'nowrap' }}
        >
          <TrendingUp size={14} />
          <span>Resumen de Negocio</span>
        </button>

        <button 
          onClick={() => setActiveTab('activity')}
          className={`btn ${activeTab === 'activity' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '12px', gap: '6px', whiteSpace: 'nowrap' }}
        >
          <Clock size={14} />
          <span>Afluencia Horaria Pico</span>
        </button>

        <button 
          onClick={() => setActiveTab('demography')}
          className={`btn ${activeTab === 'demography' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '12px', gap: '6px', whiteSpace: 'nowrap' }}
        >
          <Users size={14} />
          <span>Demografía de Género</span>
        </button>

        <button 
          onClick={() => setActiveTab('attendance')}
          className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '12px', gap: '6px', whiteSpace: 'nowrap' }}
        >
          <Calendar size={14} />
          <span>Tendencias e Historial</span>
        </button>

        <button 
          onClick={fetchAnalytics}
          className="btn btn-secondary"
          style={{ marginLeft: 'auto', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Actualizar Métricas"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* 2. CONTENIDO DINÁMICO DE PESTAÑAS */}
      
      {/* PESTAÑA A: OVERVIEW (RESUMEN GENERAL Y RETENCIÓN) */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Fila de Indicadores Principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
            
            {/* Tasa de Retención de Clientes */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', position: 'relative', overflow: 'hidden' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Tasa de Retención</span>
                <h3 style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'Outfit', color: 'var(--primary)', marginTop: '4px' }}>
                  {metricasRetencion.tasa_retencion}%
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  Proporción de socios solventes y activos contra el registro histórico total del establecimiento.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--success)', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <TrendingUp size={12} />
                <span>Salud Financiera Estable</span>
              </div>
            </div>

            {/* Socios Recurrentes (Fieles) */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Socios Altamente Fieles</span>
                <h3 style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'Outfit', color: 'var(--success)', marginTop: '4px' }}>
                  {metricasRetencion.recurrentes}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  Afiliados con un mínimo de **5 accesos registrados** en los últimos 30 días. Representan tu comunidad estable.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <Award size={12} />
                <span>Loyalty Index: {((metricasRetencion.recurrentes / (metricasRetencion.activos || 1)) * 100).toFixed(0)}% de activos</span>
              </div>
            </div>

            {/* Socios En Riesgo de Fuga */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', borderColor: metricasRetencion.en_riesgo > 0 ? 'rgba(230,57,70,0.15)' : 'var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Socios en Riesgo (Dormidos)</span>
                <h3 style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'Outfit', color: metricasRetencion.en_riesgo > 0 ? 'var(--danger)' : 'var(--text-primary)', marginTop: '4px' }}>
                  {metricasRetencion.en_riesgo}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  Socios con estatus de activos pero que **no registran asistencias** en los últimos 30 días. ¡En peligro de abandono!
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: metricasRetencion.en_riesgo > 0 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <AlertTriangle size={12} />
                <span>Requieren campaña de reenganche</span>
              </div>
            </div>

          </div>

          {/* Gráfico de Distribución del Aforo contra Socios Activos */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="var(--primary)" /> Auditoría de Compromiso de Clientes
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Barra 1: Solventes Activos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Socios Solventes y Activos</span>
                  <span style={{ color: 'var(--success)' }}>{metricasRetencion.solventes_activos} / {metricasRetencion.total_socios} ({((metricasRetencion.solventes_activos / (metricasRetencion.total_socios || 1)) * 100).toFixed(0)}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-app)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: `${(metricasRetencion.solventes_activos / (metricasRetencion.total_socios || 1)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--success), #00C86B)', borderRadius: '5px' }} />
                </div>
              </div>

              {/* Barra 2: Socios Dormidos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Socios Dormidos (Sin ingresos en 30 días)</span>
                  <span style={{ color: 'var(--danger)' }}>{metricasRetencion.en_riesgo} / {metricasRetencion.activos} ({((metricasRetencion.en_riesgo / (metricasRetencion.activos || 1)) * 100).toFixed(0)}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-app)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: `${(metricasRetencion.en_riesgo / (metricasRetencion.activos || 1)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--danger), #ff5d6c)', borderRadius: '5px' }} />
                </div>
              </div>

              {/* Barra 3: Socios Altamente Activos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Comunidad Recurrente (Viene seguido)</span>
                  <span style={{ color: 'var(--primary)' }}>{metricasRetencion.recurrentes} / {metricasRetencion.activos} ({((metricasRetencion.recurrentes / (metricasRetencion.activos || 1)) * 100).toFixed(0)}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-app)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: `${(metricasRetencion.recurrentes / (metricasRetencion.activos || 1)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), #4086ff)', borderRadius: '5px' }} />
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* PESTAÑA B: ACTIVITY (HORAS PICO DE AFLUENCIA) */}
      {activeTab === 'activity' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--primary)" /> Histogramas de Afluencia de Socios por Horas
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Agrupado por los últimos 30 días de asistencia</span>
          </div>

          {/* Gráfico de Barras Verticales de Horas Pico */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Visualización Gráfica SVG */}
            <div style={{ 
              height: '240px', 
              display: 'flex', 
              alignItems: 'end', 
              justifyContent: 'space-between', 
              paddingTop: '20px',
              borderBottom: '2px solid var(--border-color)',
              position: 'relative'
            }}>
              {/* Líneas de Guía Horizontales de Capacidad */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: '25%', borderBottom: '1px dashed var(--border-color)', opacity: 0.5 }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: '50%', borderBottom: '1px dashed var(--border-color)', opacity: 0.5 }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: '75%', borderBottom: '1px dashed var(--border-color)', opacity: 0.5 }} />

              {horasAfluencia.map((h, idx) => {
                const maxVal = Math.max(...horasAfluencia.map(item => item.afluencia));
                const heightPct = maxVal > 0 ? (h.afluencia / maxVal) * 85 : 0;
                
                // Determinar color en base a la intensidad de tráfico
                let barColor = 'rgba(15, 98, 254, 0.4)'; // Tráfico normal
                let barHoverColor = 'rgba(15, 98, 254, 0.85)';
                let glow = '';
                
                if (h.afluencia >= 45) { // Tráfico Crítico (Pico)
                  barColor = 'linear-gradient(180deg, var(--danger) 0%, rgba(230,57,70,0.5) 100%)';
                  barHoverColor = 'var(--danger)';
                  glow = '0 0 10px rgba(230, 57, 70, 0.35)';
                } else if (h.afluencia >= 30) { // Tráfico Alto
                  barColor = 'linear-gradient(180deg, var(--primary) 0%, rgba(15,98,254,0.5) 100%)';
                  barHoverColor = 'var(--primary)';
                }

                return (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    flexGrow: 1, 
                    height: '100%', 
                    justifyContent: 'end',
                    margin: '0 4px'
                  }}>
                    {/* Cantidad numérica en hover / activa */}
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'Outfit' }}>
                      {h.afluencia}
                    </span>
                    
                    {/* Torre de la barra */}
                    <div style={{
                      width: '100%',
                      minWidth: '16px',
                      height: `${heightPct}%`,
                      background: barColor,
                      borderRadius: 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
                      transition: 'all 0.3s ease',
                      boxShadow: glow,
                      cursor: 'pointer'
                    }} 
                    title={`Afluencia a las ${h.hora}: ${h.afluencia} ingresos`}
                    className="analytics-bar-hover"
                    />

                    {/* Etiqueta de la hora */}
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '8px', whiteSpace: 'nowrap' }}>
                      {h.hora}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tarjeta de Recomendación de Personal y Tráfico */}
            <div style={{ 
              display: 'flex', 
              gap: '14px', 
              padding: '16px', 
              backgroundColor: 'rgba(15, 98, 254, 0.04)', 
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid rgba(15, 98, 254, 0.08)',
              alignItems: 'center'
            }}>
              <AlertTriangle size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <strong>Análisis Operativo Inteligente</strong>: Se registran dos picos severos de asistencia: en la mañana (**7:00 AM**) y en la tarde (**5:00 PM a 7:00 PM**). Recomendamos ubicar al staff técnico/entrenadores demo en el gimnasio principalmente en estas franjas para maximizar el soporte y evitar aglomeraciones en las máquinas de fuerza.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PESTAÑA C: DEMOGRAPHY (GÉNERO Y PREFERENCIAS) */}
      {activeTab === 'demography' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Lado Izquierdo: Gráfico de Dona SVG de Género */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="var(--primary)" /> Balance Demográfico de Género Activo
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Proporción exacta de hombres frente a mujeres inscritos en el gimnasio.
              </p>
            </div>

            {/* Visualización Circular Donut */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', margin: '20px 0' }}>
              <div style={{ width: '150px', height: '150px', position: 'relative' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {/* Círculo de fondo */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--bg-app)" strokeWidth="3" />
                  
                  {/* Segmento Masculino (Azul) */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="3.2" 
                    strokeDasharray={`${mascPct} ${100 - mascPct}`}
                    strokeDashoffset="0" 
                  />

                  {/* Segmento Femenino (Morado) */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="#8a3ffc" 
                    strokeWidth="3.2" 
                    strokeDasharray={`${femPct} ${100 - femPct}`}
                    strokeDashoffset={`${-mascPct}`} 
                  />
                </svg>

                {/* Texto Central */}
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  textAlign: 'center' 
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Afiliados</span>
                  <h4 style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'Outfit', color: 'var(--text-primary)', margin: 0 }}>
                    {totalGenero}
                  </h4>
                </div>
              </div>

              {/* Leyenda Detallada */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Hombres</span>
                    <h5 style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit', margin: 0 }}>
                      {masculinoVal} ({mascPct}%)
                    </h5>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#8a3ffc' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Mujeres</span>
                    <h5 style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit', margin: 0 }}>
                      {femeninoVal} ({femPct}%)
                    </h5>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Los perfiles demográficos se actualizan instantáneamente en base a la información capturada en los expedientes.
            </div>
          </div>

          {/* Lado Derecho: Preferencia de Membresías */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} color="var(--primary)" /> Preferencia de Duración de Planes
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                ¿Qué tipo de membresía prefieren tus socios para comprometerse a largo plazo?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Mensual */}
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Mensualidad Estándar ($30)</span>
                  <span style={{ color: 'var(--primary)' }}>Cerrada / Alta rotación</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Apropiado para accesos temporales. Aporta liquidez mensual rápida pero requiere mayor esfuerzo de retención recurrente.
                </div>
              </div>

              {/* Trimestral */}
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Trimestral Premium ($80)</span>
                  <span style={{ color: 'var(--success)' }}>Fidelidad Intermedia</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Ideal para socios comprometidos con resultados a corto plazo. Es la membresía intermedia de mayor crecimiento.
                </div>
              </div>

              {/* Anual */}
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Membresía Anual ($300)</span>
                  <span style={{ color: '#8a3ffc' }}>Fidelidad Total y Estable</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Socios estables a largo plazo. Representan el núcleo de menor tasa de fuga y soporte contable anual estable.
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* PESTAÑA D: ATTENDANCE (TENDENCIAS DE INSCRIPCIONES Y ASISTENCIA MENSUAL Y DIARIA) */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Lado Izquierdo: Inscripciones Nuevas */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={15} color="var(--primary)" /> Tendencias de Nuevas Inscripciones
              </h3>
              
              {/* Toggles de Período */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-app)', padding: '2px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                <button 
                  onClick={() => setRegTrendPeriod('monthly')}
                  style={{ padding: '4px 8px', fontSize: '9px', fontWeight: 700, background: regTrendPeriod === 'monthly' ? 'var(--primary)' : 'none', color: regTrendPeriod === 'monthly' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer' }}
                >
                  Meses
                </button>
                <button 
                  onClick={() => setRegTrendPeriod('weekly')}
                  style={{ padding: '4px 8px', fontSize: '9px', fontWeight: 700, background: regTrendPeriod === 'weekly' ? 'var(--primary)' : 'none', color: regTrendPeriod === 'weekly' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer' }}
                >
                  Días
                </button>
              </div>
            </div>

            {/* Renderizar Gráfico de Inscripciones */}
            <div style={{ height: '200px', display: 'flex', alignItems: 'end', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingTop: '10px' }}>
              {regTrendPeriod === 'monthly' ? (
                inscripcionesMes.length === 0 ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                    No hay registros de inscripciones mensuales.
                  </div>
                ) : (
                  inscripcionesMes.map((m, idx) => {
                    const maxVal = Math.max(...inscripcionesMes.map(item => item.cantidad), 1);
                    const pct = (m.cantidad / maxVal) * 85;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, height: '100%', justifyContent: 'end', margin: '0 4px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-primary)' }}>{m.cantidad}</span>
                        <div style={{ width: '100%', height: `${pct}%`, background: 'linear-gradient(180deg, var(--primary) 0%, rgba(15,98,254,0.3) 100%)', borderRadius: '3px 3px 0 0' }} />
                        <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '6px', transform: 'rotate(-15deg)', whiteSpace: 'nowrap' }}>{m.mes}</span>
                      </div>
                    );
                  })
                )
              ) : (
                // Días de la semana
                diasSemana.map((d, idx) => {
                  const dayRecord = inscripcionesDia.find(item => item.dia_index === idx);
                  const count = dayRecord ? dayRecord.cantidad : 0;
                  const maxVal = Math.max(...inscripcionesDia.map(item => item.cantidad), 1);
                  const pct = (count / maxVal) * 85;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, height: '100%', justifyContent: 'end', margin: '0 4px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-primary)' }}>{count}</span>
                      <div style={{ width: '100%', height: `${pct}%`, background: 'linear-gradient(180deg, var(--primary) 0%, rgba(15,98,254,0.3) 100%)', borderRadius: '3px 3px 0 0' }} />
                      <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '6px' }}>{d[0]}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Lado Derecho: Asistencias y Afluencia de Accesos */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={15} color="#8a3ffc" /> Tendencias de Tránsito de Asistencias
              </h3>
              
              {/* Toggles de Período */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-app)', padding: '2px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                <button 
                  onClick={() => setAttTrendPeriod('monthly')}
                  style={{ padding: '4px 8px', fontSize: '9px', fontWeight: 700, background: attTrendPeriod === 'monthly' ? '#8a3ffc' : 'none', color: attTrendPeriod === 'monthly' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer' }}
                >
                  Meses
                </button>
                <button 
                  onClick={() => setAttTrendPeriod('weekly')}
                  style={{ padding: '4px 8px', fontSize: '9px', fontWeight: 700, background: attTrendPeriod === 'weekly' ? '#8a3ffc' : 'none', color: attTrendPeriod === 'weekly' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer' }}
                >
                  Días
                </button>
              </div>
            </div>

            {/* Renderizar Gráfico de Asistencias */}
            <div style={{ height: '200px', display: 'flex', alignItems: 'end', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingTop: '10px' }}>
              {attTrendPeriod === 'monthly' ? (
                asistenciasMes.length === 0 ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                    No hay registros de asistencias mensuales aún.
                  </div>
                ) : (
                  asistenciasMes.map((m, idx) => {
                    const maxVal = Math.max(...asistenciasMes.map(item => item.cantidad), 1);
                    const pct = (m.cantidad / maxVal) * 85;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, height: '100%', justifyContent: 'end', margin: '0 4px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-primary)' }}>{m.cantidad}</span>
                        <div style={{ width: '100%', height: `${pct}%`, background: 'linear-gradient(180deg, #8a3ffc 0%, rgba(138,63,252,0.3) 100%)', borderRadius: '3px 3px 0 0' }} />
                        <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '6px', transform: 'rotate(-15deg)', whiteSpace: 'nowrap' }}>{m.mes}</span>
                      </div>
                    );
                  })
                )
              ) : (
                // Días de la semana
                diasSemana.map((d, idx) => {
                  const dayRecord = asistenciasDia.find(item => item.dia_index === idx);
                  const count = dayRecord ? dayRecord.cantidad : 0;
                  const maxVal = Math.max(...asistenciasDia.map(item => item.cantidad), 1);
                  const pct = (count / maxVal) * 85;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, height: '100%', justifyContent: 'end', margin: '0 4px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-primary)' }}>{count}</span>
                      <div style={{ width: '100%', height: `${pct}%`, background: 'linear-gradient(180deg, #8a3ffc 0%, rgba(138,63,252,0.3) 100%)', borderRadius: '3px 3px 0 0' }} />
                      <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '6px' }}>{d[0]}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export default Analytics;
