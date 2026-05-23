# Sistema de Biometría Facial y Gestión de Centros Deportivos

Este proyecto representa el desarrollo del sistema de grado titulado: **"BIOMETRÍA FACIAL PARA LA GESTIÓN ADMINISTRATIVA Y DE ACCESO DE LOS USUARIOS EN LOS CENTROS DEPORTIVOS DEL MUNICIPIO CABIMAS"** elaborado por Br. **Luis Ramos** (Ingeniería de Sistemas, Extensión Costa Oriental del Lago - Cabimas).

La plataforma moderniza de forma integral los procesos administrativos, de cobro y de acceso en establecimientos como *ExtremoGym*, *Booster*, y *CrunchGym* ubicados en la parroquia Carmen Herrera del Municipio Cabimas, sustituyendo el registro manual/verbal de la cédula de identidad por una validación biométrica automatizada y de alta fidelidad estética.

---

## 🚀 Arquitectura Tecnológica y Características Premium

El sistema se compone de tres módulos modulares y de alto rendimiento que se integran en tiempo real:

1.  **Backend (Node.js + Express.js)**:
    *   Gestiona las reglas de negocio de membresías, vencimientos automáticos y solvencias.
    *   Conexión inteligente con **XAMPP MySQL** local con auto-creación programática de la base de datos `sistema_biometria` y todas sus tablas (`socios`, `membresias`, `pagos`, `registro_asistencias`) al arrancar.
    *   Incluye un **Seeder** inteligente con 5 socios demo con datos de Cabimas, pagos e historiales de check-in distribuidos en horas pico.
2.  **Frontend (React.js + Vite + Vanilla CSS)**:
    *   **Estética Visual Premium de Estado del Arte**: Diseño futurista en modo oscuro, efectos holográficos de glassmorphism, degradados armoniosos de paletas HSL (cian/azul neón) y tipografías modernas (*Inter* y *Outfit*).
    *   **Visor de Escaneo Holográfico**: Cámara en vivo del usuario con una animación de visor de escaneo láser dinámico que cambia a verde neón (éxito) o rojo neón (error).
    *   **Audio-Síntesis de Retorno Sensorial (Web Audio API)**: Emite chimes armónicos binaurales de dos tonos (`C5` -> `E5`) para accesos permitidos y zumbidos de decaimiento lineal para denegaciones sin requerir dependencias de archivos de sonido externos.
    *   **Dashboard de Analítica Avanzada**: Estadísticas de socios activos/inactivos, ingresos recaudados en tiempo real y un gráfico interactivo CSS de distribución horaria para identificar **horas pico** de afluencia.
    *   **Panel de Simulación de Recepción**: Permite evaluar de manera inmediata todos los escenarios lógicos del negocio (Acceso Permitido por Solvencia, Acceso Denegado por Insolvencia, Usuario No Registrado) con un solo clic, permitiendo una defensa de tesis impecable e interactiva incluso sin cámara activa o sin motor de Python.
3.  **Motor Biométrico (Python 3 + Flask + OpenCV)**:
    *   Visión artificial ágil y de cero fricciones de instalación en Windows.
    *   Utiliza clasificadores de cascada **Haar Cascades** para detección ultra-rápida de rostros.
    *   Emplea el reconocedor **LBPH (Local Binary Patterns Histograms)** de OpenCV para extraer patrones fisionómicos, entrenar el clasificador automáticamente en milisegundos y clasificar identidades.
    *   Persistencia del modelo entrenado en un archivo local (`model.yml`) para arrancar de forma instantánea.

---

## 🛠️ Requisitos de Instalación

