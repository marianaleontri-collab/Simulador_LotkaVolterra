/**
 * ============================================================================
 * EcoFlux — Controlador Principal de la Aplicación (ES6)
 * Módulo: app.js
 * 
 * Orquesta la sincronización de la interfaz de usuario, presets ecológicos,
 * conmutación dinámica entre el motor local RK4 y la API REST Spring Boot,
 * actualización de estadísticas y renderizado reactivo de gráficas.
 * ============================================================================
 */

import { simularLotkaVolterra, calcularEstadisticas, normalizarParametros } from './mockRk4.js';
import { calcularSimulacionAPI, verificarConexionBackend } from './api.js';
import { inicializarGraficas, actualizarGraficas, exportarGraficaComoImagen } from './charts.js';

// ============================================================================
// DEFINICIÓN DE PRESETS ECOLÓGICOS
// ============================================================================
export const PRESETS = {
  savanna: {
    id: 'savanna',
    nombreEcosistema: 'Sabana Africana',
    nombrePresa: 'Gacelas',
    nombreDepredador: 'Guepardos',
    x0: 100,
    y0: 20,
    alpha: 0.100,
    beta: 0.0020,
    delta: 0.0010,
    gamma: 0.050,
    tiempoTotal: 200,
    pasoTiempo: 0.100
  },
  boreal: {
    id: 'boreal',
    nombreEcosistema: 'Bosque Boreal',
    nombrePresa: 'Liebres',
    nombreDepredador: 'Linces',
    x0: 80,
    y0: 20,
    alpha: 0.150,
    beta: 0.0030,
    delta: 0.0015,
    gamma: 0.075,
    tiempoTotal: 250,
    pasoTiempo: 0.050
  },
  reef: {
    id: 'reef',
    nombreEcosistema: 'Arrecife Coralino',
    nombrePresa: 'Peces Coralinos',
    nombreDepredador: 'Tiburones de Arrecife',
    x0: 150,
    y0: 15,
    alpha: 0.200,
    beta: 0.0040,
    delta: 0.0020,
    gamma: 0.100,
    tiempoTotal: 150,
    pasoTiempo: 0.050
  },
  plague: {
    id: 'plague',
    nombreEcosistema: 'Campo Agrícola (Plaga)',
    nombrePresa: 'Roedores',
    nombreDepredador: 'Lechuzas',
    x0: 250,
    y0: 10,
    alpha: 0.300,
    beta: 0.0050,
    delta: 0.0005,
    gamma: 0.120,
    tiempoTotal: 120,
    pasoTiempo: 0.050
  }
};

// Estado global en memoria de la última ejecución
const state = {
  ultimaSimulacion: null,
  ultimosParametros: null,
  ultimasEstadisticas: null,
  origenEjecucion: 'local', // 'local' | 'backend'
  backendDisponible: false
};

// ============================================================================
// MAPEO Y VINCULACIÓN BIDIRECCIONAL DE CONTROLES (SLIDERS <-> INPUTS)
// ============================================================================
const CONTROL_PAIRS = [
  { inputId: 'x0_input', sliderId: 'x0_slider', decimals: 0 },
  { inputId: 'alpha_input', sliderId: 'alpha_slider', decimals: 3 },
  { inputId: 'beta_input', sliderId: 'beta_slider', decimals: 4 },
  { inputId: 'y0_input', sliderId: 'y0_slider', decimals: 0 },
  { inputId: 'delta_input', sliderId: 'delta_slider', decimals: 4 },
  { inputId: 'gamma_input', sliderId: 'gamma_slider', decimals: 3 },
  { inputId: 'tiempoTotal_input', sliderId: 'tiempoTotal_slider', decimals: 0 },
  { inputId: 'pasoTiempo_input', sliderId: 'pasoTiempo_slider', decimals: 3 }
];

/**
 * Inicializa la sincronización inmediata en tiempo real entre sliders e inputs numéricos.
 */
