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
  const [cameraError, setCameraError] = useState('');

  // Refs de vídeo y canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  // Nuevas referencias para el bucle inteligente de biometría adaptativa (Eco / Rendimiento)
  const delayRef = useRef(800);
  const noFaceCountRef = useRef(0);

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

  // Programador recursivo del bucle de cámara
  const scheduleNextCapture = (ms) => {
    if (intervalRef.current) clearTimeout(intervalRef.current);
    intervalRef.current = setTimeout(async () => {
      await captureAndVerify();
    }, ms);
  };

  // Iniciar cámara real en recepción o kiosco
  const startCamera = async () => {
    try {
      setCameraError('');
      setCameraActive(true);
      setScanningStatus('scanning');

      const savedCameraId = localStorage.getItem('selectedCameraId');
      let constraints = { video: { width: 400, height: 300 } };
      if (savedCameraId) {
        constraints = {
          video: {
            deviceId: { exact: savedCameraId },
            width: 400,
            height: 300
          }
        };
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        if (savedCameraId) {
          console.warn('Fallo al abrir cámara guardada, reintentando con la de defecto:', err);
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
        } else {
          throw err;
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Iniciar bucle inteligente adaptativo
      noFaceCountRef.current = 0;
      delayRef.current = 800;
      scheduleNextCapture(800);
    } catch (err) {
      console.error('Error al encender cámara:', err);
      setCameraError(err.name === 'NotAllowedError' ? 'PermissionDenied' : err.message || 'ErrorHardware');
      setCameraActive(false);
      setScanningStatus('idle');
    }
  };

  // Apagar cámara
  const stopCamera = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    setScanningStatus('idle');
  };

  // Bucle de Captura y Envío de imagen al Backend (Bucle Adaptativo)
  const captureAndVerify = async () => {
    if (!cameraActive && !isKiosk) return; // Salir si la cámara se desactivó
    if (scanningStatus === 'allowed' || scanningStatus === 'denied' || scanningStatus === 'analyzing') {
      // Si el lector está mostrando el veredicto en pantalla, esperar y volver a programar
      scheduleNextCapture(delayRef.current);
      return;
    }

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

      try {
        const res = await fetch('http://localhost:3000/api/biometrics/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_base64: base64, gym_sede: 'MarianGym' })
        });
        const result = await res.json();
        
        // CALIBRACIÓN DE VELOCIDAD ADAPTATIVA EN BASE A PRESENCIA
        if (result.error === 'no_face_detected' || result.reason === 'no_face_detected') {
          noFaceCountRef.current += 1;
          // Si no se ve un rostro durante 10 escaneos consecutivos (~8s), bajamos a Modo Eco/Espera (2.5s)
          if (noFaceCountRef.current >= 10) {
            delayRef.current = 2500;
          }
        } else {
          // Si se detecta un rostro en el plano (sea coincidente o no), subimos a Modo Rendimiento (800ms)
          noFaceCountRef.current = 0;
          delayRef.current = 800;
        }

        processAccessResult(result);
      } catch (err) {
        console.error('Error al conectar biometría:', err);
        scheduleNextCapture(delayRef.current);
      }
    } else {
      scheduleNextCapture(delayRef.current);
    }
  };

  // Procesar veredicto del backend y emitir a Pantalla 2
  const processAccessResult = (result) => {
    // Si no se detectó rostro, retornar silenciosamente sin emitir a Pantalla 2
    if (result.error === 'no_face_detected' || result.reason === 'no_face_detected') {
      setScanningStatus('scanning');
      setMatchedMember(null);
      setDeniedReason('');
      scheduleNextCapture(delayRef.current);
      return;
    }

    // Emitir el check-in al instante localmente para el visor de estatus en Pantalla 2
    localStorage.setItem('last_kiosk_checkin', JSON.stringify({
      allowed: result.allowed,
      member: result.member,
      match_percentage: result.match_percentage,
      reason: result.reason || (result.allowed ? 'Coincidencia facial exitosa.' : 'El rostro no coincide con ningún socio registrado.'),
      timestamp: Date.now()
    }));

    if (result.allowed) {
      setScanningStatus('allowed');
      setMatchedMember({ ...result.member, match_percentage: result.match_percentage });
      setDeniedReason('');
      playSound('success');
      
      // Regresar al modo escáner tras 3.0 segundos
      setTimeout(() => {
        setScanningStatus('scanning');
        setMatchedMember(null);
        setDeniedReason('');
        // Al regresar, forzamos Alto Rendimiento (800ms) para atrapar rápido al siguiente socio
        noFaceCountRef.current = 0;
        delayRef.current = 800;
        scheduleNextCapture(800);
      }, 3000);
    } else {
      setScanningStatus('denied');
      setMatchedMember(result.member ? { ...result.member, match_percentage: result.match_percentage } : null);
      setDeniedReason(result.reason || 'Rostro no registrado en la base de datos.');
      playSound('error');
      
      // Si es un socio registrado pero insolvente (tenemos matchedMember), dura exactamente 5 segundos (5000ms)
      // Si es un rostro no registrado (desconocido), dura 3.5 segundos (3500ms)
      const timeoutDuration = result.member ? 5000 : 3500;

      // Regresar al modo escáner
      setTimeout(() => {
        setScanningStatus('scanning');
        setMatchedMember(null);
        setDeniedReason('');
        noFaceCountRef.current = 0;
        delayRef.current = 800;
        scheduleNextCapture(800);
      }, timeoutDuration);
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
    const showDetailsCard = !!(matchedMember && (scanningStatus === 'allowed' || scanningStatus === 'denied'));
    const isAllowed = scanningStatus === 'allowed';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '24px', position: 'relative' }}>
        
        {/* Botones de control del Kiosco en la esquina superior izquierda */}
        <div style={{ position: 'absolute', top: '-10px', left: '0px', display: 'flex', gap: '8px', alignItems: 'center', zIndex: 100 }}>
          <button 
            onClick={() => {
              window.open('/kiosk-status', 'KioskStatusWindow', 'width=1000,height=800,menubar=no,toolbar=no,location=no,status=no');
            }}
            className="btn btn-secondary"
            style={{ borderRadius: '12px', height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', borderColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}
            title="Abrir Visor Externo (Pantalla 2)"
          >
            <span>🖥️ Abrir Pantalla 2</span>
          </button>
          
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

        <h2 style={{ fontSize: '26px', fontWeight: 800, textAlign: 'center', fontFamily: 'Outfit', letterSpacing: '1px' }}>
          CONTROL DE ACCESO AUTÓNOMO
        </h2>

        {/* -------------------------------------------------- */}
        {/* SECCIÓN A: FICHA DE SOCIO IDENTIFICADO (BIENVENIDA O ADVERTENCIA) */}
        {/* -------------------------------------------------- */}
        {matchedMember && (
          <div className="glass-card animate-kiosk-card" style={{
            width: '90%',
            maxWidth: '780px',
            background: isAllowed ? 'rgba(10, 25, 18, 0.35)' : 'rgba(25, 10, 10, 0.35)',
            backdropFilter: 'blur(20px)',
            border: isAllowed ? '3px solid var(--success)' : '3px solid var(--danger)',
            borderRadius: '24px',
            padding: '36px',
            boxShadow: isAllowed ? '0 0 50px rgba(0, 168, 107, 0.2)' : '0 0 50px rgba(230, 57, 70, 0.2)',
            display: showDetailsCard ? 'grid' : 'none',
            gridTemplateColumns: '1fr 1.6fr',
            gap: '36px',
            alignItems: 'center',
            marginTop: '20px'
          }}>
            {/* Foto del Socio */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '20px',
                overflow: 'hidden',
                border: isAllowed ? '4px solid var(--success)' : '4px solid var(--danger)',
                boxShadow: isAllowed ? '0 8px 32px rgba(0, 168, 107, 0.2)' : '0 8px 32px rgba(230, 57, 70, 0.2)',
                backgroundColor: '#0c0f16'
              }}>
                {matchedMember.foto_url ? (
                  <img 
                    src={`http://localhost:3000${matchedMember.foto_url}`} 
                    alt="Foto del socio" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      filter: isAllowed ? 'none' : 'grayscale(0.5)'
                    }}
                  />
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '64px', 
                    color: isAllowed ? 'var(--success)' : 'var(--danger)' 
                  }}>
                    👤
                  </div>
                )}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: isAllowed ? 'var(--success)' : 'var(--danger)', 
                fontWeight: 800, 
                backgroundColor: isAllowed ? 'rgba(0, 168, 107, 0.1)' : 'rgba(230, 57, 70, 0.1)', 
                padding: '4px 14px', 
                borderRadius: '9999px',
                border: isAllowed ? '1px solid rgba(0, 168, 107, 0.2)' : '1px solid rgba(230, 57, 70, 0.2)',
                fontFamily: 'Outfit'
              }}>
                Match Facial: {matchedMember.match_percentage || '95'}%
              </div>
            </div>

            {/* Datos del Socio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div style={{
                backgroundColor: isAllowed ? 'rgba(0, 168, 107, 0.1)' : 'rgba(230, 57, 70, 0.1)',
                color: isAllowed ? '#34d399' : '#fca5a5',
                padding: '6px 14px',
                borderRadius: '30px',
                alignSelf: 'flex-start',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                border: isAllowed ? '1px solid rgba(0, 168, 107, 0.2)' : '1px solid rgba(230, 57, 70, 0.2)'
              }}>
                {isAllowed ? '✓ ACCESO AUTORIZADO' : '⚠️ DEBE PASAR POR RECEPCIÓN'}
              </div>
              
              <div>
                <h2 style={{ fontSize: '32px', fontWeight: 900, margin: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {matchedMember.nombre} {matchedMember.apellido}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '4px', margin: 0, fontWeight: 600 }}>
                  Cédula: {matchedMember.cedula}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px 20px',
                marginTop: '10px',
                padding: '20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Membresía</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, textTransform: 'capitalize', display: 'block', marginTop: '2px' }}>
                    {matchedMember.membresia_tipo || 'Mensual'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inscrito el</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                    {matchedMember.fecha_registro ? new Date(matchedMember.fecha_registro).toLocaleDateString('es-VE') : 'N/D'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha de Nacimiento</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                    {matchedMember.fecha_nacimiento ? new Date(matchedMember.fecha_nacimiento).toLocaleDateString('es-VE') : 'N/D'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pago Vence el</span>
                  <span style={{ color: isAllowed ? 'var(--success)' : 'var(--danger)', fontSize: '16px', fontWeight: 800, display: 'block', marginTop: '2px' }}>
                    {matchedMember.fecha_fin ? new Date(matchedMember.fecha_fin).toLocaleDateString('es-VE') : 'N/D'}
                  </span>
                </div>
              </div>

              <div style={{
                fontSize: '18px',
                fontWeight: 800,
                color: isAllowed ? '#34d399' : '#f87171',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {isAllowed ? (
                  <span>🏋️ ¡BIENVENIDO A ENTRENAR!</span>
                ) : (
                  <span>📢 DEBE PASAR POR RECEPCIÓN PARA REGULARIZAR SU PAGO</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* SECCIÓN B: INTERFAZ ACTIVA DEL ESCÁNER (CÁMARA Y VEREDICTO) */}
        {/* -------------------------------------------------- */}
        <div style={{ 
          display: showDetailsCard ? 'none' : 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '32px',
          width: '100%',
          animation: 'fadeIn 0.3s ease'
        }}>
          
          {/* Círculo Kiosco de Cámara */}
          <div className={`kiosk-camera-circle ${scanningStatus}`} style={{ transform: 'scale(1.15)', position: 'relative', overflow: 'hidden' }}>
            {/* Elemento de Video Siempre Montado */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                transform: 'scaleX(-1)',
                display: cameraActive ? 'block' : 'none' 
              }}
            />

            {cameraActive && (
              <>
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
                  color: 'rgba(255,255,255,0.855)',
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
            )}

            {!cameraActive && (
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
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                {cameraError ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d4d', fontWeight: 800, fontSize: '15px' }}>
                      <span>⚠️ DIAGNÓSTICO DE CÁMARA</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4', margin: '4px 0 12px', maxWidth: '280px', textAlign: 'center' }}>
                      {cameraError === 'PermissionDenied'
                        ? 'Permiso de cámara bloqueado en el navegador. Por favor, autorice el acceso a la cámara.'
                        : cameraError.includes('Could not start video source') || cameraError.includes('Source error') || cameraError.includes('Readable')
                          ? 'La cámara está siendo utilizada por otra pestaña del sistema. Cierre las demás ventanas del escáner.'
                          : 'No se detecta la cámara. Conecte su webcam física e intente de nuevo.'}
                    </p>
                    <button 
                      onClick={startCamera} 
                      className="btn btn-primary" 
                      style={{ fontSize: '10px', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', gap: '4px' }}
                    >
                      <Camera size={12} />
                      <span>Reintentar Conexión</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 600 }}>Kiosco Listo</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Por favor arranca la cámara para iniciar el escaneo facial.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <style>{`
          @keyframes scaleUp {
            from { transform: scale(0.96); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-kiosk-card {
            animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
        `}</style>
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
          {/* Elemento de Video Siempre Montado */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              transform: 'scaleX(-1)', 
              borderRadius: 'var(--border-radius-md)',
              display: cameraActive ? 'block' : 'none'
            }}
          />

          {!cameraActive && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '12px', padding: '20px', textAlign: 'center' }}>
              {cameraError ? (
                <>
                  <div style={{ color: 'var(--danger)', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠️ CÁMARA DETENIDA</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: '1.4', margin: 0 }}>
                    {cameraError === 'PermissionDenied'
                      ? 'Permisos bloqueados en este navegador. Autorice el acceso a la webcam.'
                      : cameraError.includes('Could not start video source') || cameraError.includes('Source error') || cameraError.includes('Readable')
                        ? 'La cámara está siendo utilizada por otra pestaña (ej: Pantalla 2).'
                        : 'No se detecta la cámara. Conecte su webcam física e intente de nuevo.'}
                  </p>
                </>
              ) : (
                <>
                  <ScanFace size={54} style={{ opacity: 0.15, animation: 'pulse 2s infinite' }} />
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Cámara de recepción apagada.</p>
                </>
              )}
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

          <button 
            onClick={() => {
              window.open('/kiosk-status', 'KioskStatusWindow', 'width=1200,height=900,menubar=no,toolbar=no,location=no,status=no');
            }}
            className="btn btn-secondary"
            style={{ padding: '10px 16px', fontSize: '12px', borderColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700 }}
            title="Abrir Pantalla 2 (Visor de Clientes)"
          >
            <span>🖥️ Abrir Pantalla 2</span>
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
