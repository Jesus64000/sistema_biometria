import os
import base64
import json
import time
from datetime import datetime
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Rutas de almacenamiento
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FACES_DIR = os.path.join(BASE_DIR, 'faces')
MODEL_PATH = os.path.join(BASE_DIR, 'model.yml')
METADATA_PATH = os.path.join(BASE_DIR, 'metadata.json')

os.makedirs(FACES_DIR, exist_ok=True)

# Cargar el detector de rostros de Haar de OpenCV
HAAR_CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(HAAR_CASCADE_PATH)

# Inicializar el reconocedor LBPH
# Nota: cv2.face.LBPHFaceRecognizer_create requiere opencv-contrib-python
recognizer = None
try:
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    print("✅ Motor biométrico LBPH creado correctamente.")
except AttributeError:
    print("❌ ERROR: opencv-contrib-python no está instalado. LBPH no estará disponible.")

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
            print(f"✅ Metadatos cargados: {len(member_metadata)} socios registrados.")
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
        print("❌ No se puede entrenar: recognizer es None")
        return False

    faces = []
    ids = []
    
    # Recorrer todas las imágenes en el directorio de rostros
    # Los archivos se guardan como: member_{member_id}_{timestamp}.jpg
    files = [f for f in os.listdir(FACES_DIR) if f.endswith('.jpg') or f.endswith('.png')]
    
    if len(files) == 0:
        print("⚠️ No hay imágenes de rostros para entrenar.")
        trained = False
        return False

    print(f"🔄 Entrenando modelo con {len(files)} imágenes de rostros...")
    
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
            print("✅ Modelo biométrico facial guardado y entrenado con éxito.")
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
            print("✅ Modelo biométrico existente cargado con éxito.")
        except Exception as e:
            print(f"⚠️ Error al leer modelo existente: {str(e)}. Intentando reentrenar...")
            train_model()
    else:
        # Intentar entrenar si existen imágenes
        train_model()

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "service": "Marian Gym Biometric IA Engine",
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
            
            # Detectar rostro con parámetros de alta fidelidad y tolerancia
            faces = face_cascade.detectMultiScale(gray_eq, scaleFactor=1.06, minNeighbors=4, minSize=(40, 40))
            
            if len(faces) == 0:
                continue

            # Seleccionar rostro más grande
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            x, y, w, h = faces[0]
            
            # Recortar y redimensionar (desde la imagen ecualizada para normalizar texturas)
            cropped_face = gray_eq[y:y+h, x:x+w]
            cropped_face_resized = cv2.resize(cropped_face, (200, 200))

            # Guardar imagen
            timestamp = int(time.time()) + idx
            filename = f"member_{member_id}_{timestamp}_{idx}.jpg"
            filepath = os.path.join(FACES_DIR, filename)
            cv2.imwrite(filepath, cropped_face_resized)
            processed_count += 1

        if processed_count == 0:
            return jsonify({"success": False, "error": "No se detectó ningún rostro válido en las imágenes suministradas."}), 200

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
            "message": f"Enrolamiento multicapa completado. Procesados con éxito: {processed_count} muestras de rostros.",
            "trained": train_success,
            "samples": member_metadata[str(member_id)]["samples"]
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Error interno en el servidor biométrico: {str(e)}"}), 500

@app.route('/verify', methods=['POST'])
def verify_face():
    if not trained:
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
        
        # Ecualización del histograma para normalizar la luz (Cabimas Proof)
        gray_eq = cv2.equalizeHist(gray)
        
        # Detectar rostro con parámetros de alta fidelidad y tolerancia
        faces = face_cascade.detectMultiScale(gray_eq, scaleFactor=1.06, minNeighbors=4, minSize=(40, 40))
        
        if len(faces) == 0:
            return jsonify({"success": False, "error": "no_face_detected"}), 200

        # Seleccionar rostro más grande
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]
        
        # Recortar y redimensionar (desde la imagen ecualizada)
        cropped_face = gray_eq[y:y+h, x:x+w]
        cropped_face_resized = cv2.resize(cropped_face, (200, 200))

        # Realizar predicción
        member_id, confidence = recognizer.predict(cropped_face_resized)
        
        # Calcular tasa de confianza en formato porcentaje comercial (Chi-square a %)
        # 0 de distancia = 100% match. Un valor de 80.0 de distancia = 0% match.
        match_percentage = max(0.0, min(100.0, 100.0 - (confidence / 80.0) * 100.0))
        
        end_time = time.time()
        processing_ms = (end_time - start_time) * 1000.0
        
        print(f"🔮 Predicción biométrica: Socio ID {member_id} | Confianza: {confidence:.2f} ({match_percentage:.1f}%) | Tiempo: {processing_ms:.2f}ms")

        # Umbral para LBPH (Calibrado a 73.0 para un reconocimiento cómodo en gimnasios)
        CONFIDENCE_THRESHOLD = 73.0
        
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