function configurarSincronizacionControles() {
  const presetSelect = document.getElementById('ecosystem-preset-select') || document.getElementById('preset-select');

  CONTROL_PAIRS.forEach(({ inputId, sliderId, decimals }) => {
    const inputEl = document.getElementById(inputId);
    const sliderEl = document.getElementById(sliderId);

    if (!inputEl || !sliderEl) return;

    // Al deslizar el slider -> actualizar input numérico
    sliderEl.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      inputEl.value = decimals > 0 ? val.toFixed(decimals) : Math.round(val);
      if (presetSelect && presetSelect.value !== 'custom') {
        presetSelect.value = 'custom';
      }
    });

    // Al modificar el input numérico -> actualizar slider
    inputEl.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        sliderEl.value = val;
        if (presetSelect && presetSelect.value !== 'custom') {
          presetSelect.value = 'custom';
        }
      }
    });
  });
}

/**
 * Lee y estructura todos los parámetros configurados en el formulario.
 * 
 * @returns {Object} Parámetros normalizados
 */
function recopilarParametrosFormulario() {
  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const num = parseFloat(el.value);
    return isNaN(num) ? fallback : num;
  };

  const getStr = (id, fallback) => {
    const el = document.getElementById(id);
    return el && el.value.trim() ? el.value.trim() : fallback;
  };

  return normalizarParametros({
    nombreEcosistema: getStr('nombreEcosistema', 'Sabana Africana'),
    nombrePresa: getStr('nombrePresa', 'Gacelas'),
    nombreDepredador: getStr('nombreDepredador', 'Guepardos'),
    poblacionInicialPresas: getVal('x0_input', 100),
    poblacionInicialDepredadores: getVal('y0_input', 20),
    alfa: getVal('alpha_input', 0.100),
    beta: getVal('beta_input', 0.0020),
    delta: getVal('delta_input', 0.0010),
    gamma: getVal('gamma_input', 0.050),
    tiempoTotal: getVal('tiempoTotal_input', 200),
    pasoTiempo: getVal('pasoTiempo_input', 0.100)
  });
}

/**
 * Carga un preset en los controles del formulario y actualiza tanto inputs como sliders.
 * 
 * @param {string} presetKey Clave del preset ('savanna', 'boreal', etc.)
 */
function aplicarPreset(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return;

  const setControl = (id, sliderId, val, decimals) => {
    const input = document.getElementById(id);
    const slider = document.getElementById(sliderId);
    if (input) input.value = decimals > 0 ? Number(val).toFixed(decimals) : Math.round(val);
    if (slider) slider.value = val;
  };

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setText('nombreEcosistema', preset.nombreEcosistema);
  setText('nombrePresa', preset.nombrePresa);
  setText('nombreDepredador', preset.nombreDepredador);

  setControl('x0_input', 'x0_slider', preset.x0, 0);
  setControl('y0_input', 'y0_slider', preset.y0, 0);
  setControl('alpha_input', 'alpha_slider', preset.alpha, 3);
  setControl('beta_input', 'beta_slider', preset.beta, 4);
  setControl('delta_input', 'delta_slider', preset.delta, 4);
  setControl('gamma_input', 'gamma_slider', preset.gamma, 3);
  setControl('tiempoTotal_input', 'tiempoTotal_slider', preset.tiempoTotal, 0);
  setControl('pasoTiempo_input', 'pasoTiempo_slider', preset.pasoTiempo, 3);
}

// ============================================================================
// ACTUALIZACIÓN DE INTERFAZ, KPIS Y BADGE DE ESTADO
// ============================================================================

/**
 * Actualiza el badge visual de estado en el encabezado.
 * 
 * @param {'backend' | 'local' | 'error'} modo 
 * @param {string} [mensaje]
 */
