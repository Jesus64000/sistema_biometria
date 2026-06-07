import React, { useState, useEffect } from 'react';
import DatePicker from './DatePicker';
import { 
  ScanFace, 
  Search, 
  Calendar, 
  RefreshCw, 
  Printer, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  TrendingDown,
  UserCheck
} from 'lucide-react';

function History({ activeGym }) {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [metodo, setMetodo] = useState('all');
  const [fecha, setFecha] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      let url = `http://localhost:3000/api/asistencias?status=${status}&metodo=${metodo}`;
      if (fecha) url += `&fecha=${fecha}`;
      if (search) url += `&search=${search}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!data.error) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Error al cargar bitácora:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [status, metodo, fecha]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const handlePrint = () => {
    window.print();
  };

  // Cálculos estadísticos para los registros filtrados
  const total = logs.length;
  const permitidos = logs.filter(l => l.status_acceso === 'permitido').length;
  const denegados = logs.filter(l => l.status_acceso === 'denegado').length;
  const faciales = logs.filter(l => l.metodo === 'facial').length;
  const tasaFacial = total > 0 ? ((faciales / total) * 100).toFixed(1) : '0';

  return (
    <div className="history-view">
      {/* 1. Panel de Métricas e Indicadores de Auditoría */}
      <div className="grid-stats print-hidden" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(15, 98, 254, 0.05)', color: 'var(--primary)' }}>
            <ScanFace size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{total}</span>
            <span className="stat-label">Registros Totales</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <UserCheck size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{permitidos}</span>
            <span className="stat-label">Ingresos Concedidos</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <TrendingDown size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{denegados}</span>
            <span className="stat-label">Accesos Denegados</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(255, 159, 10, 0.05)', color: 'var(--warning)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{tasaFacial}%</span>
            <span className="stat-label">Ratio Match Facial</span>
          </div>
        </div>
      </div>

      {/* Título de Impresión (Oculto en pantalla, visible al imprimir) */}
      <div className="print-only" style={{ display: 'none', marginBottom: '30px', borderBottom: '3px solid #161616', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', color: '#161616', textAlign: 'center' }}>{activeGym || 'RamosGym'}</h1>
        <h2 style={{ fontSize: '16px', fontWeight: 700, textAlign: 'center', color: '#525252', marginTop: '4px' }}>Reporte de Control de Acceso y Asistencia</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px', color: '#525252' }}>
          <span>Generado por: Personal Administrativo</span>
          <span>Fecha de Emisión: {new Date().toLocaleDateString('es-VE')}</span>
        </div>
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="glass-card print-hidden" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flexGrow: 1, maxWidth: '400px' }}>
          <div className="form-group" style={{ flexGrow: 1, margin: 0, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar por Nombre o Cédula..."
              className="form-control"
              style={{ paddingLeft: '36px', width: '100%', height: '38px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '38px' }}>
            <span>Buscar</span>
          </button>
        </form>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Estatus:</span>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="form-control"
              style={{ height: '38px', width: '130px' }}
            >
              <option value="all">Todos</option>
              <option value="permitido">Permitido</option>
              <option value="denegado">Denegado</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Método:</span>
            <select 
              value={metodo} 
              onChange={(e) => setMetodo(e.target.value)}
              className="form-control"
              style={{ height: '38px', width: '120px' }}
            >
              <option value="all">Todos</option>
              <option value="facial">Facial (IA)</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <DatePicker 
              value={fecha}
              onChange={setFecha}
              placeholder="Filtrar fecha"
              style={{ width: '160px' }}
            />
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ height: '38px' }} 
            onClick={() => {
              setSearch('');
              setStatus('all');
              setMetodo('all');
              setFecha('');
            }}
            title="Limpiar filtros"
          >
            Limpiar
          </button>

          <button className="btn btn-secondary" style={{ height: '38px', gap: '6px' }} onClick={handlePrint}>
            <Printer size={14} />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* 3. Tabla del Historial */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '240px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" />
          <span style={{ marginLeft: '10px', fontWeight: 600 }}>Cargando bitácora de portería...</span>
        </div>
      ) : (
        <div className="table-container" style={{ margin: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Socio</th>
                <th>Cédula</th>
                <th>Fecha y Hora</th>
                <th>Método de Acceso</th>
                <th>Estatus</th>
                <th>Razón (Denegación)</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No hay registros de asistencia que coincidan con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="activity-avatar" style={{ width: '32px', height: '32px', border: '1px solid var(--border-color)' }}>
                          {log.foto_url ? (
                            <img src={`http://localhost:3000${log.foto_url}`} alt="Socio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            log.nombre[0]
                          )}
                        </div>
                        <span style={{ fontWeight: 700 }}>{log.nombre} {log.apellido}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{log.cedula}</td>
                    <td style={{ fontWeight: 600 }}>
                      {new Date(log.fecha_hora).toLocaleDateString([], { day: '2-digit', month: 'short' })} • {new Date(log.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span className={`badge ${log.metodo === 'facial' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                        {log.metodo === 'facial' ? 'Facial (IA)' : 'Manual'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${log.status_acceso === 'permitido' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                        {log.status_acceso === 'permitido' ? 'Permitido' : 'Denegado'}
                      </span>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {log.razon_denegacion || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Estilos específicos para impresión mediante CSS inyectado */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: #ffffff !important;
            color: #161616 !important;
            overflow: visible !important;
            height: auto !important;
          }
          .app-container {
            display: block !important;
            height: auto !important;
          }
          .sidebar, .header, .print-hidden, ::-webkit-scrollbar {
            display: none !important;
          }
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          .view-container {
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print-only {
            display: block !important;
          }
          .table-container {
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .custom-table {
            border: 1px solid #161616 !important;
          }
          .custom-table th {
            background-color: #f1f5f9 !important;
            color: #161616 !important;
            border-bottom: 2px solid #161616 !important;
          }
          .custom-table td {
            border-bottom: 1px solid #ccd3e0 !important;
            color: #161616 !important;
          }
        }
      `}} />
    </div>
  );
}

export default History;
