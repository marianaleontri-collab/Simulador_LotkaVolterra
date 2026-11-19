/**
 * ============================================================================
 * EcoFlux: Guardián del Bioma — Módulo de Gráficas y HUD Matemático
 * Módulo: hudCharts.js
 * 
 * Gestiona la visualización científica en tiempo real con Chart.js 4.4.x:
 * 1. Mini Radar de Retrato de Fase (#phaseRadarChart):
 *    - Diagrama de dispersión (Scatter) orbital en tiempo real.
 *    - Trazo de la trayectoria x(t) vs y(t) de los últimos 60 puntos.
 *    - Marcador del Punto de Equilibrio Teórico E1 (x*, y*) dorado.
 *    - Marcador del estado actual del ecosistema.
 * 2. Gráfica Comparativa Final (#comparisonChart):
 *    - Serie temporal comparativa en el modal de fin de partida.
 *    - Contrasta la gestión del jugador frente a la proyección natural sin ayuda.
 * ============================================================================
 */

let phaseRadarChartInstance = null;
let comparisonChartInstance = null;
const trajectoryBuffer = [];
const MAX_RADAR_POINTS = 60;

/**
 * Obtiene de forma segura el constructor global de Chart.js.
 * @returns {typeof Chart}
 */
function getChartJs() {
  if (typeof window !== 'undefined' && window.Chart) {
    return window.Chart;
  }
  console.warn('[hudCharts] Chart.js no encontrado en window.Chart. Las gráficas quedarán en espera.');
  return null;
}

/**
 * Resuelve el elemento Canvas por ID o referencia HTMLCanvasElement.
 * @param {string|HTMLCanvasElement} canvasId 
 * @returns {HTMLCanvasElement|null}
 */
function resolveCanvas(canvasId) {
  if (!canvasId) return null;
  if (typeof canvasId === 'string') {
    const cleanId = canvasId.startsWith('#') ? canvasId.slice(1) : canvasId;
    return document.getElementById(cleanId);
  }
  if (canvasId instanceof HTMLCanvasElement) {
    return canvasId;
  }
  return null;
}

/**
 * Inicializa el Mini Radar de Retrato de Fase en el canvas especificado.
 * 
 * @param {string|HTMLCanvasElement} [canvasId='phaseRadarChart'] ID del canvas
 * @param {{ x: number, y: number }} [puntoEquilibrio={ x: 40, y: 40 }] Punto E1 teórico
 * @returns {Chart|null} Instancia de Chart.js creada
 */
