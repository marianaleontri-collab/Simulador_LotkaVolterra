/**
 * ============================================================================
 * EcoFlux: Guardián del Bioma — Bucle Principal y Controlador Maestro
 * Módulo: gameLoop.js
 * 
 * Orquesta la simulación en tiempo real a 60 FPS:
 * - Vincula el motor numérico continuo RK4 (rk4Engine.js).
 * - Sincroniza el terrario visual 2D y sistema de boids (WorldCanvas).
 * - Controla el HUD matemático vivo y radar de fase (hudCharts.js).
 * - Conecta con el backend Spring Boot / Modo Offline (api.js).
 * - Gestiona cartas de intervención, eventos climáticos aleatorios y condiciones de fin de partida.
 * ============================================================================
 */

import { WorldCanvas } from './worldCanvas.js';
import * as rk4Engine from './rk4Engine.js';
import * as hudCharts from './hudCharts.js';
import * as api from './api.js';

// ============================================================================
// ESTADO GLOBAL DE LA PARTIDA
// ============================================================================
const state = {
  estado: 'START', // 'START' | 'RUNNING' | 'PAUSED' | 'GAME_OVER'
  biomaKey: 'BOSQUE',
  bioma: null,
  
  // Tiempo virtual (1 día = 1.0 segundo a 1x)
  diaActual: 1.0,
  velocidad: 1.0, // 1.0 o 2.0
  lastTimestamp: 0,
  
  // Poblaciones dinámicas de Lotka-Volterra
  x: 80.0, // Presas
  y: 20.0, // Depredadores
  preyPeak: 80.0,
  predatorPeak: 20.0,
  
  // Parámetros ecológicos
  parametrosBase: { alfa: 0.8, beta: 0.02, delta: 0.01, gamma: 0.4 },
  parametrosActivos: { alfa: 0.8, beta: 0.02, delta: 0.01, gamma: 0.4 },
  
  // Energía de intervención (0 a 100, regenera +6/segundo)
  energia: 50.0,
  tasaRegeneracionEnergia: 6.0,
  
  // Cartas activas con duración
  modificadoresCartas: [], // { id, tipo, duracionRestante, duracionTotal }
  
  // Eventos climáticos aleatorios
  eventoClimatico: null, // { id, nombre, icono, descripcion, duracionRestante }
  proximoEventoDia: 12.0,
  
  // Estadísticas y métricas de desempeño
  intervencionesUsadas: 0,
  estabilidadAcumulada: 0,
  muestrasEstabilidad: 0,
  estabilidadPromedio: 100.0,
  historialJugador: [], // [{ dia, presas, depredadores }]
  ultimoMuestreoDia: 0,
  
  // Puntuación
  puntajeActual: 0,
  partidaGuardada: false
};

// Instancia única del terrario visual WorldCanvas
let worldInstance = null;

// ============================================================================
// DEFINICIÓN DE CARTAS Y COSTOS
// ============================================================================
const CARTAS_CONFIG = {
  rain: {
    id: 'rain',
    costo: 25,
    duracion: 8.0,
    nombre: 'Lluvia Fértil'
  },
  shelter: {
    id: 'shelter',
    costo: 30,
    duracion: 8.0,
    nombre: 'Refugio Natural'
  },
  migration: {
    id: 'migration',
    costo: 40,
    duracion: 0.0, // Instantáneo
    nombre: 'Migración de Presas'
  },
  predatorControl: {
    id: 'predatorControl',
    costo: 35,
    duracion: 8.0,
    nombre: 'Control de Depredadores'
  }
};

// ============================================================================
// EVENTOS CLIMÁTICOS ALEATORIOS POSIBLES
// ============================================================================
const EVENTOS_CLIMATICOS = [
  {
    id: 'SEQUIA',
    nombre: '¡Sequía Severa!',
    icono: 'fa-bolt',
    iconoColor: 'text-amber-400',
    descripcion: 'Escasez crítica de pastos. La tasa de natalidad de presas colapsa (-35% α).',
    modificadores: { alfaFactor: 0.65 }
  },
  {
    id: 'INVIERNO',
    nombre: '¡Invierno Glacial!',
    icono: 'fa-snowflake',
    iconoColor: 'text-sky-400',
    descripcion: 'Ventisca ártica. La mortandad natural de depredadores se dispara (+30% γ).',
    modificadores: { gammaFactor: 1.30 }
  },
  {
    id: 'PRIMAVERA',
    nombre: '¡Primavera Exuberante!',
    icono: 'fa-leaf',
    iconoColor: 'text-emerald-400',
    descripcion: 'Floración masiva. Los pastizales nutren una explosión de presas (+40% α).',
    modificadores: { alfaFactor: 1.40 }
  },
  {
    id: 'CALOR',
    nombre: '¡Ola de Calor Extremo!',
    icono: 'fa-fire',
    iconoColor: 'text-rose-400',
    descripcion: 'Estrés hídrico y agresividad. Depredación acelerada (+25% β) y mayor desgaste (+20% γ).',
    modificadores: { betaFactor: 1.25, gammaFactor: 1.20 }
  }
];

