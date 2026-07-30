import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Plus,
  RefreshCw,
  ScanFace,
  Wallet,
  X,
  Camera,
  Check,
  Search,
  CreditCard
} from 'lucide-react';
import CaptureModal from './CaptureModal';
import DatePicker from './DatePicker';

const format12h = (timeStr) => {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const parts = timeStr.split(':');
  const hr = parseInt(parts[0], 10);
  if (isNaN(hr)) return timeStr;
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const displayHr = hr % 12 === 0 ? 12 : hr % 12;
  return `${displayHr}:${parts[1]} ${ampm}`;
};

const formatHourOnly12h = (timeStr) => {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const hr = parseInt(timeStr.split(':')[0], 10);
  if (isNaN(hr)) return timeStr;
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const displayHr = hr % 12 === 0 ? 12 : hr % 12;
  return `${displayHr} ${ampm}`;
};

function Dashboard({ activeGym, tasaCambio, onNavigate, user }) {
  const [stats, setStats] = useState({
    total_socios: 0,
    activos: 0,
    solventes: 0,
    insolventes: 0,
    asistencias_hoy: 0,
    vencen_pronto: 0,
    ingresos_totales: '0.00',
    gastos_totales: '0.00',
    balance_neto: '0.00'
  });
  const [hours, setHours] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de Lote 3: Notas y Recordatorios en Guardia
  const [dashNotes, setDashNotes] = useState([]);
  const [activeToasts, setActiveToasts] = useState([]);

  // Estados de Lote 5: Enrolamiento Multicapa (3 Fotos Sucesivas)
  const [enrolPhotos, setEnrolPhotos] = useState([]);
  const [enrolStep, setEnrolStep] = useState(1); // 1: Frente, 2: Perfil Izq, 3: Perfil Der

  // Estados para modales de acción rápida
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Formulario nuevo socio
  const [memberFormData, setMemberFormData] = useState({
    cedula: '',
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    tipo_membresia: 'mensual',
    genero: 'Masculino',
    fecha_nacimiento: '',
    foto_base64: ''
  });

  const [dashCedulaPrefix, setDashCedulaPrefix] = useState('V-');

  // Formulario de pago
  const [membersList, setMembersList] = useState([]);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [paymentData, setPaymentData] = useState({
    monto: '30.00',
    metodo_pago: 'pago_movil',
    tipo_membresia: 'mensual',
    referencia: ''
  });

  const [config, setConfig] = useState({
    tasa_cambio: 114.00,
    cuota_semanal: 10.00,
    cuota_mensual: 30.00,
    cuota_trimestral: 80.00,
    cuota_anual: 300.00,
    cobra_inscripcion: 1,
    cuota_inscripcion: 10.00,
    cuota_reactivacion: 5.00
  });

  const [includeInscription, setIncludeInscription] = useState(false);
  const [includeReactivation, setIncludeReactivation] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/config');
      const data = await res.json();
      if (!data.error) {
        setConfig(data);
      }
    } catch (e) {
      console.warn('Error al cargar configuración en Dashboard:', e.message);
    }
  };

  const calculateTotalPayment = (tipo, incIns, incReac, customConfig = config) => {
    let base = parseFloat(customConfig.cuota_mensual !== undefined ? customConfig.cuota_mensual : 30.00);
    if (tipo === 'semanal') base = parseFloat(customConfig.cuota_semanal !== undefined ? customConfig.cuota_semanal : 10.00);
    else if (tipo === 'trimestral') base = parseFloat(customConfig.cuota_trimestral !== undefined ? customConfig.cuota_trimestral : 80.00);
    else if (tipo === 'anual') base = parseFloat(customConfig.cuota_anual !== undefined ? customConfig.cuota_anual : 300.00);

    if (incIns && customConfig.cobra_inscripcion === 1) base += parseFloat(customConfig.cuota_inscripcion !== undefined ? customConfig.cuota_inscripcion : 10.00);
    if (incReac) base += parseFloat(customConfig.cuota_reactivacion !== undefined ? customConfig.cuota_reactivacion : 5.00);

    return base.toFixed(2);
  };

  // Formulario de gastos
  const [expenseData, setExpenseData] = useState({
    descripcion: '',
    monto: '',
    categoria: 'Servicios'
  });

  // Cámara e imágenes para inscripción (Modal Dedicado)
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  const handleCaptureConfirm = (photos) => {
    setMemberFormData(prev => ({ ...prev, foto_base64: photos }));
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, hoursRes, recentRes] = await Promise.all([
        fetch(`http://localhost:3000/api/dashboard/stats?t=${Date.now()}`),
        fetch(`http://localhost:3000/api/dashboard/hours?t=${Date.now()}`),
        fetch(`http://localhost:3000/api/dashboard/recent?t=${Date.now()}`)
      ]);

      const statsData = await statsRes.json();
      const hoursData = await hoursRes.json();
      const recentData = await recentRes.json();

      if (!statsData.error) setStats(statsData);
      if (!hoursData.error) setHours(hoursData);
      if (!recentData.error) setRecent(recentData);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error.message);
    }
  };

  // Cargar notas y lanzar notificaciones Toasts para Prioridad Alta
  const loadDashNotes = () => {
    const saved = localStorage.getItem('gym_notes');
    if (saved) {
      const parsed = JSON.parse(saved);
      setDashNotes(parsed);
      
      // Mostrar Toasts únicamente al iniciar de notas de prioridad ALTA no archivadas
      const altaNotes = parsed.filter(n => n.prioridad === 'alta' && !n.archivada);
      if (altaNotes.length > 0) {
        setActiveToasts(altaNotes.map(n => ({
          id: n.id,
          titulo: n.titulo,
          contenido: n.contenido,
          autor: n.autor || 'Sistema'
        })));
      }
    }
  };

  const handleToggleDashTask = (noteId, taskId) => {
    const updated = dashNotes.map(note => {
      if (note.id === noteId) {
        const updatedTareas = note.tareas.map(t => {
          if (t.id === taskId) return { ...t, completada: !t.completada };
          return t;
        });
        return { ...note, tareas: updatedTareas };
      }
      return note;
    });
    setDashNotes(updated);
    localStorage.setItem('gym_notes', JSON.stringify(updated));
  };

  // Cargar datos del servidor en segundo plano
  const loadInitialMembers = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/members');
      const data = await res.json();
      if (!data.error) setMembersList(data);
    } catch (error) {
      console.error('Error cargando socios:', error.message);
    }
  };

  const getTodayBirthdays = () => {
    if (!membersList) return [];
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate(); // 1-31

    return membersList.filter(m => {
      if (!m.fecha_nacimiento) return false;
      const parts = m.fecha_nacimiento.split('T')[0].split('-');
      if (parts.length !== 3) return false;
      const birthMonth = parseInt(parts[1], 10);
      const birthDay = parseInt(parts[2], 10);
      return birthMonth === todayMonth && birthDay === todayDay;
    });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboardData(), loadInitialMembers(), fetchConfig()]).finally(() => setLoading(false));
    loadDashNotes();

    // Auto-recarga cada 2 segundos (antes era 8s) para reflejar biometría en vivo instantáneamente
    const interval = setInterval(fetchDashboardData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Cargar lista de socios cuando se abre el modal de pagos
  useEffect(() => {
    if (showPaymentModal) {
      const loadMembers = async () => {
        try {
          const res = await fetch('http://localhost:3000/api/members');
          const data = await res.json();
          if (!data.error) setMembersList(data);
        } catch (error) {
          console.error(error);
        }
      };
      loadMembers();
    }
  }, [showPaymentModal]);

  // Control de cámara en CaptureModal
  const startCamera = async () => {};
  const stopCamera = () => {};
  const captureEnrollmentSnapshot = () => {};

  // Submit Handlers
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberFormData.cedula || !memberFormData.nombre || !memberFormData.apellido) {
      alert('Por favor rellena los campos obligatorios (Cédula, Nombre y Apellido).');
      return;
    }

    if (memberFormData.cedula.length < 6 || memberFormData.cedula.length > 8) {
      alert('La cédula de identidad debe tener entre 6 y 8 números.');
      return;
    }

    try {
      const fullCedula = `${dashCedulaPrefix}${memberFormData.cedula.trim()}`;
      const res = await fetch('http://localhost:3000/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...memberFormData, cedula: fullCedula, gym_sede: activeGym })
      });
      const result = await res.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      if (memberFormData.foto_base64) {
        await fetch('http://localhost:3000/api/biometrics/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socio_id: result.socio.id,
            foto_base64: memberFormData.foto_base64
          })
        });
      }

      alert('Socio inscrito e ingresado al sistema biométrico con éxito.');
      setShowAddModal(false);
      setDashCedulaPrefix('V-');
      setMemberFormData({
        cedula: '',
        nombre: '',
        apellido: '',
        telefono: '',
        email: '',
        tipo_membresia: 'mensual',
        genero: 'Masculino',
        fecha_nacimiento: '',
        foto_base64: ''
      });
      stopCamera();
      fetchDashboardData();
      loadInitialMembers();
    } catch (err) {
      console.error(err);
      alert('Error al registrar socio en el servidor.');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Seleccione un socio para cobrar.');
      return;
    }

    if (paymentData.metodo_pago === 'pago_movil' || paymentData.metodo_pago === 'transferencia') {
      if (!paymentData.referencia) {
        alert('Por favor, introduzca el número de referencia bancaria para Pago Móvil / Transferencia.');
        return;
      }
      const refLength = paymentData.referencia.length;
      if (refLength !== 4 && refLength !== 6) {
        alert('El número de referencia bancaria debe tener exactamente 4 o 6 dígitos (ni más ni menos).');
        return;
      }
    }

    try {
      const res = await fetch('http://localhost:3000/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socio_id: selectedMember.id,
          monto: parseFloat(paymentData.monto),
          metodo_pago: paymentData.metodo_pago,
          tipo_membresia: paymentData.tipo_membresia,
          gym_sede: activeGym,
          referencia: (paymentData.metodo_pago === 'pago_movil' || paymentData.metodo_pago === 'transferencia') ? paymentData.referencia : null
        })
      });
      const result = await res.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert('Renovación y pago registrados con éxito. Estatus de solvencia extendido y socio reactivado.');
      setShowPaymentModal(false);
      setSelectedMember(null);
      setPaymentSearch('');
      fetchDashboardData();
      loadInitialMembers();
    } catch (err) {
      console.error(err);
      alert('Error en red al procesar el pago.');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseData.descripcion || !expenseData.monto) return;

    try {
      const res = await fetch('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: expenseData.descripcion,
          monto: parseFloat(expenseData.monto),
          categoria: expenseData.categoria
        })
      });
      const data = await res.json();
      if (data.success) {
        setExpenseData({
          descripcion: '',
          monto: '',
          categoria: 'Servicios'
        });
        alert('Gasto registrado exitosamente.');
        setShowExpenseModal(false);
        fetchDashboardData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Error de red al registrar gasto.');
    }
  };

  const peakHour = hours.length > 0 
    ? hours.reduce((max, h) => h.cantidad > max.cantidad ? h : max, hours[0])
    : { hora: 'Sin registros', cantidad: 0 };

  const clientesSuspendidos = stats.total_socios - stats.activos;
  const isReceptionist = user?.role === 'recepcionista';
  const welcomeName = user ? `${user.nombre} ${user.apellido}` : 'Luis Ramos';

  // Buscar socios en el modal de renovación
  const filteredSearchMembers = paymentSearch.trim() === '' ? [] :
    membersList.filter(m => 
      `${m.nombre} ${m.apellido} ${m.cedula}`.toLowerCase().includes(paymentSearch.toLowerCase())
    );

  return (
    <div>
      {/* Contenedor de Toasts Flotantes para Notas de Guardia Altas */}
      {activeToasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '320px',
          width: '100%'
        }}>
          {activeToasts.map(toast => (
            <div key={toast.id} className="glass-card" style={{
              borderLeft: '4px solid var(--danger)',
              backgroundColor: 'rgba(26, 26, 26, 0.95)',
              backdropFilter: 'blur(12px)',
              padding: '14px 16px',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: '0 10px 25px rgba(230, 57, 70, 0.2)',
              position: 'relative',
              animation: 'fadeIn 0.3s ease'
            }}>
              <button 
                onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                title="Cerrar aviso"
              >
                <X size={14} />
              </button>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
                <strong style={{ fontSize: '12px', color: '#ffffff', fontWeight: 800 }}>{toast.titulo}</strong>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                {toast.contenido}
              </p>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '6px', fontWeight: 700 }}>
                Autor: {toast.autor}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Welcome Hero Banner - High-End Athletic Greet */}
      <div className="glass-card" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'linear-gradient(135deg, var(--primary), #0043ce)', 
        color: '#ffffff', 
        border: 'none', 
        padding: '24px 32px', 
        borderRadius: 'var(--border-radius-lg)', 
        boxShadow: '0 6px 20px rgba(15, 98, 254, 0.15)',
        marginBottom: '28px',
        animation: 'fadeIn 0.4s ease-out'
      }}>
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>
            Panel {isReceptionist ? 'Recepcionista' : 'Operacional'}
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginTop: '2px', color: '#ffffff', fontFamily: 'Outfit' }}>
            ¡Listo para entrenar, {welcomeName}!
          </h2>
          <p style={{ fontSize: '13px', marginTop: '6px', opacity: 0.9, maxWidth: '480px', lineHeight: 1.4 }}>
            Monitoreo en vivo para <strong>{activeGym}</strong> activo. La validación biométrica en puerta se está sincronizando en tiempo real.
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.8 }}>FECHA Y REGISTRO</span>
          <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'Outfit' }}>
            {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>Cabimas, Venezuela</span>
        </div>
      </div>

      {/* Barra de Acciones Rápidas Deportiva */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="btn btn-secondary" 
          style={{ gap: '6px', fontSize: '12px', padding: '10px 16px', fontWeight: 700 }}
        >
          <Plus size={14} color="var(--primary)" />
          <span>Inscribir</span>
        </button>
        <button 
          onClick={() => {
            setShowPaymentModal(true);
            setSelectedMember(null);
            setPaymentSearch('');
          }} 
          className="btn btn-secondary" 
          style={{ gap: '6px', fontSize: '12px', padding: '10px 16px', fontWeight: 700 }}
        >
          <RefreshCw size={14} color="var(--primary)" />
          <span>Renovar</span>
        </button>
        
        {!isReceptionist && (
          <button 
            onClick={() => setShowExpenseModal(true)} 
            className="btn btn-secondary" 
            style={{ gap: '6px', fontSize: '12px', padding: '10px 16px', fontWeight: 700 }}
          >
            <DollarSign size={14} color="var(--primary)" />
            <span>Registrar Gasto</span>
          </button>
        )}

        <button 
          onClick={() => onNavigate('kiosk')} 
          className="btn btn-secondary" 
          style={{ gap: '6px', fontSize: '12px', padding: '10px 16px', fontWeight: 700 }}
        >
          <ScanFace size={14} color="var(--primary)" />
          <span>Pantalla Acceso</span>
        </button>
      </div>

      {/* Contadores Estadísticos Premium Deportivos y Minimalistas */}
      <div className="grid-stats">
        <div className="stat-card" id="stat-total" onClick={() => onNavigate('members', { status: 'all', solvency: 'all', expiringSoon: false })} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">
            <Users size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total_socios}</span>
            <span className="stat-label">Clientes Totales</span>
          </div>
        </div>

        <div className="stat-card success" id="stat-active" onClick={() => onNavigate('members', { status: 'activo', solvency: 'all', expiringSoon: false })} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">
            <UserCheck size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.activos}</span>
            <span className="stat-label">Clientes Activos</span>
          </div>
        </div>

        <div className="stat-card" id="stat-suspended" onClick={() => onNavigate('members', { status: 'inactivo', solvency: 'all', expiringSoon: false })} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ color: 'var(--text-muted)' }}>
            <UserX size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{clientesSuspendidos}</span>
            <span className="stat-label">Clientes Suspendidos</span>
          </div>
        </div>

        <div className="stat-card warning" id="stat-expiring" onClick={() => onNavigate('members', { status: 'activo', solvency: 'all', expiringSoon: true })} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.vencen_pronto}</span>
            <span className="stat-label">Vencen en 3 días</span>
          </div>
        </div>

        <div className="stat-card danger" id="stat-expired" onClick={() => onNavigate('members', { status: 'activo', solvency: 'insolvent', expiringSoon: false })} style={{ cursor: 'pointer' }}>
          <div className="stat-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.insolventes}</span>
            <span className="stat-label">Clientes Vencidos</span>
          </div>
        </div>
      </div>

      {/* Fila Central: Gráfico de Horas Pico e Ingresos Recientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px', marginTop: '28px' }}>
        
        {/* Gráfico de Horas Pico */}
        <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--primary)" /> Distribución Horaria de Asistencias
            </h3>
            {peakHour.cantidad > 0 && (
              <span className="badge badge-success" style={{ fontSize: '10px', gap: '4px', padding: '4px 10px' }}>
                <TrendingUp size={10} /> Hora Pico: {format12h(peakHour.hora)}
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Estadísticas consolidadas de ingresos diarios de socios en {activeGym} para análisis operacional.
          </p>

          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div className="chart-axis-y">
              {hours.map((h, index) => {
                const maxVal = Math.max(...hours.map(item => item.cantidad), 1);
                const pct = (h.cantidad / maxVal) * 80;

                return (
                  <div key={index} className="chart-bar-wrapper">
                    <span className="chart-bar-tooltip">{h.cantidad} asistencias</span>
                    <div 
                      className="chart-bar" 
                      style={{ height: `${Math.max(pct, 6)}%` }}
                    />
                    <span className="chart-label">{formatHourOnly12h(h.hora)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 4px 0', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
              <span>Mañana (06:00 AM)</span>
              <span>Tarde (12:00 PM)</span>
              <span>Noche (10:00 PM)</span>
            </div>
          </div>
        </section>

        {/* Ingresos Recientes */}
        <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '340px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScanFace size={16} color="var(--primary)" /> Monitoreo de Entrada
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Flujo en vivo de accesos biométricos de socios.
          </p>

          <div className="activity-feed" style={{ flexGrow: 1 }}>
            {recent.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)' }}>
                <ScanFace size={24} style={{ marginBottom: '8px', opacity: 0.15 }} />
                <p style={{ fontSize: '11px' }}>Sin asistencias registradas hoy.</p>
              </div>
            ) : (
              recent.map((log) => (
                <div key={log.id} className="activity-item">
                  <div className="activity-user-container">
                    <div className={`activity-avatar ${log.status_acceso === 'permitido' ? 'allowed' : 'denied'}`}>
                      {log.foto_url ? (
                        <img 
                          src={`http://localhost:3000${log.foto_url}`} 
                          alt="Socio" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        log.nombre[0]
                      )}
                    </div>
                    <div className="activity-details">
                      <span className="activity-name">{log.nombre} {log.apellido}</span>
                      <span className="activity-meta">C.I: {log.cedula} • {new Date(log.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                  </div>

                  <span className={`badge ${log.status_acceso === 'permitido' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '9px', padding: '2px 8px' }}>
                    {log.status_acceso === 'permitido' ? 'Ok' : 'Bloqueado'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ==================== SECCIÓN DE MONITOREO OPERACIONAL EN TIEMPO REAL ==================== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px', marginTop: '28px' }}>
        
        {/* Lado Izquierdo: Métricas del Gimnasio (Aforo, Distribución de Planes y Alertas de Pago) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Sub-Grid: Aforo + Distribución de Planes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Aforo en Vivo (Termómetro) */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', minHeight: '180px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Aforo en Vivo</h4>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Últimas 2 horas de ingresos</span>
                </div>
                <span className={`badge ${
                  (recent ? recent.filter((log, idx, self) => log.status_acceso === 'permitido' && (new Date() - new Date(log.fecha_hora)) < 2 * 60 * 60 * 1000 && self.findIndex(l => l.socio_id === log.socio_id) === idx).length : 0) > 35 ? 'badge-danger' : 'badge-success'
                }`} style={{ fontSize: '9px', padding: '2px 8px' }}>
                  {(recent ? recent.filter((log, idx, self) => log.status_acceso === 'permitido' && (new Date() - new Date(log.fecha_hora)) < 2 * 60 * 60 * 1000 && self.findIndex(l => l.socio_id === log.socio_id) === idx).length : 0) > 35 ? 'Flujo Alto' : 'Flujo Ligero'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                {/* SVG Gauge */}
                <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="70" height="70" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="40" stroke="var(--border-color)" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke="var(--primary)" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (Math.min(((recent ? recent.filter((log, idx, self) => log.status_acceso === 'permitido' && (new Date() - new Date(log.fecha_hora)) < 2 * 60 * 60 * 1000 && self.findIndex(l => l.socio_id === log.socio_id) === idx).length : 0) / 50) * 100, 100) / 100) * 251.2}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'Outfit' }}>
                      {recent ? recent.filter((log, idx, self) => log.status_acceso === 'permitido' && (new Date() - new Date(log.fecha_hora)) < 2 * 60 * 60 * 1000 && self.findIndex(l => l.socio_id === log.socio_id) === idx).length : 0}
                    </span>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700 }}>/ 50</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>Socios entrenando</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Capacidad máxima: <strong>50 personas</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Métricas de Planes */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', minHeight: '180px', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Distribución de Membresías</h4>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Porcentaje de socios activos</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {/* Plan Mensual */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    <span>MENSUALES</span>
                    <span>{membersList ? membersList.filter(m => m.membresia_tipo === 'mensual' && m.status === 'activo').length : 0} socios ({((membersList ? membersList.filter(m => m.membresia_tipo === 'mensual' && m.status === 'activo').length : 0) / (membersList ? membersList.filter(m => m.status === 'activo').length : 1) * 100 || 0).toFixed(0)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${((membersList ? membersList.filter(m => m.membresia_tipo === 'mensual' && m.status === 'activo').length : 0) / (membersList ? membersList.filter(m => m.status === 'activo').length : 1) * 100 || 0)}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #00a86b, #00d28a)', 
                      borderRadius: '3px' 
                    }} />
                  </div>
                </div>

                {/* Plan Trimestral */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    <span>TRIMESTRALES</span>
                    <span>{membersList ? membersList.filter(m => m.membresia_tipo === 'trimestral' && m.status === 'activo').length : 0} socios ({((membersList ? membersList.filter(m => m.membresia_tipo === 'trimestral' && m.status === 'activo').length : 0) / (membersList ? membersList.filter(m => m.status === 'activo').length : 1) * 100 || 0).toFixed(0)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${((membersList ? membersList.filter(m => m.membresia_tipo === 'trimestral' && m.status === 'activo').length : 0) / (membersList ? membersList.filter(m => m.status === 'activo').length : 1) * 100 || 0)}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #0f62fe, #3b82f6)', 
                      borderRadius: '3px' 
                    }} />
                  </div>
                </div>

                {/* Plan Anual */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    <span>ANUALES</span>
                    <span>{membersList ? membersList.filter(m => m.membresia_tipo === 'anual' && m.status === 'activo').length : 0} socios ({((membersList ? membersList.filter(m => m.membresia_tipo === 'anual' && m.status === 'activo').length : 0) / (membersList ? membersList.filter(m => m.status === 'activo').length : 1) * 100 || 0).toFixed(0)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${((membersList ? membersList.filter(m => m.membresia_tipo === 'anual' && m.status === 'activo').length : 0) / (membersList ? membersList.filter(m => m.status === 'activo').length : 1) * 100 || 0)}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #8a3ffc, #a78bfa)', 
                      borderRadius: '3px' 
                    }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Alertas Críticas de Pago */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', minHeight: '190px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} color="var(--danger)" /> Alertas Críticas de Pago y Rechazos
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Monitoreo directo de accesos denegados por insolvencia financiera en puerta.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '120px' }}>
              {recent && recent.filter(log => log.status_acceso === 'denegado').length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '11px', fontWeight: 700, padding: '12px', backgroundColor: 'rgba(0, 168, 107, 0.04)', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(0, 168, 107, 0.08)' }}>
                  <Check size={14} />
                  <span>Todo en orden. No se registran rechazos de pago en las últimas asistencias.</span>
                </div>
              ) : (
                recent && recent.filter(log => log.status_acceso === 'denegado').slice(0, 3).map(log => (
                  <div key={log.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '8px 12px', 
                    backgroundColor: 'rgba(230, 57, 70, 0.03)', 
                    border: '1px solid rgba(230, 57, 70, 0.08)',
                    borderRadius: 'var(--border-radius-md)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="activity-avatar denied" style={{ width: '30px', height: '30px', border: '1px solid var(--danger)', fontSize: '11px' }}>
                        {log.foto_url ? (
                          <img src={`http://localhost:3000${log.foto_url}`} alt="Socio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          log.nombre[0]
                        )}
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{log.nombre} {log.apellido}</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Cédula: {log.cedula} • Razón: <strong style={{ color: 'var(--danger)' }}>{log.razon_denegacion || 'Insolvente'}</strong></span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedMember({ id: log.socio_id, nombre: log.nombre, apellido: log.apellido, cedula: log.cedula, status: 'inactivo', membresia_tipo: 'mensual' });
                        
                        setIncludeInscription(false);
                        setIncludeReactivation(true); // Es un socio inactivo bloqueado, se cobra cuota de reactivación por defecto
                        const baseMonto = calculateTotalPayment('mensual', false, true);
                        setPaymentData(prev => ({ 
                          ...prev, 
                          tipo_membresia: 'mensual',
                          monto: baseMonto,
                          referencia: ''
                        }));
                        setShowPaymentModal(true);
                      }}
                      className="btn btn-primary" 
                      style={{ padding: '4px 10px', fontSize: '10px', height: '26px' }}
                    >
                      Cobrar y Activar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Lado Derecho: Recordatorios de Guardia y Cumpleañeros de Hoy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Recordatorios de Guardia (Bloc de Notas) */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', minHeight: '320px', flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>📋 Notas y Pendientes de Recepción</h4>
              <button 
                onClick={() => onNavigate('notes')} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }}
              >
                Gestionar Notas
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flexGrow: 1, maxHeight: '250px', paddingRight: '4px' }}>
              {dashNotes && dashNotes.filter(n => !n.archivada).length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <Check size={28} style={{ opacity: 0.15, marginBottom: '8px' }} />
                  <p style={{ fontSize: '11px' }}>No hay recordatorios activos de guardia.</p>
                </div>
              ) : (
                dashNotes && dashNotes.filter(n => !n.archivada).map(n => {
                  const completadas = n.tareas ? n.tareas.filter(t => t.completada).length : 0;
                  const totales = n.tareas ? n.tareas.length : 0;
                  const hasTareas = totales > 0;
                  
                  const getBorderColor = (p) => {
                    if (p === 'alta') return 'var(--danger)';
                    if (p === 'media') return 'var(--primary)';
                    return 'var(--text-muted)';
                  };

                  return (
                    <div key={n.id} style={{ 
                      padding: '12px', 
                      borderRadius: 'var(--border-radius-md)', 
                      backgroundColor: 'var(--bg-app)', 
                      border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${getBorderColor(n.prioridad)}`,
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{n.titulo}</strong>
                        <span style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: getBorderColor(n.prioridad) }}>
                          {n.prioridad}
                        </span>
                      </div>

                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                        {n.contenido}
                      </p>

                      {/* Subchecklist en el Dashboard */}
                      {hasTareas && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                          {n.tareas.map(t => (
                            <div 
                              key={t.id} 
                              onClick={() => handleToggleDashTask(n.id, t.id)} 
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            >
                              <div style={{ width: '10px', height: '10px', borderRadius: '2px', border: '1px solid var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: t.completada ? 'var(--success)' : 'transparent' }}>
                                {t.completada && <Check size={7} color="#ffffff" />}
                              </div>
                              <span style={{ 
                                fontSize: '10px', 
                                color: t.completada ? 'var(--text-muted)' : 'var(--text-secondary)',
                                textDecoration: t.completada ? 'line-through' : 'none',
                                fontWeight: 600
                              }}>
                                {t.texto}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700 }}>
                        <span>Por: {n.autor || 'Recepción'}</span>
                        <span>{n.fecha}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cumpleañeros de Hoy 🎂 */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', minHeight: '220px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎂 Cumpleañeros de Hoy
            </h4>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Felicita a tus socios hoy en su día y mejora la retención del gimnasio.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '180px', paddingRight: '4px' }}>
              {getTodayBirthdays().length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <span style={{ fontSize: '24px', marginBottom: '6px' }}>🎈</span>
                  <p style={{ fontSize: '11px' }}>No hay cumpleañeros el día de hoy.</p>
                </div>
              ) : (
                getTodayBirthdays().map(m => {
                  const parts = m.fecha_nacimiento.split('T')[0].split('-');
                  const age = new Date().getFullYear() - parseInt(parts[0], 10);
                  
                  let cleanPhone = m.telefono ? m.telefono.replace(/\D/g, '') : '';
                  if (cleanPhone.startsWith('0')) {
                    cleanPhone = '58' + cleanPhone.substring(1);
                  } else if (cleanPhone.length > 0 && !cleanPhone.startsWith('58')) {
                    cleanPhone = '58' + cleanPhone;
                  }

                  const templateMsg = `¡Hola ${m.nombre}! 🎉 En ${activeGym} te deseamos un muy feliz cumpleaños. 🎂 Que pases un excelente día lleno de salud y entrenamiento. ¡Hoy tienes un pase gratis de cortesía para un invitado especial! 🏋️‍♂️💪`;
                  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(templateMsg)}` : null;

                  return (
                    <div key={m.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '10px 12px', 
                      backgroundColor: 'rgba(168, 85, 247, 0.03)', 
                      border: '1px solid rgba(168, 85, 247, 0.08)',
                      borderRadius: 'var(--border-radius-md)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="activity-avatar" style={{ 
                          width: '32px', 
                          height: '32px', 
                          border: '1px dashed var(--primary)', 
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          background: 'rgba(15, 98, 254, 0.05)',
                          color: 'var(--primary)',
                          fontWeight: 800
                        }}>
                          {m.foto_url ? (
                            <img src={`http://localhost:3000${m.foto_url}`} alt="Socio" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            m.nombre[0]
                          )}
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{m.nombre} {m.apellido}</span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>¡Cumple {age} años! 🎁</span>
                        </div>
                      </div>

                      {waUrl ? (
                        <a 
                          href={waUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-secondary" 
                          style={{ 
                            padding: '4px 10px', 
                            fontSize: '10px', 
                            height: '26px', 
                            textDecoration: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            backgroundColor: 'rgba(37, 211, 102, 0.08)',
                            borderColor: 'rgba(37, 211, 102, 0.15)',
                            color: '#25d366'
                          }}
                        >
                          💬 Felicitar
                        </a>
                      ) : (
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Sin teléfono</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Módulo de Contabilidad e Indicadores Financieros (OCULTO PARA RECEPCIONISTAS) */}
      {!isReceptionist && (
        <div className="glass-card" style={{ marginTop: '28px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={16} color="var(--primary)" /> Balance Contable de Caja
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {/* Ingresos Totales */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(0,168,107,0.06)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>INGRESOS TOTALES</span>
                <h4 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit', marginTop: '2px' }}>
                  ${stats.ingresos_totales}
                </h4>
              </div>
            </div>

            {/* Gastos Totales */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(230,57,70,0.06)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={18} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>GASTOS TOTALES</span>
                <h4 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit', marginTop: '2px' }}>
                  -${stats.gastos_totales}
                </h4>
              </div>
            </div>

            {/* Balance Neto */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: parseFloat(stats.balance_neto) >= 0 ? 'rgba(0,168,107,0.12)' : 'rgba(230,57,70,0.12)', color: parseFloat(stats.balance_neto) >= 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={18} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>SALDO DE CAJA NETO</span>
                <h4 style={{ 
                  fontSize: '20px', 
                  fontWeight: 900, 
                  color: parseFloat(stats.balance_neto) >= 0 ? 'var(--success)' : 'var(--danger)', 
                  fontFamily: 'Outfit', 
                  marginTop: '2px' 
                }}>
                  ${stats.balance_neto}
                </h4>
              </div>
            </div>
          </div>

          {/* Sección de conversión a Bolívares */}
          <div style={{ marginTop: '16px', padding: '10px 14px', backgroundColor: 'rgba(15,98,254,0.03)', border: '1px solid rgba(15,98,254,0.08)', borderRadius: 'var(--border-radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <span>Conversión de Saldo Neto a Moneda Nacional (BCV):</span>
            <span style={{ color: 'var(--primary)', fontFamily: 'Outfit', fontSize: '12px' }}>
              Bs. {(parseFloat(stats.balance_neto) * tasaCambio).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* ==================== MODALES DE ACCIÓN RÁPIDA ==================== */}

      {/* Modal 1: Inscribir Nuevo Socio */}
      {showAddModal && (
        <div className="modal-overlay" style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="modal-content" style={{ animation: 'scaleUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Inscribir Socio (Acceso Rápido)</h3>
              <button 
                onClick={() => { setShowAddModal(false); stopCamera(); setEnrolPhotos([]); setEnrolStep(1); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input 
                    type="text" 
                    required
                    value={memberFormData.nombre}
                    onChange={(e) => setMemberFormData(prev => ({ ...prev, nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '') }))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido *</label>
                  <input 
                    type="text" 
                    required
                    value={memberFormData.apellido}
                    onChange={(e) => setMemberFormData(prev => ({ ...prev, apellido: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '') }))}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cédula de Identidad *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={dashCedulaPrefix}
                    onChange={(e) => setDashCedulaPrefix(e.target.value)}
                    className="form-control"
                    style={{ width: '80px', flexShrink: 0, fontWeight: 700 }}
                  >
                    <option value="V-">V-</option>
                    <option value="E-">E-</option>
                  </select>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: 25123456"
                    value={memberFormData.cedula}
                    onChange={(e) => setMemberFormData(prev => ({ ...prev, cedula: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                    className="form-control"
                    style={{ flexGrow: 1 }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 04121234567"
                    value={memberFormData.telefono}
                    onChange={(e) => setMemberFormData(prev => ({ ...prev, telefono: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Género *</label>
                  <select 
                    value={memberFormData.genero}
                    onChange={(e) => setMemberFormData(prev => ({ ...prev, genero: e.target.value }))}
                    className="form-control"
                    required
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    placeholder="Ej: cliente@correo.com"
                    value={memberFormData.email}
                    onChange={(e) => setMemberFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Nacimiento</label>
                  <DatePicker 
                    max={new Date().toISOString().split('T')[0]}
                    value={memberFormData.fecha_nacimiento}
                    onChange={(val) => setMemberFormData(prev => ({ ...prev, fecha_nacimiento: val }))}
                    placeholder="Seleccionar fecha"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Membresía</label>
                  <select 
                    value={memberFormData.tipo_membresia}
                    onChange={(e) => setMemberFormData(prev => ({ ...prev, tipo_membresia: e.target.value }))}
                    className="form-control"
                  >
                    <option value="mensual">Mensual (${parseFloat(config.cuota_mensual || 20).toFixed(2)})</option>
                    {config.solo_mensual !== 1 && (
                      <>
                        <option value="semanal">Semanal (${parseFloat(config.cuota_semanal || 10).toFixed(2)})</option>
                        <option value="trimestral">Trimestral (${parseFloat(config.cuota_trimestral || 80).toFixed(2)})</option>
                        <option value="anual">Anual (${parseFloat(config.cuota_anual || 300).toFixed(2)})</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ opacity: 0, pointerEvents: 'none' }}>
                  <label className="form-label">Espacio</label>
                  <select className="form-control"><option/></select>
                </div>
              </div>

              {/* Enrolamiento Circular (Dedicado) */}
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                  <Camera size={14} /> Captura Facial del Cliente (Escáner Biométrico)
                </label>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '90px', 
                    height: '90px', 
                    borderRadius: '50%', 
                    overflow: 'hidden', 
                    background: 'var(--bg-app)', 
                    border: '2px solid var(--border-color)', 
                    position: 'relative', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {Array.isArray(memberFormData.foto_base64) && memberFormData.foto_base64.length > 0 ? (
                      <img 
                        src={memberFormData.foto_base64[0]} 
                        alt="Foto Enrolada" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Users size={24} style={{ opacity: 0.15 }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ 
                        padding: '8px 14px', 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.1) 0%, rgba(79, 172, 254, 0.1) 100%)', 
                        border: '1px solid rgba(0, 242, 254, 0.3)',
                        color: '#00f2fe',
                        borderRadius: '10px'
                      }} 
                      onClick={() => setShowCaptureModal(true)}
                    >
                      <span>📷 {Array.isArray(memberFormData.foto_base64) ? 'Repetir Captura Facial' : 'Iniciar Escáner Facial'}</span>
                    </button>
                    {Array.isArray(memberFormData.foto_base64) && (
                      <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={12} /> ✓ {memberFormData.foto_base64.length}/3 Fotos Biométricas Listas
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddModal(false); stopCamera(); setEnrolPhotos([]); setEnrolStep(1); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Socio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Renovar/Cobrar Mensualidad */}
      {showPaymentModal && (
        <div className="modal-overlay" style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="modal-content" style={{ maxWidth: '440px', animation: 'scaleUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Renovación / Cobro de Mensualidad</h3>
              <button 
                onClick={() => { setShowPaymentModal(false); setSelectedMember(null); setPaymentSearch(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Paso A: Buscar socio si no hay seleccionado */}
            {!selectedMember ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className="form-label">Buscar Afiliado</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Escriba Cédula o Nombre del socio..."
                    className="form-control"
                    style={{ paddingLeft: '36px', width: '100%' }}
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                  />
                </div>

                {/* Lista de resultados filtrados */}
                {filteredSearchMembers.length > 0 && (
                  <div style={{ 
                    maxHeight: '180px', 
                    overflowY: 'auto', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--border-radius-md)',
                    backgroundColor: 'var(--bg-app)'
                  }}>
                    {filteredSearchMembers.map(m => (
                      <div 
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          const isInactive = m.status === 'inactivo';
                          setIncludeInscription(false);
                          setIncludeReactivation(isInactive);
                          
                          const baseMonto = calculateTotalPayment(m.membresia_tipo || 'mensual', false, isInactive);
                          setPaymentData(prev => ({ 
                            ...prev, 
                            tipo_membresia: m.membresia_tipo || 'mensual',
                            monto: baseMonto,
                            referencia: ''
                          }));
                        }}
                        style={{ 
                          padding: '10px 14px', 
                          cursor: 'pointer', 
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 98, 254, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{m.nombre} {m.apellido}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>C.I: {m.cedula}</span>
                        </div>
                        <span className={`badge ${m.membresia_solvencia === 1 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '9px' }}>
                          {m.membresia_solvencia === 1 ? 'Solvente' : 'Insolvente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {paymentSearch.trim() !== '' && filteredSearchMembers.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>No se encontraron socios con esa coincidencia.</p>
                )}
              </div>
            ) : (
              // Paso B: Cargar formulario de cobro para el socio seleccionado
              <form onSubmit={handleRecordPayment}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  marginBottom: '20px', 
                  padding: '10px 14px', 
                  background: 'rgba(15, 98, 254, 0.04)', 
                  borderRadius: 'var(--border-radius-md)', 
                  border: '1px solid rgba(15, 98, 254, 0.1)',
                  position: 'relative'
                }}>
                  <div className="activity-avatar" style={{ width: '36px', height: '36px', fontSize: '14px', fontWeight: 900 }}>
                    {selectedMember.nombre[0]}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedMember.nombre} {selectedMember.apellido}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Cédula: {selectedMember.cedula} • ({selectedMember.status === 'activo' ? 'Activo' : 'Inactivo'})</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    style={{ position: 'absolute', right: '14px', top: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                  >
                    Cambiar
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Membresía</label>
                  <select 
                    value={paymentData.tipo_membresia}
                    onChange={(e) => {
                      const tipo = e.target.value;
                      const newMonto = calculateTotalPayment(tipo, includeInscription, includeReactivation);
                      setPaymentData(prev => ({ ...prev, tipo_membresia: tipo, monto: newMonto }));
                    }}
                    className="form-control"
                  >
                    <option value="mensual">Mensual (${parseFloat(config.cuota_mensual || 20).toFixed(2)})</option>
                    {config.solo_mensual !== 1 && (
                      <>
                        <option value="semanal">Semanal (${parseFloat(config.cuota_semanal || 10).toFixed(2)})</option>
                        <option value="trimestral">Trimestral (${parseFloat(config.cuota_trimestral || 80).toFixed(2)})</option>
                        <option value="anual">Anual (${parseFloat(config.cuota_anual || 300).toFixed(2)})</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Monto a Cobrar (USD) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={paymentData.monto}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, monto: e.target.value }))}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método de Pago</label>
                    <select 
                      value={paymentData.metodo_pago}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, metodo_pago: e.target.value, referencia: '' }))}
                      className="form-control"
                    >
                      <option value="pago_movil">Pago Móvil</option>
                      <option value="divisas">Divisas (USD Efectivo)</option>
                      <option value="efectivo">Bolívares (Efectivo)</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>
                </div>

                {/* Input Dinámico de Referencia para Pago Móvil y Transferencia */}
                {(paymentData.metodo_pago === 'pago_movil' || paymentData.metodo_pago === 'transferencia') && (
                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <label className="form-label" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Referencia Bancaria (Últimos 4-6 dígitos) *</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: 9584"
                      value={paymentData.referencia || ''}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, referencia: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      className="form-control"
                      maxLength={6}
                    />
                  </div>
                )}

                {/* Checkboxes de cobro opcional para inscripción y reactivación */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px' }}>
                  {config.cobra_inscripcion === 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox"
                        id="dash_inc_ins"
                        checked={includeInscription}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const newMonto = calculateTotalPayment(paymentData.tipo_membresia, checked, includeReactivation);
                          setIncludeInscription(checked);
                          setPaymentData(prev => ({ ...prev, monto: newMonto }));
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="dash_inc_ins" style={{ fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
                        Cobrar Inscripción (+${parseFloat(config.cuota_inscripcion || 10).toFixed(2)})
                      </label>
                    </div>
                  )}
                  
                  {selectedMember?.status === 'inactivo' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox"
                        id="dash_inc_reac"
                        checked={includeReactivation}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const newMonto = calculateTotalPayment(paymentData.tipo_membresia, includeInscription, checked);
                          setIncludeReactivation(checked);
                          setPaymentData(prev => ({ ...prev, monto: newMonto }));
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="dash_inc_reac" style={{ fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
                        Cobrar Cuota de Reactivación (+${parseFloat(config.cuota_reactivacion || 5).toFixed(2)})
                      </label>
                    </div>
                  )}
                </div>

                {/* Caja de conversión en vivo a Bs (Fijado al registrar) */}
                <div style={{
                  background: 'rgba(15, 98, 254, 0.05)',
                  border: '1px solid rgba(15, 98, 254, 0.15)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginTop: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Total en Bolívares (BCV):</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                    Bs. {(parseFloat(paymentData.monto || 0) * (config.tasa_cambio || 114.00)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowPaymentModal(false); setSelectedMember(null); setPaymentSearch(''); }}>Cancelar</button>
                  <button type="submit" className="btn btn-success" style={{ gap: '6px' }}>
                    <CreditCard size={14} />
                    <span>Procesar Pago</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Registrar Gasto Rápido (SOLO ADMIINISTRADOR) */}
      {showExpenseModal && !isReceptionist && (
        <div className="modal-overlay" style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="modal-content" style={{ maxWidth: '400px', animation: 'scaleUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Registrar Egreso / Gasto</h3>
              <button 
                onClick={() => setShowExpenseModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label className="form-label">Descripción del gasto *</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="Ej: Pago de electricidad de Mayo"
                  value={expenseData.descripcion}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, descripcion: e.target.value }))}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Monto (USD) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={expenseData.monto}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, monto: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-control"
                    value={expenseData.categoria}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, categoria: e.target.value }))}
                  >
                    <option value="Servicios">Servicios</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Personal">Personal</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Alquiler">Alquiler</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                  <DollarSign size={14} />
                  <span>Guardar Gasto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CaptureModal
        isOpen={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        onConfirm={handleCaptureConfirm}
        isEnrolment={true}
      />
    </div>
  );
}

export default Dashboard;
