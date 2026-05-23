import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Dumbbell, TrendingUp } from 'lucide-react';

function Settings({ gymName, tasaCambio, onUpdate }) {
  const [name, setName] = useState(gymName);
  const [tasa, setTasa] = useState(tasaCambio);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setName(gymName);
    setTasa(tasaCambio);
  }, [gymName, tasaCambio]);

  const handleSyncBcv = async () => {
    setSyncing(true);
    try {
      const res = await fetch('http://localhost:3000/api/config/sync-bcv', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTasa(data.tasa_cambio);
        alert(`✓ Tasa cambiaria oficial del BCV sincronizada con éxito: Bs. ${data.tasa_cambio}`);
      } else {
        alert(`Error: ${data.error || 'No se pudo sincronizar la tasa.'}`);
      }
    } catch (err) {
      alert('Error de conexión al sincronizar la tasa BCV.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !tasa) return;

    setSaving(true);
    try {
      const res = await fetch('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_name: name, tasa_cambio: parseFloat(tasa) })
      });
      const data = await res.json();
      if (data.success) {
        alert('Configuración guardada y actualizada con éxito en todo el sistema.');
        onUpdate(); // Recargar en App.jsx
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Error de conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <section className="glass-card">
        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon size={18} color="var(--primary)" /> Configuración General del Establecimiento
        </h3>
        
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Dumbbell size={14} color="var(--primary)" /> Nombre Comercial del Gimnasio
            </label>
            <input 
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Marian Gym"
              required
            />
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Este nombre se mostrará en el sidebar, el título de la pestaña y los reportes.</p>
          </div>

          <div className="form-group" style={{ marginTop: '24px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="var(--primary)" /> Tasa de Cambio del Dólar Oficial (Bs. / USD)
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="number"
                step="0.01"
                className="form-control"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                placeholder="Ej: 114.00"
                required
                style={{ flexGrow: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSyncBcv}
                disabled={syncing}
                style={{ height: '38px', gap: '6px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', borderColor: 'rgba(15, 98, 254, 0.15)' }}
              >
                {syncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                <span>Sincronizar BCV 🇻🇪</span>
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Tasa utilizada para la conversión en vivo de inscripciones y cobros de mensualidades a bolívares en la cabecera.</p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '28px', gap: '8px', fontWeight: 800 }}
            disabled={saving}
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saving ? 'Guardando cambios...' : 'Guardar Parámetros'}</span>
          </button>
        </form>
      </section>
    </div>
  );
}

export default Settings;