export function initPhaseRadar(canvasId = 'phaseRadarChart', puntoEquilibrio = null) {
  const Chart = getChartJs();
  const canvas = resolveCanvas(canvasId);

  if (!Chart || !canvas) {
    return null;
  }

  // Destruir instancia previa si existe para evitar fugas de memoria o solapamientos
  if (phaseRadarChartInstance) {
    phaseRadarChartInstance.destroy();
    phaseRadarChartInstance = null;
  }

  trajectoryBuffer.length = 0;

  const ctx = canvas.getContext('2d');

  const eqData = (puntoEquilibrio && Number.isFinite(puntoEquilibrio.x) && Number.isFinite(puntoEquilibrio.y))
    ? [{ x: puntoEquilibrio.x, y: puntoEquilibrio.y }]
    : [];

  phaseRadarChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        // Dataset 0: Órbita del jugador (trayectoria reciente de 60 puntos)
        {
          label: 'Órbita Reciente',
          data: [],
          showLine: true,
          borderColor: '#38bdf8',
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: '#38bdf8',
          pointBorderColor: '#0284c7',
          pointHoverRadius: 4,
          tension: 0.25,
          fill: false,
          order: 2
        },
        // Dataset 1: Punto de equilibrio teórico dorado fijo E1 = (x*, y*)
        {
          label: 'Equilibrio E₁ (x*, y*)',
          data: eqData,
          showLine: false,
          pointRadius: 7,
          pointHoverRadius: 9,
          pointBackgroundColor: '#fbbf24',
          pointBorderColor: '#d97706',
          borderWidth: 2,
          pointStyle: 'rectRot',
          order: 1
        },
        // Dataset 2: Posición actual instantánea (x, y)
        {
          label: 'Población Actual',
          data: [],
          showLine: false,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          borderWidth: 2,
          pointStyle: 'circle',
          order: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false, // Desactivado para garantizar 60 FPS estables sin sobrecarga
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Presas (x)',
            color: '#94a3b8',
            font: { size: 9, family: 'Inter' }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 9, family: 'JetBrains Mono' },
            maxTicksLimit: 6
          }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'Depredadores (y)',
            color: '#94a3b8',
            font: { size: 9, family: 'Inter' }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 9, family: 'JetBrains Mono' },
            maxTicksLimit: 6
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#94a3b8',
            boxWidth: 8,
            boxHeight: 8,
            font: { size: 9, family: 'Inter' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#f8fafc',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(51, 65, 85, 0.6)',
          borderWidth: 1,
          padding: 8,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const p = context.raw;
              return `${context.dataset.label}: Presas=${p.x.toFixed(1)}, Depr=${p.y.toFixed(1)}`;
            }
          }
        }
      }
    }
  });

  return phaseRadarChartInstance;
}

/**
 * Actualiza el Mini Radar de Retrato de Fase con las poblaciones actuales.
 * Mantiene los últimos 60 puntos con un buffer circular eficiente.
 * 
 * @param {number} x Población actual de presas
 * @param {number} y Población actual de depredadores
 */
export function updatePhaseRadar(x, y) {
  if (!phaseRadarChartInstance) return;

  const validX = Math.round(Number(x) * 100) / 100;
  const validY = Math.round(Number(y) * 100) / 100;

  if (!Number.isFinite(validX) || !Number.isFinite(validY)) return;

  // Actualizar buffer de órbita
  trajectoryBuffer.push({ x: validX, y: validY });
  if (trajectoryBuffer.length > MAX_RADAR_POINTS) {
    trajectoryBuffer.shift();
  }

  // Asignar datos a los datasets
  phaseRadarChartInstance.data.datasets[0].data = trajectoryBuffer;
  phaseRadarChartInstance.data.datasets[2].data = [{ x: validX, y: validY }];

  // Actualización instantánea sin animación para no penalizar el render loop
  phaseRadarChartInstance.update('none');
}

/**
 * Reinicia la trayectoria del Mini Radar de Fase y actualiza el punto de equilibrio.
 * 
 * @param {{ x: number, y: number }} [puntoEquilibrio] Nuevo punto de equilibrio
 */
export function resetPhaseRadar(puntoEquilibrio = null) {
  trajectoryBuffer.length = 0;

  if (phaseRadarChartInstance) {
    phaseRadarChartInstance.data.datasets[0].data = [];
    phaseRadarChartInstance.data.datasets[2].data = [];

    if (puntoEquilibrio && Number.isFinite(puntoEquilibrio.x) && Number.isFinite(puntoEquilibrio.y)) {
      phaseRadarChartInstance.data.datasets[1].data = [{ x: puntoEquilibrio.x, y: puntoEquilibrio.y }];
    }

    phaseRadarChartInstance.update();
  }
}

/**
 * Destruye la instancia del radar de fase si existe.
 */
export function destroyPhaseRadar() {
  if (phaseRadarChartInstance) {
    phaseRadarChartInstance.destroy();
    phaseRadarChartInstance = null;
  }
}