// ============================================================================
// UTILIDADES DOM Y TOASTS
// ============================================================================
function $(id) {
  return document.getElementById(id);
}

function showToast(mensaje, tipo = 'info') {
  const container = $('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const colorMap = {
    info: 'border-sky-500/40 bg-slate-900/90 text-sky-300',
    success: 'border-emerald-500/40 bg-slate-900/90 text-emerald-300',
    warning: 'border-amber-500/40 bg-slate-900/90 text-amber-300',
    error: 'border-rose-500/40 bg-slate-900/90 text-rose-300'
  };

  const borderClass = colorMap[tipo] || colorMap.info;
  toast.className = `flex items-center gap-2 px-4 py-2.5 rounded-xl border ${borderClass} shadow-xl backdrop-blur-md text-xs font-medium animate-slide-down pointer-events-auto transition-all duration-300`;
  toast.innerHTML = `<span>${mensaje}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ============================================================================
// RECALCULO DE PARÁMETROS ACTIVOS
// ============================================================================
function recalcularParametros() {
  const base = state.parametrosBase;
  let alfa = base.alfa;
  let beta = base.beta;
  let delta = base.delta;
  let gamma = base.gamma;

  // 1. Modificadores por cartas activas
  for (const mod of state.modificadoresCartas) {
    if (mod.tipo === 'rain') {
      alfa *= 1.35; // +35% alfa
    } else if (mod.tipo === 'shelter') {
      beta *= 0.60; // -40% beta
    } else if (mod.tipo === 'predatorControl') {
      gamma *= 1.30; // +30% gamma
    }
  }

  // 2. Modificador por evento climático
  if (state.eventoClimatico && state.eventoClimatico.modificadores) {
    const m = state.eventoClimatico.modificadores;
    if (m.alfaFactor) alfa *= m.alfaFactor;
    if (m.betaFactor) beta *= m.betaFactor;
    if (m.gammaFactor) gamma *= m.gammaFactor;
    if (m.deltaFactor) delta *= m.deltaFactor;
  }

  state.parametrosActivos = {
    alfa: Math.max(0.001, alfa),
    beta: Math.max(0.0001, beta),
    delta: Math.max(0.0001, delta),
    gamma: Math.max(0.001, gamma)
  };
}

// ============================================================================
// GESTIÓN DE EVENTOS CLIMÁTICOS
// ============================================================================
function dispararEventoClimatico() {
  const eventoIdx = Math.floor(Math.random() * EVENTOS_CLIMATICOS.length);
  const plantilla = EVENTOS_CLIMATICOS[eventoIdx];

  state.eventoClimatico = {
    ...plantilla,
    duracionRestante: 8.0,
    duracionTotal: 8.0
  };

  recalcularParametros();

  const banner = $('weather-event-banner');
  const icon = $('weather-event-icon');
  const title = $('weather-event-title');
  const desc = $('weather-event-desc');
  const timer = $('weather-event-timer');

  if (banner && icon && title && desc && timer) {
    icon.innerHTML = `<i class="fa-solid ${plantilla.icono} ${plantilla.iconoColor}"></i>`;
    title.textContent = plantilla.nombre;
    title.className = `font-display font-bold text-xs uppercase tracking-wider ${plantilla.iconoColor}`;
    desc.textContent = plantilla.descripcion;
    timer.textContent = '08s';
    banner.classList.remove('hidden');
  }

  showToast(`Alerta Climática: ${plantilla.nombre}`, 'warning');
}

function actualizarEventoClimatico(dtVirtual) {
  if (state.eventoClimatico) {
    state.eventoClimatico.duracionRestante -= dtVirtual;

    const timer = $('weather-event-timer');
    if (timer) {
      const seg = Math.max(0, Math.ceil(state.eventoClimatico.duracionRestante));
      timer.textContent = `${String(seg).padStart(2, '0')}s`;
    }

    if (state.eventoClimatico.duracionRestante <= 0) {
      state.eventoClimatico = null;
      recalcularParametros();

      const banner = $('weather-event-banner');
      if (banner) banner.classList.add('hidden');

      // Programar siguiente evento entre 12 y 15 días posteriores
      state.proximoEventoDia = state.diaActual + 12.0 + (Math.random() * 3.0);
      showToast('Las condiciones climáticas han vuelto a la normalidad.', 'info');
    }
  } else {
    if (state.diaActual >= state.proximoEventoDia) {
      dispararEventoClimatico();
    }
  }
}

// ============================================================================
// GESTIÓN DE CARTAS DE INTERVENCIÓN
// ============================================================================
function activarCarta(tipoCarta) {
  if (state.estado !== 'RUNNING') {
    showToast('La simulación debe estar activa para intervenir.', 'warning');
    return;
  }

  const cfg = CARTAS_CONFIG[tipoCarta];
  if (!cfg) return;

  if (state.energia < cfg.costo) {
    showToast(`Energía insuficiente. Requiere ${cfg.costo}⚡.`, 'warning');
    return;
  }

  // Deducir costo
  state.energia = Math.max(0, state.energia - cfg.costo);
  state.intervencionesUsadas++;

  // Aplicar efecto
  if (tipoCarta === 'rain') {
    state.modificadoresCartas.push({
      id: Date.now() + Math.random(),
      tipo: 'rain',
      duracionRestante: cfg.duracion,
      duracionTotal: cfg.duracion
    });
    if (worldInstance?.setRainEffect) worldInstance.setRainEffect(true);
    showToast('Lluvia Fértil activada (+35% tasa de presas por 8s)', 'success');
  } else if (tipoCarta === 'shelter') {
    state.modificadoresCartas.push({
      id: Date.now() + Math.random(),
      tipo: 'shelter',
      duracionRestante: cfg.duracion,
      duracionTotal: cfg.duracion
    });
    if (worldInstance?.setShelterEffect) worldInstance.setShelterEffect(true);
    showToast('Refugio Natural desplegado (-40% depredación por 8s)', 'success');
  } else if (tipoCarta === 'migration') {
    state.x += 15.0;
    state.preyPeak = Math.max(state.preyPeak, state.x);
    if (worldInstance?.triggerMigrationEffect) worldInstance.triggerMigrationEffect();
    showToast('Migración de presas exitosa (+15 presas instantáneas)', 'success');
  } else if (tipoCarta === 'predatorControl') {
    state.modificadoresCartas.push({
      id: Date.now() + Math.random(),
      tipo: 'predatorControl',
      duracionRestante: cfg.duracion,
      duracionTotal: cfg.duracion
    });
    if (worldInstance?.triggerPredatorControlEffect) worldInstance.triggerPredatorControlEffect();
    showToast('Control ecológico de depredadores activado (+30% dispersión por 8s)', 'success');
  }

  recalcularParametros();
}

function actualizarModificadoresCartas(dtVirtual) {
  let huboCambios = false;

  for (let i = state.modificadoresCartas.length - 1; i >= 0; i--) {
    const mod = state.modificadoresCartas[i];
    mod.duracionRestante -= dtVirtual;

    if (mod.duracionRestante <= 0) {
      state.modificadoresCartas.splice(i, 1);
      huboCambios = true;

      // Apagar efectos continuos si no quedan otras cartas activas del mismo tipo
      if (mod.tipo === 'rain') {
        const quedanLluvias = state.modificadoresCartas.some(m => m.tipo === 'rain');
        if (!quedanLluvias && worldInstance?.setRainEffect) {
          worldInstance.setRainEffect(false);
        }
      } else if (mod.tipo === 'shelter') {
        const quedanRefugios = state.modificadoresCartas.some(m => m.tipo === 'shelter');
        if (!quedanRefugios && worldInstance?.setShelterEffect) {
          worldInstance.setShelterEffect(false);
        }
      }
    }
  }

  if (huboCambios) {
    recalcularParametros();
  }
}

// ============================================================================
// ACTUALIZACIÓN DEL HUD MATEMÁTICO Y DE ESTADO
// ============================================================================
function actualizarHUD(dtReal) {
  // 1. Días y barra de progreso
  const currentDayEl = $('current-day');
  const targetDayEl = $('target-day');
  const dayProgressBar = $('day-progress-bar');
  const diasObjetivo = state.bioma?.diasObjetivo || 60;

  if (currentDayEl) currentDayEl.textContent = Math.floor(state.diaActual);
  if (targetDayEl) targetDayEl.textContent = diasObjetivo;
  if (dayProgressBar) {
    const pct = Math.min(100, Math.max(0, (state.diaActual / diasObjetivo) * 100));
    dayProgressBar.style.width = `${pct}%`;
  }

  // 2. Energía y estados de cartas
  const energyText = $('energy-text');
  const energyBar = $('energy-bar');
  if (energyText) energyText.textContent = `${Math.floor(state.energia)} / 100`;
  if (energyBar) energyBar.style.width = `${Math.min(100, Math.max(0, state.energia))}%`;

  const btnRain = $('card-rain');
  const btnShelter = $('card-shelter');
  const btnMigration = $('card-migration');
  const btnPredator = $('card-predator-control');

  const updateCardState = (btn, costo, tipo) => {
    if (!btn) return;
    const alcanzable = state.energia >= costo && state.estado === 'RUNNING';
    const isActive = state.modificadoresCartas.some(m => m.tipo === tipo);

    if (alcanzable) {
      btn.classList.remove('opacity-40', 'cursor-not-allowed');
      btn.removeAttribute('disabled');
    } else {
      btn.classList.add('opacity-40', 'cursor-not-allowed');
      btn.setAttribute('disabled', 'true');
    }

    if (isActive) {
      btn.classList.add('ring-2', 'ring-emerald-400');
    } else {
      btn.classList.remove('ring-2', 'ring-emerald-400');
    }
  };

  updateCardState(btnRain, CARTAS_CONFIG.rain.costo, 'rain');
  updateCardState(btnShelter, CARTAS_CONFIG.shelter.costo, 'shelter');
  updateCardState(btnMigration, CARTAS_CONFIG.migration.costo, 'migration');
  updateCardState(btnPredator, CARTAS_CONFIG.predatorControl.costo, 'predatorControl');

  // 3. Ecuaciones vivas (Parámetros y Derivadas instantáneas)
  const pAlpha = $('param-alpha');
  const pBeta = $('param-beta');
  const pDelta = $('param-delta');
  const pGamma = $('param-gamma');

  if (pAlpha) pAlpha.textContent = state.parametrosActivos.alfa.toFixed(3);
  if (pBeta) pBeta.textContent = state.parametrosActivos.beta.toFixed(3);
  if (pDelta) pDelta.textContent = state.parametrosActivos.delta.toFixed(3);
  if (pGamma) pGamma.textContent = state.parametrosActivos.gamma.toFixed(3);

  const { dx, dy } = rk4Engine.calcularDerivadas(state.x, state.y, state.parametrosActivos);

  const rateDxdt = $('rate-dxdt');
  const arrowDxdt = $('arrow-dxdt');
  if (rateDxdt) {
    rateDxdt.textContent = `${dx >= 0 ? '+' : ''}${dx.toFixed(2)}`;
    rateDxdt.className = `font-bold ${dx >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  }
  if (arrowDxdt) {
    arrowDxdt.className = `fa-solid ${dx >= 0 ? 'fa-arrow-up text-emerald-400' : 'fa-arrow-down text-rose-400'} text-[10px]`;
  }

  const rateDydt = $('rate-dydt');
  const arrowDydt = $('arrow-dydt');
  if (rateDydt) {
    rateDydt.textContent = `${dy >= 0 ? '+' : ''}${dy.toFixed(2)}`;
    rateDydt.className = `font-bold ${dy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  }
  if (arrowDydt) {
    arrowDydt.className = `fa-solid ${dy >= 0 ? 'fa-arrow-up text-emerald-400' : 'fa-arrow-down text-rose-400'} text-[10px]`;
  }

  // 4. Poblaciones
  const preyCount = $('prey-count');
  const predatorCount = $('predator-count');
  const canvasPrey = $('canvas-prey-badge');
  const canvasPredator = $('canvas-predator-badge');

  const roundX = Math.round(state.x);
  const roundY = Math.round(state.y);

  if (preyCount) preyCount.textContent = roundX;
  if (predatorCount) predatorCount.textContent = roundY;
  if (canvasPrey) canvasPrey.textContent = roundX;
  if (canvasPredator) canvasPredator.textContent = roundY;

  // Actualizar picos
  state.preyPeak = Math.max(state.preyPeak, state.x);
  state.predatorPeak = Math.max(state.predatorPeak, state.y);

  const preyPeakEl = $('prey-peak');
  const predPeakEl = $('predator-peak');
  if (preyPeakEl) preyPeakEl.textContent = Math.round(state.preyPeak);
  if (predPeakEl) predPeakEl.textContent = Math.round(state.predatorPeak);

  // 5. Radar de Retrato de Fase
  hudCharts.updatePhaseRadar(state.x, state.y);

  // 6. Índice de Estabilidad y Consejero del Ecosistema
  const eq = state.bioma?.puntoEquilibrio || { x: 40, y: 20 };
  const devX = Math.abs(state.x - eq.x) / (eq.x || 1);
  const devY = Math.abs(state.y - eq.y) / (eq.y || 1);
  const devPromedio = (devX + devY) / 2;
  const estabilidadInst = Math.max(0, Math.min(100, Math.round(100 * (1 - Math.min(1.0, devPromedio)))));

  state.estabilidadAcumulada += estabilidadInst;
  state.muestrasEstabilidad++;
  state.estabilidadPromedio = state.estabilidadAcumulada / state.muestrasEstabilidad;

  const stabVal = $('stability-value');
  const stabMeter = $('stability-meter');
  if (stabVal) stabVal.textContent = `${estabilidadInst}%`;
  if (stabMeter) stabMeter.style.width = `${estabilidadInst}%`;

  // Calcular puntuación acumulativa en vivo
  const diasSobrevividos = Math.floor(state.diaActual);
  state.puntajeActual = Math.max(0, Math.round(
    (state.estabilidadPromedio * 18) + (diasSobrevividos * 8) - (state.intervencionesUsadas * 6)
  ));
  const scoreEl = $('current-score');
  if (scoreEl) scoreEl.textContent = `${state.puntajeActual.toLocaleString()} pts`;

  // Consejero ecológico dinámico
  const adviceEl = $('ecosystem-status-advice');
  if (adviceEl) {
    if (state.x < 15) {
      adviceEl.textContent = '¡Alerta! Presas en peligro inminente de extinción. Aplica Lluvia Fértil o Migración.';
      adviceEl.className = 'text-rose-400 font-semibold';
    } else if (state.y < 5) {
      adviceEl.textContent = '¡Alerta! Depredadores escasos. Si colapsan, las presas se superpoblarán.';
      adviceEl.className = 'text-amber-400 font-semibold';
    } else if (estabilidadInst >= 80) {
      adviceEl.textContent = 'Ecosistema en equilibrio armónico regular y saludable.';
      adviceEl.className = 'text-slate-300';
    } else {
      adviceEl.textContent = 'Oscilaciones marcadas. Mantén la vigilancia sobre las órbitas de fase.';
      adviceEl.className = 'text-sky-300';
    }
  }
}

// ============================================================================
// VERIFICACIÓN DE FIN DE PARTIDA (VICTORIA O EXTINCIÓN)
// ============================================================================
async function finalizarPartida(victoria, causa) {
  state.estado = 'GAME_OVER';
  if (worldInstance?.pause) worldInstance.pause();

  const diasObjetivo = state.bioma?.diasObjetivo || 60;
  const diasSobrevividos = Math.min(diasObjetivo, Math.floor(state.diaActual));

  // Puntaje final ponderado
  const bonoVictoria = victoria ? 600 : 0;
  const penalizacion = state.intervencionesUsadas * 10;
  const puntajeFinal = Math.max(0, Math.round(
    (state.estabilidadPromedio * 20) + (diasSobrevividos * 10) + bonoVictoria - penalizacion
  ));

  // Actualizar Modal de Fin de Partida
  const modalGameOver = $('modal-game-over');
  const badge = $('game-over-badge');
  const title = $('game-over-title');
  const subtitle = $('game-over-subtitle');
  const finalScoreEl = $('final-score');
  const daysSurvivedEl = $('days-survived');
  const avgStabilityEl = $('avg-stability');

  if (badge) {
    if (victoria) {
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold mb-2';
      badge.innerHTML = '<i class="fa-solid fa-trophy"></i> <span>¡Misión Cumplida!</span>';
    } else {
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-semibold mb-2';
      badge.innerHTML = '<i class="fa-solid fa-skull"></i> <span>Colapso Ecológico</span>';
    }
  }

  if (title) {
    title.textContent = victoria ? 'Equilibrio Preservado' : 'Bioma Extinto';
  }

  if (subtitle) {
    subtitle.textContent = victoria
      ? `Has mantenido el bioma en perfecta estabilidad durante los ${diasObjetivo} días requeridos.`
      : `El ecosistema colapsó en el día ${diasSobrevividos} por ${causa}.`;
  }

  if (finalScoreEl) finalScoreEl.textContent = puntajeFinal.toLocaleString();
  if (daysSurvivedEl) daysSurvivedEl.textContent = `${diasSobrevividos} / ${diasObjetivo}`;
  if (avgStabilityEl) avgStabilityEl.textContent = `${state.estabilidadPromedio.toFixed(1)}%`;

  if (modalGameOver) {
    modalGameOver.classList.remove('hidden-modal');
  }

  // Obtener y graficar comparación final (Jugador vs Proyección Natural)
  try {
    const serieNatural = await api.obtenerProyeccionNatural(
      state.bioma.id,
      state.parametrosBase,
      state.bioma.x0,
      state.bioma.y0,
      diasObjetivo
    );
    hudCharts.renderComparisonChart('comparisonChart', state.historialJugador, serieNatural, diasObjetivo);
  } catch (err) {
    console.error('[gameLoop] Error al renderizar gráfica comparativa final:', err);
  }

  // Almacenar datos para el guardado
  state.registroFinal = {
    nombreJugador: 'Guardián',
    nivelId: state.bioma.id,
    puntaje: puntajeFinal,
    diasSobrevividos: diasSobrevividos,
    estabilidadPromedio: state.estabilidadPromedio,
    intervencionesUsadas: state.intervencionesUsadas,
    victoria: victoria
  };
}

// ============================================================================
// CARGA Y REINICIO DE BIOMAS
// ============================================================================
export function cargarBioma(biomaKey = 'BOSQUE') {
  const config = api.obtenerConfiguracionBioma(biomaKey);
  state.biomaKey = config.temaVisual;
  state.bioma = config;

  state.diaActual = 1.0;
  state.x = config.poblacionInicialPresas;
  state.y = config.poblacionInicialDepredadores;
  state.preyPeak = state.x;
  state.predatorPeak = state.y;

  state.parametrosBase = {
    alfa: config.alfa,
    beta: config.beta,
    delta: config.delta,
    gamma: config.gamma
  };
  state.parametrosActivos = { ...state.parametrosBase };

  state.energia = 50.0;
  state.modificadoresCartas = [];
  state.eventoClimatico = null;
  state.proximoEventoDia = 12.0 + (Math.random() * 3.0);

  state.intervencionesUsadas = 0;
  state.estabilidadAcumulada = 0;
  state.muestrasEstabilidad = 0;
  state.estabilidadPromedio = 100.0;
  state.historialJugador = [
    { dia: 1.0, presas: state.x, depredadores: state.y }
  ];
  state.ultimoMuestreoDia = 1.0;
  state.puntajeActual = 0;
  state.partidaGuardada = false;

  // Actualizar UI del Header
  const activeBadge = $('active-biome-badge');
  const biomeIcon = $('current-biome-icon');
  if (activeBadge) activeBadge.textContent = config.nombre;
  if (biomeIcon) {
    if (config.temaVisual === 'BOSQUE') biomeIcon.className = 'fa-solid fa-tree';
    else if (config.temaVisual === 'SABANA') biomeIcon.className = 'fa-solid fa-sun';
    else if (config.temaVisual === 'TUNDRA') biomeIcon.className = 'fa-solid fa-snowflake';
  }

  const preyInitialEl = $('prey-initial');
  const predInitialEl = $('predator-initial');
  if (preyInitialEl) preyInitialEl.textContent = config.x0;
  if (predInitialEl) predInitialEl.textContent = config.y0;

  const eqCoordsEl = $('equilibrium-coords');
  if (eqCoordsEl) {
    eqCoordsEl.textContent = `(${config.puntoEquilibrio.x.toFixed(1)}, ${config.puntoEquilibrio.y.toFixed(1)})`;
  }

  // Ocultar banner climático si estaba activo
  const banner = $('weather-event-banner');
  if (banner) banner.classList.add('hidden');

  // Inicializar o reiniciar WorldCanvas
  if (worldInstance) {
    worldInstance.setBiome(config.temaVisual);
    worldInstance.syncEntities(Math.round(state.x), Math.round(state.y));
  }

  // Reiniciar Mini Radar de fase
  hudCharts.resetPhaseRadar(config.puntoEquilibrio);

  showToast(`Bioma cargado: ${config.nombre}`, 'info');
}

// ============================================================================
// BUCLE PRINCIPAL DE ANIMACIÓN (60 FPS)
// ============================================================================
function gameStep(timestamp) {
  if (!state.lastTimestamp) state.lastTimestamp = timestamp;
  let dtReal = (timestamp - state.lastTimestamp) / 1000.0;
  state.lastTimestamp = timestamp;

  // Acotar dtReal para evitar saltos drásticos al cambiar de pestaña
  if (dtReal > 0.1) dtReal = 0.1;

  if (state.estado === 'RUNNING') {
    const dtVirtual = dtReal * state.velocidad;

    // 1. Avanzar tiempo virtual
    state.diaActual += dtVirtual;

    // 2. Regenerar energía
    state.energia = Math.min(100.0, state.energia + (state.tasaRegeneracionEnergia * dtVirtual));

    // 3. Actualizar temporizadores de cartas y clima
    actualizarModificadoresCartas(dtVirtual);
    actualizarEventoClimatico(dtVirtual);

    // 4. Paso de integración numérica RK4 continua
    const nextPop = rk4Engine.pasoRk4(state.x, state.y, state.parametrosActivos, dtVirtual);
    state.x = nextPop.x;
    state.y = nextPop.y;

    // 5. Muestreo de historial para la gráfica comparativa final
    if (state.diaActual - state.ultimoMuestreoDia >= 0.5) {
      state.historialJugador.push({
        dia: Math.round(state.diaActual * 10) / 10,
        presas: Math.round(state.x * 10) / 10,
        depredadores: Math.round(state.y * 10) / 10
      });
      state.ultimoMuestreoDia = state.diaActual;
    }

    // 6. Sincronizar sprites del terrario
    if (worldInstance?.syncEntities) {
      worldInstance.syncEntities(Math.round(state.x), Math.round(state.y));
    }

    // 7. Actualizar HUD y radar
    actualizarHUD(dtReal);

    // 8. Verificar condiciones de victoria o extinción
    if (state.x < 1.0) {
      finalizarPartida(false, 'extinción total de las presas');
    } else if (state.y < 1.0) {
      finalizarPartida(false, 'inanición y extinción de los depredadores');
    } else if (state.diaActual >= (state.bioma?.diasObjetivo || 60)) {
      finalizarPartida(true, 'armonía ecológica completa');
    }
  }

  // Renderizado del terrario visual independiente de pausa
  if (worldInstance?.render) {
    worldInstance.render(dtReal);
  }

  requestAnimationFrame(gameStep);
}

// ============================================================================
// CARGA Y RENDERIZADO DE LA TABLA DE CLASIFICACIÓN (RANKING)
// ============================================================================
async function cargarYRenderizarRanking() {
  const tbody = $('ranking-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">Cargando clasificación...</td></tr>`;

  try {
    const lista = await api.obtenerRanking();
    if (!lista || lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">Aún no hay partidas registradas en el Salón de Honor.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    lista.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition';

      const medalla = index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `${index + 1}`;
      const colorRank = index === 0 ? 'text-amber-400 font-bold' : index === 1 ? 'text-slate-300 font-bold' : index === 2 ? 'text-amber-600 font-bold' : 'text-slate-400';
      const fechaCorta = item.fecha ? new Date(item.fecha).toLocaleDateString() : 'Reciente';

      tr.innerHTML = `
        <td class="py-2.5 px-3 ${colorRank}">${medalla}</td>
        <td class="py-2.5 px-3 font-semibold text-white">${item.nombreJugador || 'Anónimo'}</td>
        <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">${item.nombreNivel || 'Bioma'}</span></td>
        <td class="py-2.5 px-3 text-slate-300 font-mono">${item.diasSobrevividos || 0}d</td>
        <td class="py-2.5 px-3 text-cyan-300 font-mono">${Number(item.estabilidadPromedio || 0).toFixed(1)}%</td>
        <td class="py-2.5 px-3 text-right font-mono font-bold text-amber-300">${(item.puntaje || 0).toLocaleString()} pts</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('[gameLoop] Error al cargar ranking:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-rose-400">Error al consultar clasificación.</td></tr>`;
  }
}

// ============================================================================
// INICIALIZACIÓN DE EVENTOS DE INTERFAZ Y MODALES
// ============================================================================
function inicializarEventosUI() {
  // 1. Selector de Bioma inicial y Modal de inicio
  const modalBiomeSelect = $('modal-biome-select');
  const biomeCards = document.querySelectorAll('.biome-card');

  biomeCards.forEach(card => {
    card.addEventListener('click', () => {
      biomeCards.forEach(c => {
        c.classList.remove('border-emerald-500', 'border-amber-500', 'border-cyan-500');
        c.classList.add('border-slate-800');
      });

      const biomeKey = card.getAttribute('data-biome') || 'BOSQUE';
      state.biomaKey = biomeKey;

      if (biomeKey === 'BOSQUE') card.classList.add('border-emerald-500');
      else if (biomeKey === 'SABANA') card.classList.add('border-amber-500');
      else if (biomeKey === 'TUNDRA') card.classList.add('border-cyan-500');
    });
  });

  const btnStartMission = $('btn-start-mission');
  if (btnStartMission) {
    btnStartMission.addEventListener('click', () => {
      cargarBioma(state.biomaKey);
      if (modalBiomeSelect) modalBiomeSelect.classList.add('hidden-modal');
      state.estado = 'RUNNING';
      if (worldInstance?.resume) worldInstance.resume();
      showToast('¡Simulación iniciada! Protege el bioma.', 'success');
    });
  }

  const btnChangeBiome = $('btn-change-biome');
  if (btnChangeBiome) {
    btnChangeBiome.addEventListener('click', () => {
      state.estado = 'PAUSED';
      if (worldInstance?.pause) worldInstance.pause();
      if (modalBiomeSelect) modalBiomeSelect.classList.remove('hidden-modal');
    });
  }

  // 2. Control de Pausa y Reanudación
  const btnPause = $('btn-pause');
  const pauseIcon = $('pause-icon');
  const pauseText = $('pause-text');

  const togglePause = () => {
    if (state.estado === 'RUNNING') {
      state.estado = 'PAUSED';
      if (pauseIcon) pauseIcon.className = 'fa-solid fa-play text-amber-400';
      if (pauseText) pauseText.textContent = 'Reanudar';
      if (worldInstance?.pause) worldInstance.pause();
      showToast('Simulación en pausa', 'info');
    } else if (state.estado === 'PAUSED') {
      state.estado = 'RUNNING';
      if (pauseIcon) pauseIcon.className = 'fa-solid fa-pause text-emerald-400';
      if (pauseText) pauseText.textContent = 'Pausar';
      if (worldInstance?.resume) worldInstance.resume();
      showToast('Simulación reanudada', 'info');
    }
  };

  if (btnPause) btnPause.addEventListener('click', togglePause);

  // 3. Control de Velocidad (1x / 2x)
  const btnSpeed1x = $('btn-speed-1x');
  const btnSpeed2x = $('btn-speed-2x');

  if (btnSpeed1x && btnSpeed2x) {
    btnSpeed1x.addEventListener('click', () => {
      state.velocidad = 1.0;
      btnSpeed1x.className = 'px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/40 transition';
      btnSpeed2x.className = 'px-2 py-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-mono text-xs font-bold transition ml-0.5';
      showToast('Velocidad ajustada a 1x', 'info');
    });

    btnSpeed2x.addEventListener('click', () => {
      state.velocidad = 2.0;
      btnSpeed2x.className = 'px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/40 transition ml-0.5';
      btnSpeed1x.className = 'px-2 py-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-mono text-xs font-bold transition';
      showToast('Velocidad ajustada a 2x', 'info');
    });
  }

  // 4. Reiniciar Partida
  const btnRestart = $('btn-restart');
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      cargarBioma(state.biomaKey);
      state.estado = 'RUNNING';
      if (pauseIcon) pauseIcon.className = 'fa-solid fa-pause text-emerald-400';
      if (pauseText) pauseText.textContent = 'Pausar';
      showToast('Ecosistema reiniciado.', 'warning');
    });
  }

  // 5. Botones de Cartas de Intervención
  $('card-rain')?.addEventListener('click', () => activarCarta('rain'));
  $('card-shelter')?.addEventListener('click', () => activarCarta('shelter'));
  $('card-migration')?.addEventListener('click', () => activarCarta('migration'));
  $('card-predator-control')?.addEventListener('click', () => activarCarta('predatorControl'));

  // 6. Modal de Ranking (Abrir / Cerrar)
  const modalRanking = $('modal-ranking');
  $('btn-open-ranking')?.addEventListener('click', () => {
    if (modalRanking) {
      modalRanking.classList.remove('hidden-modal');
      cargarYRenderizarRanking();
    }
  });
  $('btn-close-ranking')?.addEventListener('click', () => {
    if (modalRanking) modalRanking.classList.add('hidden-modal');
  });

  // 7. Modal de Guía Científica
  const modalGuide = $('modal-guide');
  $('btn-open-guide')?.addEventListener('click', () => {
    if (modalGuide) modalGuide.classList.remove('hidden-modal');
  });
  $('btn-close-guide')?.addEventListener('click', () => {
    if (modalGuide) modalGuide.classList.add('hidden-modal');
  });
  $('btn-close-guide-footer')?.addEventListener('click', () => {
    if (modalGuide) modalGuide.classList.add('hidden-modal');
  });

  // 8. Modal de Fin de Partida (Guardar Puntos y Jugar de Nuevo)
  const modalGameOver = $('modal-game-over');
  const btnSaveScore = $('btn-save-score');
  const playerNameInput = $('player-name-input');
  const btnPlayAgain = $('btn-play-again');

  if (btnSaveScore) {
    btnSaveScore.addEventListener('click', async () => {
      if (state.partidaGuardada) {
        showToast('Esta partida ya ha sido registrada.', 'warning');
        return;
      }

      const nombre = (playerNameInput?.value || '').trim() || 'Guardián';
      if (state.registroFinal) {
        state.registroFinal.nombreJugador = nombre;
        btnSaveScore.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        try {
          await api.guardarEnRanking(state.registroFinal);
          state.partidaGuardada = true;
          btnSaveScore.innerHTML = '<i class="fa-solid fa-check"></i> ¡Guardado!';
          btnSaveScore.classList.add('bg-emerald-500', 'text-white');
          showToast('¡Puntaje registrado exitosamente en el Salón de Honor!', 'success');
        } catch (err) {
          console.error('[gameLoop] Error al guardar partida:', err);
          btnSaveScore.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Reintentar';
          showToast('Error al conectar con el ranking. Intenta nuevamente.', 'error');
        }
      }
    });
  }

  if (btnPlayAgain) {
    btnPlayAgain.addEventListener('click', () => {
      if (modalGameOver) modalGameOver.classList.add('hidden-modal');
      if (modalBiomeSelect) modalBiomeSelect.classList.remove('hidden-modal');
    });
  }

  // 9. Atajos de Teclado Científicos
  window.addEventListener('keydown', (e) => {
    // Si el usuario está escribiendo en un input, ignorar atajos globales
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePause();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      cargarBioma(state.biomaKey);
      state.estado = 'RUNNING';
    } else if (e.key === '1') {
      activarCarta('rain');
    } else if (e.key === '2') {
      activarCarta('shelter');
    } else if (e.key === '3') {
      activarCarta('migration');
    } else if (e.key === '4') {
      activarCarta('predatorControl');
    }
  });

  // 10. Monitoreo y comprobación de estado de conexión Backend
  verificarConectividadBackend();
}

