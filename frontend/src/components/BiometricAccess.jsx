import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanFace, 
  Camera, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  Play, 
  UserMinus,
  CheckCircle,
  XCircle,
  ArrowLeft,
  UserX,
  LogOut
} from 'lucide-react';

function BiometricAccess({ activeGym, isKiosk, exitKiosk, onLogout }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [scanningStatus, setScanningStatus] = useState('idle'); // idle, scanning, analyzing, allowed, denied
  const [matchedMember, setMatchedMember] = useState(null);
  const [deniedReason, setDeniedReason] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [membersList, setMembersList] = useState([]); // Para el simulador
  const [selectedMockCedula, setSelectedMockCedula] = useState('');

  // Refs de vídeo y canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  // Cargar lista de socios para el simulador
  const loadMockMembers = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/members`);
      const data = await res.json();
      if (!data.error) {
        setMembersList(data);
        if (data.length > 0) {
          setSelectedMockCedula(data[0].cedula);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadMockMembers();
    // En modo Kiosco de Entrada, la cámara arranca de manera automática al cargar
    if (isKiosk) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, []);

  // Generador de sonidos premium utilizando AudioContext del navegador (Cero archivos externos)
  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'success') {
        // Chime Armonioso (C5 -> E5)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);

        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.45);
        osc2.stop(ctx.currentTime + 0.45);
      } else if (type === 'error') {
        // Buzzer grave disonante (140Hz)
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('AudioContext bloqueado por el navegador:', e.message);
    }
  };

  // Iniciar cámara real en recepción
  const startCamera = async () => {
    try {
      setCameraActive(true);
      setScanningStatus('scanning');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Iniciar bucle de verificación facial automática (Cada 2.5 segundos)
      intervalRef.current = setInterval(captureAndVerify, 2500);
    } catch (err) {
      console.error(err);
      alert('No se pudo acceder a la cámara. Verifica los permisos de hardware.');
      setCameraActive(false);
      setScanningStatus('idle');
    }
  };

  // Apagar cámara
  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    setScanningStatus('idle');
  };

  // Bucle de Captura y Envío de imagen al Backend
  const captureAndVerify = async () => {
    if (scanningStatus === 'allowed' || scanningStatus === 'denied' || scanningStatus === 'analyzing') return;

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = 320;
      canvas.height = 240;
      
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const base64 = canvas.toDataURL('image/jpeg', 0.65);
      
      setScanningStatus('analyzing');

      try {
        const res = await fetch('http://localhost:3000/api/biometrics/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_base64: base64, gym_sede: 'MarianGym' })
        });
        const result = await res.json();
        processAccessResult(result);
      } catch (err) {
        console.error('Error al conectar biometría:', err);
        setScanningStatus('scanning');
      }
    }
  };

  // Procesar veredicto del backend
  const processAccessResult = (result) => {
    if (result.allowed) {
      setScanningStatus('allowed');
      setMatchedMember({ ...result.member, match_percentage: result.match_percentage });
      setDeniedReason('');
      playSound('success');
      
      // Regresar al modo escáner tras 3.5 segundos
      setTimeout(() => {
        setScanningStatus(cameraActive || isKiosk ? 'scanning' : 'idle');
        setMatchedMember(null);
        setDeniedReason('');
      }, 3500);
    } else if (result.reason === 'no_face_detected') {
      // Si no se detectó rostro, no mostramos error ni hacemos sonido.
      // Simplemente volvemos al modo escaneo de inmediato de forma rápida y silenciosa.
      setScanningStatus(cameraActive || isKiosk ? 'scanning' : 'idle');
      setMatchedMember(null);
      setDeniedReason('');
    } else {
      setScanningStatus('denied');
      setMatchedMember(result.member ? { ...result.member, match_percentage: result.match_percentage } : null);
      setDeniedReason(result.reason || 'Rostro no registrado en la base de datos.');
      playSound('error');
      
      // Regresar al modo escáner tras 3.5 segundos
      setTimeout(() => {
        setScanningStatus(cameraActive || isKiosk ? 'scanning' : 'idle');
        setMatchedMember(null);
        setDeniedReason('');
      }, 3500);
    }
  };

  // EJECUTAR ESCANEO SIMULADO (1 Clic)
  const triggerMockScan = async (isUnknown = false) => {
    if (scanningStatus === 'allowed' || scanningStatus === 'denied' || scanningStatus === 'analyzing') return;

    setScanningStatus('analyzing');

    setTimeout(async () => {
      try {
        const payload = isUnknown ? { mock_cedula: '99999999' } : { mock_cedula: selectedMockCedula };
        
        const res = await fetch('http://localhost:3000/api/biometrics/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, gym_sede: 'MarianGym' })
        });
        const result = await res.json();
        processAccessResult(result);
      } catch (err) {
        console.error(err);
        setScanningStatus('idle');
      }
    }, 600);
  };

  // ==========================================================================
  // RENDER PANTALLA COMPLETA: TOTEM DE ENTRADA (KIOSCO)
  // ==========================================================================
  if (isKiosk) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '32px', position: 'relative' }}>
        
        {/* Botones de control del Kiosco en la esquina superior izquierda */}
        <div style={{ position: 'absolute', top: '-10px', left: '0px', display: 'flex', gap: '8px' }}>
          <button 
            onClick={exitKiosk}
            className="btn btn-secondary"
            style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Volver al Panel"
          >
            <ArrowLeft size={16} />
          </button>
          
          {onLogout && (
            <button 
              onClick={onLogout}
              className="btn btn-secondary"
              style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(230, 57, 70, 0.15)', color: 'var(--danger)' }}
              title="Desautorizar Tótem (Cerrar Sesión)"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        <h2 style={{ fontSize: '26px', fontWeight: 800, textAlign: 'center', fontFamily: 'Outfit' }}>
          CONTROL DE ACCESO AUTÓNOMO
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          
          {/* Círculo Kiosco de Cámara */}
          <div className={`kiosk-camera-circle ${scanningStatus}`} style={{ transform: 'scale(1.15)', position: 'relative', overflow: 'hidden' }}>
            {cameraActive ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
                {/* Visual Guides: Alignment Ring (Anti-Spoofing) */}
                <div style={{
                  position: 'absolute',
                  border: '2px dashed rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  top: '15%',
                  bottom: '15%',
                  left: '20%',
                  right: '20%',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                  zIndex: 5,
                  pointerEvents: 'none'
                }} />
                {/* Laser scan line overlay */}
                {scanningStatus === 'scanning' && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: '2.5px',
                    backgroundColor: '#0f62fe',
                    boxShadow: '0 0 10px #0f62fe, 0 0 20px #0f62fe',
                    top: '15%',
                    animation: 'scanLaser 2.2s infinite ease-in-out',
                    zIndex: 10,
                    pointerEvents: 'none'
                  }} />
                )}
                {scanningStatus === 'analyzing' && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: '2.5px',
                    backgroundColor: '#f5c618',
                    boxShadow: '0 0 10px #f5c618, 0 0 20px #f5c618',
                    top: '50%',
                    animation: 'scanLaser 0.8s infinite ease-in-out',
                    zIndex: 10,
                    pointerEvents: 'none'
                  }} />
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '9px',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  zIndex: 12,
                  fontFamily: 'Outfit',
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}>
                  🔒 ANTI-SPOOFING ACTIVO
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <ScanFace size={50} style={{ opacity: 0.15, animation: 'pulse 1.8s infinite' }} />
              </div>
            )}
          </div>

          {/* Panel Gigante de Veredicto Minimalista */}
          <div className={`kiosk-verdict-panel ${scanningStatus}`} style={{ marginTop: '20px' }}>
            
            {scanningStatus === 'scanning' && (
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                <ScanFace size={36} style={{ marginBottom: '8px', color: 'var(--primary)', opacity: 0.8 }} />
                <h4 style={{ fontSize: '18px', fontWeight: 800 }}>Punto de Entrada Facial</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Míra fijamente a la cámara para ingresar.</p>
              </div>
            )}

            {scanningStatus === 'analyzing' && (
              <div style={{ color: '#ffffff' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 800, animation: 'pulse 1s infinite' }}>Procesando Visión Artificial...</h4>
                <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Extrayendo patrones biométricos faciales.</p>
              </div>
            )}

            {scanningStatus === 'allowed' && matchedMember && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: '4px solid #ffffff',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {matchedMember.foto_url ? (
                    <img src={`http://localhost:3000${matchedMember.foto_url}`} alt="Socio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ background: '#ffffff', color: 'var(--success)', fontSize: '32px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{matchedMember.nombre[0]}</div>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '24px', fontWeight: 900 }}>¡BIENVENIDO!</h3>
                  <h4 style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px', opacity: 0.9 }}>{matchedMember.nombre} {matchedMember.apellido}</h4>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 14px', borderRadius: '9999px' }}>
                  ACCESO CONCEDIDO ✓
                </div>
              </div>
            )}

            {scanningStatus === 'denied' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: '4px solid #ffffff',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.2)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {matchedMember && matchedMember.foto_url ? (
                    <img src={`http://localhost:3000${matchedMember.foto_url}`} alt="Socio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserX size={44} color="#ffffff" />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: 900 }}>ACCESO DENEGADO</h3>
                  {matchedMember && <h4 style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{matchedMember.nombre} {matchedMember.apellido}</h4>}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.25)', padding: '6px 14px', borderRadius: '8px', maxWidth: '300px', lineHeight: '1.3' }}>
                  {deniedReason}
                </div>
              </div>
            )}

            {scanningStatus === 'idle' && (
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 600 }}>Kiosco Listo</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Por favor arranca la cámara para iniciar el escaneo facial.</p>
              </div>
            )}

          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }

  // ==========================================================================
  // RENDER MONITOR DE ACCESO: VISTA RECEPCIÓN (PANTALLA B)
  // ==========================================================================
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px' }}>
      
      {/* Columna Izquierda - Visor de Recepción */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <div 
          className={`glass-card`} 
          style={{ 
            width: '100%', 
            maxWidth: '480px', 
            padding: '16px', 
            borderColor: scanningStatus === 'allowed' ? 'var(--success)' : scanningStatus === 'denied' ? 'var(--danger)' : 'var(--border-color)',
            boxShadow: scanningStatus === 'allowed' ? '0 0 25px rgba(0, 168, 107, 0.15)' : scanningStatus === 'denied' ? '0 0 25px rgba(230, 57, 70, 0.15)' : 'var(--shadow-md)',
            transition: 'all 0.3s ease',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '320px',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--border-radius-lg)',
            background: 'var(--bg-app)'
          }}
        >
          {cameraActive ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', borderRadius: 'var(--border-radius-md)' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '16px' }}>
              <ScanFace size={54} style={{ opacity: 0.15, animation: 'pulse 2s infinite' }} />
              <p style={{ fontSize: '13px', fontWeight: 600 }}>Cámara de recepción apagada.</p>
            </div>
          )}

          {scanningStatus === 'analyzing' && (
            <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'var(--primary)', color: '#fff', fontSize: '11px', padding: '4px 12px', borderRadius: '4px', fontWeight: 700 }}>
              Analizando...
            </div>
          )}

          {scanningStatus === 'allowed' && (
            <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'var(--success)', color: '#fff', fontSize: '11px', padding: '4px 12px', borderRadius: '4px', fontWeight: 700 }}>
              Acceso Permitido ✓
            </div>
          )}

          {scanningStatus === 'denied' && (
            <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'var(--danger)', color: '#fff', fontSize: '11px', padding: '4px 12px', borderRadius: '4px', fontWeight: 700 }}>
              Acceso Denegado ✗
            </div>
          )}
        </div>

        {/* Controles del hardware */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!cameraActive ? (
            <button className="btn btn-primary" onClick={startCamera} style={{ padding: '10px 16px', fontSize: '12px' }}>
              <Camera size={14} />
              <span>Activar Cámara Real</span>
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={stopCamera} style={{ padding: '10px 16px', fontSize: '12px' }}>
              <span>Apagar Cámara</span>
            </button>
          )}

          <button 
            className="btn btn-secondary" 
            style={{ padding: '10px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Silenciar beeps' : 'Activar beeps'}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* Columna Derecha - Tarjeta del Socio Identificado */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '260px' }}>
          
          {scanningStatus === 'allowed' && matchedMember && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', animation: 'scaleUp 0.25s ease' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px solid var(--success)',
                overflow: 'hidden'
              }}>
                {matchedMember.foto_url ? (
                  <img src={`http://localhost:3000${matchedMember.foto_url}`} alt="Socio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ background: 'var(--border-color)', color: 'var(--success)', fontSize: '24px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{matchedMember.nombre[0]}</div>
                )}
              </div>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{matchedMember.nombre} {matchedMember.apellido}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px', fontFamily: 'Outfit' }}>C.I: {matchedMember.cedula}</p>
                {matchedMember.match_percentage && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--success)', 
                    fontWeight: 800, 
                    backgroundColor: 'rgba(0, 168, 107, 0.05)', 
                    padding: '2px 10px', 
                    borderRadius: '4px', 
                    marginTop: '6px',
                    display: 'inline-block' 
                  }}>
                    Match Facial: {matchedMember.match_percentage}% (Seguro)
                  </div>
                )}
              </div>
              <span className="badge badge-success" style={{ padding: '4px 12px' }}>Solvente e Ingresado</span>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Membresía vence: {new Date(matchedMember.fecha_fin).toLocaleDateString()}</p>
            </div>
          )}

          {scanningStatus === 'denied' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', animation: 'scaleUp 0.25s ease' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px solid var(--danger)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(230, 57, 70, 0.05)'
              }}>
                {matchedMember && matchedMember.foto_url ? (
                  <img src={`http://localhost:3000${matchedMember.foto_url}`} alt="Socio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserX size={36} color="var(--danger)" />
                )}
              </div>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {matchedMember ? `${matchedMember.nombre} ${matchedMember.apellido}` : 'Rostro Desconocido'}
                </h4>
                {matchedMember && (
                  <>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px', fontFamily: 'Outfit' }}>C.I: {matchedMember.cedula}</p>
                    {matchedMember.match_percentage && (
                      <div style={{ 
                        fontSize: '11px', 
                        color: 'var(--danger)', 
                        fontWeight: 800, 
                        backgroundColor: 'rgba(230, 57, 70, 0.05)', 
                        padding: '2px 10px', 
                        borderRadius: '4px', 
                        marginTop: '6px',
                        display: 'inline-block' 
                      }}>
                        Match Facial: {matchedMember.match_percentage}% (No Autorizado)
                      </div>
                    )}
                  </>
                )}
              </div>
              <span className="badge badge-danger" style={{ padding: '4px 12px' }}>Acceso Denegado</span>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, maxWidth: '240px', lineHeight: 1.3 }}>{deniedReason}</p>
            </div>
          )}

          {(scanningStatus === 'idle' || scanningStatus === 'scanning' || scanningStatus === 'analyzing') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', color: 'var(--text-muted)', gap: '12px' }}>
              <ScanFace size={38} style={{ opacity: 0.15 }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Monitoreo Activo</h4>
              <p style={{ fontSize: '11px', maxWidth: '200px', lineHeight: 1.4 }}>Esperando validación biométrica en la entrada para mostrar ficha del cliente.</p>
            </div>
          )}

        </div>

      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default BiometricAccess;