function actualizarBadgeEstado(modo, mensaje = '') {
  const badge = document.getElementById('backend-status-badge');
  const ping = document.getElementById('backend-status-ping');
  const dot = document.getElementById('backend-status-dot');
  const text = document.getElementById('backend-status-text');

  if (!badge || !text) return;

  // Limpiar clases previas de color
  badge.className = 'flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition';

  if (modo === 'backend') {
    badge.classList.add('bg-emerald-500/10', 'text-emerald-300', 'border-emerald-500/30');
    if (ping) ping.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
    if (dot) dot.className = 'relative inline-flex rounded-full h-2 w-2 bg-emerald-500';
    text.textContent = mensaje || 'API Backend Online (Spring Boot)';
    badge.title = 'Simulación procesada en el servidor backend Java';
  } else if (modo === 'local') {
    badge.classList.add('bg-amber-500/10', 'text-amber-300', 'border-amber-500/30');
    if (ping) ping.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75';
    if (dot) dot.className = 'relative inline-flex rounded-full h-2 w-2 bg-amber-500';
    text.textContent = mensaje || 'Modo Autónomo Local (RK4)';
    badge.title = 'Simulación calculada en el navegador con Runge-Kutta 4to Orden';
  } else {
    badge.classList.add('bg-rose-500/10', 'text-rose-300', 'border-rose-500/30');
    if (ping) ping.className = 'absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-50';
    if (dot) dot.className = 'relative inline-flex rounded-full h-2 w-2 bg-rose-500';
    text.textContent = mensaje || 'Error en Conexión';
    badge.title = 'No se pudo comunicar con el backend seleccionado';
  }
}

/**
 * Actualiza los valores en las tarjetas de métricas (KPIs).
 * 
 * @param {Object} estadisticas 
 * @param {number} tiempoCalculoMs 
 * @param {Object} params 
 */
function actualizarKPIs(estadisticas, tiempoCalculoMs, params) {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText('kpi-prey-equilibrium', estadisticas.puntoEquilibrioPresas.toFixed(1));
  setText('kpi-predator-equilibrium', estadisticas.puntoEquilibrioDepredadores.toFixed(1));
  setText('kpi-prey-max', estadisticas.maxPresas.toFixed(1));
  setText('kpi-predator-max', estadisticas.maxDepredadores.toFixed(1));
  setText('kpi-period', `~${estadisticas.periodoAproximado.toFixed(1)}`);
  setText('kpi-calc-time-val', `${tiempoCalculoMs.toFixed(1)} ms`);

  // Actualizar textos de leyenda dinámica
  setText('label-legend-prey', `${params.nombrePresa} (x)`);
  setText('label-legend-predator', `${params.nombreDepredador} (y)`);

  // Alerta si hay riesgo de extinción
  const preyStatus = document.getElementById('kpi-prey-status');
  if (preyStatus) {
    if (estadisticas.riesgoExtincion) {
      preyStatus.textContent = '⚠️ Riesgo de colapso demográfico (<1)';
      preyStatus.className = 'text-[10px] text-rose-400 font-semibold mt-1 truncate';
    } else {
      preyStatus.textContent = 'Población en ciclo armónico estable';
      preyStatus.className = 'text-[10px] text-slate-500 mt-1 truncate';
    }
  }
}

/**
 * Llena el cuerpo de la tabla HTML con los primeros y últimos registros simulados
 * evitando sobrecargar el DOM con miles de elementos.
 * 
 * @param {Array<Object>} serie 
 */
function actualizarTablaDatos(serie) {
  const tbody = document.getElementById('simulation-data-tbody');
  if (!tbody || !Array.isArray(serie)) return;

  // Si la serie es muy larga, muestrear de manera uniforme hasta 150 filas
  const MAX_ROWS = 150;
  const pasoMuestreo = Math.max(1, Math.floor(serie.length / MAX_ROWS));

  let filasHtml = '';
  for (let i = 0; i < serie.length; i += pasoMuestreo) {
    const pt = serie[i];
    filasHtml += `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="py-1.5 px-3 text-slate-500">${pt.paso}</td>
        <td class="py-1.5 px-3">${pt.tiempo.toFixed(2)}</td>
        <td class="py-1.5 px-3 text-emerald-400 font-semibold">${pt.presas.toFixed(2)}</td>
        <td class="py-1.5 px-3 text-rose-400 font-semibold">${pt.depredadores.toFixed(2)}</td>
        <td class="py-1.5 px-3 text-slate-400">${pt.conservada.toFixed(4)}</td>
      </tr>
    `;
  }

  // Asegurar siempre la inclusión del último punto exacto si no cayó en el muestreo
  const ultimoPt = serie[serie.length - 1];
  if (serie.length > 1 && (serie.length - 1) % pasoMuestreo !== 0) {
    filasHtml += `
      <tr class="hover:bg-slate-800/40 transition-colors bg-slate-900/40">
        <td class="py-1.5 px-3 text-slate-500">${ultimoPt.paso}</td>
        <td class="py-1.5 px-3">${ultimoPt.tiempo.toFixed(2)}</td>
        <td class="py-1.5 px-3 text-emerald-400 font-semibold">${ultimoPt.presas.toFixed(2)}</td>
        <td class="py-1.5 px-3 text-rose-400 font-semibold">${ultimoPt.depredadores.toFixed(2)}</td>
        <td class="py-1.5 px-3 text-slate-400">${ultimoPt.conservada.toFixed(4)}</td>
      </tr>
    `;
  }

  tbody.innerHTML = filasHtml;
}

