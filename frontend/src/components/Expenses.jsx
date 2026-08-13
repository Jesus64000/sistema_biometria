import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Trash2, Plus, Calendar, Tag, Download, FileSpreadsheet } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../utils/reportExporter';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('Servicios');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/expenses');
      const data = await res.json();
      if (!data.error) {
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error al cargar gastos:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!descripcion || !monto) return;

    try {
      const res = await fetch('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion, monto: parseFloat(monto), categoria })
      });
      const data = await res.json();
      if (data.success) {
        setDescripcion('');
        setMonto('');
        setCategoria('Servicios');
        fetchExpenses();
      }
    } catch (error) {
      alert('Error de red al agregar gasto.');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto registrado?')) return;
    try {
      const res = await fetch(`http://localhost:3000/api/expenses/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchExpenses();
      }
    } catch (error) {
      alert('Error al eliminar gasto.');
    }
  };

  const totalGastos = expenses.reduce((sum, item) => sum + parseFloat(item.monto), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
      {/* Formulario de registro */}
      <section className="glass-card" style={{ height: 'fit-content' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} color="var(--primary)" /> Registrar Egreso
        </h3>
        
        <form onSubmit={handleAddExpense}>
          <div className="form-group">
            <label className="form-label">Descripción del gasto</label>
            <input 
              type="text"
              className="form-control"
              placeholder="Ej: Factura de agua de Mayo"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto (USD)</label>
              <input 
                type="number"
                step="0.01"
                className="form-control"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-control"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', gap: '6px' }}>
            <DollarSign size={16} />
            <span>Guardar Egreso</span>
          </button>
        </form>
      </section>

      {/* Listado y totalizador */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Totalizador */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'linear-gradient(to right, rgba(230, 57, 70, 0.03), rgba(0,0,0,0))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(230, 57, 70, 0.05)', color: 'var(--danger)' }}>
              <Trash2 size={20} />
            </div>
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700 }}>Egresos Acumulados</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Suma total de gastos operacionales del gimnasio.</p>
            </div>
          </div>
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--danger)', fontFamily: 'Outfit' }}>
            ${totalGastos.toFixed(2)} USD
          </span>
        </div>

        {/* Tabla */}
        <div className="glass-card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Historial de Gastos</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '11px', padding: '6px 12px', gap: '6px', fontWeight: 700 }}
                onClick={() => {
                  const cols = [
                    { header: 'ID', key: 'id' },
                    { header: 'Descripción', key: 'descripcion' },
                    { header: 'Categoría', key: 'categoria' },
                    { header: 'Monto ($)', key: e => `$${parseFloat(e.monto || 0).toFixed(2)}` },
                    { header: 'Fecha', key: e => e.fecha ? String(e.fecha).slice(0, 10) : '' }
                  ];
                  exportToExcel(expenses, cols, 'Reporte_Gastos_Gimnasio', 'Gastos');
                }}
              >
                <FileSpreadsheet size={13} color="var(--success)" /> Excel
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '11px', padding: '6px 12px', gap: '6px', fontWeight: 700 }}
                onClick={() => {
                  const cols = [
                    { header: 'Descripción', key: 'descripcion' },
                    { header: 'Categoría', key: 'categoria' },
                    { header: 'Monto USD', key: e => `$${parseFloat(e.monto || 0).toFixed(2)}` },
                    { header: 'Fecha', key: e => e.fecha ? String(e.fecha).slice(0, 10) : '' }
                  ];
                  exportToPdf(expenses, cols, 'Reporte de Gastos Operacionales', 'Reporte_Gastos_PDF');
                }}
              >
                <FileText size={13} color="var(--danger)" /> PDF
              </button>
            </div>
          </div>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando gastos...</div>
          ) : (
            <div className="table-container" style={{ border: 'none', marginTop: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Gasto</th>
                    <th>Categoría</th>
                    <th>Monto</th>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No hay gastos operacionales registrados en el sistema.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                            <FileText size={14} color="var(--text-secondary)" />
                            <span>{expense.descripcion}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-primary" style={{ display: 'inline-flex', gap: '4px', fontSize: '10px' }}>
                            <Tag size={10} />
                            {expense.categoria}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'var(--danger)' }}>
                          -${parseFloat(expense.monto).toFixed(2)}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={10} />
                            {new Date(expense.fecha).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="btn btn-secondary"
                              style={{ padding: '6px', color: 'var(--danger)', borderColor: 'transparent' }}
                              title="Eliminar gasto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Expenses;
