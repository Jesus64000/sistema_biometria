import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Camera, 
  CreditCard, 
  Check, 
  X, 
  RefreshCw,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react';

function Members({ activeGym, initialTab, user }) {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSolvency, setFilterSolvency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('fecha_registro');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  
  // Estados de modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSocio, setSelectedSocio] = useState(null);

  // Formulario nuevo socio
  const [formData, setFormData] = useState({
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

  const [cedulaPrefix, setCedulaPrefix] = useState('V-');
  const [editCedulaPrefix, setEditCedulaPrefix] = useState('V-');

  const [editFormData, setEditFormData] = useState({
    id: '',
    cedula: '',
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    status: 'activo',
    genero: 'Masculino',
    fecha_nacimiento: '',
    tipo_membresia: 'mensual',
    foto_url: '',
    foto_base64: ''
  });

  // Formulario de pago
  const [paymentData, setPaymentData] = useState({
    monto: '30.00',
    metodo_pago: 'pago_movil',
    tipo_membresia: 'mensual',
    referencia: ''
  });

  const [config, setConfig] = useState({
    tasa_cambio: 114.00,
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
      console.warn('Error al cargar configuración en socios:', e.message);
    }
  };

  const calculateTotalPayment = (tipo, incIns, incReac, customConfig = config) => {
    let base = parseFloat(customConfig.cuota_mensual !== undefined ? customConfig.cuota_mensual : 30.00);
    if (tipo === 'trimestral') base = parseFloat(customConfig.cuota_trimestral !== undefined ? customConfig.cuota_trimestral : 80.00);
    else if (tipo === 'anual') base = parseFloat(customConfig.cuota_anual !== undefined ? customConfig.cuota_anual : 300.00);

    if (incIns && customConfig.cobra_inscripcion === 1) base += parseFloat(customConfig.cuota_inscripcion !== undefined ? customConfig.cuota_inscripcion : 10.00);
    if (incReac) base += parseFloat(customConfig.cuota_reactivacion !== undefined ? customConfig.cuota_reactivacion : 5.00);

    return base.toFixed(2);
  };

  // Cámara e imágenes
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/members');
      const data = await res.json();
      if (!data.error) {
        setMembers(data);
      }
    } catch (error) {
      console.error('Error al cargar socios:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchConfig();
    if (initialTab === 'payments') {
      setFilterSolvency('insolvent'); // Enfocar insolventes automáticamente
    }
  }, [initialTab]);

  // Iniciar webcam para capturar foto de enrolamiento
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('No se pudo acceder a la cámara:', err.message);
      alert('Error: No se pudo abrir la cámara. Verifica los permisos de tu navegador.');
      setCameraActive(false);
    }
  };

  // Apagar cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  // Capturar instantánea
  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = 240;
      canvas.height = 240; // Cuadrada para el avatar circular
      
      // Dibujar imagen invertida (modo espejo) y centrar
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, -40, 0, 320, 240); // Ajustar encuadre
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      if (showEditModal) {
        setEditFormData(prev => ({ ...prev, foto_base64: base64 }));
      } else {
        setFormData(prev => ({ ...prev, foto_base64: base64 }));
      }
      stopCamera();
    }
  };

  // Guardar nuevo socio
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!formData.cedula || !formData.nombre || !formData.apellido) {
      alert('Por favor rellena los campos obligatorios (Cédula, Nombre y Apellido).');
      return;
    }

    try {
      const fullCedula = `${cedulaPrefix}${formData.cedula.trim()}`;
      const res = await fetch('http://localhost:3000/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, cedula: fullCedula, gym_sede: 'MarianGym' })
      });
      const result = await res.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      // Si se enroló biometría, enviamos al reconocedor de Python
      if (formData.foto_base64) {
        await fetch('http://localhost:3000/api/biometrics/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socio_id: result.socio.id,
            foto_base64: formData.foto_base64
          })
        });
      }

      alert('Socio registrado con éxito e inscrito en el sistema biométrico.');
      
      // Cerrar modal y limpiar
      setShowAddModal(false);
      setCedulaPrefix('V-');
      setFormData({
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
      fetchMembers();
    } catch (err) {
      console.error(err);
      alert('Error al registrar socio en el servidor.');
    }
  };

  // Guardar pago
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedSocio) return;

    if ((paymentData.metodo_pago === 'pago_movil' || paymentData.metodo_pago === 'transferencia') && !paymentData.referencia) {
      alert('Por favor, introduzca el número de referencia bancaria para Pago Móvil / Transferencia.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socio_id: selectedSocio.id,
          monto: parseFloat(paymentData.monto),
          metodo_pago: paymentData.metodo_pago,
          tipo_membresia: paymentData.tipo_membresia,
          gym_sede: 'MarianGym',
          referencia: (paymentData.metodo_pago === 'pago_movil' || paymentData.metodo_pago === 'transferencia') ? paymentData.referencia : null
        })
      });
      const result = await res.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert('Pago procesado con éxito. Estatus de solvencia extendido por 30 días y socio reactivado.');
      setShowPaymentModal(false);
      setSelectedSocio(null);
      fetchMembers();
    } catch (err) {
      console.error(err);
      alert('Error en red al procesar el pago.');
    }
  };

  // Alternar el estatus (Activo/Inactivo)
  const toggleStatus = async (socio) => {
    const newStatus = socio.status === 'activo' ? 'inactivo' : 'activo';
    if (!confirm(`¿Deseas cambiar el estatus de ${socio.nombre} a ${newStatus.toUpperCase()}?`)) return;

    try {
      await fetch(`http://localhost:3000/api/members/${socio.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  // Abrir modal de edición
  const handleOpenEditModal = (socio) => {
    let prefix = 'V-';
    let number = socio.cedula;
    if (socio.cedula.includes('-')) {
      const parts = socio.cedula.split('-');
      prefix = parts[0] + '-';
      number = parts[1];
    } else if (socio.cedula.startsWith('V') || socio.cedula.startsWith('E')) {
      prefix = socio.cedula.substring(0, 1) + '-';
      number = socio.cedula.substring(1);
    }
    setEditCedulaPrefix(prefix);
    setEditFormData({
      id: socio.id,
      cedula: number,
      nombre: socio.nombre,
      apellido: socio.apellido,
      telefono: socio.telefono || '',
      email: socio.email || '',
      status: socio.status || 'activo',
      genero: socio.genero || 'Masculino',
      fecha_nacimiento: socio.fecha_nacimiento ? socio.fecha_nacimiento.split('T')[0] : '',
      tipo_membresia: socio.membresia_tipo || 'mensual',
      foto_url: socio.foto_url || '',
      foto_base64: ''
    });
    setShowEditModal(true);
  };

  // Enviar edición de socio
  const handleEditMember = async (e) => {
    e.preventDefault();
    if (!editFormData.cedula || !editFormData.nombre || !editFormData.apellido) {
      alert('Por favor rellena los campos obligatorios.');
      return;
    }

    try {
      const fullCedula = `${editCedulaPrefix}${editFormData.cedula.trim()}`;
      const res = await fetch(`http://localhost:3000/api/members/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editFormData, cedula: fullCedula })
      });
      const result = await res.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      // Si se capturó una nueva foto, enrolarla en el motor Python Flask
      if (editFormData.foto_base64) {
        await fetch('http://localhost:3000/api/biometrics/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socio_id: editFormData.id,
            foto_base64: editFormData.foto_base64
          })
        });
      }

      alert('Datos del socio actualizados exitosamente.');
      setShowEditModal(false);
      stopCamera();
      fetchMembers();
    } catch (err) {
      console.error(err);
      alert('Error de red al actualizar los datos.');
    }
  };

  // Eliminar socio físicamente (solo Admin)
  const handleDeleteMember = async (id) => {
    if (!confirm('¿Estás completamente seguro de eliminar este socio? Se perderá de forma permanente todo su registro e historial biométrico.')) return;

    try {
      const res = await fetch(`http://localhost:3000/api/members/${id}`, {
        method: 'DELETE'
      });
      const result = await res.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert('Socio eliminado con éxito del sistema.');
      fetchMembers();
    } catch (err) {
      console.error(err);
      alert('Error de conexión al intentar eliminar socio.');
    }
  };

  // Filtrado dinámico
  const filteredMembers = members
    .filter(m => {
      // 1. Buscador texto
      const searchString = `${m.nombre} ${m.apellido} ${m.cedula}`.toLowerCase();
      const matchesSearch = searchString.includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      
      // 2. Filtro Solvencia
      if (filterSolvency === 'solvent' && m.membresia_solvencia !== 1) return false;
      if (filterSolvency === 'insolvent' && m.membresia_solvencia !== 0) return false;
      
      // 3. Filtro Estatus
      if (filterStatus === 'activo' && m.status !== 'activo') return false;
      if (filterStatus === 'inactivo' && m.status !== 'inactivo') return false;
      
      // 4. Filtro Género
      if (filterGender === 'Masculino' && m.genero !== 'Masculino') return false;
      if (filterGender === 'Femenino' && m.genero !== 'Femenino') return false;
      
      // 5. Filtro Rango de Fechas (Fecha de registro)
      if (startDate) {
        const regDate = new Date(m.fecha_registro);
        const sDate = new Date(startDate);
        sDate.setHours(0,0,0,0);
        if (regDate < sDate) return false;
      }
      if (endDate) {
        const regDate = new Date(m.fecha_registro);
        const eDate = new Date(endDate);
        eDate.setHours(23,59,59,999);
        if (regDate > eDate) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // 6. Ordenamiento Dinámico
      let valueA, valueB;
      
      if (sortBy === 'fecha_registro') {
        valueA = new Date(a.fecha_registro || 0).getTime();
        valueB = new Date(b.fecha_registro || 0).getTime();
      } else if (sortBy === 'membresia_fin') {
        valueA = new Date(a.membresia_fin || 0).getTime();
        valueB = new Date(b.membresia_fin || 0).getTime();
      } else {
        // Alfabético por nombre
        valueA = `${a.nombre} ${a.apellido}`.toLowerCase();
        valueB = `${b.nombre} ${b.apellido}`.toLowerCase();
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      {/* Controles de Búsqueda y Filtros */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', padding: '20px' }}>
        
        {/* Fila 1: Búsqueda y Filtros Principales */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Buscador de Texto */}
          <div className="form-group" style={{ flexGrow: 2, minWidth: '260px', margin: 0, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '11px', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </span>
            <input 
              id="search-input"
              type="text" 
              placeholder="Buscar socio por Cédula, Nombre o Apellido..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '40px', width: '100%', height: '38px' }}
            />
          </div>

          {/* Filtro Solvencia */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <select 
              id="solvency-filter"
              value={filterSolvency}
              onChange={(e) => setFilterSolvency(e.target.value)}
              className="form-control"
              style={{ width: '175px', height: '38px', fontWeight: 600 }}
            >
              <option value="all">Ver Solvencia (Todos)</option>
              <option value="solvent">Solo Solventes</option>
              <option value="insolvent">Solo Insolventes</option>
            </select>
          </div>

          {/* Filtro Estatus */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <select 
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-control"
              style={{ width: '165px', height: '38px', fontWeight: 600 }}
            >
              <option value="all">Ver Estatus (Todos)</option>
              <option value="activo">Solo Activos</option>
              <option value="inactivo">Solo Inactivos</option>
            </select>
          </div>

          {/* Filtro Género */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <select 
              id="gender-filter"
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="form-control"
              style={{ width: '165px', height: '38px', fontWeight: 600 }}
            >
              <option value="all">Ver Género (Todos)</option>
              <option value="Masculino">Hombres</option>
              <option value="Femenino">Mujeres</option>
            </select>
          </div>
        </div>

        {/* Fila 2: Filtros de Fecha de Inscripción y Ordenación */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
          
          {/* Rangos de Fecha de Registro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Inscripción entre:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-control"
              style={{ width: '135px', height: '32px', fontSize: '11px', padding: '4px 8px' }}
              title="Fecha Inicial de Inscripción"
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>y</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-control"
              style={{ width: '135px', height: '32px', fontSize: '11px', padding: '4px 8px' }}
              title="Fecha Final de Inscripción"
            />
            {(startDate || endDate) && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '10px', height: '32px' }}
                onClick={() => { setStartDate(''); setEndDate(''); }}
              >
                Limpiar Fechas
              </button>
            )}
          </div>

          {/* Ordenamiento Dinámico */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Ordenar por:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-control"
              style={{ width: '150px', height: '32px', fontSize: '11px', padding: '4px 8px', fontWeight: 600 }}
            >
              <option value="fecha_registro">Fecha Inscripción</option>
              <option value="membresia_fin">Próximos a Vencer</option>
              <option value="nombre">Orden Alfabético</option>
            </select>

            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="form-control"
              style={{ width: '110px', height: '32px', fontSize: '11px', padding: '4px 8px', fontWeight: 600 }}
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>

            <div style={{ display: 'flex', gap: '6px', marginLeft: '10px' }}>
              <button id="btn-refresh" className="btn btn-secondary" style={{ height: '32px', width: '32px', padding: 0, justifyContent: 'center' }} onClick={fetchMembers} title="Actualizar Socios">
                <RefreshCw size={12} />
              </button>
              
              {isAdmin && (
                <button id="btn-add-member" className="btn btn-primary" style={{ height: '32px', gap: '4px', fontSize: '11px', padding: '0 12px' }} onClick={() => setShowAddModal(true)}>
                  <UserPlus size={12} />
                  <span>Nuevo Socio</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Listado de Socios */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} className="animate-spin" />
          <span style={{ marginLeft: '10px', fontWeight: 600, fontSize: '13px' }}>Cargando expediente de socios de {activeGym}...</span>
        </div>
      ) : (
        <div className="table-container" style={{ marginTop: 0 }}>
          <table className="custom-table" id="members-table">
            <thead>
              <tr>
                <th>Socio</th>
                <th>Cédula</th>
                <th>Contacto</th>
                <th>Estatus</th>
                <th>Solvencia</th>
                <th>Membresía Vence</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No se encontraron socios registrados.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} id={`member-row-${member.id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="activity-avatar" style={{ width: '34px', height: '34px', border: '2px solid var(--border-color)' }}>
                          {member.foto_url ? (
                            <img 
                              src={`http://localhost:3000${member.foto_url}`} 
                              alt="Socio" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            member.nombre[0]
                          )}
                        </div>
                        <span style={{ fontWeight: 700 }}>{member.nombre} {member.apellido}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{member.cedula}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {member.telefono && <span><Phone size={8} /> {member.telefono}</span>}
                        {member.email && <span><Mail size={8} /> {member.email}</span>}
                      </div>
                    </td>
                    <td>
                      <button 
                        className={`badge ${member.status === 'activo' ? 'badge-success' : 'badge-danger'}`}
                        onClick={() => isAdmin && toggleStatus(member)}
                        style={{ cursor: isAdmin ? 'pointer' : 'default', border: '1px solid transparent', padding: '2px 8px', fontSize: '10px' }}
                        title={isAdmin ? "Cambiar estatus" : "Control de estatus"}
                        disabled={!isAdmin}
                      >
                        {member.status === 'activo' ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${member.membresia_solvencia === 1 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {member.membresia_solvencia === 1 ? 'Solvente' : 'Insolvente'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {member.membresia_fin ? new Date(member.membresia_fin).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'Sin registro'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '11px', gap: '4px', height: '30px' }}
                          onClick={() => {
                            setSelectedSocio(member);
                            const isInactive = member.status === 'inactivo';
                            setIncludeInscription(false);
                            setIncludeReactivation(isInactive);
                            
                            // Cargar de inmediato con la tasa correcta y el sueldo de reactivacion si aplica
                            const baseMonto = calculateTotalPayment(member.membresia_tipo || 'mensual', false, isInactive);
                            setPaymentData(prev => ({ 
                              ...prev, 
                              tipo_membresia: member.membresia_tipo || 'mensual',
                              monto: baseMonto,
                              referencia: ''
                            }));
                            setShowPaymentModal(true);
                          }}
                          title="Registrar cobro de mensualidad"
                        >
                          <CreditCard size={12} />
                          <span>Cobrar</span>
                        </button>

                        {isAdmin && (
                          <>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '11px', gap: '4px', height: '30px', color: 'var(--primary)' }}
                              onClick={() => handleOpenEditModal(member)}
                              title="Editar datos de afiliado"
                            >
                              <Edit size={12} />
                              <span>Editar</span>
                            </button>
                            
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px', color: 'var(--danger)', borderColor: 'transparent', height: '30px' }}
                              onClick={() => handleDeleteMember(member.id)}
                              title="Eliminar socio"
                            >
                              <Trash2 size={14} />
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

      {/* Modal 1: Nuevo Socio y Enrolamiento */}
      {showAddModal && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Inscribir Nuevo Socio</h3>
              <button 
                onClick={() => { setShowAddModal(false); stopCamera(); }}
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
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.apellido}
                    onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cédula de Identidad *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={cedulaPrefix}
                    onChange={(e) => setCedulaPrefix(e.target.value)}
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
                    value={formData.cedula}
                    onChange={(e) => setFormData(prev => ({ ...prev, cedula: e.target.value.replace(/\D/g, '') }))}
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
                    placeholder="Ej: 0414-1234567"
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Género *</label>
                  <select 
                    value={formData.genero}
                    onChange={(e) => setFormData(prev => ({ ...prev, genero: e.target.value }))}
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
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Nacimiento</label>
                  <input 
                    type="date" 
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.fecha_nacimiento}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Membresía</label>
                  <select 
                    value={formData.tipo_membresia}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo_membresia: e.target.value }))}
                    className="form-control"
                  >
                    <option value="mensual">Mensual (${parseFloat(config.cuota_mensual || 20).toFixed(2)})</option>
                    {config.solo_mensual !== 1 && (
                      <>
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

              {/* Enrolamiento Circular */}
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                  <Camera size={14} /> Captura Facial del Cliente
                </label>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
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
                    {cameraActive ? (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                      />
                    ) : formData.foto_base64 ? (
                      <img 
                        src={formData.foto_base64} 
                        alt="Foto Enrolada" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Users size={20} style={{ opacity: 0.2 }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {!cameraActive ? (
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={startCamera}>
                        <span>Iniciar Cámara</span>
                      </button>
                    ) : (
                      <button type="button" className="btn btn-success" style={{ padding: '6px 12px', fontSize: '11px', gap: '4px' }} onClick={captureSnapshot}>
                        <Check size={12} />
                        <span>Capturar</span>
                      </button>
                    )}
                    {formData.foto_base64 && (
                      <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 700 }}>✓ Cara lista</span>
                    )}
                  </div>
                </div>
              </div>

              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddModal(false); stopCamera(); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Completar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Registrar Pago */}
      {showPaymentModal && selectedSocio && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Registrar Pago</h3>
              <button 
                onClick={() => { setShowPaymentModal(false); setSelectedSocio(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '10px', background: 'var(--bg-app)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
              <div className="activity-avatar" style={{ width: '36px', height: '36px' }}>
                {selectedSocio.nombre[0]}
              </div>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700 }}>{selectedSocio.nombre} {selectedSocio.apellido}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Cédula: {selectedSocio.cedula}</p>
              </div>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label className="form-label">Tipo de Renovación</label>
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
                      <option value="trimestral">Trimestral (${parseFloat(config.cuota_trimestral || 80).toFixed(2)})</option>
                      <option value="anual">Anual (${parseFloat(config.cuota_anual || 300).toFixed(2)})</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Monto (USD) *</label>
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
                    onChange={(e) => setPaymentData(prev => ({ ...prev, referencia: e.target.value.replace(/\D/g, '') }))}
                    className="form-control"
                  />
                </div>
              )}

              {/* Checkboxes de cobro opcional para inscripción y reactivación */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px' }}>
                {config.cobra_inscripcion === 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox"
                      id="inc_ins"
                      checked={includeInscription}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newMonto = calculateTotalPayment(paymentData.tipo_membresia, checked, includeReactivation);
                        setIncludeInscription(checked);
                        setPaymentData(prev => ({ ...prev, monto: newMonto }));
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="inc_ins" style={{ fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      Cobrar Inscripción (+${parseFloat(config.cuota_inscripcion || 10).toFixed(2)})
                    </label>
                  </div>
                )}
                
                {selectedSocio?.status === 'inactivo' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox"
                      id="inc_reac"
                      checked={includeReactivation}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newMonto = calculateTotalPayment(paymentData.tipo_membresia, includeInscription, checked);
                        setIncludeReactivation(checked);
                        setPaymentData(prev => ({ ...prev, monto: newMonto }));
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="inc_reac" style={{ fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
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
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPaymentModal(false); setSelectedSocio(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-success" style={{ gap: '6px' }}>
                  <UserCheck size={14} />
                  <span>Procesar Pago</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Editar Socio */}
      {showEditModal && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Editar Expediente del Socio</h3>
              <button 
                onClick={() => { setShowEditModal(false); stopCamera(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditMember}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input 
                    type="text" 
                    required
                    value={editFormData.nombre}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido *</label>
                  <input 
                    type="text" 
                    required
                    value={editFormData.apellido}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, apellido: e.target.value }))}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cédula de Identidad *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={editCedulaPrefix}
                    onChange={(e) => setEditCedulaPrefix(e.target.value)}
                    className="form-control"
                    style={{ width: '80px', flexShrink: 0, fontWeight: 700 }}
                  >
                    <option value="V-">V-</option>
                    <option value="E-">E-</option>
                  </select>
                  <input 
                    type="text" 
                    required
                    value={editFormData.cedula}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, cedula: e.target.value.replace(/\D/g, '') }))}
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
                    placeholder="Ej: 0414-1234567"
                    value={editFormData.telefono}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    placeholder="Ej: cliente@correo.com"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Estatus Administrativo</label>
                  <select 
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="form-control"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Género *</label>
                  <select 
                    value={editFormData.genero}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, genero: e.target.value }))}
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
                  <label className="form-label">Membresía</label>
                  <select 
                    value={editFormData.tipo_membresia}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, tipo_membresia: e.target.value }))}
                    className="form-control"
                  >
                    <option value="mensual">Mensual (${parseFloat(config.cuota_mensual || 20).toFixed(2)})</option>
                    {config.solo_mensual !== 1 && (
                      <>
                        <option value="trimestral">Trimestral (${parseFloat(config.cuota_trimestral || 80).toFixed(2)})</option>
                        <option value="anual">Anual (${parseFloat(config.cuota_anual || 300).toFixed(2)})</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Nacimiento</label>
                  <input 
                    type="date" 
                    max={new Date().toISOString().split('T')[0]}
                    value={editFormData.fecha_nacimiento}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Enrolamiento / Actualización de Foto */}
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                  <Camera size={14} /> Actualizar Foto del Cliente (Opcional)
                </label>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
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
                    {cameraActive ? (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                      />
                    ) : editFormData.foto_base64 ? (
                      <img 
                        src={editFormData.foto_base64} 
                        alt="Nueva Foto" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : editFormData.foto_url ? (
                      <img 
                        src={`http://localhost:3000${editFormData.foto_url}`} 
                        alt="Foto Actual" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Users size={20} style={{ opacity: 0.2 }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {!cameraActive ? (
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={startCamera}>
                        <span>Iniciar Cámara</span>
                      </button>
                    ) : (
                      <button type="button" className="btn btn-success" style={{ padding: '6px 12px', fontSize: '11px', gap: '4px' }} onClick={captureSnapshot}>
                        <Check size={12} />
                        <span>Capturar</span>
                      </button>
                    )}
                    {editFormData.foto_base64 && (
                      <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 700 }}>✓ Nueva foto lista</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); stopCamera(); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;