// ============================================================================
// EJECUCIÓN PRINCIPAL DE LA SIMULACIÓN
// ============================================================================

/**
 * Ejecuta el cálculo de la simulación utilizando el modo configurado (Auto, Local, Backend)
 * y actualiza de inmediato todas las vistas y métricas.
 */
export async function ejecutarSimulacion() {
  const params = recopilarParametrosFormulario();
  const modeSelect = document.getElementById('execution-mode-select');
  const modoDeseado = modeSelect ? modeSelect.value : 'auto';

  const tInicio = performance.now();
  let serieResultado = null;
  let estadisticasResultado = null;
  let origenUtilizado = 'local';
  let tiempoCalculo = 0;

  try {
    if (modoDeseado === 'backend') {
      // Forzar llamada a la API Spring Boot
      const res = await calcularSimulacionAPI(params);
      serieResultado = res.serieTemporal;
      estadisticasResultado = res.estadisticas;
      origenUtilizado = 'backend';
      tiempoCalculo = res.tiempoRespuestaMs;
      actualizarBadgeEstado('backend', `API Backend Online (${tiempoCalculo} ms)`);

    } else if (modoDeseado === 'local') {
      // Forzar ejecución en el motor local RK4 de JavaScript
      serieResultado = simularLotkaVolterra(params);
      estadisticasResultado = calcularEstadisticas(serieResultado, params);
      origenUtilizado = 'local';
      tiempoCalculo = Number((performance.now() - tInicio).toFixed(1));
      actualizarBadgeEstado('local', 'Modo Autónomo Local (RK4)');

    } else {
      // Modo 'auto': Probar backend con timeout, con fallback transparente a RK4 local
      try {
        const res = await calcularSimulacionAPI(params, 2500);
        serieResultado = res.serieTemporal;
        estadisticasResultado = res.estadisticas;
        origenUtilizado = 'backend';
        tiempoCalculo = res.tiempoRespuestaMs;
        actualizarBadgeEstado('backend', `API Backend Online (${tiempoCalculo} ms)`);
      } catch (backendError) {
        console.info('Backend no disponible en modo auto. Activando motor RK4 local:', backendError.message);
        serieResultado = simularLotkaVolterra(params);
        estadisticasResultado = calcularEstadisticas(serieResultado, params);
        origenUtilizado = 'local';
        tiempoCalculo = Number((performance.now() - tInicio).toFixed(1));
        actualizarBadgeEstado('local', 'Modo Autónomo Local (RK4)');
      }
    }

    // Guardar en el estado global
    state.ultimaSimulacion = serieResultado;
    state.ultimosParametros = params;
    state.ultimasEstadisticas = estadisticasResultado;
    state.origenEjecucion = origenUtilizado;

    // Obtener preferencias de los toggles de visualización
    const showGridTime = document.getElementById('toggle-grid-time')?.checked ?? true;
    const showEquilibriumTime = document.getElementById('toggle-equilibrium-time')?.checked ?? true;
    const showGridPhase = document.getElementById('toggle-grid-phase')?.checked ?? true;

    // Actualizar gráficas y KPIs
    actualizarGraficas(serieResultado, params, estadisticasResultado, {
      showGridTime,
      showEquilibriumTime,
      showGridPhase
    });

    actualizarKPIs(estadisticasResultado, tiempoCalculo, params);
    actualizarTablaDatos(serieResultado);

  } catch (error) {
    console.error('Error al ejecutar simulación:', error);
    actualizarBadgeEstado('error', 'Error de Simulación');
    alert(`Ocurrió un error al ejecutar la simulación:\n\n${error.message}`);
  }
}

