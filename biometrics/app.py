import os
import sys
import base64
import json
import time
from datetime import datetime
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

app = Flask(__name__)
CORS(app)

# Rutas de almacenamiento compatibles con desarrollo y PyInstaller ejecutable
if getattr(sys, 'frozen', False):
    # Ejecutable empaquetado (.exe)
    BASE_DIR = os.path.dirname(sys.executable)
    BUNDLE_DIR = getattr(sys, '_MEIPASS', BASE_DIR)
else:
    # Modo desarrollo (Python script)
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    BUNDLE_DIR = BASE_DIR

DATA_DIR = os.environ.get('BIOMETRICS_DATA_DIR', BASE_DIR)

FACES_DIR = os.path.join(DATA_DIR, 'faces')
MODEL_PATH = os.path.join(DATA_DIR, 'model.yml')
METADATA_PATH = os.path.join(DATA_DIR, 'metadata.json')

os.makedirs(FACES_DIR, exist_ok=True)

# Cargar el detector de rostros de Haar de OpenCV
HAAR_CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
if not os.path.exists(HAAR_CASCADE_PATH):
    HAAR_CASCADE_PATH = os.path.join(BUNDLE_DIR, 'haarcascade_frontalface_default.xml')
if not os.path.exists(HAAR_CASCADE_PATH):
    HAAR_CASCADE_PATH = os.path.join(BASE_DIR, 'haarcascade_frontalface_default.xml')

face_cascade = cv2.CascadeClassifier(HAAR_CASCADE_PATH)

# Inicializar el reconocedor LBPH
# Nota: cv2.face.LBPHFaceRecognizer_create requiere opencv-contrib-python
recognizer = None
try:
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    print("[OK] Motor biometrico LBPH creado correctamente.")
except AttributeError:
    print("[ERROR] opencv-contrib-python no esta instalado. LBPH no estara disponible.")

# Estado de carga
trained = False
member_metadata = {} # Guarda la relación de member_id -> cedula, nombre, etc.

# Función para decodificar base64 a imagen OpenCV
def decode_base64_image(base64_str):
    if not base64_str:
        return None
    try:
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error al decodificar base64: {str(e)}")
        return None

# Función para cargar metadatos guardados
def load_metadata():
    global member_metadata
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, 'r', encoding='utf-8') as f:
                member_metadata = json.load(f)
            print(f"[OK] Metadatos cargados: {len(member_metadata)} socios registrados.")
        except Exception as e:
            print(f"Error al cargar metadatos: {str(e)}")

