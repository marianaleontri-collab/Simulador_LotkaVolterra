/**
 * ============================================================================
 * EcoFlux — Motor Numérico Autónomo Runge-Kutta 4to Orden (RK4)
 * Módulo: mockRk4.js
 * 
 * Implementación de alta precisión en JavaScript ES6 para resolver
 * el sistema diferencial no lineal depredador-presa de Lotka-Volterra:
 *   dx/dt = alfa * x - beta * x * y
 *   dy/dt = delta * x * y - gamma * y
 * 
 * Garantiza total equivalencia con el motor desarrollado en Java.
 * ============================================================================
 */

/**
 * Derivada temporal de la población de presas (dx/dt).
 * 
 * @param {Object} p Parámetros del sistema { alfa, beta }
 * @param {number} x Población actual de presas
 * @param {number} y Población actual de depredadores
 * @returns {number} Tasa de cambio instantánea dx/dt
 */
function dx(p, x, y) {
  return p.alfa * x - p.beta * x * y;
}

/**
 * Derivada temporal de la población de depredadores (dy/dt).
 * 
 * @param {Object} p Parámetros del sistema { delta, gamma }
 * @param {number} x Población actual de presas
 * @param {number} y Población actual de depredadores
 * @returns {number} Tasa de cambio instantánea dy/dt
 */
function dy(p, x, y) {
  return p.delta * x * y - p.gamma * y;
}

/**
 * Realiza un único paso de integración numérica usando Runge-Kutta de 4to orden (RK4).
 * Combina 4 estimaciones de pendiente ponderadas: (k1 + 2*k2 + 2*k3 + k4) / 6.
 * 
 * @param {Object} p Parámetros del modelo
 * @param {number} x Población de presas en t
 * @param {number} y Población de depredadores en t
 * @param {number} h Tamaño de paso de integración
 * @returns {[number, number]} [nuevasPresas, nuevosDepredadores] en t + h
 */
export function pasoRk4(p, x, y, h) {
  const k1x = dx(p, x, y);
  const k1y = dy(p, x, y);

  const k2x = dx(p, x + 0.5 * h * k1x, y + 0.5 * h * k1y);
  const k2y = dy(p, x + 0.5 * h * k1x, y + 0.5 * h * k1y);

  const k3x = dx(p, x + 0.5 * h * k2x, y + 0.5 * h * k2y);
  const k3y = dy(p, x + 0.5 * h * k2x, y + 0.5 * h * k2y);

  const k4x = dx(p, x + h * k3x, y + h * k3y);
  const k4y = dy(p, x + h * k3x, y + h * k3y);

  const nextX = x + (h / 6.0) * (k1x + 2.0 * k2x + 2.0 * k3x + k4x);
  const nextY = y + (h / 6.0) * (k1y + 2.0 * k2y + 2.0 * k3y + k4y);

  // Evita poblaciones numéricamente negativas por error de truncamiento
  return [Math.max(0, nextX), Math.max(0, nextY)];
}

/**
 * Cantidad invariante conservada de Lotka-Volterra (Constante de movimiento V(x, y)):
 * V = delta * x - gamma * ln(x) + beta * y - alfa * ln(y)
 * 
 * Esta función es constante a lo largo de las trayectorias reales y sirve
 * como auditoría analítica del error global de integración.
 * 
 * @param {Object} params Parámetros del modelo
 * @param {number} x Población de presas
 * @param {number} y Población de depredadores
 * @returns {number} Valor de la función potencial conservada V(x, y)
 */
export function cantidadConservada(params, x, y) {
  const p = normalizarParametros(params);
  const safeX = Math.max(1e-12, Number(x) || 0);
  const safeY = Math.max(1e-12, Number(y) || 0);
  return p.delta * safeX - p.gamma * Math.log(safeX) + p.beta * safeY - p.alfa * Math.log(safeY);
}

