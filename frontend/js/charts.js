/**
 * ============================================================================
 * EcoFlux — Módulo de Renderizado y Visualización de Gráficas
 * Módulo: charts.js
 * 
 * Gestiona dos instancias de Chart.js 4.x con diseño científico dark-mode:
 * 1. Gráfica de Serie Temporal (Evolución de poblaciones vs Tiempo)
 * 2. Gráfica de Espacio de Fases (Retrato de fase, trayectorias orbitales y equilibrios)
 * ============================================================================
 */

let timeSeriesChartInstance = null;
let phaseSpaceChartInstance = null;

/**
 * Paleta de colores científicos de alta visibilidad para modo oscuro.
 */
const PALETTE = {
  prey: '#10b981',         // Esmeralda vibrante
  preyFill: 'rgba(16, 185, 129, 0.12)',
  preyEquilibrium: 'rgba(16, 185, 129, 0.65)',
  
  predator: '#f43f5e',     // Coral / Rosa intenso
  predatorFill: 'rgba(244, 63, 94, 0.12)',
  predatorEquilibrium: 'rgba(244, 63, 94, 0.65)',
  
  phaseOrbit: '#38bdf8',   // Cian brillante para órbita cerrada
  phaseStart: '#facc15',   // Ámbar para estado inicial (x0, y0)
  phaseEquilibrium: '#c084fc', // Púrpura brillante para centro (x*, y*)
  
  textMuted: '#94a3b8',
  textLight: '#f1f5f9',
  gridLines: 'rgba(51, 65, 85, 0.35)',
  cardBg: '#0f172a'
};

/**
 * Obtiene la referencia global de Chart.js cargada desde CDN.
 */
function getChartConstructor() {
  if (typeof window !== 'undefined' && window.Chart) {
    return window.Chart;
  }
  throw new Error('Chart.js no está cargado en el entorno global (window.Chart).');
}

/**
 * Crea un gradiente vertical sutil en el contexto del canvas para un relleno estético.
 */
function createGradient(ctx, colorRgbaTop, colorRgbaBottom = 'rgba(15, 23, 42, 0)') {
  if (!ctx) return colorRgbaTop;
  const gradient = ctx.createLinearGradient(0, 0, 0, 350);
  gradient.addColorStop(0, colorRgbaTop);
  gradient.addColorStop(1, colorRgbaBottom);
  return gradient;
}

/**
 * Inicializa ambas gráficas configurando sus escalas, leyendas y temas oscuros.
 * 
 * @param {Object} [options] Opciones iniciales de visualización
 */