Asegúrate de tener instalado en tu computadora Windows:
*   [XAMPP](https://www.apachefriends.org/es/index.html) (con el módulo de MySQL).
*   [Node.js](https://nodejs.org/) (Versión 16 o superior).
*   [Python 3.8+](https://www.python.org/) (Opcional, para el reconocimiento biométrico real; el sistema incluye simulador si deseas probarlo de inmediato).

---

## ⚙️ Configuración y Despliegue en 4 Pasos

Sigue estos sencillos pasos para levantar y dejar funcionando por completo la plataforma en tu entorno local:

### Paso 1: Activar MySQL en XAMPP
1.  Abre el **Panel de Control de XAMPP**.
2.  Haz clic en el botón **"Start"** del módulo **MySQL** (el puerto `3306` debe encenderse en verde).
3.  *Nota*: No es necesario crear bases de datos manualmente en phpMyAdmin, el servidor de Node.js lo hará por ti de forma automatizada al arrancar.

### Paso 2: Configurar y Arrancar el Backend (Node.js)
1.  Abre una terminal en la ruta de la carpeta `backend`:
    ```powershell
    cd "f:\Luis Ramos\sistema_biometria\backend"
    ```
2.  Instala las dependencias necesarias (ya han sido pre-instaladas con éxito):
    ```powershell
    npm install
    ```
3.  **Sembrar Datos de Demostración**: Ejecuta el script de sembrado para vaciar e inicializar la base de datos con 5 socios interactivos y registros históricos de asistencia:
    ```powershell
    npm run seed
    ```
4.  **Iniciar Servidor Backend**: Arranca el servidor Express en modo de desarrollo:
    ```powershell
    npm run dev
    ```
    *(El servidor correrá en `http://localhost:3000` y confirmará la conexión a XAMPP MySQL)*

### Paso 3: Configurar y Arrancar el Frontend (React)
1.  Abre otra terminal diferente en la ruta de la carpeta `frontend`:
    ```powershell
    cd "f:\Luis Ramos\sistema_biometria\frontend"
    ```
2.  Instala las dependencias de la interfaz (ya han sido pre-instaladas con éxito):
    ```powershell
    npm install
    ```
3.  **Iniciar Servidor Frontend**: Arranca la app en Vite:
    ```powershell
    npm run dev
    ```
4.  Abre tu navegador de preferencia e ingresa a: **`http://localhost:5173`**

### Paso 4: Levantar el Motor Biométrico en Python (Opcional)
Si deseas utilizar la cámara web de tu laptop y entrenar rostros reales con inteligencia artificial:
1.  Abre una terminal en la ruta de la carpeta `biometrics`:
    ```powershell
    cd "f:\Luis Ramos\sistema_biometria\biometrics"
    ```
2.  Instala los requisitos de Python (se recomienda usar un entorno virtual o pip global):
    ```powershell
    pip install -r requirements.txt
    ```
3.  Arranca el servidor biométrico Flask:
    ```powershell
    python app.py
    ```
    *(El motor se iniciará en `http://localhost:5000`)*

---

## 💡 Guía de Demostración del Sistema para la Defensa de Tesis

Para realizar una excelente demostración interactiva frente a los jurados o tutores del politécnico, puedes utilizar los siguientes flujos de prueba:

### 1. Panel de Control y Analíticas de Afluencia
*   Entra en la sección **Dashboard Analítico** en el menú izquierdo.
*   Cambia de gimnasio en el selector de sedes en la parte superior derecha (puedes cambiar entre **ExtremoGym**, **Booster Gym** y **CrunchGym**).
*   Observa cómo cambian los contadores dinámicos de socios y solvencia.
*   Examina la **gráfica de afluencia por horas (horas pico)**; se alimenta directamente de la base de datos local y demuestra la toma de decisiones basada en inteligencia de negocio.
*   Mira el feed de **Ingresos Recientes** con los check-ins que han ocurrido hoy.

### 2. Administración y Cobro de Membresías
*   Navega a **Gestión de Socios** en la barra lateral.
*   Verás la lista interactiva de los 5 socios cargados por el seeder.
*   **Caso de Insolvencia**: Busca a **Carlos Mendoza** (verás que su estatus aparece en rojo como "Insolvente / Membresía Vencida").
*   **Registrar Pago**: Haz clic en el botón azul "Registrar Pago" de su fila. Selecciona un método de pago (Pago Móvil, Divisas, etc.) y confirma.
    *   *Resultado*: El sistema registrará el ingreso de dinero en MySQL, extenderá su membresía por 30 días y su estatus cambiará instantáneamente a verde brillante ("Activo / Solvente"). ¡Visualízalo en el Dashboard!

### 3. Enrolamiento Biométrico Facial Real
*   En la misma pestaña de **Gestión de Socios**, haz clic en el botón celeste de cámara **"Enrolar Rostro"** para cualquier socio.
*   Se abrirá una ventana de captura glassmorphism que tomará la transmisión de tu cámara.
*   Asegúrate de estar centrado y haz clic en **"Tomar Captura de Enrolamiento"**.
*   El backend enviará el base64 de la imagen al motor de Python, este usará Haar Cascades para recortar únicamente tu cara y reentrenará de inmediato el modelo LBPH de forma transparente.

### 4. Simulación Integrada en Recepción (Prueba Rápida en 1 Clic)
Si estás exponiendo y no tienes el motor de Python encendido, o si deseas demostrar el flujo en segundos:
1.  Ve a la pestaña **Acceso Recepción**.
2.  Observa el **Panel de Simulación de Recepción** interactivo en la esquina inferior izquierda.
3.  Prueba los tres botones mágicos de demostración:
    *   **Simular Luis Ramos (Solvente)**: El visor disparará su escáner, reproducirá un doble tono armónico y exitoso (`C5` -> `E5`), y el marco de la cámara se iluminará en **verde esmeralda**, mostrando la foto de Luis Ramos y el mensaje **ACCESO PERMITIDO - BIENVENIDO**.
    *   **Simular Carlos Mendoza (Insolvente)**: Si no has registrado su pago, el visor de escaneo disparará una alerta roja parpadeante, reproducirá un zumbido disonante de denegación, el marco se iluminará en **rojo carmesí**, y mostrará la foto del socio y el mensaje **ACCESO DENEGADO - SOCIO INSOLVENTE**.
    *   **Simular Desconocido**: El marco se volverá rojo e indicará **ACCESO DENEGADO - ROSTRO NO REGISTRADO**, ideal para demostrar la seguridad perimetral del establecimiento.
4.  Cualquier acceso simulado o real se registrará automáticamente como bitácora de auditoría en la tabla `registro_asistencias` y se reflejará instantáneamente en los gráficos del Dashboard.

---

## 📂 Estructura de Carpetas

```
sistema_biometria/
├── database/
│   └── schema.sql             # Estructura e índices relacionales de MySQL
├── backend/
│   ├── config/
│   │   └── db.js              # Conector inteligente con auto-creación de BD XAMPP
│   ├── controllers/           # Controladores Express (CRUD, pagos, analíticas, biometría)
│   ├── routes/                # Enrutadores API RESTful
│   ├── uploads/               # Almacenamiento local de fotografías de socios
│   ├── seed.js                # Sembrador inicial de datos demo de Cabimas
│   ├── server.js              # Inicializador del servidor Express
│   └── package.json           # Dependencias de Node (Express, mysql2, cors, multer)
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes interactivos de React (Dashboard, Members, Access)
│   │   ├── App.jsx            # Router, navegación lateral y selector de gimnasios
│   │   ├── main.jsx           # Punto de montaje de React
│   │   └── index.css          # Estilos Vanilla CSS Premium (Glows, Glassmorphism, Laser)
│   ├── vite.config.js         # Configuración de compilador Vite
│   └── package.json           # Dependencias frontend (lucide-react, react-dom)
└── biometrics/
    ├── app.py                 # Motor de Inteligencia Artificial y Flask (LBPH + Haar Cascades)
    └── requirements.txt       # Requisitos de Python (opencv-contrib-python, Flask, numpy)
```

---

---

## 🔐 Control de Acceso Administrativo (Login y Seguridad de la Tesis)

Para garantizar la seguridad de la información del establecimiento y cumplir con las metodologías de seguridad exigidas por los jurados de tesis, hemos implementado una **Compuerta de Autenticación Premium (Login Gate)** con control estricto de roles administrativos y segmentación de sedes.

### 🔑 Credenciales Demo de la Base de Datos (Sembradas)

Al ejecutar `npm run seed`, la base de datos se poblará automáticamente con las siguientes cuentas de demostración listas para interactuar:

| Usuario (`username`) | Contraseña | Rol / Nombre | Sede Asignada | Comportamiento del Selector de Sede |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | **Luis Ramos** (Administrador) | **ExtremoGym** | **Desbloqueado (100% libre)**. Puede alternar entre todas las sedes del Municipio Cabimas para ver estadísticas completas y registrar nuevos socios en cualquier sede. |
| **`recep`** | `recep123` | **María Gómez** (Recepcionista) | **Booster** | **Bloqueado estrictamente**. No puede cambiar de sede. El sistema bloquea el selector y fuerza todos los datos, cobros y check-ins para la sede **Booster Gym**. |
| **`recep2`** | `recep456` | **Carlos Mendoza** (Recepcionista) | **CrunchGym** | **Bloqueado estrictamente**. Solo tiene visibilidad y acciones operativas dentro de **CrunchGym**. |

> [!TIP]
> **Consola de Demostración en 1 Clic**: La pantalla de Login incluye dos botones interactivos en la parte inferior ("Luis Ramos" y "María Gómez"). Al hacer clic en cualquiera de ellos, las credenciales se auto-completan e inician sesión instantáneamente, agilizando tu presentación ante el jurado sin tener que escribir en el teclado.

---

## 🧪 Pasos para Probar y Demostrar el Sistema de Tesis

Una vez que tengas **MySQL activo en tu Panel de Control de XAMPP**, sigue este flujo exacto para deslumbrar en tu defensa:

### 1. Inicializar la Base de Datos
En la terminal de la carpeta `backend`, corre el seeder para restaurar la base de datos limpia con los 5 socios segmentados por sede y los usuarios administrativos:
```powershell
npm run seed
```

### 2. Iniciar los Servidores
*   En la terminal del **Backend** (`backend`):
    ```powershell
    npm run dev
    ```
*   En la terminal del **Frontend** (`frontend`):
    ```powershell
    npm run dev
    ```

### 3. Prueba A: Demostración de Recepcionista (Seguridad y Segmentación de Datos)
1.  Abre `http://localhost:5173`. Verás la pantalla oscura futurista de login.
2.  Haz clic en el botón de la consola de demostración: **"María Gómez (Recepcionista)"**.
3.  El portal iniciará sesión de forma inmediata y elegante:
    *   **Selector de Sede**: Observa que el dropdown arriba a la derecha está en gris oscuro (`disabled`) y bloqueado en **Booster Gym**. El cursor cambia a "no permitido" si pasas el ratón.
    *   **Socios de Booster**: Ve a **Gestión de Socios**. Notarás que solo aparecen **María Gómez** e **José Chirinos** (los únicos socios asignados a la sede Booster por el seeder). ¡No hay filtraciones de datos de ExtremoGym ni CrunchGym!
    *   **Acceso en Booster**: Ve a **Acceso Recepción**. Si simulas el acceso de **María Gómez**, se validará correctamente en Booster y se registrará en la base de datos bajo esta sede.
    *   **Estadísticas Segmentadas**: Ve al **Dashboard Analítico**. El total facturado y los contadores representan únicamente el balance del gimnasio Booster.

### 4. Prueba B: Demostración de Administrador (Supervisión y Control Total)
1.  Haz clic en el botón rojo brillante de **Cerrar Sesión** en el pie de la barra lateral.
2.  De vuelta en el login, haz clic en **"Luis Ramos (Administrador)"**.
3.  Verás los siguientes privilegios desbloqueados:
    *   **Selector Libre**: El selector de sedes en la cabecera ahora está activo y desbloqueado.
    *   **Monitoreo Multisede**: Haz clic en el selector y cambia a **CrunchGym**. Observa cómo los ingresos cambian instantáneamente, el historial de horas pico se re-escala matemáticamente para mostrar el flujo de CrunchGym, y los accesos en vivo se actualizan solos en 0.1 segundos.
    *   **Gestión Global**: Ve a **Gestión de Socios**. Selecciona la sede **CrunchGym**: verás que solo aparece **Carlos Mendoza** (socio insolvente de CrunchGym). Cambia la sede activa a **ExtremoGym**: verás a **Luis Ramos** y **Ana Sánchez**.
    *   **Inscripción en Sede Activa**: Si cambias a CrunchGym y registras un "Nuevo Socio", el backend guardará su cédula asignándolo automáticamente a CrunchGym de forma inteligente.

---

## 🎓 Agradecimientos Académicos

Este software ha sido diseñado con dedicación bajo el amparo metodológico de la Programación Extrema (XP) y en línea con el área de Cibernética del **Instituto Universitario Politécnico "Santiago Mariño"** para potenciar el sector empresarial y tecnológico del Municipio Cabimas, Estado Zulia.