/**
 * Calcula los puntos de equilibrio crítico no triviales:
 * Presas estables: x* = gamma / delta
 * Depredadores estables: y* = alfa / beta
 * 
 * @param {Object} params Parámetros de la simulación
 * @returns {{ presas: number, depredadores: number, xStar: number, yStar: number }}
 */
export function calcularEquilibrios(params) {
  const p = normalizarParametros(params);
  const presas = p.delta > 0 ? p.gamma / p.delta : 0;
  const depredadores = p.beta > 0 ? p.alfa / p.beta : 0;
  return {
    presas: Number(presas.toFixed(4)),
    depredadores: Number(depredadores.toFixed(4)),
    xStar: presas,
    yStar: depredadores
  };
}

/**
 * Normaliza las propiedades de entrada soportando nombres del DTO de Java y alias comunes.
 * 
 * @param {Object} params Parámetros en crudo
 * @returns {Object} Objeto con valores numéricos validados
 */
export function normalizarParametros(params = {}) {
  const nombreEcosistema = params.nombreEcosistema || params.ecosistema || 'Ecosistema Personalizado';
  const nombrePresa = params.nombrePresa || params.presa || 'Presas';
  const nombreDepredador = params.nombreDepredador || params.depredador || 'Depredadores';

  const poblacionInicialPresas = Number(
    params.poblacionInicialPresas ??
    params.presasIniciales ??
    params.x0 ??
    100
  );

  const poblacionInicialDepredadores = Number(
    params.poblacionInicialDepredadores ??
    params.depredadoresIniciales ??
    params.y0 ??
    20
  );

  const alfa = Number(params.alfa ?? params.alpha ?? 0.1);
  const beta = Number(params.beta ?? 0.002);
  const delta = Number(params.delta ?? 0.001);
  const gamma = Number(params.gamma ?? 0.05);

  const tiempoTotal = Number(params.tiempoTotal ?? params.T ?? 200);
  const pasoTiempo = Number(params.pasoTiempo ?? params.dt ?? params.h ?? 0.1);

  return {
    nombreEcosistema,
    nombrePresa,
    nombreDepredador,
    poblacionInicialPresas: Math.max(0, poblacionInicialPresas),
    poblacionInicialDepredadores: Math.max(0, poblacionInicialDepredadores),
    alfa: Math.max(0.00001, alfa),
    beta: Math.max(0.00001, beta),
    delta: Math.max(0.00001, delta),
    gamma: Math.max(0.00001, gamma),
    tiempoTotal: Math.max(1, tiempoTotal),
    pasoTiempo: Math.max(0.001, Math.min(1.0, pasoTiempo))
  };
}

/**
 * Ejecuta la simulación completa de Lotka-Volterra mediante Runge-Kutta 4to Orden.
 * Replica fielmente el ajuste uniforme de paso `h = tiempoTotal / pasos` del motor Java.
 * 
 * @param {Object} params Configuración del ecosistema
 * @returns {Array<{ paso: number, tiempo: number, presas: number, depredadores: number, conservada: number }>}
 */
export function simularLotkaVolterra(params) {
  const p = normalizarParametros(params);

  // Cantidad de pasos con epsilon para evitar desfases de coma flotante
  const pasos = Math.max(1, Math.ceil(p.tiempoTotal / p.pasoTiempo - 1e-9));
  const h = p.tiempoTotal / pasos;

  const serie = new Array(pasos + 1);
  let x = p.poblacionInicialPresas;
  let y = p.poblacionInicialDepredadores;

  // Punto inicial en t = 0 (valores completos de doble precisión sin toFixed para paridad estricta < 1e-6 con Java)
  serie[0] = {
    paso: 0,
    tiempo: 0.0,
    presas: x,
    depredadores: y,
    conservada: cantidadConservada(p, x, y)
  };

  // Iteración temporal
  for (let i = 1; i <= pasos; i++) {
    const siguiente = pasoRk4(p, x, y, h);
    x = siguiente[0];
    y = siguiente[1];

    serie[i] = {
      paso: i,
      tiempo: i * h,
      presas: x,
      depredadores: y,
      conservada: cantidadConservada(p, x, y)
    };
  }

  // Protección de rendimiento: Si excede 10,000 pasos, submuestrear para no congelar Chart.js ni la UI
  const MAX_PUNTOS = 10000;
  if (serie.length > MAX_PUNTOS) {
    const factor = Math.ceil(serie.length / MAX_PUNTOS);
    const subserie = [];
    for (let i = 0; i < serie.length; i += factor) {
      subserie.push(serie[i]);
    }
    const ultimoPunto = serie[serie.length - 1];
    if (subserie[subserie.length - 1] !== ultimoPunto) {
      subserie.push(ultimoPunto);
    }
    return subserie;
  }

  return serie;
}