/**
 * Renderiza la gráfica comparativa final en el modal de fin de partida.
 * Compara las curvas poblacionales del jugador contra la proyección natural sin asistencia.
 * 
 * @param {string|HTMLCanvasElement} [canvasId='comparisonChart'] ID del canvas
 * @param {Array<{ dia: number, presas: number, depredadores: number }>} serieJugador Datos del jugador
 * @param {Array<{ dia: number, presas: number, depredadores: number }>} serieNatural Datos sin intervención
 * @param {number} [diasObjetivo=60] Días objetivo de la partida
 * @returns {Chart|null} Instancia de la gráfica creada
 */
export function renderComparisonChart(canvasId = 'comparisonChart', serieJugador = [], serieNatural = [], diasObjetivo = 60) {
  const Chart = getChartJs();
  const canvas = resolveCanvas(canvasId);

  if (!Chart || !canvas) {
    console.warn('[hudCharts] No se pudo renderizar la gráfica comparativa: canvas o Chart no disponible.');
    return null;
  }

  if (comparisonChartInstance) {
    comparisonChartInstance.destroy();
    comparisonChartInstance = null;
  }

  // Homogeneizar labels de tiempo a partir de las series
  const labelsSet = new Set();
  (serieJugador || []).forEach(p => labelsSet.add(p.dia));
  (serieNatural || []).forEach(p => labelsSet.add(p.dia));

  let labels = Array.from(labelsSet).sort((a, b) => a - b);
  if (labels.length === 0) {
    labels = Array.from({ length: diasObjetivo + 1 }, (_, i) => i);
  }

  // Mapear puntos con formato { x: dia, y: valor }
  const dataPresasJugador = (serieJugador || []).map(p => ({ x: p.dia, y: p.presas }));
  const dataDeprJugador = (serieJugador || []).map(p => ({ x: p.dia, y: p.depredadores }));
  const dataPresasNatural = (serieNatural || []).map(p => ({ x: p.dia, y: p.presas }));
  const dataDeprNatural = (serieNatural || []).map(p => ({ x: p.dia, y: p.depredadores }));

  const ctx = canvas.getContext('2d');

  comparisonChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        // 1. Presas del Jugador (Verde esmeralda sólido)
        {
          label: 'Presas (Tu Gestión)',
          data: dataPresasJugador,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2.5,
          pointRadius: 1,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false
        },
        // 2. Depredadores del Jugador (Coral sólido)
        {
          label: 'Depredadores (Tu Gestión)',
          data: dataDeprJugador,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          borderWidth: 2.5,
          pointRadius: 1,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false
        },
        // 3. Presas Proyección Natural (Verde punteado traslúcido)
        {
          label: 'Presas (Destino Natural)',
          data: dataPresasNatural,
          borderColor: 'rgba(16, 185, 129, 0.55)',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false
        },
        // 4. Depredadores Proyección Natural (Coral punteado traslúcido)
        {
          label: 'Depredadores (Destino Natural)',
          data: dataDeprNatural,
          borderColor: 'rgba(244, 63, 94, 0.55)',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Días de Simulación',
            color: '#94a3b8',
            font: { size: 11, family: 'Inter' }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 10, family: 'JetBrains Mono' },
            stepSize: 10
          }
        },
        y: {
          title: {
            display: true,
            text: 'Biomasa Poblacional (individuos)',
            color: '#94a3b8',
            font: { size: 11, family: 'Inter' }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 10, family: 'JetBrains Mono' }
          },
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#cbd5e1',
            boxWidth: 14,
            boxHeight: 10,
            usePointStyle: false,
            font: { size: 11, family: 'Inter' }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(51, 65, 85, 0.7)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: function(items) {
              if (items.length > 0) {
                return `Día ${Number(items[0].parsed.x).toFixed(1)}`;
              }
              return '';
            },
            label: function(context) {
              return ` ${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)}`;
            }
          }
        }
      }
    }
  });

  return comparisonChartInstance;
}

export default {
  initPhaseRadar,
  updatePhaseRadar,
  resetPhaseRadar,
  destroyPhaseRadar,
  renderComparisonChart
};
