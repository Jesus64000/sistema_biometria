import React, { useState, useEffect, useRef } from 'react';
import { Camera, Check, X, RefreshCw, Video, AlertCircle } from 'lucide-react';

export default function CaptureModal({ isOpen, onClose, onConfirm, isEnrolment = true }) {
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(localStorage.getItem('selectedCameraId') || '');
  const [streamActive, setStreamActive] = useState(false);
  const [enrolStep, setEnrolStep] = useState(1); // 1: Frente, 2: Perfil Izq, 3: Perfil Der
  const [capturedPhotos, setCapturedPhotos] = useState([]); // Array of base64 strings
  const [singlePhoto, setSinglePhoto] = useState(null); // Single base64 string for non-enrolment
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Single, unified sequential initialization effect
  useEffect(() => {
    let active = true;

    const initialize = async () => {
      if (!isOpen) return;

      try {
        setErrorMsg('');
        setStreamActive(false);

        // 1. Request temporary video stream to unlock labels and close immediately
        let tempStream = null;
        try {
          tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach(track => track.stop());
        } catch (permErr) {
          console.warn('Permiso de cámara denegado o error:', permErr);
          if (active) {
            setErrorMsg('Permiso de cámara denegado o dispositivo ocupado.');
          }
          return;
        }

        if (!active) return;

        // 2. Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        if (active) {
          setVideoDevices(videoInputs);
        }

        // 3. Select active camera ID
        let targetId = '';
        if (videoInputs.length > 0) {
          const savedId = localStorage.getItem('selectedCameraId');
          const exists = videoInputs.some(device => device.deviceId === savedId);
          if (exists && savedId) {
            targetId = savedId;
          } else {
            targetId = videoInputs[0].deviceId;
            localStorage.setItem('selectedCameraId', targetId);
          }
          if (active) {
            setSelectedCameraId(targetId);
          }
        } else {
          if (active) {
            setErrorMsg('No se detectaron cámaras conectadas.');
          }
          return;
        }

        if (!active) return;

        // 4. Start stream sequentially
        await startCamera(targetId);

      } catch (err) {
        console.error('Error durante la inicialización:', err);
        if (active) {
          setErrorMsg('Error al iniciar el dispositivo de video.');
        }
      }
    };

    initialize();

    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async (deviceId) => {
    try {
      stopCamera(); // Stop any existing stream
      setErrorMsg('');
      
      let constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      };

      if (deviceId) {
        constraints.video.deviceId = { exact: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      } else {
        // If ref is not populated yet, wait for a tick
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setStreamActive(true);
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error al iniciar cámara:', err);
      // Fallback to default camera if exact ID failed
      if (deviceId) {
        console.warn('Fallo al abrir cámara guardada, intentando con por defecto...');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setStreamActive(true);
          } else {
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setStreamActive(true);
              }
            }, 100);
          }
        } catch (fallbackErr) {
          setErrorMsg('No se pudo acceder a la cámara seleccionada ni a la de defecto.');
          setStreamActive(false);
        }
      } else {
        setErrorMsg('Error de acceso a la cámara. Revisa los permisos.');
        setStreamActive(false);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  const handleCameraChange = async (e) => {
    const id = e.target.value;
    setSelectedCameraId(id);
    localStorage.setItem('selectedCameraId', id);
    await startCamera(id);
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // 1:1 Aspect ratio square for the circular profile avatar
      canvas.width = 480;
      canvas.height = 480;

      // Draw mirrored video centered into square
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Crop a centered square from the 4:3 video input
      const sx = (video.videoWidth - video.videoHeight) / 2;
      ctx.drawImage(
        video,
        sx, 0, video.videoHeight, video.videoHeight, // Source crop
        0, 0, canvas.width, canvas.height // Destination
      );
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const base64 = canvas.toDataURL('image/jpeg', 0.85);

      if (isEnrolment) {
        const nextPhotos = [...capturedPhotos, base64];
        setCapturedPhotos(nextPhotos);

        if (enrolStep < 3) {
          setEnrolStep(prev => prev + 1);
        } else {
          // Finished all 3 steps
          stopCamera();
        }
      } else {
        setSinglePhoto(base64);
        stopCamera();
      }
    }
  };

  const handleReset = () => {
    setCapturedPhotos([]);
    setSinglePhoto(null);
    setEnrolStep(1);
    setErrorMsg('');
    if (selectedCameraId) {
      startCamera(selectedCameraId);
    }
  };

  const handleConfirm = () => {
    if (isEnrolment) {
      if (capturedPhotos.length === 3) {
        onConfirm(capturedPhotos);
        onClose();
      }
    } else {
      if (singlePhoto) {
        onConfirm(singlePhoto);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 11, 15, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20000,
      padding: '20px',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <div style={{
        backgroundColor: 'rgba(23, 27, 43, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 242, 254, 0.15)',
        padding: '24px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif"
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={22} style={{ color: '#00f2fe' }} />
              {isEnrolment ? 'Escáner Biométrico de Enrolamiento' : 'Actualizar Foto de Perfil'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              {isEnrolment ? 'Captura facial multicapa de 3 ángulos' : 'Instantánea única de alta calidad'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => { stopCamera(); onClose(); }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(230, 57, 70, 0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera device selection */}
        {videoDevices.length > 1 && streamActive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Seleccionar Cámara Activa
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedCameraId}
                onChange={handleCameraChange}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(10, 12, 22, 0.9)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              >
                {videoDevices.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Cámara ${idx + 1}`}
                  </option>
                ))}
              </select>
              <div style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#00f2fe',
                fontSize: '10px'
              }}>
                ▼
              </div>
            </div>
          </div>
        )}

        {/* Instruction Banner */}
        <div style={{
          backgroundColor: 'rgba(0, 242, 254, 0.08)',
          borderLeft: '4px solid #00f2fe',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#fff',
          fontWeight: 600
        }}>
          <Video size={16} style={{ color: '#00f2fe', flexShrink: 0 }} />
          <span>
            {isEnrolment ? (
              enrolStep === 1 ? 'Muestra 1: Mire directamente al frente y pulse "Capturar"' :
              enrolStep === 2 ? 'Muestra 2: Gire levemente a la IZQUIERDA y pulse "Capturar"' :
              capturedPhotos.length === 3 ? '✓ Capturas listas. Revise abajo y confirme el registro.' :
              'Muestra 3: Gire levemente a la DERECHA y pulse "Capturar"'
            ) : (
              singlePhoto ? '✓ Foto capturada. Revise y confirme.' : 'Encuadre el rostro del cliente y pulse "Capturar"'
            )}
          </span>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            borderLeft: '4px solid #e63946',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#ff8a93'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Video Frame */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1/1',
          backgroundColor: '#0a0c16',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '2px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)'
        }}>
          {/* Always mount video so videoRef is defined, toggle visibility via style */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)', // Mirror view
              display: streamActive ? 'block' : 'none'
            }}
          />

          {!streamActive && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', padding: '20px', position: 'absolute' }}>
              {isEnrolment && capturedPhotos.length === 3 ? (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'rgba(46, 204, 113, 0.1)',
                  border: '2px solid #2ecc71',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(46, 204, 113, 0.2)'
                }}>
                  <Check size={48} style={{ color: '#2ecc71' }} />
                </div>
              ) : !isEnrolment && singlePhoto ? (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #00f2fe',
                  boxShadow: '0 0 20px rgba(0, 242, 254, 0.2)'
                }}>
                  <img src={singlePhoto} alt="Captura" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <>
                  <Video size={48} style={{ opacity: 0.2, color: '#00f2fe' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                    Iniciando flujo de video...
                  </span>
                </>
              )}
            </div>
          )}

          {streamActive && (
            <>
              {/* Circular Guides */}
              <div style={{
                position: 'absolute',
                border: '2px dashed rgba(0, 242, 254, 0.5)',
                borderRadius: '50%',
                top: '12%',
                bottom: '12%',
                left: '12%',
                right: '12%',
                pointerEvents: 'none',
                boxShadow: '0 0 0 9999px rgba(10, 12, 22, 0.4)'
              }} />

              {/* Glowing Scan Laser */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #00f2fe, #4facfe, #00f2fe, transparent)',
                boxShadow: '0 0 15px #00f2fe, 0 0 5px #00f2fe',
                animation: 'scanLaser 3s infinite ease-in-out',
                pointerEvents: 'none',
                zIndex: 10
              }} />
            </>
          )}

          {/* CSS Animation Keyframes Inject */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scanLaser {
              0% { top: 12%; }
              50% { top: 88%; }
              100% { top: 12%; }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}} />
        </div>

        {/* Captured Samples Display (Enrolment mode) */}
        {isEnrolment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Muestras Guardadas ({capturedPhotos.length}/3)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[1, 2, 3].map((step) => {
                const photo = capturedPhotos[step - 1];
                const isActive = enrolStep === step && streamActive;
                return (
                  <div key={step} style={{
                    backgroundColor: 'rgba(10, 12, 22, 0.6)',
                    border: isActive ? '2px solid #00f2fe' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 0 10px rgba(0, 242, 254, 0.15)' : 'none'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {photo ? (
                        <img src={photo} alt={`Muestra ${step}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={16} style={{ opacity: 0.15 }} />
                      )}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: photo ? '#2ecc71' : 'rgba(255,255,255,0.4)' }}>
                      {step === 1 ? '1. Frente' : step === 2 ? '2. Perfil Izq' : '3. Perfil Der'}
                    </span>
                    {photo && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: '#2ecc71',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Check size={10} style={{ color: '#fff' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', gap: '12px' }}>
          <div>
            {(capturedPhotos.length > 0 || singlePhoto) && (
              <button
                type="button"
                onClick={handleReset}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '10px 18px',
                  color: '#ff8a93',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.15)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              >
                <RefreshCw size={14} />
                Reiniciar
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '10px 18px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            >
              Cancelar
            </button>

            {/* Capturar button (Only visible if camera stream is active and not fully captured) */}
            {streamActive && ((isEnrolment && capturedPhotos.length < 3) || (!isEnrolment && !singlePhoto)) && (
              <button
                type="button"
                onClick={captureSnapshot}
                style={{
                  background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 24px',
                  color: '#13172b',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(0, 242, 254, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <Camera size={14} />
                Capturar
              </button>
            )}

            {/* Confirm/Accept button (Visible when capture sequence is complete) */}
            {((isEnrolment && capturedPhotos.length === 3) || (!isEnrolment && singlePhoto)) && (
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  backgroundColor: '#2ecc71',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 24px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <Check size={14} />
                Confirmar Fotos
              </button>
            )}
          </div>
        </div>

      </div>
      
      {/* Off-screen canvas for image generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
