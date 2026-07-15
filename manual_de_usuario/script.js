// ==========================================================================
// LÓGICA DE CONTROL E INTERACTIVIDAD: MANUALES DEL SISTEMA BIOMÉTRICO
// Navegación de Diapositivas, Atajos de Teclado y Placeholders
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    let currentSlide = 1;
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    const thumbs = document.querySelectorAll('.thumb-btn');
    
    // Elementos del DOM
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const slideIndicator = document.getElementById('slideIndicator');
    const progressBarFill = document.getElementById('progressBarFill');
    const viewModeToggle = document.getElementById('viewModeToggle');
    const pdfExportBtn = document.getElementById('pdfExportBtn');
    const keyboardHint = document.getElementById('keyboardHint');
    const closeHintBtn = document.getElementById('closeHintBtn');

    // ── MOSTRAR DIAPOSITIVA ESPECÍFICA ──
    function goToSlide(slideIndex) {
        if (slideIndex < 1) slideIndex = 1;
        if (slideIndex > totalSlides) slideIndex = totalSlides;
        
        currentSlide = slideIndex;

        // Si estamos en modo impresión, no hacemos cambio de clases de diapositiva activa
        if (document.body.classList.contains('print-mode')) return;

        // Desactivar diapositiva y miniatura previas
        document.querySelector('.slide.active')?.classList.remove('active');
        document.querySelector('.thumb-btn.active')?.classList.remove('active');

        // Activar diapositiva y miniatura correspondiente
        const targetSlide = document.getElementById(`slide-${currentSlide}`);
        if (targetSlide) {
            targetSlide.classList.add('active');
        }

        const targetThumb = document.querySelector(`.thumb-btn[data-slide="${currentSlide}"]`);
        if (targetThumb) {
            targetThumb.classList.add('active');
            // Centrar horizontalmente en la barra de miniaturas si es necesario
            targetThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // Actualizar barra de progreso e indicador
        const progressPercentage = (currentSlide / totalSlides) * 100;
        progressBarFill.style.width = `${progressPercentage}%`;
        slideIndicator.textContent = `Diapositiva ${currentSlide} de ${totalSlides}`;

        // Habilitar/Deshabilitar botones en los extremos
        prevBtn.disabled = currentSlide === 1;
        nextBtn.textContent = currentSlide === totalSlides ? 'Finalizar' : 'Siguiente →';
        prevBtn.style.opacity = currentSlide === 1 ? '0.5' : '1';
        prevBtn.style.cursor = currentSlide === 1 ? 'not-allowed' : 'pointer';
    }

    // ── NAVEGACIÓN DIAPOSITIVA SIGUIENTE/ANTERIOR ──
    function nextSlide() {
        if (currentSlide < totalSlides) {
            goToSlide(currentSlide + 1);
        } else {
            // Detectar el tipo de manual mediante el título
            const isUserManual = document.title.toLowerCase().includes('usuario');
            const manualText = isUserManual ? 'Manual de Usuario' : 'Manual de Instalación';
            alert(`¡Has completado el ${manualText} del Sistema Biométrico! Ahora puedes exportarlo a PDF o navegar por el otro manual utilizando las pestañas superiores.`);
        }
    }

    function prevSlide() {
        if (currentSlide > 1) {
            goToSlide(currentSlide - 1);
        }
    }

    // Eventos de botones de navegación
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);

    // Eventos de botones de miniaturas
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', (e) => {
            const slideNum = parseInt(e.currentTarget.getAttribute('data-slide'));
            goToSlide(slideNum);
        });
    });

    // ── ATAJOS DE TECLADO (Navegación Intuitiva) ──
    document.addEventListener('keydown', (e) => {
        // Ignorar si el usuario está en modo impresión
        if (document.body.classList.contains('print-mode')) return;

        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault(); // Evitar scroll de la barra espaciadora
            nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
            e.preventDefault();
            prevSlide();
        }
    });

    // ── MODO IMPRESIÓN (Lista Continua) ──
    viewModeToggle.addEventListener('click', () => {
        const isPrintMode = document.body.classList.toggle('print-mode');
        
        if (isPrintMode) {
            viewModeToggle.innerHTML = '<span class="icon">🎴</span> Vista Diapositivas';
            viewModeToggle.title = "Cambiar a vista de diapositivas interactivas";
            // Activar todos los slides para lectura secuencial
            slides.forEach(slide => slide.classList.add('active'));
        } else {
            viewModeToggle.innerHTML = '<span class="icon">📋</span> Vista Lista';
            viewModeToggle.title = "Cambiar a vista de lista continua";
            goToSlide(currentSlide); // Restaurar diapositiva activa
        }
    });

    // ── EVENTO DE EXPORTACIÓN A PDF ──
    pdfExportBtn.addEventListener('click', () => {
        alert('Instrucciones para generar el PDF de alta calidad:\n\n1. En la ventana de impresión, selecciona como destino: "Guardar como PDF".\n2. En la opción "Orientación", selecciona: "Horizontal" (Landscape).\n3. Abre "Más opciones / Más ajustes" y marca la casilla "Gráficos de fondo" (Background graphics) para que los colores salgan perfectos.\n4. En la opción "Márgenes", selecciona "Ninguno" para un encuadre exacto.');
        window.print();
    });

    // ── CONTROL DE INSTRUCCIONES DE TECLADO ──
    if (closeHintBtn) {
        closeHintBtn.addEventListener('click', () => {
            keyboardHint.classList.add('hidden');
        });
    }

    // Ocultar hint de teclado automáticamente tras 8 segundos
    setTimeout(() => {
        keyboardHint?.classList.add('hidden');
    }, 8000);

    // Inicializar primera diapositiva
    goToSlide(1);
});

// ── REEMPLAZAR IMÁGENES FALTANTES POR UN CONTROL DE INDICACIONES (PLACEHOLDER) ──
window.showPlaceholder = function(imgElement, filename, description) {
    const parentContainer = imgElement.parentElement;
    
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-img';
    placeholder.innerHTML = `
        <div class="placeholder-icon">📸</div>
        <h4>Captura de pantalla requerida</h4>
        <p class="placeholder-text-desc">${description}</p>
        <div class="placeholder-filename">manual_de_usuario/assets/images/${filename}</div>
        <p class="placeholder-text-tip">Guarda tu captura en esta ruta con este nombre exacto para verla aquí.</p>
    `;
    
    parentContainer.innerHTML = '';
    parentContainer.appendChild(placeholder);
};

// ── REEMPLAZAR LOGOTIPO DE NAVEGADOR FALTANTE CON EMOJI DE RESPALDO ──
window.showBrowserLogoPlaceholder = function(imgElement, name, fallbackEmoji) {
    const spanIcon = document.createElement('span');
    spanIcon.className = 'b-icon-large';
    spanIcon.style.fontSize = '32px';
    spanIcon.style.marginBottom = '4px';
    spanIcon.textContent = fallbackEmoji;
    imgElement.replaceWith(spanIcon);
};
