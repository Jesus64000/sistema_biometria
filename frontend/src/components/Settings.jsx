import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Dumbbell, TrendingUp, CreditCard, ShieldAlert, Camera } from 'lucide-react';

function Settings({ gymName, tasaCambio, onUpdate }) {
  const [name, setName] = useState(gymName);
  const [tasa, setTasa] = useState(tasaCambio);
  
  // Nuevos campos de tarifas personalizadas y calibración de IA
  const [cuotaMensual, setCuotaMensual] = useState(30.00);
  const [cuotaTrimestral, setCuotaTrimestral] = useState(80.00);
  const [cuotaAnual, setCuotaAnual] = useState(300.00);
  const [cobraInscripcion, setCobraInscripcion] = useState(true);
  const [cuotaInscripcion, setCuotaInscripcion] = useState(10.00);
  const [cuotaReactivacion, setCuotaReactivacion] = useState(5.00);
  const [umbralBiometrico, setUmbralBiometrico] = useState(73.00);
  const [soloMensual, setSoloMensual] = useState(false);

  // Estados de selección de cámara web
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(localStorage.getItem('selectedCameraId') || '');

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadCameraDevices = async () => {
    try {
      // Solicitar permiso temporal de video para poder leer las etiquetas de los dispositivos
      await navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        stream.getTracks().forEach(track => track.stop());
      }).catch(() => {});

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoInputs);
      
      // Si hay cámaras y no hay una previamente guardada, seleccionar la primera
      if (videoInputs.length > 0) {
        const savedId = localStorage.getItem('selectedCameraId');
        const exists = videoInputs.some(device => device.deviceId === savedId);
        if (exists && savedId) {
          setSelectedCameraId(savedId);
        } else {
          setSelectedCameraId(videoInputs[0].deviceId);
          localStorage.setItem('selectedCameraId', videoInputs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Error al enumerar dispositivos de video:', err);
    }
  };

  useEffect(() => {
    loadCameraDevices();
  }, []);

  const fetchConfigDetails = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/config');
      const data = await res.json();
      if (!data.error) {
        setName(data.gym_name);
        setTasa(data.tasa_cambio);
        setCuotaMensual(data.cuota_mensual !== undefined ? data.cuota_mensual : 30.00);
        setCuotaTrimestral(data.cuota_trimestral !== undefined ? data.cuota_trimestral : 80.00);
        setCuotaAnual(data.cuota_anual !== undefined ? data.cuota_anual : 300.00);
        setCobraInscripcion(data.cobra_inscripcion === 1);
        setCuotaInscripcion(data.cuota_inscripcion !== undefined ? data.cuota_inscripcion : 10.00);
        setCuotaReactivacion(data.cuota_reactivacion !== undefined ? data.cuota_reactivacion : 5.00);
        setUmbralBiometrico(data.umbral_biometrico !== undefined ? data.umbral_biometrico : 73.00);
        setSoloMensual(data.solo_mensual === 1);
      }
    } catch (e) {
      console.warn('Error al cargar la configuración expandida:', e.message);
    }
  };

  useEffect(() => {
    fetchConfigDetails();
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({ 
          gym_name: name, 
          tasa_cambio: parseFloat(tasa),
          cuota_mensual: parseFloat(cuotaMensual),
          cuota_trimestral: parseFloat(cuotaTrimestral),
          cuota_anual: parseFloat(cuotaAnual),
          cobra_inscripcion: cobraInscripcion ? 1 : 0,
          cuota_inscripcion: parseFloat(cuotaInscripcion),
          cuota_reactivacion: parseFloat(cuotaReactivacion),
          umbral_biometrico: parseFloat(umbralBiometrico),
          solo_mensual: soloMensual ? 1 : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('✓ Configuración y tarifas actualizadas con éxito en todo el sistema.');
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

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const tokenStr = localStorage.getItem('jwt_token') || '';
      const res = await fetch('http://localhost:3000/api/config/backup', {
        headers: {
          'Authorization': `Bearer ${tokenStr}`
        }
      });
      if (!res.ok) {
        throw new Error('Error al descargar el respaldo.');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mariangym_respaldo_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      alert('✓ Respaldo exportado y descargado con éxito.');
    } catch (err) {
      alert(`Error al exportar: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('¿Está seguro de restaurar el sistema? Se sobreescribirán de forma permanente todas las tablas (Socios, Pagos, Personal, Gastos) de la base de datos local.')) {
      e.target.value = ''; // Limpiar input
      return;
    }

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        if (!backupData || !backupData.tables) {
          throw new Error('El archivo no tiene el formato JSON estructurado de respaldo válido de Marian Gym.');
        }

        const tokenStr = localStorage.getItem('jwt_token') || '';
        const res = await fetch('http://localhost:3000/api/config/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenStr}`
          },
          body: JSON.stringify({ backupData })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          alert('✓ ¡Gimnasio restaurado con éxito al 100%! La base de datos local ha sido restablecida.');
          onUpdate(); // Sincronizar UI
        } else {
          alert(`Error al restaurar: ${data.error || 'Respuesta inválida del servidor.'}`);
        }
      } catch (err) {
        alert(`Error al procesar el archivo de respaldo: ${err.message}`);
      } finally {
        setImporting(false);
        e.target.value = ''; // Limpiar input
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      fontFamily: 'var(--font-main)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
      gap: '24px',
      alignItems: 'start'
    }}>
      <section className="glass-card" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon size={18} color="var(--primary)" /> Configuración General y Tarifas
        </h3>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Nombre */}
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
          </div>

          {/* Tasa BCV */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="var(--primary)" /> Tasa de Cambio Oficial (Bs. / USD)
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
          </div>

          {/* Cámara Web por Defecto */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={14} color="var(--primary)" /> Cámara Web de Portería / Enrolamiento
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCameraId(id);
                localStorage.setItem('selectedCameraId', id);
              }}
              className="form-control"
            >
              {videoDevices.length === 0 ? (
                <option value="">Cámara por Defecto del Navegador</option>
              ) : (
                videoDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Cámara ${index + 1}`}
                  </option>
                ))
              )}
            </select>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
              Esta cámara será utilizada para el Kiosco, la Recepción y en todos los formularios de enrolamiento del gimnasio.
            </span>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

          {/* Tarifas de Planes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <CreditCard size={14} /> Costo de Planes Deportivos (USD)
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox"
                  id="solo_mensual"
                  checked={soloMensual}
                  onChange={(e) => setSoloMensual(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="solo_mensual" style={{ fontSize: '12px', fontWeight: 800, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  ¿Ofrecer solo plan Mensual?
                </label>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Cuota Mensual *</label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={cuotaMensual}
                  onChange={(e) => setCuotaMensual(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ opacity: soloMensual ? 0.35 : 1, transition: 'opacity 0.2s ease', pointerEvents: soloMensual ? 'none' : 'auto' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Cuota Trimestral *</label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={cuotaTrimestral}
                  onChange={(e) => setCuotaTrimestral(e.target.value)}
                  required={!soloMensual}
                />
              </div>
              <div className="form-group" style={{ opacity: soloMensual ? 0.35 : 1, transition: 'opacity 0.2s ease', pointerEvents: soloMensual ? 'none' : 'auto' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Cuota Anual *</label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={cuotaAnual}
                  onChange={(e) => setCuotaAnual(e.target.value)}
                  required={!soloMensual}
                />
              </div>
            </div>
          </div>

          {/* Inscripción y Reactivación */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox"
                  id="cobra_ins"
                  checked={cobraInscripcion}
                  onChange={(e) => setCobraInscripcion(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="cobra_ins" style={{ fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
                  ¿Cobrar Inscripción?
                </label>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                Se sumará automáticamente en el registro de nuevos socios.
              </span>
            </div>

            {cobraInscripcion && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Monto Inscripción ($)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={cuotaInscripcion}
                  onChange={(e) => setCuotaInscripcion(e.target.value)}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 800, display: 'block' }}>Cuota de Reactivación ($)</label>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                Se sumará si el socio vuelve después de 3 meses inactivo.
              </span>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <input 
                type="number"
                step="0.01"
                className="form-control"
                value={cuotaReactivacion}
                onChange={(e) => setCuotaReactivacion(e.target.value)}
              />
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

          {/* Calibración Biométrica */}
          <div style={{ background: 'rgba(168, 85, 247, 0.03)', border: '1px solid rgba(168, 85, 247, 0.15)', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#c084fc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <ShieldAlert size={14} /> Calibración Biométrica Facial
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '14px' }}>
              Define el umbral máximo de tolerancia (distancia del histograma). A mayor valor, el sistema es más cómodo pero menos estricto. Recomendado: **73.0**.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                <span>Sensibilidad: {umbralBiometrico}</span>
                <span style={{ color: umbralBiometrico > 75 ? 'var(--danger)' : '#a855f7' }}>
                  {umbralBiometrico > 75 ? 'Muy Flexible' : umbralBiometrico < 65 ? 'Estricto' : 'Óptimo / Confortable'}
                </span>
              </div>
              <input 
                type="range"
                min="50"
                max="85"
                step="0.5"
                value={umbralBiometrico}
                onChange={(e) => setUmbralBiometrico(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#a855f7' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '10px', gap: '8px', fontWeight: 800 }}
            disabled={saving}
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saving ? 'Guardando parámetros...' : 'Guardar Parámetros y Tarifas'}</span>
          </button>
        </form>
      </section>

      {/* PANEL DE SEGURIDAD Y RESPALDOS ANTI-APAGONES */}
      <section className="glass-card" style={{ padding: '28px', marginTop: '0px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔌 Respaldos de Seguridad Anti-Apagones</span>
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
          Protege los datos de <strong>Marian Gym</strong> ante cortes de luz o fluctuaciones eléctricas en Cabimas. Descarga un archivo local de respaldo o restaura todo el gimnasio a un punto anterior de forma 100% offline (sin internet).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Botón de Exportación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ paddingRight: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, display: 'block' }}>Exportar Base de Datos</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                Descarga un volcado completo de todas las tablas en un archivo JSON local.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportBackup}
              disabled={exporting}
              style={{ gap: '6px', fontSize: '11px', fontWeight: 700, height: '38px', whiteSpace: 'nowrap' }}
            >
              📥 Descargar Copia
            </button>
          </div>

          {/* Selector de Importación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(168, 85, 247, 0.02)', border: '1px dashed rgba(168, 85, 247, 0.25)', padding: '16px', borderRadius: '12px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 800, display: 'block', color: '#c084fc' }}>Restaurar Gimnasio desde Copia</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                ⚠ ¡CUIDADO! Esto limpiará la base de datos actual y cargará los datos del respaldo seleccionado.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center' }}>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                disabled={importing}
                style={{ fontSize: '11px', color: 'var(--text-primary)', cursor: 'pointer', flexGrow: 1 }}
              />
              {importing && <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>Restaurando...</span>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Settings;