/**
 * Calcula estadísticas y métricas descriptivas clave a partir de la serie simulada.
 * 
 * @param {Array<Object>} serie Serie temporal generada
 * @param {Object} params Parámetros utilizados
 * @returns {Object} Objeto con estadísticas agregadas (máximos, mínimos, equilibrios, período)
 */
export function calcularEstadisticas(serie, params) {
  if (!Array.isArray(serie) || serie.length === 0) {
    return {
      maxPresas: 0,
      minPresas: 0,
      maxDepredadores: 0,
      minDepredadores: 0,
      puntoEquilibrioPresas: 0,
      puntoEquilibrioDepredadores: 0,
      riesgoExtincion: false,
      periodoAproximado: 0
    };
  }

  const p = normalizarParametros(params);
  const eq = calcularEquilibrios(p);

  let maxPresas = -Infinity;
  let minPresas = Infinity;
  let maxDepredadores = -Infinity;
  let minDepredadores = Infinity;

  for (let i = 0; i < serie.length; i++) {
    const pt = serie[i];
    const x = Number(pt.presas);
    const y = Number(pt.depredadores);

    if (x > maxPresas) maxPresas = x;
    if (x < minPresas) minPresas = x;
    if (y > maxDepredadores) maxDepredadores = y;
    if (y < minDepredadores) minDepredadores = y;
  }

  const riesgoExtincion = minPresas < 1.0 || minDepredadores < 1.0;

  // Estimación analítica del período para oscilaciones armónicas en torno al centro:
  // T ≈ 2 * PI / sqrt(alfa * gamma)
  let periodoEstimado = 0;
  if (p.alfa > 0 && p.gamma > 0) {
    periodoEstimado = (2 * Math.PI) / Math.sqrt(p.alfa * p.gamma);
  }

  // Estimación empírica buscando picos consecutivos de presas en la serie
  const picosPresas = [];
  for (let i = 1; i < serie.length - 1; i++) {
    const prev = serie[i - 1].presas;
    const curr = serie[i].presas;
    const next = serie[i + 1].presas;
    if (curr > prev && curr >= next && curr > eq.presas) {
      picosPresas.push(serie[i].tiempo);
    }
  }

  let periodoEmpirico = null;
  if (picosPresas.length >= 2) {
    let sumaDeltas = 0;
    for (let k = 1; k < picosPresas.length; k++) {
      sumaDeltas += picosPresas[k] - picosPresas[k - 1];
    }
    periodoEmpirico = sumaDeltas / (picosPresas.length - 1);
  }

  const periodoFinal = periodoEmpirico || periodoEstimado;

  return {
    maxPresas: Number(maxPresas.toFixed(2)),
    minPresas: Number(minPresas.toFixed(2)),
    maxDepredadores: Number(maxDepredadores.toFixed(2)),
    minDepredadores: Number(minDepredadores.toFixed(2)),
    puntoEquilibrioPresas: eq.presas,
    puntoEquilibrioDepredadores: eq.depredadores,
    riesgoExtincion,
    periodoAproximado: Number(periodoFinal.toFixed(1))
  };
}
