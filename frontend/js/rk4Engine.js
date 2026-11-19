/**
 * ============================================================================
 * EcoFlux: Guardián del Bioma — Motor Numérico Runge-Kutta 4to Orden (RK4)
 * Módulo: rk4Engine.js
 * 
 * Implementación matemática de alta fidelidad para el sistema de ecuaciones
 * diferenciales no lineales de Lotka-Volterra:
 *   dx/dt = alfa * x - beta * x * y
 *   dy/dt = delta * x * y - gamma * y
 * 
 * Incluye cálculo de derivadas, integración numérica RK4 de 4 puntos por paso,
 * determinación analítica del punto de equilibrio no trivial E1,
 * evaluación del invariante de conservación de energía ecológica V(x,y)
 * y proyección natural sin intervención.
 * ============================================================================
 */

/**
 * Calcula el vector de derivadas instantáneas [dx/dt, dy/dt] del sistema
 * depredador-presa de Lotka-Volterra.
 * 
 * @param {number} x Población actual de presas (x >= 0)
 * @param {number} y Población actual de depredadores (y >= 0)
 * @param {Object} params Parámetros ecológicos { alfa, beta, delta, gamma }
 * @returns {{ dx: number, dy: number }} Tasas de cambio instantáneas
 */
export function calcularDerivadas(x, y, params) {
  const alfa = Number(params?.alfa ?? params?.alpha ?? 0);
  const beta = Number(params?.beta ?? 0);
  const delta = Number(params?.delta ?? 0);
  const gamma = Number(params?.gamma ?? 0);

  // dx/dt: Crecimiento exponencial natural de presas menos pérdidas por depredación
  const dx = (alfa * x) - (beta * x * y);

  // dy/dt: Crecimiento de depredadores por asimilación de biomasa menos mortandad natural
  const dy = (delta * x * y) - (gamma * y);

  return { dx, dy };
}

/**
 * Ejecuta un único paso de integración numérica usando Runge-Kutta de 4to orden (RK4).
 * Evalúa 4 estimaciones ponderadas de pendiente (k1, k2, k3, k4) para minimizar
 * el error de truncamiento local a O(dt^5) y global a O(dt^4).
 * 
 * @param {number} x Población de presas en el instante t
 * @param {number} y Población de depredadores en el instante t
 * @param {Object} params Parámetros ecológicos { alfa, beta, delta, gamma }
 * @param {number} dt Tamaño del paso de integración temporal (delta t)
 * @returns {{ x: number, y: number }} Nuevas poblaciones en t + dt
 */
export function pasoRk4(x, y, params, dt) {
  if (dt <= 0) return { x: Math.max(0, x), y: Math.max(0, y) };

  // k1: Pendiente al inicio del intervalo
  const k1 = calcularDerivadas(x, y, params);

  // k2: Pendiente en el punto medio usando k1
  const xMid1 = Math.max(0, x + 0.5 * dt * k1.dx);
  const yMid1 = Math.max(0, y + 0.5 * dt * k1.dy);
  const k2 = calcularDerivadas(xMid1, yMid1, params);

  // k3: Pendiente en el punto medio usando k2
  const xMid2 = Math.max(0, x + 0.5 * dt * k2.dx);
  const yMid2 = Math.max(0, y + 0.5 * dt * k2.dy);
  const k3 = calcularDerivadas(xMid2, yMid2, params);

  // k4: Pendiente al final del intervalo usando k3
  const xEnd = Math.max(0, x + dt * k3.dx);
  const yEnd = Math.max(0, y + dt * k3.dy);
  const k4 = calcularDerivadas(xEnd, yEnd, params);

  // Combinación ponderada de pendientes: (k1 + 2*k2 + 2*k3 + k4) / 6
  const xNext = x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
  const yNext = y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);

  // Restricción biológica: Las poblaciones no pueden ser negativas
  return {
    x: Math.max(0, Number.isFinite(xNext) ? xNext : 0),
    y: Math.max(0, Number.isFinite(yNext) ? yNext : 0)
  };
}

/**
 * Calcula el punto de equilibrio no trivial (coexistencia estable) del sistema:
 * E1 = (x* = gamma / delta, y* = alfa / beta).
 * 
 * @param {Object} params Parámetros ecológicos { alfa, beta, delta, gamma }
 * @returns {{ x: number, y: number }} Coordenadas teóricas del centro de equilibrio
 */
