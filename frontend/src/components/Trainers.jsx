import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, Trash2, Tag, Calendar, User, Edit, X } from 'lucide-react';

function Trainers({ user }) {
  const [trainers, setTrainers] = useState(() => {
    const saved = localStorage.getItem('gym_trainers');
    return saved ? JSON.parse(saved) : [
      { id: 1, nombre: 'Luis', apellido: 'Ramos', especialidad: 'Musculación y Powerlifting', telefono: '0414-1234567', horario: '06:00 AM - 12:00 PM' },
      { id: 2, nombre: 'Ana', apellido: 'Sánchez', especialidad: 'Cardio y Pérdida de Peso', telefono: '0416-8889900', horario: '02:00 PM - 08:00 PM' },
      { id: 3, nombre: 'Daniel', apellido: 'Gutiérrez', especialidad: 'Entrenamiento Funcional y Crossfit', telefono: '0412-1112233', horario: '04:00 PM - 10:00 PM' }
    ];
  });

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [especialidad, setEspecialidad] = useState('Musculación y Powerlifting');
  const [telefono, setTelefono] = useState('');
  const [horario, setHorario] = useState('06:00 AM - 12:00 PM');

  // Estado para la edición de entrenador
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTrainer, setEditTrainer] = useState({
    id: '',
    nombre: '',
    apellido: '',
    especialidad: 'Musculación y Powerlifting',
    telefono: '',
    horario: '06:00 AM - 12:00 PM'
  });

  useEffect(() => {
    localStorage.setItem('gym_trainers', JSON.stringify(trainers));
  }, [trainers]);

  const handleAddTrainer = (e) => {
    e.preventDefault();
    if (!nombre || !apellido) return;

    const newTrainer = {
      id: Date.now(),
      nombre,
      apellido,
      especialidad,
      telefono: telefono || 'N/A',
      horario
    };

    setTrainers([...trainers, newTrainer]);
    setNombre('');
    setApellido('');
    setEspecialidad('Musculación y Powerlifting');
    setTelefono('');
    setHorario('06:00 AM - 12:00 PM');
    alert('Instructor registrado con éxito.');
  };

  const handleOpenEditModal = (t) => {
    setEditTrainer({
      id: t.id,
      nombre: t.nombre,
      apellido: t.apellido,
      especialidad: t.especialidad,
      telefono: t.telefono,
      horario: t.horario
    });
    setShowEditModal(true);
  };

  const handleUpdateTrainer = (e) => {
    e.preventDefault();
    if (!editTrainer.nombre || !editTrainer.apellido) return;

    const updated = trainers.map(t => t.id === editTrainer.id ? editTrainer : t);
    setTrainers(updated);
    setShowEditModal(false);
    alert('Instructor actualizado con éxito.');
  };

  const handleDeleteTrainer = (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este entrenador del staff?')) return;
    setTrainers(trainers.filter(t => t.id !== id));
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: isAdmin ? '1fr 2.2fr' : '1fr', 
      gap: '32px' 
    }}>
      
      {/* Columna izquierda - Registrar Entrenador (SOLO ADMINISTRADOR) */}
      {isAdmin && (
        <section className="glass-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="var(--primary)" /> Agregar Entrenador
          </h3>
          
          <form onSubmit={handleAddTrainer}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input 
                  type="text"
                  className="form-control"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido *</label>
                <input 
                  type="text"
                  className="form-control"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Especialidad</label>
              <select
                className="form-control"
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
              >
                <option value="Musculación y Powerlifting">Musculación y Powerlifting</option>
                <option value="Cardio y Pérdida de Peso">Cardio y Pérdida de Peso</option>
                <option value="Entrenamiento Funcional y Crossfit">Entrenamiento Funcional y Crossfit</option>
                <option value="Preparación Física">Preparación Física</option>
                <option value="Nutrición Deportiva">Nutrición Deportiva</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input 
                  type="text"
                  placeholder="Ej: 0414-1234567"
                  className="form-control"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Horario asignado</label>
                <select
                  className="form-control"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                >
                  <option value="06:00 AM - 12:00 PM">Turno Mañana (6am-12pm)</option>
                  <option value="12:00 PM - 06:00 PM">Turno Tarde (12pm-6pm)</option>
                  <option value="04:00 PM - 10:00 PM">Turno Noche (4pm-10pm)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', gap: '6px' }}>
              <Dumbbell size={16} />
              <span>Inscribir Instructor</span>
            </button>
          </form>
        </section>
      )}

      {/* Columna derecha - Listado de Entrenadores */}
      <section className="glass-card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px 8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Staff Técnico de Instructores</h3>
        </div>
        
        <div className="table-container" style={{ border: 'none', marginTop: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Instructor</th>
                <th>Especialidad</th>
                <th>Contacto</th>
                <th>Horario Laboral</th>
                {isAdmin && <th style={{ textAlign: 'center' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {trainers.map((trainer) => (
                <tr key={trainer.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(15, 98, 254, 0.05)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        fontWeight: 800
                      }}>
                        {trainer.nombre[0]}
                      </div>
                      <span style={{ fontWeight: 700 }}>{trainer.nombre} {trainer.apellido}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary" style={{ fontSize: '10px', gap: '4px' }}>
                      <Tag size={10} />
                      {trainer.especialidad}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'Outfit' }}>{trainer.telefono}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={10} />
                      {trainer.horario}
                    </div>
                  </td>
                  
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEditModal(trainer)}
                          className="btn btn-secondary"
                          style={{ padding: '6px', color: 'var(--primary)', borderColor: 'transparent' }}
                          title="Editar entrenador"
                        >
                          <Edit size={14} />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteTrainer(trainer.id)}
                          className="btn btn-secondary"
                          style={{ padding: '6px', color: 'var(--danger)', borderColor: 'transparent' }}
                          title="Eliminar entrenador"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Edición de Entrenador (solo Admin) */}
      {showEditModal && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Editar Instructor</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTrainer}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={editTrainer.nombre}
                    onChange={(e) => setEditTrainer(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={editTrainer.apellido}
                    onChange={(e) => setEditTrainer(prev => ({ ...prev, apellido: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Especialidad</label>
                <select
                  className="form-control"
                  value={editTrainer.especialidad}
                  onChange={(e) => setEditTrainer(prev => ({ ...prev, especialidad: e.target.value }))}
                >
                  <option value="Musculación y Powerlifting">Musculación y Powerlifting</option>
                  <option value="Cardio y Pérdida de Peso">Cardio y Pérdida de Peso</option>
                  <option value="Entrenamiento Funcional y Crossfit">Entrenamiento Funcional y Crossfit</option>
                  <option value="Preparación Física">Preparación Física</option>
                  <option value="Nutrición Deportiva">Nutrición Deportiva</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={editTrainer.telefono}
                    onChange={(e) => setEditTrainer(prev => ({ ...prev, telefono: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Horario asignado</label>
                  <select
                    className="form-control"
                    value={editTrainer.horario}
                    onChange={(e) => setEditTrainer(prev => ({ ...prev, horario: e.target.value }))}
                  >
                    <option value="06:00 AM - 12:00 PM">Turno Mañana (6am-12pm)</option>
                    <option value="12:00 PM - 06:00 PM">Turno Tarde (12pm-6pm)</option>
                    <option value="04:00 PM - 10:00 PM">Turno Noche (4pm-10pm)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Trainers;
