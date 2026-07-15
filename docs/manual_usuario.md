# MANUAL DE USUARIO Y ADMINISTRADOR
## Sistema de Gestión y Control de Acceso Biométrico Fácil - Ramos Gym
**Autor:** Br. Luis Ramos  
**Ubicación:** Cabimas, Estado Zulia  
**Fecha:** Abril 2026  

---

## 1. Introducción y Arquitectura Tecnológica
Este manual proporciona las directrices detalladas para la instalación, configuración, puesta en marcha y operación del **Sistema de Gestión y Control de Acceso Biométrico Fácil**. La plataforma ha sido diseñada bajo una arquitectura distribuida de tres capas (Frontend, Backend y Motor de IA) para garantizar la optimización de procesos en los centros deportivos del municipio Cabimas.

### Arquitectura de Tres Capas:
1. **Interfaz de Usuario (Frontend):** Desarrollada en **React.js + Vite**. Proporciona pantallas reactivas, animación del visor de cámara en vivo y retroalimentación sonora/visual instantánea.
2. **Servidor API REST (Backend):** Desarrollado en **Node.js + Express**. Gestiona la lógica de negocios, la conexión con la base de datos relacional y expone las rutas REST.
3. **Motor de Visión Artificial (IA):** Desarrollado en **Python + Flask + OpenCV**. Encargado de la detección de rostros mediante clasificadores **Haar Cascade** y el reconocimiento/extracción de patrones biométricos con **LBPH (Local Binary Patterns Histograms)**.
4. **Base de Datos (Almacenamiento):** Servidor **MySQL** (bajo entorno XAMPP) para persistir datos administrativos, financieros, registros de auditoría y rutas de patrones biométricos.

---

## 2. Requisitos y Preparación del Entorno

### Requisitos de Hardware Mínimos:
* **Procesador:** Intel Core i3 (4ta gen) / AMD Ryzen 3 o superior.
* **Memoria RAM:** 8 GB.
* **Cámara Web:** Resolución mínima de 720p (HD) con conexión USB.
* **Red:** Conectividad LAN/Intranet local activa.

### Requisitos de Software:
* **Sistema Operativo:** Windows 10 u 11 (64 bits).
* **Entorno Servidor:** XAMPP (Apache y MySQL activos).
* **Entornos de Ejecución:**
  * Node.js (Versión LTS 18 o superior).
  * Python (Versión 3.9 o superior).
* **Dependencias de Python:** OpenCV-Python, Flask, Flask-Cors, Numpy.

---

## 3. Puesta en Marcha (Instalación e Inicio)

### Paso 1: Configuración de la Base de Datos
1. Inicie el panel de control de **XAMPP**.
2. Arranque los módulos **Apache** y **MySQL** haciendo clic en sus botones "Start".
3. Abra su navegador e ingrese a `http://localhost/phpmyadmin`.
4. Cree una nueva base de datos llamada `ramos_gym` (o el nombre definido en el `.env`).
5. Importe el archivo SQL de respaldo ubicado en la carpeta `database/` del proyecto.
6. Si es la primera ejecución, puede correr el sembrador de datos ejecutando `node seed.js` en la consola del backend.

### Paso 2: Ejecución del Sistema Completo
Para agilizar el arranque del ecosistema tecnológico, se ha provisto el script de automatización `iniciar_sistema.bat` en la raíz del proyecto.