# Guardar metadatos
def save_metadata():
    try:
        with open(METADATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(member_metadata, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error al guardar metadatos: {str(e)}")

# Entrenar el reconocedor LBPH con las imágenes existentes
def train_model():
    global trained, recognizer
    if recognizer is None:
        print("[ERROR] No se puede entrenar: recognizer es None")
        return False

    faces = []
    ids = []
    
    # Recorrer todas las imágenes en el directorio de rostros
    # Los archivos se guardan como: member_{member_id}_{timestamp}.jpg
    files = [f for f in os.listdir(FACES_DIR) if f.endswith('.jpg') or f.endswith('.png')]
    
    if len(files) == 0:
        print("[INFO] No hay imagenes de rostros para entrenar.")
        trained = False
        return False

    print(f"[TRAIN] Entrenando modelo con {len(files)} imagenes de rostros...")
    
    for filename in files:
        filepath = os.path.join(FACES_DIR, filename)
        try:
            parts = filename.split('_')
            if len(parts) >= 2:
                # El id del socio está después de 'member'
                socio_id = int(parts[1])
            else:
                continue
                
            img = cv2.imread(filepath, cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue
                
            # Redimensionar rostro recortado
            img_resized = cv2.resize(img, (200, 200))
            
            faces.append(img_resized)
            ids.append(socio_id)
        except Exception as e:
            print(f"Error al procesar archivo {filename} para entrenamiento: {str(e)}")

    if len(faces) > 0:
        try:
            recognizer.train(faces, np.array(ids))
            recognizer.write(MODEL_PATH)
            trained = True
            print("[OK] Modelo biometrico facial guardado y entrenado con exito.")
            return True
        except Exception as e:
            print(f"Error durante recognizer.train: {str(e)}")
            trained = False
            return False
    else:
        trained = False
        return False

# Cargar el modelo al iniciar si existe
def init_model():
    global trained, recognizer
    load_metadata()
    if os.path.exists(MODEL_PATH) and recognizer is not None:
        try:
            recognizer.read(MODEL_PATH)
            trained = True
            print("[OK] Modelo biometrico existente cargado con exito.")
        except Exception as e:
            print(f"[WARN] Error al leer modelo existente: {str(e)}. Intentando reentrenar...")
            train_model()
    else:
        # Intentar entrenar si existen imágenes
        train_model()

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "service": "Ramos Gym Biometric IA Engine",
        "engine": "OpenCV LBPH"
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "trained": trained,
        "num_faces_registered": len(member_metadata),
        "engine": "OpenCV LBPH"
    })

@app.route('/register', methods=['POST'])
def register_face():
    global member_metadata
    if recognizer is None:
        return jsonify({"success": False, "error": "El reconocedor LBPH no está configurado en el servidor."}), 500
        
    try:
        data = request.get_json()
        if not data or 'member_id' not in data:
            return jsonify({"success": False, "error": "Datos incompletos. Se requiere 'member_id'."}), 400

        member_id = int(data['member_id'])
        cedula = data.get('cedula', '')

        # Determinar si viene una sola imagen o múltiples imágenes (Auto-enrolamiento multicapa)
        images_to_process = []
        if 'images' in data and isinstance(data['images'], list):
            images_to_process = data['images']
        elif 'image_base64' in data:
            images_to_process = [data['image_base64']]
        else:
            return jsonify({"success": False, "error": "No se proporcionaron imágenes faciales para enrolar ('image_base64' o 'images')."}), 400

        processed_count = 0
        for idx, base64_str in enumerate(images_to_process):
            # Decodificar imagen
            img = decode_base64_image(base64_str)
            if img is None:
                continue

            # Convertir a escala de grises
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Ecualización del histograma para normalizar la luz (Cabimas Proof)
            gray_eq = cv2.equalizeHist(gray)
             # Detectar rostro con parámetros de alta fidelidad y tolerancia (con fallback)
            faces = face_cascade.detectMultiScale(gray_eq, scaleFactor=1.05, minNeighbors=3, minSize=(30, 30))
            
            if len(faces) > 0:
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                x, y, w, h = faces[0]
                cropped_face = gray_eq[y:y+h, x:x+w]
            else:
                # Fallback: Recortar la región central de la imagen para garantizar enrolamiento
                h_img, w_img = gray_eq.shape
                cy, cx = h_img // 2, w_img // 2
                sz = min(h_img, w_img) // 2
                y1, y2 = max(0, cy - sz), min(h_img, cy + sz)
                x1, x2 = max(0, cx - sz), min(w_img, cx + sz)
                cropped_face = gray_eq[y1:y2, x1:x2]

            cropped_face_resized = cv2.resize(cropped_face, (200, 200))

            # Guardar imagen
            timestamp = int(time.time()) + idx
            filename = f"member_{member_id}_{timestamp}_{idx}.jpg"
            filepath = os.path.join(FACES_DIR, filename)
            cv2.imwrite(filepath, cropped_face_resized)
            processed_count += 1

        if processed_count == 0:
            return jsonify({"success": False, "error": "No se pudo procesar la imagen facial."}), 200

        # Actualizar metadatos
        member_metadata[str(member_id)] = {
            "cedula": cedula,
            "registered_at": datetime.now().isoformat(),
            "samples": member_metadata.get(str(member_id), {}).get("samples", 0) + processed_count
        }
        save_metadata()

        # Reentrenar modelo de forma inmediata en segundo plano
        train_success = train_model()
        return jsonify({
            "success": True,
            "message": f"Socio ID {member_id} enrolado correctamente con {processed_count} muestra(s).",
            "samples_added": processed_count,
            "trained": train_success
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Error durante el enrolamiento: {str(e)}"}), 500

@app.route('/verify', methods=['POST'])
def verify_face():
    global trained, recognizer, member_metadata
    if not trained or recognizer is None:
        # Intentar re-cargar o re-entrenar antes de dar error
        init_model()

    if not trained or recognizer is None:
        return jsonify({"success": False, "error": "El motor biométrico no ha sido entrenado. Registre al menos un rostro primero."}), 200

    try:
        start_time = time.time()
        data = request.get_json()
        if not data or 'image_base64' not in data:
            return jsonify({"success": False, "error": "Falta la imagen base64."}), 400

        image_base64 = data['image_base64']

        # Decodificar imagen
        img = decode_base64_image(image_base64)
        if img is None:
            return jsonify({"success": False, "error": "No se pudo decodificar la imagen base64."}), 400

        # Convertir a escala de grises
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray_eq = cv2.equalizeHist(gray)
        
        # Detectar rostro con múltiples niveles de tolerancia
        faces = face_cascade.detectMultiScale(gray_eq, scaleFactor=1.05, minNeighbors=3, minSize=(30, 30))
        if len(faces) == 0:
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=2, minSize=(30, 30))
        
        if len(faces) > 0:
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            x, y, w, h = faces[0]
            cropped_face = gray_eq[y:y+h, x:x+w]
        else:
            # Fallback a región central si no detecta bounding box perfecto en el cuadro de video
            h_img, w_img = gray_eq.shape
            cy, cx = h_img // 2, w_img // 2
            sz = min(h_img, w_img) // 2
            y1, y2 = max(0, cy - sz), min(h_img, cy + sz)
            x1, x2 = max(0, cx - sz), min(w_img, cx + sz)
            cropped_face = gray_eq[y1:y2, x1:x2]

        cropped_face_resized = cv2.resize(cropped_face, (200, 200))

        # Realizar predicción
        member_id, confidence = recognizer.predict(cropped_face_resized)
        
        # Calcular tasa de confianza comercial (Chi-square a %)
        match_percentage = max(0.0, min(100.0, 100.0 - (confidence / 85.0) * 100.0))
        
        end_time = time.time()
        processing_ms = (end_time - start_time) * 1000.0
        
        print(f"[PREDICT] Prediccion biometrica: Socio ID {member_id} | Confianza: {confidence:.2f} ({match_percentage:.1f}%) | Tiempo: {processing_ms:.2f}ms")

        # Umbral para LBPH (Ajustado a 88.0 para óptimo reconocimiento de cámara web local)
        CONFIDENCE_THRESHOLD = 88.0
        
        if confidence < CONFIDENCE_THRESHOLD:
            metadata = member_metadata.get(str(member_id), {})
            return jsonify({
                "success": True,
                "member_id": member_id,
                "confidence": float(confidence),
                "match_percentage": round(match_percentage, 1),
                "processing_time_ms": round(processing_ms, 2),
                "message": "Coincidencia facial exitosa."
            })
        else:
            return jsonify({
                "success": False,
                "confidence": float(confidence),
                "match_percentage": round(match_percentage, 1),
                "processing_time_ms": round(processing_ms, 2),
                "error": "El rostro no coincide con ningún socio registrado."
            })

    except Exception as e:
        return jsonify({"success": False, "error": f"Error interno durante la verificación: {str(e)}"}), 500

if __name__ == '__main__':
    init_model()
    # Correr en puerto 5000
    app.run(host='0.0.0.0', port=5000, debug=False)
