/**
 * EcoFlux — Controlador de Navegación e Interacción de Diapositivas
 * Soporte para teclado, clic, barra de progreso y pantalla completa.
 */

import { triggerChartAnimation } from './charts.js';

class SlideDeck {
  constructor() {
    this.slides = Array.from(document.querySelectorAll('.slide'));
    this.totalSlides = this.slides.length;
    this.currentIndex = 0; // 0-based index

    this.progressBar = document.getElementById('progress-bar');
    this.slideCounter = document.getElementById('slide-counter');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnFullscreen = document.getElementById('btn-fullscreen');

    this.init();
  }

  init() {
    this.bindEvents();
    this.showSlide(0);
  }

  bindEvents() {
    // Eventos de teclado
    window.addEventListener('keydown', (e) => {
      // Evitar colisiones si el foco está en un input (por si acaso)
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ': // Espacio
        case 'Enter':
          e.preventDefault();
          this.nextSlide();
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
          e.preventDefault();
          this.prevSlide();
          break;

        case 'Home':
          e.preventDefault();
          this.showSlide(0);
          break;

        case 'End':
          e.preventDefault();
          this.showSlide(this.totalSlides - 1);
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          this.toggleFullscreen();
          break;
      }
    });

    // Controles en pantalla
    this.btnPrev?.addEventListener('click', () => this.prevSlide());
    this.btnNext?.addEventListener('click', () => this.nextSlide());
    this.btnFullscreen?.addEventListener('click', () => this.toggleFullscreen());

    // Clic en la diapositiva para avanzar (excluyendo clics en botones o interactivos)
    document.getElementById('presentation-viewport')?.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.interactive-item')) {
        return;
      }
      // Si se hace clic en el tercio izquierdo, retrocede; si no, avanza
      const clickX = e.clientX;
      const screenWidth = window.innerWidth;
      if (clickX < screenWidth * 0.25) {
        this.prevSlide();
      } else {
        this.nextSlide();
      }
    });

    // Actualizar icono de pantalla completa al cambiar estado nativo
    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      if (this.btnFullscreen) {
        this.btnFullscreen.innerHTML = isFs
          ? '<i class="fa-solid fa-compress text-sm"></i>'
          : '<i class="fa-solid fa-expand text-sm"></i>';
      }
    });
  }

  showSlide(index) {
    if (index < 0 || index >= this.totalSlides) return;

    // Desactivar diapositiva previa
    this.slides.forEach((slide, i) => {
      if (i === index) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    this.currentIndex = index;
    const slideNumber = index + 1;

    // Actualizar UI de navegación
    if (this.slideCounter) {
      this.slideCounter.textContent = `${slideNumber} / ${this.totalSlides}`;
    }

    if (this.progressBar) {
      const progressPercent = (slideNumber / this.totalSlides) * 100;
      this.progressBar.style.width = `${progressPercent}%`;
    }

    if (this.btnPrev) {
      this.btnPrev.disabled = index === 0;
    }
    if (this.btnNext) {
      this.btnNext.disabled = index === this.totalSlides - 1;
    }

    // Disparar renderizado/animaciones de KaTeX
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(this.slides[index], {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('Error al procesar KaTeX:', err);
      }
    }

    // Disparar animaciones de gráficos en charts.js
    triggerChartAnimation(slideNumber);
  }

  nextSlide() {
    if (this.currentIndex < this.totalSlides - 1) {
      this.showSlide(this.currentIndex + 1);
    }
  }

  prevSlide() {
    if (this.currentIndex > 0) {
      this.showSlide(this.currentIndex - 1);
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error al activar pantalla completa: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
}

// Inicializar la presentación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  new SlideDeck();
});