export function calcularEquilibrio(params) {
  const alfa = Number(params?.alfa ?? params?.alpha ?? 0);
  const beta = Number(params?.beta ?? 0);
  const delta = Number(params?.delta ?? 0);
  const gamma = Number(params?.gamma ?? 0);

  const xStar = (delta > 0) ? (gamma / delta) : 0;
  const yStar = (beta > 0) ? (alfa / beta) : 0;

  return {
    x: Math.round(xStar * 1000) / 1000,
    y: Math.round(yStar * 1000) / 1000
  };
}

/**
 * Evalúa la cantidad conservada / invariante de Lotka-Volterra:
 * V(x, y) = delta * x - gamma * ln(x) + beta * y - alfa * ln(y)
 * 
 * En un sistema ideal sin perturbaciones, dV/dt = 0 a lo largo de las órbitas.
 * Protegido contra indeterminaciones logarítmicas de x=0 o y=0 mediante Math.max(1e-9, ...).
 * 
 * @param {number} x Población de presas
 * @param {number} y Población de depredadores
 * @param {Object} params Parámetros ecológicos { alfa, beta, delta, gamma }
 * @returns {number} Valor del invariante de Liapunov V(x,y)
 */
export function calcularInvariante(x, y, params) {
  const alfa = Number(params?.alfa ?? params?.alpha ?? 0);
  const beta = Number(params?.beta ?? 0);
  const delta = Number(params?.delta ?? 0);
  const gamma = Number(params?.gamma ?? 0);

  const safeX = Math.max(1e-9, Number(x) || 0);
  const safeY = Math.max(1e-9, Number(y) || 0);

  const invariante = (delta * safeX) - (gamma * Math.log(safeX)) + (beta * safeY) - (alfa * Math.log(safeY));

  return Number.isFinite(invariante) ? invariante : 0;
}

/**
 * Ejecuta una proyección numérica completa de la evolución natural del bioma sin intervenciones.
 * Genera la curva base con la que el jugador comparará su gestión ecológica al finalizar la partida.
 * 
 * @param {number} x0 Población inicial de presas
 * @param {number} y0 Población inicial de depredadores
 * @param {Object} params Parámetros base { alfa, beta, delta, gamma }
 * @param {number} diasTotal Días totales de supervivencia objetivo
 * @param {number} [dt=0.05] Paso de integración interna para máxima precisión
 * @returns {Array<{ dia: number, presas: number, depredadores: number }>} Serie temporal natural
 */
export function simularProyeccionNatural(x0, y0, params, diasTotal = 60, dt = 0.05) {
  const puntos = [];
  let currX = Math.max(0, Number(x0));
  let currY = Math.max(0, Number(y0));
  let t = 0;

  // Punto inicial (día 0)
  puntos.push({
    dia: 0,
    presas: Math.round(currX * 100) / 100,
    depredadores: Math.round(currY * 100) / 100
  });

  // Intervalo de muestreo para graficación limpia (0.5 o 1.0 días según la duración)
  const samplingInterval = diasTotal > 80 ? 1.0 : 0.5;
  let nextSampleTime = samplingInterval;

  while (t < diasTotal) {
    const step = Math.min(dt, diasTotal - t);
    const next = pasoRk4(currX, currY, params, step);
    currX = next.x;
    currY = next.y;
    t += step;

    // Umbral crítico de extinción: si una población cae por debajo de 1.0 individuo
    if (currX < 1) currX = 0;
    if (currY < 1) currY = 0;

    if (t >= nextSampleTime || t >= diasTotal) {
      puntos.push({
        dia: Math.round(t * 10) / 10,
        presas: Math.round(currX * 100) / 100,
        depredadores: Math.round(currY * 100) / 100
      });
      nextSampleTime += samplingInterval;
    }

    // Si ambas especies colapsaron, completar la serie con ceros hasta el final
    if (currX <= 0 && currY <= 0) {
      while (t < diasTotal) {
        t += samplingInterval;
        puntos.push({
          dia: Math.min(diasTotal, Math.round(t * 10) / 10),
          presas: 0,
          depredadores: 0
        });
      }
      break;
    }
  }

  return puntos;
}

export default {
  calcularDerivadas,
  pasoRk4,
  calcularEquilibrio,
  calcularInvariante,
  simularProyeccionNatural
};