export function inicializarGraficas(options = {}) {
  const Chart = getChartConstructor();

  const canvasTime = document.getElementById('timeSeriesChart');
  const canvasPhase = document.getElementById('phaseSpaceChart');

  if (!canvasTime || !canvasPhase) {
    console.warn('Los elementos canvas de las gráficas no se encontraron en el DOM.');
    return;
  }

  // Destruir instancias previas si existiesen
  destruirGraficas();

  const ctxTime = canvasTime.getContext('2d');
  const ctxPhase = canvasPhase.getContext('2d');

  // =========================================================================
  // 1. CONFIGURACIÓN: SERIE TEMPORAL
  // =========================================================================
  timeSeriesChartInstance = new Chart(ctxTime, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Presas (x)',
          data: [],
          borderColor: PALETTE.prey,
          backgroundColor: createGradient(ctxTime, PALETTE.preyFill),
          fill: true,
          tension: 0.25,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: PALETTE.prey,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
          order: 2
        },
        {
          label: 'Depredadores (y)',
          data: [],
          borderColor: PALETTE.predator,
          backgroundColor: createGradient(ctxTime, PALETTE.predatorFill),
          fill: true,
          tension: 0.25,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: PALETTE.predator,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
          order: 3
        },
        {
          label: 'Equilibrio Presas (x*)',
          data: [],
          borderColor: PALETTE.preyEquilibrium,
          borderDash: [6, 6],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          order: 4
        },
        {
          label: 'Equilibrio Depred. (y*)',
          data: [],
          borderColor: PALETTE.predatorEquilibrium,
          borderDash: [6, 6],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          order: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 750,
        easing: 'easeOutQuart'
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: PALETTE.textLight,
            font: { family: 'Inter', size: 11, weight: '500' },
            boxWidth: 14,
            boxHeight: 8,
            usePointStyle: true,
            filter: (item) => !item.text.includes('Equilibrio') || options.showEquilibriumTime !== false
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#ffffff',
          titleFont: { family: 'Outfit', size: 12, weight: 'bold' },
          bodyColor: PALETTE.textLight,
          bodyFont: { family: 'JetBrains Mono', size: 11 },
          borderColor: 'rgba(51, 65, 85, 0.8)',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          boxPadding: 4,
          callbacks: {
            title: (items) => `Tiempo t = ${Number(items[0]?.parsed?.x ?? 0).toFixed(2)}`,
            label: (item) => {
              const val = Number(item.parsed.y).toFixed(2);
              return ` ${item.dataset.label}: ${val} individuos`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Tiempo transcurrido (t)',
            color: PALETTE.textMuted,
            font: { family: 'Inter', size: 11, weight: '500' }
          },
          grid: {
            color: options.showGridTime !== false ? PALETTE.gridLines : 'transparent',
            drawBorder: false
          },
          ticks: {
            color: PALETTE.textMuted,
            font: { family: 'JetBrains Mono', size: 10 }
          }
        },
        y: {
          title: {
            display: true,
            text: 'Cantidad de individuos',
            color: PALETTE.textMuted,
            font: { family: 'Inter', size: 11, weight: '500' }
          },
          grid: {
            color: options.showGridTime !== false ? PALETTE.gridLines : 'transparent',
            drawBorder: false
          },
          ticks: {
            color: PALETTE.textMuted,
            font: { family: 'JetBrains Mono', size: 10 }
          },
          beginAtZero: true
        }
      }
    }
  });

  // =========================================================================
  // 2. CONFIGURACIÓN: ESPACIO DE FASES (RETRATO DE FASE)
  // =========================================================================
  phaseSpaceChartInstance = new Chart(ctxPhase, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Órbita Periódica (x vs y)',
          data: [],
          borderColor: PALETTE.phaseOrbit,
          backgroundColor: 'transparent',
          borderWidth: 2,
          showLine: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: PALETTE.phaseOrbit,
          order: 3
        },
        {
          label: 'Estado Inicial (x₀, y₀)',
          data: [],
          backgroundColor: PALETTE.phaseStart,
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 7,
          pointHoverRadius: 9,
          pointStyle: 'circle',
          showLine: false,
          order: 1
        },
        {
          label: 'Punto de Equilibrio (x*, y*)',
          data: [],
          backgroundColor: PALETTE.phaseEquilibrium,
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'rectRot',
          showLine: false,
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 750,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: PALETTE.textLight,
            font: { family: 'Inter', size: 11, weight: '500' },
            boxWidth: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#ffffff',
          titleFont: { family: 'Outfit', size: 12, weight: 'bold' },
          bodyColor: PALETTE.textLight,
          bodyFont: { family: 'JetBrains Mono', size: 11 },
          borderColor: 'rgba(51, 65, 85, 0.8)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (item) => {
              const xVal = Number(item.parsed.x).toFixed(2);
              const yVal = Number(item.parsed.y).toFixed(2);
              return `${item.dataset.label}: Presas=${xVal}, Depredadores=${yVal}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Población de Presas (x)',
            color: PALETTE.prey,
            font: { family: 'Inter', size: 11, weight: '600' }
          },
          grid: {
            color: options.showGridPhase !== false ? PALETTE.gridLines : 'transparent',
            drawBorder: false
          },
          ticks: {
            color: PALETTE.textMuted,
            font: { family: 'JetBrains Mono', size: 10 }
          },
          beginAtZero: true
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'Población de Depredadores (y)',
            color: PALETTE.predator,
            font: { family: 'Inter', size: 11, weight: '600' }
          },
          grid: {
            color: options.showGridPhase !== false ? PALETTE.gridLines : 'transparent',
            drawBorder: false
          },
          ticks: {
            color: PALETTE.textMuted,
            font: { family: 'JetBrains Mono', size: 10 }
          },
          beginAtZero: true
        }
      }
    }
  });
}

/**
 * Actualiza los datos de ambas gráficas de forma eficiente.
 * 
 * @param {Array<Object>} serie Lista de puntos { tiempo, presas, depredadores }
 * @param {Object} params Parámetros de la simulación
 * @param {Object} estadisticas Estadísticas calculadas (máximos, mínimos, equilibrios)
 * @param {Object} [visualOptions] Opciones de visualización (mostrar cuadrículas, equilibrios)
 */
export function actualizarGraficas(serie, params, estadisticas, visualOptions = {}) {
  if (!Array.isArray(serie) || serie.length === 0) return;

  if (!timeSeriesChartInstance || !phaseSpaceChartInstance) {
    inicializarGraficas(visualOptions);
  }

  const showGridTime = visualOptions.showGridTime ?? true;
  const showEquilibriumTime = visualOptions.showEquilibriumTime ?? true;
  const showGridPhase = visualOptions.showGridPhase ?? true;

  const tMax = serie[serie.length - 1].tiempo;
  const eqX = Number(estadisticas?.puntoEquilibrioPresas ?? 0);
  const eqY = Number(estadisticas?.puntoEquilibrioDepredadores ?? 0);

  // Mapeo optimizado de pares { x, y } para Chart.js
  const datosPresas = new Array(serie.length);
  const datosDepredadores = new Array(serie.length);
  const trayectoriaOrbital = new Array(serie.length);

  for (let i = 0; i < serie.length; i++) {
    const pt = serie[i];
    datosPresas[i] = { x: pt.tiempo, y: pt.presas };
    datosDepredadores[i] = { x: pt.tiempo, y: pt.depredadores };
    trayectoriaOrbital[i] = { x: pt.presas, y: pt.depredadores };
  }

  // =========================================================================
  // 1. ACTUALIZAR SERIE TEMPORAL
  // =========================================================================
  if (timeSeriesChartInstance) {
    const ds = timeSeriesChartInstance.data.datasets;

    // Actualizar etiquetas dinámicas con los nombres de las especies
    ds[0].label = `${params.nombrePresa || 'Presas'} (x)`;
    ds[0].data = datosPresas;

    ds[1].label = `${params.nombreDepredador || 'Depredadores'} (y)`;
    ds[1].data = datosDepredadores;

    // Líneas de referencia de equilibrio horizontal
    if (showEquilibriumTime && eqX > 0 && eqY > 0) {
      ds[2].hidden = false;
      ds[2].label = `Equilibrio ${params.nombrePresa || 'Presas'} (x* = ${eqX.toFixed(1)})`;
      ds[2].data = [{ x: 0, y: eqX }, { x: tMax, y: eqX }];

      ds[3].hidden = false;
      ds[3].label = `Equilibrio ${params.nombreDepredador || 'Depredadores'} (y* = ${eqY.toFixed(1)})`;
      ds[3].data = [{ x: 0, y: eqY }, { x: tMax, y: eqY }];
    } else {
      ds[2].hidden = true;
      ds[2].data = [];
      ds[3].hidden = true;
      ds[3].data = [];
    }

    // Cuadrícula
    timeSeriesChartInstance.options.scales.x.grid.color = showGridTime ? PALETTE.gridLines : 'transparent';
    timeSeriesChartInstance.options.scales.y.grid.color = showGridTime ? PALETTE.gridLines : 'transparent';

    timeSeriesChartInstance.update();
  }

  // =========================================================================
  // 2. ACTUALIZAR ESPACIO DE FASES
  // =========================================================================
  if (phaseSpaceChartInstance) {
    const dsPhase = phaseSpaceChartInstance.data.datasets;

    // Trayectoria orbital cerrada
    dsPhase[0].data = trayectoriaOrbital;

    // Punto inicial (x0, y0)
    const pt0 = serie[0];
    dsPhase[1].data = [{ x: pt0.presas, y: pt0.depredadores }];
    dsPhase[1].label = `Inicio (${pt0.presas.toFixed(0)}, ${pt0.depredadores.toFixed(0)})`;

    // Punto de equilibrio (x*, y*)
    if (eqX > 0 && eqY > 0) {
      dsPhase[2].hidden = false;
      dsPhase[2].data = [{ x: eqX, y: eqY }];
      dsPhase[2].label = `Equilibrio Centro (${eqX.toFixed(1)}, ${eqY.toFixed(1)})`;
    } else {
      dsPhase[2].hidden = true;
      dsPhase[2].data = [];
    }

    // Títulos de ejes con las especies
    phaseSpaceChartInstance.options.scales.x.title.text = `Presas: ${params.nombrePresa || 'x'}`;
    phaseSpaceChartInstance.options.scales.y.title.text = `Depredadores: ${params.nombreDepredador || 'y'}`;

    // Cuadrícula
    phaseSpaceChartInstance.options.scales.x.grid.color = showGridPhase ? PALETTE.gridLines : 'transparent';
    phaseSpaceChartInstance.options.scales.y.grid.color = showGridPhase ? PALETTE.gridLines : 'transparent';

    phaseSpaceChartInstance.update();
  }
}

/**
 * Destruye con seguridad las instancias de Chart.js para liberar memoria y evitar memory leaks.
 */
export function destruirGraficas() {
  if (timeSeriesChartInstance) {
    timeSeriesChartInstance.destroy();
    timeSeriesChartInstance = null;
  }
  if (phaseSpaceChartInstance) {
    phaseSpaceChartInstance.destroy();
    phaseSpaceChartInstance = null;
  }
}

/**
 * Exporta el contenido de un canvas de gráfica como imagen en formato PNG de alta resolución.
 * 
 * @param {string} canvasId ID del elemento canvas
 * @param {string} [nombreArchivo='ecoflux_grafica.png'] Nombre del archivo descargado
 */
export function exportarGraficaComoImagen(canvasId, nombreArchivo = 'ecoflux_grafica.png') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas no encontrado con ID: ${canvasId}`);
    return;
  }

  // Generar URL base64 de la imagen renderizada
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.download = nombreArchivo;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
