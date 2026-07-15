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
    <div className="capture-modal-overlay">
      <div className="capture-modal-content">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={22} style={{ color: '#00f2fe' }} />
              {isEnrolment ? 'Escáner Biométrico de Enrolamiento' : 'Actualizar Foto de Perfil'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {isEnrolment ? 'Captura facial multicapa de 3 ángulos' : 'Instantánea única de alta calidad'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => { stopCamera(); onClose(); }}
            style={{
              background: 'var(--capture-btn-bg)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--capture-btn-color)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(230, 57, 70, 0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--capture-btn-bg)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Doble Columna Adaptativa */}
        <div className="capture-modal-grid">
          
          {/* Columna Izquierda: Instrucciones y Video */}
          <div className="capture-modal-col-left">
            {/* Instruction Banner */}
            <div style={{
              backgroundColor: 'var(--capture-banner-bg)',
              borderLeft: '4px solid var(--capture-banner-color)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}>
              <Video size={16} style={{ color: 'var(--capture-banner-color)', flexShrink: 0 }} />
              <span>
                {isEnrolment ? (
                  enrolStep === 1 ? 'Muestra 1: Mire de frente y pulse "Capturar"' :
                  enrolStep === 2 ? 'Muestra 2: Gire a la IZQUIERDA y pulse "Capturar"' :
                  capturedPhotos.length === 3 ? '✓ Capturas listas. Confirme a la derecha.' :
                  'Muestra 3: Gire a la DERECHA y pulse "Capturar"'
                ) : (
                  singlePhoto ? '✓ Foto capturada. Confirme a la derecha.' : 'Encuadre el rostro y pulse "Capturar"'
                )}
              </span>
            </div>

            {/* Video Frame */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '350px',
              margin: '0 auto',
              aspectRatio: '1/1',
              backgroundColor: '#0a0c16',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '2px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), var(--shadow-sm)'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: streamActive ? 'block' : 'none'
                }}
              />

              {!streamActive && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', padding: '20px', position: 'absolute' }}>
                  {isEnrolment && capturedPhotos.length === 3 ? (
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: 'rgba(46, 204, 113, 0.1)',
                      border: '2px solid #2ecc71',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 20px rgba(46, 204, 113, 0.2)'
                    }}>
                      <Check size={40} style={{ color: '#2ecc71' }} />
                    </div>
                  ) : !isEnrolment && singlePhoto ? (
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid #00f2fe',
                      boxShadow: '0 0 20px rgba(0, 242, 254, 0.2)'
                    }}>
                      <img src={singlePhoto} alt="Captura" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <>
                      <Video size={40} style={{ opacity: 0.2, color: 'var(--capture-banner-color)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Iniciando flujo de video...
                      </span>
                    </>
                  )}
                </div>
              )}

              {streamActive && (
                <>
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
            </div>
          </div>

          {/* Columna Derecha: Cámara, Muestras y Botones */}
          <div className="capture-modal-col-right">
            
            {/* Selector de cámara */}
            {videoDevices.length > 1 && streamActive && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Seleccionar Cámara
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <select
                    value={selectedCameraId}
                    onChange={handleCameraChange}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--capture-select-bg)',
                      border: '1px solid var(--capture-select-border)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: 'var(--capture-select-color)',
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
                    color: 'var(--capture-banner-color)',
                    fontSize: '10px'
                  }}>
                    ▼
                  </div>
                </div>
              </div>
            )}

            {/* Mensajes de error */}
            {errorMsg && (
              <div style={{
                backgroundColor: 'rgba(230, 57, 70, 0.1)',
                borderLeft: '4px solid #e63946',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--danger)',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Muestras guardadas */}
            {isEnrolment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Muestras Guardadas ({capturedPhotos.length}/3)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' }}>
                  {[1, 2, 3].map((step) => {
                    const photo = capturedPhotos[step - 1];
                    const isActive = enrolStep === step && streamActive;
                    return (
                      <div key={step} style={{
                        backgroundColor: 'var(--capture-card-bg)',
                        border: isActive ? '2px solid var(--capture-banner-color)' : '1px solid var(--capture-card-border)',
                        borderRadius: '12px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        position: 'relative',
                        transition: 'all 0.2s',
                        boxShadow: isActive ? '0 0 10px var(--capture-input-shadow)' : 'none'
                      }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          background: 'var(--capture-btn-bg)',
                          border: '1px solid var(--capture-card-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {photo ? (
                            <img src={photo} alt={`Muestra ${step}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Camera size={14} style={{ opacity: 0.15 }} />
                          )}
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: photo ? '#2ecc71' : 'var(--capture-text-light)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {step === 1 ? '1. Frente' : step === 2 ? '2. Izq' : '3. Der'}
                        </span>
                        {photo && (
                          <div style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            backgroundColor: '#2ecc71',
                            borderRadius: '50%',
                            width: '14px',
                            height: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check size={8} style={{ color: '#fff' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vista previa foto única */}
            {!isEnrolment && singlePhoto && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2ecc71', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} /> Foto Capturada Con Éxito
                </span>
              </div>
            )}

            {/* Controles de Acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              
              {/* Botón Principal (Tomar Captura o Confirmar) */}
              {streamActive && ((isEnrolment && capturedPhotos.length < 3) || (!isEnrolment && !singlePhoto)) && (
                <button
                  type="button"
                  onClick={captureSnapshot}
                  style={{
                    background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    color: '#13172b',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(0, 242, 254, 0.3)',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <Camera size={16} />
                  Tomar Captura
                </button>
              )}

              {((isEnrolment && capturedPhotos.length === 3) || (!isEnrolment && singlePhoto)) && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  style={{
                    backgroundColor: '#2ecc71',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <Check size={16} />
                  Confirmar Fotos
                </button>
              )}

              {/* Botones secundarios (Cancelar y Reiniciar) */}
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                {(capturedPhotos.length > 0 || singlePhoto) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      backgroundColor: 'var(--capture-btn-bg)',
                      border: '1px solid var(--capture-card-border)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: 'var(--danger)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                      flex: 1
                    }}
                  >
                    <RefreshCw size={12} />
                    Reiniciar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { stopCamera(); onClose(); }}
                  style={{
                    backgroundColor: 'var(--capture-btn-bg)',
                    border: '1px solid var(--capture-card-border)',
                    borderRadius: '10px',
                    padding: '10px',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    textAlign: 'center'
                  }}
                >
                  Cancelar
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
      
      {/* Off-screen canvas for image generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