async function verificarConectividadBackend() {
  const isOnline = await api.verificarEstadoBackend();
  const pingEl = $('backend-status-ping');
  const dotEl = $('backend-status-dot');
  const textEl = $('backend-status-text');

  if (textEl && dotEl && pingEl) {
    if (isOnline) {
      pingEl.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
      dotEl.className = 'relative inline-flex rounded-full h-2 w-2 bg-emerald-500';
      textEl.textContent = 'Online';
      textEl.className = 'text-emerald-400 font-medium';
    } else {
      pingEl.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75';
      dotEl.className = 'relative inline-flex rounded-full h-2 w-2 bg-amber-500';
      textEl.textContent = 'Modo Local Activo';
      textEl.className = 'text-amber-400 font-medium';
    }
  }
}

// ============================================================================
// PUNTO DE ENTRADA PRINCIPAL
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('[EcoFlux] Inicializando motor de juego y HUD matemático...');

  // 1. Inicializar WorldCanvas en el elemento canvas principal
  const canvasElement = $('worldCanvas');
  if (canvasElement) {
    worldInstance = new WorldCanvas();
    worldInstance.init(canvasElement, 'BOSQUE');
  }

  // 2. Inicializar Mini Radar de Retrato de Fase
  const configInicial = api.obtenerConfiguracionBioma('BOSQUE');
  hudCharts.initPhaseRadar('phaseRadarChart', configInicial.puntoEquilibrio);

  // 3. Vincular eventos y atajos de interfaz
  inicializarEventosUI();

  // 4. Preparar configuración base inicial
  cargarBioma('BOSQUE');

  // 5. Arrancar el loop de 60 FPS
  requestAnimationFrame(gameStep);
});