1. Haga doble clic sobre el archivo [iniciar_sistema.bat](file:///f:/Luis%20Ramos/sistema_biometria/iniciar_sistema.bat).
2. El script abrirá tres ventanas de consola independientes en segundo plano:
   * **Consola 1 (Verde):** Servidor Frontend (Vite) en `http://localhost:5173`.
   * **Consola 2 (Amarilla):** Servidor Backend (Node.js) en el puerto `3000`.
   * **Consola 3 (Púrpura):** Motor de IA Facial (Python) en el puerto `5000`.
3. Abra su navegador web e ingrese a la dirección: `http://localhost:5173`.

> [!IMPORTANT]
> Mantenga abiertas las tres consolas de comando durante toda la sesión de trabajo. Si cierra alguna de ellas, el módulo correspondiente dejará de funcionar.

---

## 4. Manual de Operación para el Recepcionista (Operador)

El personal de recepción es el encargado directo de gestionar el flujo de socios y sus transacciones financieras del día a día.

### 4.1. Acceso al Sistema (Login)
1. Al cargar la plataforma, visualizará la pantalla de **Login**.
2. Ingrese su Nombre de Usuario y Contraseña.
3. Si está en etapa de demostración o pruebas rápidas, use los botones de **Simulación Rápida** en la zona inferior para iniciar sesión con un solo clic.
4. Tras validarse, el sistema lo redireccionará al Dashboard correspondiente a su sede asignada.

---

### 4.2. Registro y Enrolamiento Facial de Socios (Módulo de Clientes)

Para que un socio pueda acceder por biometría, primero debe ser registrado y su rostro debe ser entrenado en el motor de IA.

```
       [Menú Clientes] -> [Registrar Nuevo Socio]
                              |
                     [Llenar Datos Físicos]
                              |
                    [Abrir Cámara de Enrolamiento]
                              |
  +---------------------------+---------------------------+
  |                           |                           |
[Paso 1: Frente]   [Paso 2: Perfil Izquierdo]  [Paso 3: Perfil Derecho]
  |                           |                           |
  +---------------------------+---------------------------+
                              |
                    [Guardar y Entrenar IA]
```

#### Paso 4.2.1: Registro de Datos Básicos
1. Diríjase a **Socios** en el menú lateral izquierdo.
2. Haga clic en el botón **"Nuevo Socio"**.
3. Complete el formulario con la Cédula, Nombre completo, Teléfono, Correo electrónico y seleccione el estatus inicial.

#### Paso 4.2.2: Captura Biométrica Angular (Tres Poses)
1. En la ficha del socio, localice y presione el botón **"Enrolar Rostro"** para desplegar la interfaz de cámara.
2. **Postura 1 (Frente):** Indique al socio que mire fijamente a la cámara con una expresión neutra. Presione **"Capturar Frente"**.
3. **Postura 2 (Perfil Izquierdo):** Indique al socio que gire levemente su cabeza unos 45 grados hacia la izquierda. Presione **"Capturar Perfil Izquierdo"**.
4. **Postura 3 (Perfil Derecho):** Indique al socio que gire la cabeza unos 45 grados hacia la derecha. Presione **"Capturar Perfil Derecho"**.
5. Verifique que las tres imágenes capturadas sean nítidas y que el recuadro verde confirme la detección del rostro en cada pose.
6. Presione el botón **"Confirmar y Entrenar"**. 

> [!TIP]
> El motor de IA iniciarás automáticamente el re-entrenamiento del clasificador LBPH en segundo plano. Este proceso toma entre 2 y 5 segundos, actualizando inmediatamente el modelo matemático `model.yml` sin necesidad de reiniciar el sistema.

---

### 4.3. Cobro de Mensualidades y Facturación

El estatus de solvencia determina si el sistema autoriza o rechaza el ingreso en la puerta.

1. Ingrese al módulo de **Facturación o Pagos** en la barra lateral.
2. Busque al socio por su número de Cédula o Nombre.
3. El sistema cargará automáticamente los detalles de su membresía y mostrará su deuda actual.
4. **Registrar Pago:**
   * Ingrese el Monto transado.
   * Seleccione la Moneda (USD / Bs.).
   * Si es en bolívares, el sistema consumirá la tasa de cambio del día para reflejar el valor neto en dólares.
   * Seleccione el Método de Pago (Pago Móvil, Transferencia, Efectivo, Punto de Venta).
   * Registre el código de Referencia bancaria si aplica.
5. Haga clic en **"Procesar Pago"**.
6. **Efecto Inmediato:** El estado financiero del socio cambiará instantáneamente a **"Solvente"** en la base de datos, y su fecha de vencimiento se extenderá por 30 días calendario.

---

### 4.4. Operación del Kiosko de Control de Acceso

El Kiosko se sitúa en la entrada del gimnasio y opera a pantalla completa de manera automatizada.

1. Desde el menú superior, presione el botón **"Modo Kiosko"**.
2. Asegúrese de que la cámara de la entrada esté conectada y seleccionada.
3. **Operación en Vivo:**
   * El socio se sitúa frente a la cámara (distancia recomendada: 50 cm a 1 metro).
   * El visor digital de la interfaz dibujará dinámicamente un recuadro de enfoque sobre el rostro detectado.
   * El sistema evaluará el patrón facial en el motor de IA en milisegundos.
4. **Interpretación de Estados Lógicos de Entrada:**

| Estado en Pantalla | Color del Marco | Sonido Emitido | Acción Requerida / Significado |
| :--- | :--- | :--- | :--- |
| **Acceso Autorizado** | Verde Esmeralda | Chime Armónico | El socio está registrado y solvente. Se registra la asistencia en BD y se le permite el ingreso. |
| **Acceso Denegado: Insolvente** | Rojo Carmesí | Zumbido Grave | Socio registrado en BD pero con deuda vencida. Se le invita a pasar por administración a regularizar su pago. |
| **Acceso Denegado: Desconocido** | Rojo Carmesí | Zumbido Grave | Rostro no registrado en el sistema. Se le invita a registrarse. |

> [!NOTE]
> En caso de fallas de la cámara o iluminación deficiente, el Kiosko cuenta con un **Panel Simulador Lateral** donde el recepcionista puede introducir manualmente la cédula del socio para autorizar el paso rápidamente sin interrumpir el flujo.

---

## 5. Manual de Operación para el Administrador (Gerente)

El perfil de Administrador cuenta con accesos totales e ilimitados para la toma de decisiones, control del personal, auditoría e ingresos de datos críticos.

### 5.1. Dashboard y Métricas de Negocio
El panel de inicio ofrece al gerente una visión global y en tiempo real:
* **Tarjetas Dinámicas:** Muestran el número total de Socios Activos, socios actualmente insolventes y la Recaudación Financiera neta del día.
* **Gráfico de Afluencia Horaria:** Procesa las horas de entrada de los socios para trazar una curva de tráfico, identificando las horas pico de afluencia. Permite coordinar la cantidad de instructores necesarios en el recinto según la hora.

---

### 5.2. Módulo de Auditoría y Bitácora
Esencial para velar por la seguridad y auditar transacciones.
1. Ingrese a **Auditoría e Historial**.
2. Filtre los registros mediante los selectores de **Fecha de Inicio** y **Fecha de Fin**.
3. **Consulta de Asistencias:** Muestra el listado de accesos autorizados con foto, hora y fecha exacta.
4. **Bitácora de Intentos Fallidos:** Muestra los eventos de rostros desconocidos o denegados, detallando la fecha, la justificación de rechazo (ej. "Socio Insolvente" o "Rostro No Registrado") y la imagen capturada por la cámara de seguridad en ese instante.

---

### 5.3. Gestión Financiera de Gastos y Egresos
1. Diríjase a **Gastos / Egresos** en el menú.
2. Haga clic en **"Registrar Gasto"**.
3. Defina el Título (ej. "Pago de Servicio Eléctrico", "Mantenimiento de Máquinas"), el Monto, la Categoría del egreso y la fecha.
4. **Balance Neto de Recaudación:** El sistema restará el acumulado de egresos de la recaudación por membresías, entregando un reporte financiero neto de la utilidad del centro deportivo en tiempo real.

---

### 5.4. Control de Personal y Nómina
1. Ingrese a **Personal y Nómina**.
2. Registre a los instructores, entrenadores personales y staff del gimnasio.
3. Configure su Salario base y Turno de trabajo.
4. El sistema calculará el valor de su nómina a pagar consumiendo de forma directa la tasa de cambio oficial configurada, lo que previene desajustes por devaluación.

---

### 5.5. Configuración de Seguridad y Sucursales (RBAC)
Para resguardar los datos del negocio, el sistema implementa **Control de Acceso Basado en Roles (RBAC)**.
1. Diríjase a **Configuración de Seguridad**.
2. **Crear / Editar Cuentas:** Cree accesos para los recepcionistas definiendo su Rol ("Administrador" o "Recepcionista").
3. **Segmentación por Sede:** Asigne una sede física obligatoria para la cuenta (Booster, ExtremoGym, CrunchGym). Al iniciar sesión, el recepcionista solo podrá ver los socios, asistencias y finanzas de la sucursal asignada. El Administrador, en cambio, posee un selector para conmutar y auditar todas las sedes de forma centralizada.

---

### 5.6. Configuración General del Sistema
Parámetros globales indispensables para el backend.
1. Ingrese a **Configuración**.
2. **Tasa de Cambio:** Actualice la tasa de cambio oficial (Bs. por USD). Todos los cobros en bolívares se calcularán en base a este valor.
3. **Precio de Membresía:** Defina el costo mensual de la afiliación al gimnasio.
4. Presione **"Guardar Parámetros"** para aplicar los cambios de inmediato en toda la plataforma.

---

## 6. Guía de Solución de Problemas (Troubleshooting)

### 6.1. La cámara no enciende en la pantalla de Enrolamiento o Kiosko
1. Verifique que el cable USB de la cámara esté firmemente conectado a la computadora.
2. Asegúrese de que no haya otro programa (Zoom, Teams, Skype, etc.) utilizando la cámara web en ese momento.
3. En la interfaz de captura del sistema, despliegue el selector de dispositivos de video en la esquina superior derecha y conmute de cámara hasta visualizar la transmisión.
4. Asegúrese de otorgar permisos de cámara en el navegador web si este los solicita en la barra de direcciones.

### 6.2. El Kiosko no detecta el rostro del socio
* **Iluminación:** Asegúrese de que el rostro del socio esté bien iluminado. Evite luces intensas directamente a espaldas del socio (contraluz).
* **Posición:** El socio debe mirar al frente del lente y mantenerse quieto durante 1 segundo a una distancia de entre 50 cm y 1 metro.
* **Gafas o Accesorios:** Si el socio fue enrolado sin gafas, gorras o tapabocas, se recomienda que pase la verificación sin estos accesorios para evitar distorsiones en los histogramas de vectores de LBPH.

### 6.3. Mensaje de error: "Error de comunicación con el motor biométrico"
1. Verifique si la consola del **Motor Biométrico (Python IA)** se ha cerrado.
2. Si está cerrada, ejecute nuevamente el comando `python app.py` dentro de la carpeta `biometrics/` o ejecute el archivo `iniciar_sistema.bat`.
3. Verifique que no haya ningún otro programa ocupando el puerto `5000` en su computadora.

### 6.4. El sistema no guarda datos o muestra error en el registro
1. Verifique en el panel de control de **XAMPP** que el módulo **MySQL** esté en estatus activo ("Green").
2. Si MySQL se detiene inesperadamente, verifique el espacio en disco o si el puerto `3306` está ocupado por otra instancia de base de datos.
