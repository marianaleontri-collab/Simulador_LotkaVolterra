/**
 * ============================================================================
 * EcoFlux — Controlador Principal de la Aplicación (ES6)
 * Módulo: app.js
 * 
 * Orquesta la sincronización de la interfaz de usuario, presets ecológicos,
 * conmutación dinámica entre el motor local RK4 y la API REST Spring Boot,
 * persistencia CRUD (guardar, listar, cargar, eliminar simulaciones),
 * actualización de estadísticas y renderizado reactivo de gráficas.
 * ============================================================================
 */

import { simularLotkaVolterra, calcularEstadisticas, normalizarParametros } from './mockRk4.js';
import {
  calcularSimulacionAPI,
  guardarSimulacionAPI,
  listarSimulacionesAPI,
  cargarSimulacionAPI,
  eliminarSimulacionAPI,
  obtenerPresetsAPI,
  verificarConexionBackend
} from './api.js';
import { inicializarGraficas, actualizarGraficas, exportarGraficaComoImagen } from './charts.js';

// ============================================================================
// DEFINICIÓN DE PRESETS ECOLÓGICOS (FALLBACK LOCAL)
// ============================================================================
export const PRESETS_LOCALES = {
  savanna: {
    id: 'savanna',
    nombre: 'Sabana Africana (Equilibrado)',
    descripcion: 'Ciclo armónico equilibrado entre gacelas y guepardos en la sabana.',
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
    nombre: 'Bosque Boreal (Oscilante)',
    descripcion: 'Oscilación clásica de alta amplitud entre liebres y linces.',
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
    nombre: 'Arrecife Coralino (Ciclo Rápido)',
    descripcion: 'Dinámica de renovación acelerada entre peces herbívoros y tiburones.',
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
    nombre: 'Campo Agrícola (Plaga)',
    descripcion: 'Desbalance demográfico con explosión de roedores y estrés de depredadores.',
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

// Catálogo activo en memoria (se actualiza si la API responde con los presets de Spring Boot)
let catalogoPresets = { ...PRESETS_LOCALES };

// Estado global en memoria de la última ejecución
const state = {
  ultimaSimulacion: null,
  ultimosParametros: null,
  ultimasEstadisticas: null,
  origenEjecucion: 'local', // 'local' | 'backend'
  backendDisponible: false
};

// ============================================================================
// SISTEMA DE NOTIFICACIONES TOAST (FEEDBACK VISUAL)
// ============================================================================

/**
 * Muestra un mensaje flotante tipo toast en la esquina inferior de la pantalla.
 * 
 * @param {string} mensaje Contenido del mensaje
 * @param {'success'|'error'|'info'|'warning'} [tipo='info'] Tipo de alerta
 * @param {number} [duracionMs=3500] Tiempo antes de desaparecer
 */
export function mostrarToast(mensaje, tipo = 'info', duracionMs = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);
  const toast = document.createElement('div');
  toast.id = toastId;

  // Clases y colores según tipo
  let bgClass = 'bg-slate-900 border-slate-700 text-slate-200';
  let iconName = 'info';
  let iconColor = 'text-sky-400';

  if (tipo === 'success') {
    bgClass = 'bg-slate-900/95 border-emerald-500/40 text-emerald-200';
    iconName = 'check-circle-2';
    iconColor = 'text-emerald-400';
  } else if (tipo === 'error') {
    bgClass = 'bg-slate-900/95 border-rose-500/40 text-rose-200';
    iconName = 'alert-triangle';
    iconColor = 'text-rose-400';
  } else if (tipo === 'warning') {
    bgClass = 'bg-slate-900/95 border-amber-500/40 text-amber-200';
    iconName = 'alert-circle';
    iconColor = 'text-amber-400';
  }

  toast.className = `pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 opacity-0 translate-y-3 ${bgClass}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 shrink-0 mt-0.5 ${iconColor}"></i>
    <div class="flex-1 text-xs font-medium leading-relaxed">${mensaje}</div>
    <button type="button" class="text-slate-400 hover:text-slate-200 transition shrink-0 ml-2" onclick="document.getElementById('${toastId}')?.remove()">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);

  if (window.lucide) {
    window.lucide.createIcons({ root: toast });
  }

  // Animación de entrada
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-3');
    toast.classList.add('opacity-100', 'translate-y-0');
  });

  // Retirar tras expiración
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duracionMs);
}

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
  const presetSelect = document.getElementById('ecosystem-preset-select');

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
 * Lee y estructura todos los parámetros configurados en el formulario con nombres exactos de DTO.
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
 * Carga un preset o conjunto de parámetros en los controles del formulario y actualiza sliders e inputs.
 * 
 * @param {string|Object} presetKeyOrObj Clave del preset ('savanna', 'lince-liebre', etc.) o DTO de simulación
 */
export function aplicarPreset(presetKeyOrObj) {
  let preset = null;

  if (typeof presetKeyOrObj === 'string') {
    preset = catalogoPresets[presetKeyOrObj];
  } else if (presetKeyOrObj && typeof presetKeyOrObj === 'object') {
    preset = presetKeyOrObj;
  }

  if (!preset) return;

  // Extraer parámetros ya sea de formato plano o anidado en .parametros
  const p = preset.parametros || preset;

  const setControl = (id, sliderId, val, decimals) => {
    const input = document.getElementById(id);
    const slider = document.getElementById(sliderId);
    if (input && val != null) input.value = decimals > 0 ? Number(val).toFixed(decimals) : Math.round(Number(val));
    if (slider && val != null) slider.value = Number(val);
  };

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el && val != null) el.value = val;
  };

  setText('nombreEcosistema', preset.nombreEcosistema || p.nombreEcosistema || 'Ecosistema');
  setText('nombrePresa', preset.nombrePresa || p.nombrePresa || 'Presas');
  setText('nombreDepredador', preset.nombreDepredador || p.nombreDepredador || 'Depredadores');

  setControl('x0_input', 'x0_slider', p.poblacionInicialPresas ?? p.x0 ?? 100, 0);
  setControl('y0_input', 'y0_slider', p.poblacionInicialDepredadores ?? p.y0 ?? 20, 0);
  setControl('alpha_input', 'alpha_slider', p.alfa ?? p.alpha ?? 0.1, 3);
  setControl('beta_input', 'beta_slider', p.beta ?? 0.002, 4);
  setControl('delta_input', 'delta_slider', p.delta ?? 0.001, 4);
  setControl('gamma_input', 'gamma_slider', p.gamma ?? 0.05, 3);
  setControl('tiempoTotal_input', 'tiempoTotal_slider', p.tiempoTotal ?? 200, 0);
  setControl('pasoTiempo_input', 'pasoTiempo_slider', p.pasoTiempo ?? 0.1, 3);
}

// ============================================================================
// CARGA Y SINCRONIZACIÓN DE PRESETS (BACKEND / FALLBACK LOCAL)
// ============================================================================

/**
 * Consulta la API GET /api/v1/presets al inicio. Si el backend está disponible,
 * actualiza el dropdown de presets. Si está offline, preserva los presets locales sin romper la interfaz.
 */
async function inicializarPresets() {
  const select = document.getElementById('ecosystem-preset-select');
  if (!select) return;

  try {
    const presetsBackend = await obtenerPresetsAPI(2000);

    if (Array.isArray(presetsBackend) && presetsBackend.length > 0) {
      // Registrar presets en el catálogo activo
      catalogoPresets = {};
      presetsBackend.forEach(item => {
        catalogoPresets[item.id] = {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          parametros: item.parametros
        };
      });

      // Re-poblar el <select>
      select.innerHTML = '';
      presetsBackend.forEach((item, index) => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.className = 'bg-slate-900 text-slate-200';
        opt.textContent = `${item.nombre} (${item.parametros?.nombreEcosistema || 'Clásico'})`;
        if (index === 0) opt.selected = true;
        select.appendChild(opt);
      });

      const optCustom = document.createElement('option');
      optCustom.value = 'custom';
      optCustom.className = 'bg-slate-900 text-slate-200';
      optCustom.textContent = '⚙️ Personalizado';
      select.appendChild(optCustom);

      // Aplicar el primer preset del backend
      const primerId = presetsBackend[0].id;
      aplicarPreset(primerId);
      return;
    }
  } catch (err) {
    console.info('Backend offline para presets, utilizando catálogo local de fallback:', err.message);
  }

  // Fallback: usar catálogo local
  catalogoPresets = { ...PRESETS_LOCALES };
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

  const eqPresas = estadisticas?.puntoEquilibrioPresas ?? (params.delta > 0 ? params.gamma / params.delta : 0);
  const eqDepredadores = estadisticas?.puntoEquilibrioDepredadores ?? (params.beta > 0 ? params.alfa / params.beta : 0);

  setText('kpi-prey-equilibrium', Number(eqPresas).toFixed(1));
  setText('kpi-predator-equilibrium', Number(eqDepredadores).toFixed(1));
  setText('kpi-prey-max', Number(estadisticas?.maxPresas ?? 0).toFixed(1));
  setText('kpi-predator-max', Number(estadisticas?.maxDepredadores ?? 0).toFixed(1));

  // Estimación analítica del período si el backend no lo provee
  let periodoVal = '--';
  if (estadisticas?.periodoAproximado != null && estadisticas.periodoAproximado > 0) {
    periodoVal = `~${estadisticas.periodoAproximado.toFixed(1)}`;
  } else if (params.alfa > 0 && params.gamma > 0) {
    const periodoTeorico = (2 * Math.PI) / Math.sqrt(params.alfa * params.gamma);
    periodoVal = `~${periodoTeorico.toFixed(1)}`;
  }
  setText('kpi-period', periodoVal);
  setText('kpi-calc-time-val', `${tiempoCalculoMs.toFixed(1)} ms`);

  // Actualizar textos de leyenda dinámica
  setText('label-legend-prey', `${params.nombrePresa || 'Presas'} (x)`);
  setText('label-legend-predator', `${params.nombreDepredador || 'Depredadores'} (y)`);

  // Alerta si hay riesgo de extinción
  const preyStatus = document.getElementById('kpi-prey-status');
  if (preyStatus) {
    if (estadisticas?.riesgoExtincion) {
      preyStatus.textContent = '⚠️ Riesgo de colapso demográfico (<1)';
      preyStatus.className = 'text-[10px] text-rose-400 font-semibold mt-1 truncate';
    } else {
      preyStatus.textContent = 'Población en ciclo armónico estable';
      preyStatus.className = 'text-[10px] text-slate-500 mt-1 truncate';
    }
  }
}

/**
 * Llena el cuerpo de la tabla HTML con un muestreo uniforme evitando sobrecargar el DOM.
 * 
 * @param {Array<Object>} serie 
 */
function actualizarTablaDatos(serie) {
  const tbody = document.getElementById('simulation-data-tbody');
  if (!tbody || !Array.isArray(serie)) return;

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
        <td class="py-1.5 px-3 text-slate-400">${(pt.conservada ?? 0).toFixed(4)}</td>
      </tr>
    `;
  }

  const ultimoPt = serie[serie.length - 1];
  if (serie.length > 1 && (serie.length - 1) % pasoMuestreo !== 0) {
    filasHtml += `
      <tr class="hover:bg-slate-800/40 transition-colors bg-slate-900/40">
        <td class="py-1.5 px-3 text-slate-500">${ultimoPt.paso}</td>
        <td class="py-1.5 px-3">${ultimoPt.tiempo.toFixed(2)}</td>
        <td class="py-1.5 px-3 text-emerald-400 font-semibold">${ultimoPt.presas.toFixed(2)}</td>
        <td class="py-1.5 px-3 text-rose-400 font-semibold">${ultimoPt.depredadores.toFixed(2)}</td>
        <td class="py-1.5 px-3 text-slate-400">${(ultimoPt.conservada ?? 0).toFixed(4)}</td>
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
      const res = await calcularSimulacionAPI(params);
      serieResultado = res.serieTemporal;
      estadisticasResultado = res.estadisticas;
      origenUtilizado = 'backend';
      tiempoCalculo = res.tiempoRespuestaMs;
      state.backendDisponible = true;
      actualizarBadgeEstado('backend', `API Backend Online (${tiempoCalculo} ms)`);

    } else if (modoDeseado === 'local') {
      serieResultado = simularLotkaVolterra(params);
      estadisticasResultado = calcularEstadisticas(serieResultado, params);
      origenUtilizado = 'local';
      tiempoCalculo = Number((performance.now() - tInicio).toFixed(1));
      actualizarBadgeEstado('local', 'Modo Autónomo Local (RK4)');

    } else {
      // Modo 'auto': Intenta backend; si falla o timeout, conmuta al RK4 local
      try {
        const res = await calcularSimulacionAPI(params, 2500);
        serieResultado = res.serieTemporal;
        estadisticasResultado = res.estadisticas;
        origenUtilizado = 'backend';
        tiempoCalculo = res.tiempoRespuestaMs;
        state.backendDisponible = true;
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

    // Actualizar estado global
    state.ultimaSimulacion = serieResultado;
    state.ultimosParametros = params;
    state.ultimasEstadisticas = estadisticasResultado;
    state.origenEjecucion = origenUtilizado;

    // Obtener preferencias de los toggles de visualización
    const showGridTime = document.getElementById('toggle-grid-time')?.checked ?? true;
    const showEquilibriumTime = document.getElementById('toggle-equilibrium-time')?.checked ?? true;
    const showGridPhase = document.getElementById('toggle-grid-phase')?.checked ?? true;

    // Renderizar gráficas, KPIs y tabla
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
    mostrarToast(`Error al ejecutar simulación: ${error.message}`, 'error', 4500);
  }
}

// ============================================================================
// GESTIÓN CRUD DE SIMULACIONES (GUARDAR, LISTAR, CARGAR, ELIMINAR)
// ============================================================================

/**
 * Guarda los parámetros y el cálculo de la simulación actual en la base de datos de Spring Boot.
 */
export async function guardarSimulacionActual() {
  const btn = document.getElementById('btn-save-simulation');
  const btnText = document.getElementById('btn-save-simulation-text');
  const originalText = btnText ? btnText.textContent : 'Guardar';

  const params = recopilarParametrosFormulario();

  try {
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Guardando...';

    const res = await guardarSimulacionAPI(params);

    // Actualizar el estado con el resultado recibido
    state.ultimaSimulacion = res.serieTemporal;
    state.ultimosParametros = res.parametros;
    state.ultimasEstadisticas = res.estadisticas;
    state.origenEjecucion = 'backend';
    state.backendDisponible = true;

    actualizarBadgeEstado('backend', `Guardado en BD (#${res.id})`);
    actualizarKPIs(res.estadisticas, res.tiempoRespuestaMs, res.parametros);
    actualizarTablaDatos(res.serieTemporal);

    const showGridTime = document.getElementById('toggle-grid-time')?.checked ?? true;
    const showEquilibriumTime = document.getElementById('toggle-equilibrium-time')?.checked ?? true;
    const showGridPhase = document.getElementById('toggle-grid-phase')?.checked ?? true;

    actualizarGraficas(res.serieTemporal, res.parametros, res.estadisticas, {
      showGridTime,
      showEquilibriumTime,
      showGridPhase
    });

    mostrarToast(`¡Ecosistema "${res.nombreEcosistema}" guardado exitosamente con ID #${res.id}!`, 'success', 4000);

    // Si el modal de historial está abierto, refrescar su contenido
    const historyModal = document.getElementById('history-modal');
    if (historyModal && !historyModal.classList.contains('hidden')) {
      cargarYRenderizarHistorial();
    }

  } catch (err) {
    console.error('Error al guardar simulación en el backend:', err);
    mostrarToast(`No se pudo guardar la simulación: ${err.message}`, 'error', 5000);
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = originalText;
  }
}

/**
 * Formatea una fecha ISO a un formato legible en español.
 */
function formatearFecha(isoStr) {
  if (!isoStr) return 'Fecha no registrada';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
}

/**
 * Consulta la lista de simulaciones desde GET /api/v1/simulaciones y renderiza las tarjetas en el modal.
 */
export async function cargarYRenderizarHistorial() {
  const container = document.getElementById('history-list-container');
  const summary = document.getElementById('history-status-summary');
  if (!container) return;

  container.innerHTML = `
    <div class="py-12 text-center text-slate-500 text-xs">
      <div class="animate-spin inline-block w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full mb-2"></div>
      <p>Consultando base de datos Spring Boot...</p>
    </div>
  `;

  try {
    const lista = await listarSimulacionesAPI();

    if (summary) {
      summary.textContent = `${lista.length} ecosistema${lista.length === 1 ? '' : 's'} guardado${lista.length === 1 ? '' : 's'}`;
    }

    if (!Array.isArray(lista) || lista.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2">
          <i data-lucide="inbox" class="w-8 h-8 text-slate-600 mx-auto"></i>
          <h4 class="text-sm font-semibold text-slate-300">No hay simulaciones guardadas</h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">
            Configura los parámetros del ecosistema en el panel lateral y presiona el botón <strong>"Guardar"</strong> para registrarlo en la base de datos.
          </p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons({ root: container });
      return;
    }

    // Renderizar tarjetas de cada simulación
    let html = '';
    lista.forEach(sim => {
      const fecha = formatearFecha(sim.fechaCreacion);
      const p = sim.parametros || {};
      const est = sim.estadisticas || {};

      html += `
        <div class="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="sim-item-${sim.id}">
          <div class="space-y-1.5 min-w-0">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                #${sim.id}
              </span>
              <h4 class="text-sm font-bold text-slate-100 truncate">${sim.nombreEcosistema || 'Ecosistema'}</h4>
            </div>
            <div class="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
              <span class="text-emerald-400">Presa: <strong>${sim.nombrePresa}</strong> (x₀: ${p.poblacionInicialPresas ?? '--'})</span>
              <span class="text-rose-400">Depredador: <strong>${sim.nombreDepredador}</strong> (y₀: ${p.poblacionInicialDepredadores ?? '--'})</span>
              <span class="text-slate-500 text-[10px]">Guardado: ${fecha}</span>
            </div>
            <div class="text-[10px] text-slate-400 font-mono flex flex-wrap gap-2 pt-0.5">
              <span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">α: ${p.alfa ?? '--'}</span>
              <span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">β: ${p.beta ?? '--'}</span>
              <span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">δ: ${p.delta ?? '--'}</span>
              <span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">γ: ${p.gamma ?? '--'}</span>
              <span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">T: ${p.tiempoTotal ?? '--'}</span>
              ${est.puntoEquilibrioPresas ? `<span class="text-teal-300 bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-800/40">Eq: (${est.puntoEquilibrioPresas.toFixed(1)}, ${est.puntoEquilibrioDepredadores?.toFixed(1) ?? '--'})</span>` : ''}
            </div>
          </div>

          <div class="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0">
            <!-- Botón Cargar -->
            <button type="button" class="btn-load-sim px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium transition flex items-center space-x-1 active:scale-95 cursor-pointer" data-id="${sim.id}">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Cargar</span>
            </button>

            <!-- Botón Eliminar -->
            <button type="button" class="btn-delete-sim p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition flex items-center justify-center active:scale-95 cursor-pointer" title="Eliminar simulación" data-id="${sim.id}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons({ root: container });
    }

    // Vincular listeners de Cargar y Eliminar
    container.querySelectorAll('.btn-load-sim').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await cargarSimulacionEnSimulador(id);
      });
    });

    container.querySelectorAll('.btn-delete-sim').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await confirmarYEliminarSimulacion(id);
      });
    });

  } catch (err) {
    console.error('Error al consultar historial:', err);
    if (summary) summary.textContent = 'Error de conexión';
    container.innerHTML = `
      <div class="p-6 text-center bg-rose-500/5 rounded-xl border border-rose-500/20 space-y-2">
        <i data-lucide="wifi-off" class="w-8 h-8 text-rose-400 mx-auto"></i>
        <h4 class="text-sm font-semibold text-rose-300">Backend Desconectado</h4>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          No se pudo conectar con la API en <code>${API_BASE_URL}</code>. Asegúrate de que el servidor Spring Boot esté corriendo en el puerto 8080.
        </p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons({ root: container });
  }
}

/**
 * Carga una simulación por su ID en el simulador y actualiza todas las vistas.
 * 
 * @param {number|string} id 
 */
async function cargarSimulacionEnSimulador(id) {
  try {
    mostrarToast(`Cargando simulación #${id}...`, 'info', 2000);
    const sim = await cargarSimulacionAPI(id);

    // Cargar parámetros en el formulario
    aplicarPreset(sim);

    // Actualizar select de presets a "custom"
    const presetSelect = document.getElementById('ecosystem-preset-select');
    if (presetSelect) presetSelect.value = 'custom';

    // Actualizar estado y vistas
    state.ultimaSimulacion = sim.serieTemporal;
    state.ultimosParametros = sim.parametros;
    state.ultimasEstadisticas = sim.estadisticas;
    state.origenEjecucion = 'backend';
    state.backendDisponible = true;

    actualizarBadgeEstado('backend', `Cargado #${sim.id} (${sim.nombreEcosistema})`);
    actualizarKPIs(sim.estadisticas, sim.tiempoRespuestaMs, sim.parametros);
    actualizarTablaDatos(sim.serieTemporal);

    const showGridTime = document.getElementById('toggle-grid-time')?.checked ?? true;
    const showEquilibriumTime = document.getElementById('toggle-equilibrium-time')?.checked ?? true;
    const showGridPhase = document.getElementById('toggle-grid-phase')?.checked ?? true;

    actualizarGraficas(sim.serieTemporal, sim.parametros, sim.estadisticas, {
      showGridTime,
      showEquilibriumTime,
      showGridPhase
    });

    // Cerrar modal de historial
    cerrarModalHistorial();
    mostrarToast(`Ecosistema "${sim.nombreEcosistema}" cargado exitosamente.`, 'success', 3500);

  } catch (err) {
    console.error('Error al cargar simulación:', err);
    mostrarToast(`Error al cargar simulación #${id}: ${err.message}`, 'error', 4500);
  }
}

/**
 * Solicita confirmación y elimina un ecosistema del backend.
 * 
 * @param {number|string} id 
 */
async function confirmarYEliminarSimulacion(id) {
  const confirmacion = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la simulación #${id}?`);
  if (!confirmacion) return;

  try {
    await eliminarSimulacionAPI(id);
    mostrarToast(`Simulación #${id} eliminada correctamente.`, 'success', 3000);
    cargarYRenderizarHistorial();
  } catch (err) {
    console.error('Error al eliminar simulación:', err);
    mostrarToast(`No se pudo eliminar la simulación #${id}: ${err.message}`, 'error', 4500);
  }
}

// ============================================================================
// MODAL DE HISTORIAL
// ============================================================================

function abrirModalHistorial() {
  const modal = document.getElementById('history-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  void modal.offsetWidth;
  modal.classList.remove('opacity-0');
  modal.classList.add('opacity-100');
  cargarYRenderizarHistorial();
}

function cerrarModalHistorial() {
  const modal = document.getElementById('history-modal');
  if (!modal) return;
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

function configurarModalHistorial() {
  const modal = document.getElementById('history-modal');
  const btnOpen = document.getElementById('btn-open-history-modal');
  const btnClose = document.getElementById('btn-close-history-modal');
  const btnCloseFooter = document.getElementById('btn-close-history-modal-footer');
  const btnRefresh = document.getElementById('btn-refresh-history');

  if (btnOpen) btnOpen.addEventListener('click', abrirModalHistorial);
  if (btnClose) btnClose.addEventListener('click', cerrarModalHistorial);
  if (btnCloseFooter) btnCloseFooter.addEventListener('click', cerrarModalHistorial);
  if (btnRefresh) btnRefresh.addEventListener('click', cargarYRenderizarHistorial);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrarModalHistorial();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        cerrarModalHistorial();
      }
    });
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
    mostrarToast('Primero ejecuta una simulación antes de exportar los datos.', 'warning');
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
  mostrarToast('Archivo CSV generado y descargado.', 'success', 2500);
}

/**
 * Genera y descarga los resultados completos de la simulación en formato JSON estructurado.
 */
export function exportarDatosJSON() {
  if (!state.ultimaSimulacion || state.ultimaSimulacion.length === 0) {
    mostrarToast('Primero ejecuta una simulación antes de exportar los datos.', 'warning');
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
  mostrarToast('Archivo JSON generado y descargado.', 'success', 2500);
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

  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });

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

  // 3. Configurar listeners de modales y toggles
  configurarModalMatematico();
  configurarModalHistorial();
  configurarToggleTabla();
  configurarTogglesGraficas();

  // 4. Selector de Preset
  const presetSelect = document.getElementById('ecosystem-preset-select');
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
      mostrarToast('Parámetros restablecidos al ecosistema base.', 'info', 2000);
    });
  }

  // 6. Botón Guardar Simulación en Base de Datos
  const btnSave = document.getElementById('btn-save-simulation');
  if (btnSave) {
    btnSave.addEventListener('click', guardarSimulacionActual);
  }

  // 7. Botón de Simulación y Envío de Formulario
  const form = document.getElementById('simulation-form');
  const btnSimulate = document.getElementById('btn-simulate');

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

  // 8. Botones de Exportación de Datos (CSV, JSON)
  const btnCsv = document.getElementById('btn-download-csv');
  const btnJson = document.getElementById('btn-download-json');

  if (btnCsv) btnCsv.addEventListener('click', exportarDatosCSV);
  if (btnJson) btnJson.addEventListener('click', exportarDatosJSON);

  // 9. Botones de Exportación de Imágenes de Gráficas (PNG)
  const btnExportTime = document.getElementById('btn-export-time-chart');
  const btnExportPhase = document.getElementById('btn-export-phase-chart');

  if (btnExportTime) {
    btnExportTime.addEventListener('click', () => {
      const p = state.ultimosParametros || {};
      const slug = (p.nombreEcosistema || 'ecosistema').toLowerCase().replace(/\s+/g, '_');
      exportarGraficaComoImagen('timeSeriesChart', `ecoflux_${slug}_serie_temporal.png`);
      mostrarToast('Imagen de serie temporal descargada.', 'success', 2000);
    });
  }

  if (btnExportPhase) {
    btnExportPhase.addEventListener('click', () => {
      const p = state.ultimosParametros || {};
      const slug = (p.nombreEcosistema || 'ecosistema').toLowerCase().replace(/\s+/g, '_');
      exportarGraficaComoImagen('phaseSpaceChart', `ecoflux_${slug}_espacio_fases.png`);
      mostrarToast('Imagen de espacio de fases descargada.', 'success', 2000);
    });
  }

  // 10. Detección no bloqueante de conectividad con backend y carga de presets
  try {
    const estadoConexion = await verificarConexionBackend(1800);
    state.backendDisponible = estadoConexion.online;

    if (estadoConexion.online) {
      actualizarBadgeEstado('backend', `API Backend Online (${estadoConexion.latenciaMs} ms)`);
      await inicializarPresets();
    } else {
      actualizarBadgeEstado('local', 'Modo Autónomo Local (RK4)');
      await inicializarPresets();
    }
  } catch {
    state.backendDisponible = false;
    actualizarBadgeEstado('local', 'Modo Autónomo Local (RK4)');
    await inicializarPresets();
  }

  // 11. Ejecución inicial con el preset activo para visualización viva inmediata
  ejecutarSimulacion();
});
