import React, { useState, useEffect, useRef } from 'react';

export default function KioskStatus() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'allowed' | 'denied'
  const [data, setData] = useState(null);
  const [gymName, setGymName] = useState('RamosGym');
  const timeoutRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/config')
      .then(r => r.json())
      .then(data => {
        if (!data.error && data.gym_name) {
          setGymName(data.gym_name);
        }
      })
      .catch(e => console.warn('Error loading config in kiosk status:', e.message));
  }, []);

  // Reproducir sonido sintetizado vía Web Audio API (evita depender de archivos estáticos)
  const playBeep = (type) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      
      if (type === 'success') {
        // Tono ascendente agradable
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // Tono grave de advertencia doble
        const playGrave = (delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.35);
        };
        playGrave(0);
        playGrave(0.18);
      }
    } catch (e) {
      console.warn('AudioContext bloqueado o no soportado:', e.message);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'last_kiosk_checkin' && e.newValue) {
        try {
          const result = JSON.parse(e.newValue);
          
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          setData(result);
          
          if (result.allowed) {
            setStatus('allowed');
            playBeep('success');
          } else {
            setStatus('denied');
            playBeep('error');
          }

          // Determinar tiempo de visualización dinámico:
          // 3s (3000ms) para solventes, 5s (5000ms) para insolventes registrados, 3.5s (3500ms) para desconocidos
          const timeoutDuration = result.allowed 
            ? 3000 
            : (result.member ? 5000 : 3500);

          timeoutRef.current = setTimeout(() => {
            setStatus('idle');
            setData(null);
          }, timeoutDuration);
        } catch (err) {
          console.error('Error parseando datos de kiosco:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0a0b0e',
      backgroundImage: 'radial-gradient(circle at center, #161922 0%, #050608 100%)',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      overflow: 'hidden',
      position: 'relative',
      margin: 0,
      padding: 0
    }}>
      
      {/* Estado: Espera (Idle) */}
      {status === 'idle' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          animation: 'pulse 3s infinite ease-in-out'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.05)',
            border: '2px dashed rgba(56, 189, 248, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(56, 189, 248, 0.1)'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5">
              <path d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 21v-2a3 3 0 0 0-3-3H10a3 3 0 0 0-3 3v2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '2px', color: '#f8fafc', margin: 0, textTransform: 'uppercase' }}>{gymName}</h1>
            <p style={{ color: '#64748b', fontSize: '16px', marginTop: '8px', fontWeight: 500 }}>🔒 ESCANEE SU ROSTRO PARA INGRESAR</p>
          </div>
        </div>
      )}

      {/* Estado: Permitido (Allowed) */}
      {status === 'allowed' && data && (
        <div style={{
          width: '90%',
          maxWidth: '850px',
          background: 'rgba(10, 15, 12, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '3px solid #10b981',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 0 60px rgba(16, 185, 129, 0.25)',
          display: 'grid',
          gridTemplateColumns: '1.2fr 2fr',
          gap: '40px',
          alignItems: 'center',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Foto del Socio */}
          <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto' }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '4px solid #10b981',
              boxShadow: '0 8px 30px rgba(16, 185, 129, 0.2)'
            }}>
              {data.member?.foto_url ? (
                <img 
                  src={`http://localhost:3000${data.member.foto_url}`} 
                  alt="Socio" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '60px'
                }}>
                  👤
                </div>
              )}
            </div>
            {/* Medalla de Confianza */}
            <div style={{
              position: 'absolute',
              bottom: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap'
            }}>
              Match: {data.match_percentage}%
            </div>
          </div>

          {/* Datos del Socio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#34d399',
              padding: '8px 16px',
              borderRadius: '30px',
              alignSelf: 'flex-start',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              boxShadow: 'inset 0 0 10px rgba(16, 185, 129, 0.2)'
            }}>
              ✓ ACCESO AUTORIZADO
            </div>
            
            <div>
              <h2 style={{ fontSize: '38px', fontWeight: 800, margin: 0, color: '#f8fafc', lineHeight: 1.2 }}>
                {data.member?.nombre} {data.member?.apellido}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '18px', marginTop: '6px', margin: 0 }}>
                Cédula: {data.member?.cedula}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginTop: '10px',
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Membresía</span>
                <span style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, textTransform: 'capitalize' }}>
                  {data.member?.membresia_tipo || 'Mensual'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Vence el</span>
                <span style={{ color: '#10b981', fontSize: '18px', fontWeight: 700 }}>
                  {data.member?.membresia_fin ? new Date(data.member.membresia_fin).toLocaleDateString() : 'N/D'}
                </span>
              </div>
            </div>

            <div style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#34d399',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🏋️ ¡BIENVENIDO A ENTRENAR!</span>
            </div>
          </div>
        </div>
      )}

      {/* Estado: Denegado (Denied) */}
      {status === 'denied' && data && (
        <div style={{
          width: '90%',
          maxWidth: '850px',
          background: 'rgba(20, 10, 10, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '3px solid #ef4444',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 0 60px rgba(239, 68, 68, 0.25)',
          display: 'grid',
          gridTemplateColumns: data.member ? '1.2fr 2fr' : '1fr',
          gap: '40px',
          alignItems: 'center',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Foto del Socio si está registrado pero insolvente */}
          {data.member && (
            <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto' }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '4px solid #ef4444',
                boxShadow: '0 8px 30px rgba(239, 68, 68, 0.2)'
              }}>
                {data.member.foto_url ? (
                  <img 
                    src={`http://localhost:3000${data.member.foto_url}`} 
                    alt="Socio" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.7)' }} 
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '60px'
                  }}>
                    👤
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motivo de Acceso Denegado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: data.member ? 'left' : 'center' }}>
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              padding: '8px 16px',
              borderRadius: '30px',
              alignSelf: data.member ? 'flex-start' : 'center',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              boxShadow: 'inset 0 0 10px rgba(239, 68, 68, 0.2)'
            }}>
              ⚠ ACCESO DENEGADO
            </div>
            
            {data.member ? (
              <div>
                <h2 style={{ fontSize: '38px', fontWeight: 800, margin: 0, color: '#f8fafc', lineHeight: 1.2 }}>
                  {data.member.nombre} {data.member.apellido}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '18px', marginTop: '6px', margin: 0 }}>
                  Cédula: {data.member.cedula}
                </p>
              </div>
            ) : (
              <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                ROSTRO NO DETECTADO O DESCONOCIDO
              </h2>
            )}

            <div style={{
              padding: '20px',
              background: 'rgba(239, 68, 68, 0.05)',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              marginTop: '10px'
            }}>
              <span style={{ color: '#fca5a5', fontSize: '14px', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                Causa del Rechazo
              </span>
              <p style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 600, margin: 0 }}>
                {data.reason || 'El rostro escaneado no coincide con ningún miembro activo de la base de datos.'}
              </p>
            </div>

            <p style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#fca5a5',
              marginTop: '10px',
              margin: 0
            }}>
              📢 POR FAVOR, DIRÍJASE A LA RECEPCIÓN PARA REGULARIZAR SU SITUACIÓN.
            </p>
          </div>
        </div>
      )}

      {/* Estilos inyectados para animaciones premium */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.03); opacity: 1; filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.2)); }
        }
        @keyframes slideUp {
          from { transform: translateY(40px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