// ============================================================================
// EXPORTACIÓN DE ARCHIVOS (CSV, JSON, IMÁGENES PNG)
// ============================================================================

/**
 * Descarga una cadena de texto como archivo local en el navegador del usuario.
 */
function descargarArchivoBlob(contenido, nombreArchivo, mimeType) {
  const blob = new Blob([contenido], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera y descarga los resultados de la simulación en formato CSV.
 */
export function exportarDatosCSV() {
  if (!state.ultimaSimulacion || state.ultimaSimulacion.length === 0) {
    alert('Primero ejecuta una simulación antes de exportar los datos.');
    return;
  }

  const p = state.ultimosParametros || {};
  let csv = `Paso,Tiempo,${p.nombrePresa || 'Presas'},${p.nombreDepredador || 'Depredadores'},Invariante_V\n`;

  for (let i = 0; i < state.ultimaSimulacion.length; i++) {
    const pt = state.ultimaSimulacion[i];
    csv += `${pt.paso},${pt.tiempo},${pt.presas},${pt.depredadores},${pt.conservada}\n`;
  }

  const slug = (p.nombreEcosistema || 'ecosistema').toLowerCase().replace(/\s+/g, '_');
  descargarArchivoBlob(csv, `ecoflux_${slug}_datos.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Genera y descarga los resultados completos de la simulación en formato JSON estructurado.
 */
export function exportarDatosJSON() {
  if (!state.ultimaSimulacion || state.ultimaSimulacion.length === 0) {
    alert('Primero ejecuta una simulación antes de exportar los datos.');
    return;
  }

  const dataExport = {
    aplicacion: 'EcoFlux Lotka-Volterra Simulator',
    version: '1.0 RK4',
    fechaGeneracion: new Date().toISOString(),
    origenEjecucion: state.origenEjecucion,
    parametros: state.ultimosParametros,
    estadisticas: state.ultimasEstadisticas,
    totalPuntos: state.ultimaSimulacion.length,
    serieTemporal: state.ultimaSimulacion
  };

  const p = state.ultimosParametros || {};
  const slug = (p.nombreEcosistema || 'ecosistema').toLowerCase().replace(/\s+/g, '_');
  descargarArchivoBlob(JSON.stringify(dataExport, null, 2), `ecoflux_${slug}_simulacion.json`, 'application/json');
}

// ============================================================================
// MODAL MATEMÁTICO & TABLA COLAPSABLE
// ============================================================================

function configurarModalMatematico() {
  const modal = document.getElementById('math-modal');
  const btnOpen = document.getElementById('btn-open-math-modal');
  const btnClose = document.getElementById('btn-close-math-modal');
  const btnUnderstood = document.getElementById('btn-modal-understood');

  if (!modal) return;

  const abrirModal = () => {
    modal.classList.remove('hidden');
    // Forzar reflow para animación fluida de opacidad
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
  };

  const cerrarModal = () => {
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 200);
  };

  if (btnOpen) btnOpen.addEventListener('click', abrirModal);
  if (btnClose) btnClose.addEventListener('click', cerrarModal);
  if (btnUnderstood) btnUnderstood.addEventListener('click', cerrarModal);

  // Cerrar al presionar fuera de la ventana modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      cerrarModal();
    }
  });
}

function configurarToggleTabla() {
  const btnToggle = document.getElementById('btn-toggle-table');
  const container = document.getElementById('data-table-container');
  const btnText = document.getElementById('btn-toggle-table-text');

  if (!btnToggle || !container) return;

  btnToggle.addEventListener('click', () => {
    const isHidden = container.classList.toggle('hidden');
    if (btnText) {
      btnText.textContent = isHidden ? 'Ver Tabla' : 'Ocultar Tabla';
    }
  });
}

function configurarTogglesGraficas() {
  const timeGridToggle = document.getElementById('toggle-grid-time');
  const timeEqToggle = document.getElementById('toggle-equilibrium-time');
  const phaseGridToggle = document.getElementById('toggle-grid-phase');

  const refrescar = () => {
    if (state.ultimaSimulacion && state.ultimosParametros && state.ultimasEstadisticas) {
      actualizarGraficas(
        state.ultimaSimulacion,
        state.ultimosParametros,
        state.ultimasEstadisticas,
        {
          showGridTime: timeGridToggle?.checked ?? true,
          showEquilibriumTime: timeEqToggle?.checked ?? true,
          showGridPhase: phaseGridToggle?.checked ?? true
        }
      );
    }
  };

  if (timeGridToggle) timeGridToggle.addEventListener('change', refrescar);
  if (timeEqToggle) timeEqToggle.addEventListener('change', refrescar);
  if (phaseGridToggle) phaseGridToggle.addEventListener('change', refrescar);
}

// ============================================================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicializar gráficas con configuración inicial
  inicializarGraficas();

  // 2. Configurar sincronización sliders e inputs
  configurarSincronizacionControles();

  // 3. Configurar listeners de modales, toggles y exportación
  configurarModalMatematico();
  configurarToggleTabla();
  configurarTogglesGraficas();

  // 4. Selector de Preset
  const presetSelect = document.getElementById('ecosystem-preset-select') || document.getElementById('preset-select');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected !== 'custom') {
        aplicarPreset(selected);
        ejecutarSimulacion();
      }
    });
  }

  // 5. Botón Reset
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (presetSelect) presetSelect.value = 'savanna';
      aplicarPreset('savanna');
      ejecutarSimulacion();
    });
  }

  // 6. Botón de Simulación y Envío de Formulario
  const form = document.getElementById('simulation-form');
  const btnSimulate = document.getElementById('btn-simulate') || document.getElementById('btn-ejecutar');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ejecutarSimulacion();
    });
  }

  if (btnSimulate && btnSimulate !== form) {
    btnSimulate.addEventListener('click', (e) => {
      e.preventDefault();
      ejecutarSimulacion();
    });
  }

  // 7. Botones de Exportación de Datos
  const btnCsv = document.getElementById('btn-download-csv') || document.getElementById('btn-export-csv');
  const btnJson = document.getElementById('btn-download-json') || document.getElementById('btn-export-json');

  if (btnCsv) btnCsv.addEventListener('click', exportarDatosCSV);
  if (btnJson) btnJson.addEventListener('click', exportarDatosJSON);

  // 8. Botones de Exportación de Imágenes de Gráficas
  const btnExportTime = document.getElementById('btn-export-time-chart');
  const btnExportPhase = document.getElementById('btn-export-phase-chart');

  if (btnExportTime) {
    btnExportTime.addEventListener('click', () => {
      const p = state.ultimosParametros || {};
      const slug = (p.nombreEcosistema || 'ecosistema').toLowerCase().replace(/\s+/g, '_');
      exportarGraficaComoImagen('timeSeriesChart', `ecoflux_${slug}_serie_temporal.png`);
    });
  }

  if (btnExportPhase) {
    btnExportPhase.addEventListener('click', () => {
      const p = state.ultimosParametros || {};
      const slug = (p.nombreEcosistema || 'ecosistema').toLowerCase().replace(/\s+/g, '_');
      exportarGraficaComoImagen('phaseSpaceChart', `ecoflux_${slug}_espacio_fases.png`);
    });
  }

  // 9. Comprobación preliminar no bloqueante de conexión al backend
  verificarConexionBackend(1500).then((estado) => {
    state.backendDisponible = estado.online;
    if (estado.online) {
      actualizarBadgeEstado('backend', `API Backend Online (${estado.latenciaMs} ms)`);
    } else {
      actualizarBadgeEstado('local', 'Modo Autónomo Local (RK4)');
    }
  }).catch(() => {
    actualizarBadgeEstado('local', 'Modo Autónomo Local (RK4)');
  });

  // 10. Auto-ejecución inicial con el preset por defecto ('savanna')
  // para que la interfaz muestre de inmediato resultados vivos y atractivos.
  aplicarPreset('savanna');
  ejecutarSimulacion();
});
