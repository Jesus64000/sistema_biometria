import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  AlertCircle, 
  User, 
  Archive, 
  FolderOpen, 
  CheckSquare, 
  Square, 
  Check, 
  ChevronRight,
  Inbox,
  Clock,
  ListTodo
} from 'lucide-react';

function Notes() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('gym_notes');
    return saved ? JSON.parse(saved) : [
      { 
        id: 1, 
        titulo: 'Reparar máquina de polea', 
        contenido: 'La polea cruzada de la entrada rechina al levantar más de 40kg. Reportar al técnico el lunes.', 
        fecha: new Date().toLocaleDateString('es-VE'), 
        prioridad: 'alta', 
        fecha_limite: '2026-05-30', 
        autor: 'Luis Ramos', 
        archivada: false,
        tareas: [
          { id: 101, texto: 'Llamar al técnico mecánico', completada: true },
          { id: 102, texto: 'Comprar grasa lubricante industrial', completada: false }
        ]
      },
      { 
        id: 2, 
        titulo: 'Aviso de la tasa del dólar', 
        contenido: 'Recuerden actualizar la tasa del dólar en el panel de configuración al arrancar la mañana de acuerdo a la tasa oficial del BCV.', 
        fecha: new Date().toLocaleDateString('es-VE'), 
        prioridad: 'alta', 
        fecha_limite: '', 
        autor: 'Administrador', 
        archivada: false,
        tareas: []
      },
      { 
        id: 3, 
        titulo: 'Inventario de hidratación', 
        contenido: 'Verificar neveras y rellenar con aguas minerales y bebidas isotónicas para el turno de la tarde.', 
        fecha: new Date().toLocaleDateString('es-VE'), 
        prioridad: 'media', 
        fecha_limite: '', 
        autor: 'Recepción Mañana', 
        archivada: false,
        tareas: [
          { id: 301, texto: 'Contar botellas de agua', completada: true },
          { id: 302, texto: 'Pedir lote a distribuidor', completada: true },
          { id: 303, texto: 'Rellenar neveras', completada: false }
        ]
      }
    ];
  });

  const [filterTab, setFilterTab] = useState('activas'); // 'activas' | 'archivadas'
  const [activeNote, setActiveNote] = useState(null);
  
  // Estados de edición
  const [editTitulo, setEditTitulo] = useState('');
  const [editContenido, setEditContenido] = useState('');
  const [editPrioridad, setEditPrioridad] = useState('baja');
  const [editFechaLimite, setEditFechaLimite] = useState('');
  const [editAutor, setEditAutor] = useState('');
  const [editTareas, setEditTareas] = useState([]);
  const [newTareaTexto, setNewTareaTexto] = useState('');

  // Sincronizar localStorage
  useEffect(() => {
    localStorage.setItem('gym_notes', JSON.stringify(notes));
  }, [notes]);

  // Al arrancar, seleccionar la primera nota del filtro actual si existe
  useEffect(() => {
    const filtradas = notes.filter(n => filterTab === 'activas' ? !n.archivada : n.archivada);
    if (filtradas.length > 0 && !activeNote) {
      setActiveNote(filtradas[0]);
    } else if (filtradas.length === 0) {
      setActiveNote(null);
    }
  }, [notes, filterTab]);

  // Rellenar formulario cuando cambia la nota activa
  useEffect(() => {
    if (activeNote) {
      setEditTitulo(activeNote.titulo);
      setEditContenido(activeNote.contenido);
      setEditPrioridad(activeNote.prioridad || 'baja');
      setEditFechaLimite(activeNote.fecha_limite || '');
      setEditAutor(activeNote.autor || 'Recepción');
      setEditTareas(activeNote.tareas || []);
    } else {
      setEditTitulo('');
      setEditContenido('');
      setEditPrioridad('baja');
      setEditFechaLimite('');
      setEditAutor('');
      setEditTareas([]);
    }
  }, [activeNote]);

  const handleAddNote = () => {
    const newNote = {
      id: Date.now(),
      titulo: 'Nueva Nota ' + (notes.length + 1),
      contenido: 'Comienza a escribir aquí...',
      fecha: new Date().toLocaleDateString('es-VE'),
      prioridad: 'baja',
      fecha_limite: '',
      autor: 'Luis Ramos',
      archivada: false,
      tareas: []
    };
    setNotes([newNote, ...notes]);
    setFilterTab('activas');
    setActiveNote(newNote);
  };

  const handleSaveNote = () => {
    if (!activeNote) return;
    const updated = notes.map(n => {
      if (n.id === activeNote.id) {
        return { 
          ...n, 
          titulo: editTitulo, 
          contenido: editContenido,
          prioridad: editPrioridad,
          fecha_limite: editFechaLimite,
          autor: editAutor,
          tareas: editTareas
        };
      }
      return n;
    });
    setNotes(updated);
    // Actualizar nota activa
    setActiveNote({ 
      ...activeNote, 
      titulo: editTitulo, 
      contenido: editContenido,
      prioridad: editPrioridad,
      fecha_limite: editFechaLimite,
      autor: editAutor,
      tareas: editTareas
    });
    alert('Nota guardada con éxito.');
  };

  const handleDeleteNote = (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta nota definitivamente?')) return;
    const filtered = notes.filter(n => n.id !== id);
    setNotes(filtered);
    if (activeNote && activeNote.id === id) {
      const remaining = filtered.filter(n => filterTab === 'activas' ? !n.archivada : n.archivada);
      setActiveNote(remaining[0] || null);
    }
  };

  const handleToggleArchive = () => {
    if (!activeNote) return;
    const nuevoEstado = !activeNote.archivada;
    const updated = notes.map(n => {
      if (n.id === activeNote.id) {
        return { ...n, archivada: nuevoEstado };
      }
      return n;
    });
    setNotes(updated);
    setActiveNote(null);
    alert(nuevoEstado ? 'Nota archivada con éxito. Ya no aparecerá en el dashboard principal.' : 'Nota desarchivada y devuelta a activas.');
  };

  // Gestión de Checklist
  const handleAddTarea = (e) => {
    e.preventDefault();
    if (!newTareaTexto.trim()) return;
    const nueva = {
      id: Date.now(),
      texto: newTareaTexto.trim(),
      completada: false
    };
    const updatedTareas = [...editTareas, nueva];
    setEditTareas(updatedTareas);
    setNewTareaTexto('');
    
    // Auto-guardar checklist en el modelo principal
    const updatedNotes = notes.map(n => {
      if (n.id === activeNote.id) {
        return { ...n, tareas: updatedTareas };
      }
      return n;
    });
    setNotes(updatedNotes);
  };

  const handleToggleTarea = (tareaId) => {
    const updatedTareas = editTareas.map(t => {
      if (t.id === tareaId) return { ...t, completada: !t.completada };
      return t;
    });
    setEditTareas(updatedTareas);

    // Auto-guardar en el modelo principal
    const updatedNotes = notes.map(n => {
      if (n.id === activeNote.id) {
        return { ...n, tareas: updatedTareas };
      }
      return n;
    });
    setNotes(updatedNotes);
  };

  const handleDeleteTarea = (tareaId) => {
    const updatedTareas = editTareas.filter(t => t.id !== tareaId);
    setEditTareas(updatedTareas);

    // Auto-guardar en el modelo principal
    const updatedNotes = notes.map(n => {
      if (n.id === activeNote.id) {
        return { ...n, tareas: updatedTareas };
      }
      return n;
    });
    setNotes(updatedNotes);
  };

  // Filtrar notas para renderizar en la columna izquierda
  const visibleNotes = notes.filter(n => filterTab === 'activas' ? !n.archivada : n.archivada);

  const getPriorityColor = (p) => {
    switch (p) {
      case 'alta': return 'var(--danger)';
      case 'media': return 'var(--primary)';
      case 'baja': default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 2fr', gap: '28px', height: '620px' }}>
      {/* 1. Columna lateral izquierda - Lista de Notas y Filtros */}
      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '18px', height: '100%', overflow: 'hidden' }}>
        
        {/* Switch de Filtros Activas / Archivadas */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-app)', padding: '4px', borderRadius: 'var(--border-radius-md)', marginBottom: '14px', border: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => { setFilterTab('activas'); setActiveNote(null); }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: filterTab === 'activas' ? 'var(--glass-bg)' : 'transparent',
              color: filterTab === 'activas' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Inbox size={12} />
            <span>Activas</span>
          </button>
          <button 
            onClick={() => { setFilterTab('archivadas'); setActiveNote(null); }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: filterTab === 'archivadas' ? 'var(--glass-bg)' : 'transparent',
              color: filterTab === 'archivadas' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Archive size={12} />
            <span>Archivadas</span>
          </button>
        </div>

        {/* Título de Sección y botón Nueva */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {filterTab === 'activas' ? 'Recordatorios Activos' : 'Archivo'}
          </h3>
          <button onClick={handleAddNote} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '11px', gap: '4px', height: '30px' }}>
            <Plus size={12} />
            <span>Nueva</span>
          </button>
        </div>

        {/* Listado de Notas con Scroll */}
        <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
          {visibleNotes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
              <FolderOpen size={32} style={{ opacity: 0.15, marginBottom: '8px' }} />
              <p style={{ fontSize: '11px' }}>No hay notas en esta sección.</p>
            </div>
          ) : (
            visibleNotes.map(n => {
              const completadas = n.tareas ? n.tareas.filter(t => t.completada).length : 0;
              const totales = n.tareas ? n.tareas.length : 0;
              const hasTareas = totales > 0;

              return (
                <div
                  key={n.id}
                  onClick={() => setActiveNote(n)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--border-radius-md)',
                    backgroundColor: activeNote && activeNote.id === n.id ? 'rgba(15, 98, 254, 0.05)' : 'var(--bg-app)',
                    border: `1px solid ${activeNote && activeNote.id === n.id ? 'var(--primary)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.25s ease'
                  }}
                  className="note-sidebar-card"
                >
                  {/* Prioridad en Borde Izquierdo */}
                  <div style={{ 
                    position: 'absolute', 
                    left: 0, 
                    top: 0, 
                    bottom: 0, 
                    width: '4px', 
                    backgroundColor: getPriorityColor(n.prioridad), 
                    borderRadius: '4px 0 0 4px' 
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ 
                      fontSize: '12px', 
                      fontWeight: 800, 
                      color: 'var(--text-primary)', 
                      textOverflow: 'ellipsis', 
                      overflow: 'hidden', 
                      whiteSpace: 'nowrap', 
                      maxWidth: '160px' 
                    }}>
                      {n.titulo}
                    </h4>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6, padding: 0 }}
                      title="Eliminar permanentemente"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <p style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)', 
                    marginTop: '4px', 
                    textOverflow: 'ellipsis', 
                    overflow: 'hidden', 
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4
                  }}>
                    {n.contenido}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    {/* Indicador de Tareas Checklist */}
                    {hasTareas ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: 700, color: completadas === totales ? 'var(--success)' : 'var(--primary)' }}>
                        <ListTodo size={9} /> {completadas}/{totales} tareas
                      </span>
                    ) : (
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        Por: {n.autor || 'Recepción'}
                      </span>
                    )}

                    {/* Fecha de Creación */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: 'var(--text-muted)' }}>
                      <Calendar size={8} /> {n.fecha}
                    </span>
                  </div>

                  {/* Alerta de Fecha Límite */}
                  {n.fecha_limite && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: 'var(--warning)', marginTop: '4px', fontWeight: 600 }}>
                      <Clock size={8} /> Límite: {new Date(n.fecha_limite).toLocaleDateString('es-VE')}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 2. Columna derecha - Formulario Completo y Gestor de Checklists */}
      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px 24px', height: '100%', overflow: 'hidden' }}>
        {activeNote ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px', overflowY: 'auto' }}>
            
            {/* Header del Editor: Título y Botón Guardar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="form-group" style={{ flexGrow: 1, margin: 0 }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ 
                    fontSize: '15px', 
                    fontWeight: 900, 
                    border: 'none', 
                    borderBottom: '2px solid var(--border-color)', 
                    borderRadius: 0, 
                    paddingLeft: 0, 
                    paddingRight: 0, 
                    background: 'transparent',
                    boxShadow: 'none'
                  }}
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  placeholder="Título de la nota..."
                />
              </div>
              
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  onClick={handleToggleArchive} 
                  className="btn btn-secondary" 
                  style={{ gap: '4px', fontSize: '11px', padding: '8px 12px', height: '34px' }}
                  title={activeNote.archivada ? "Desarchivar" : "Archivar nota"}
                >
                  <Archive size={12} color="var(--primary)" />
                  <span>{activeNote.archivada ? 'Desarchivar' : 'Archivar'}</span>
                </button>

                <button 
                  onClick={handleSaveNote} 
                  className="btn btn-success" 
                  style={{ gap: '5px', fontSize: '11px', padding: '8px 14px', height: '34px' }}
                >
                  <Save size={12} />
                  <span>Guardar</span>
                </button>
              </div>
            </div>

            {/* Metadatos Avanzados: Prioridad, Límite, Autor */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: '12px', 
              padding: '12px 14px', 
              backgroundColor: 'var(--bg-app)', 
              borderRadius: 'var(--border-radius-md)', 
              border: '1px solid var(--border-color)' 
            }}>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={9} /> Prioridad
                </label>
                <select 
                  value={editPrioridad} 
                  onChange={(e) => setEditPrioridad(e.target.value)}
                  className="form-control"
                  style={{ height: '30px', padding: '0 8px', fontSize: '11px', fontWeight: 700 }}
                >
                  <option value="baja">Baja (Gris)</option>
                  <option value="media">Media (Azul)</option>
                  <option value="alta">Alta (Roja)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={9} /> Fecha Límite
                </label>
                <input 
                  type="date" 
                  value={editFechaLimite} 
                  onChange={(e) => setEditFechaLimite(e.target.value)}
                  className="form-control"
                  style={{ height: '30px', padding: '0 8px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={9} /> Autor / Guardia
                </label>
                <input 
                  type="text" 
                  value={editAutor} 
                  onChange={(e) => setEditAutor(e.target.value)}
                  className="form-control"
                  placeholder="Ej: Personal Recepción"
                  style={{ height: '30px', padding: '0 8px', fontSize: '11px' }}
                />
              </div>
            </div>

            {/* Contenido de la Nota */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Detalle del Recordatorio</label>
              <textarea
                className="form-control"
                style={{ 
                  minHeight: '80px', 
                  resize: 'none', 
                  border: '1px solid var(--border-color)', 
                  padding: '10px', 
                  backgroundColor: 'transparent', 
                  lineHeight: 1.5,
                  fontSize: '12px'
                }}
                value={editContenido}
                onChange={(e) => setEditContenido(e.target.value)}
                placeholder="Escribe las instrucciones detalladas aquí..."
              />
            </div>

            {/* Gestor de Checklist / Sub-Tareas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ListTodo size={11} color="var(--primary)" /> Lista de Sub-Tareas Interactivas
              </label>

              {/* Agregar Tarea */}
              <form onSubmit={handleAddTarea} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text"
                  placeholder="Nueva tarea (Ej: Limpiar mostrador o llamar a socio)..."
                  className="form-control"
                  style={{ height: '32px', fontSize: '11px', flexGrow: 1 }}
                  value={newTareaTexto}
                  onChange={(e) => setNewTareaTexto(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '0 12px', fontSize: '11px', height: '32px', fontWeight: 700 }}>
                  Añadir
                </button>
              </form>

              {/* Listado de Tareas */}
              <div style={{ 
                maxHeight: '130px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '6px', 
                padding: '4px 0' 
              }}>
                {editTareas.length === 0 ? (
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                    No hay tareas asignadas a esta nota. ¡Añade una arriba!
                  </p>
                ) : (
                  editTareas.map(t => (
                    <div 
                      key={t.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div 
                        onClick={() => handleToggleTarea(t.id)} 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexGrow: 1 }}
                      >
                        {t.completada ? (
                          <CheckSquare size={13} color="var(--success)" style={{ flexShrink: 0 }} />
                        ) : (
                          <Square size={13} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ 
                          fontSize: '11px', 
                          color: t.completada ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: t.completada ? 'line-through' : 'none',
                          fontWeight: t.completada ? 500 : 600,
                          lineHeight: 1.2
                        }}>
                          {t.texto}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteTarea(t.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ opacity: 0.1, marginBottom: '12px' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Selecciona o crea un Recordatorio</h4>
            <p style={{ fontSize: '11px', marginTop: '4px', maxWidth: '240px', textAlign: 'center' }}>
              Utiliza el menú lateral para seleccionar un pendiente o dar de alta un aviso de guardia.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Notes;
