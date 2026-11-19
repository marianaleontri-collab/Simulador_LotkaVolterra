/**
 * ============================================================================
 * EcoFlux — Cliente de Integración API REST Backend
 * Módulo: api.js
 * 
 * Conexión resiliente con la API Spring Boot (puerto 8080).
 * Maneja timeouts con AbortController, validación y normalización
 * de la respuesta del backend para el visualizador.
 * ============================================================================
 */

import { normalizarParametros, cantidadConservada, calcularEstadisticas } from './mockRk4.js';

export const API_BASE_URL = 'http://localhost:8080/api/v1';
const DEFAULT_TIMEOUT_MS = 3500;

/**
 * Transforma los parámetros locales a la estructura exacta esperada por SimulacionRequestDTO.
 * 
 * @param {Object} params Parámetros en bruto
 * @returns {Object} Payload serializable en JSON
 */
export function estructurarPayloadDTO(params) {
  const norm = normalizarParametros(params);

  return {
    nombreEcosistema: norm.nombreEcosistema,
    nombrePresa: norm.nombrePresa,
    nombreDepredador: norm.nombreDepredador,
    poblacionInicialPresas: norm.poblacionInicialPresas,
    poblacionInicialDepredadores: norm.poblacionInicialDepredadores,
    alfa: norm.alfa,
    beta: norm.beta,
    delta: norm.delta,
    gamma: norm.gamma,
    tiempoTotal: norm.tiempoTotal,
    pasoTiempo: norm.pasoTiempo
  };
}

/**
 * Realiza una petición POST al endpoint de cálculo de simulaciones en el backend Java.
 * Si el servidor tarda más de 3.5s o no responde (red caída, backend apagado),
 * cancela la petición y arroja un error descriptivo para permitir el fallback al motor JS.
 * 
 * @param {Object} params Configuración del ecosistema
 * @param {number} [timeoutMs=3500] Tiempo límite de espera en ms
 * @returns {Promise<{ serieTemporal: Array<Object>, estadisticas: Object, origen: string, tiempoRespuestaMs: number }>}
 */
export async function calcularSimulacionAPI(params, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const payload = estructurarPayloadDTO(params);
  const url = `${API_BASE_URL}/simulaciones/calcular`;
  const tInicio = performance.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);
    const tiempoRespuestaMs = Number((performance.now() - tInicio).toFixed(1));

    if (!response.ok) {
      let detalleError = `Error HTTP ${response.status} (${response.statusText})`;
      try {
        const errorBody = await response.json();
        if (errorBody && (errorBody.mensaje || errorBody.message || errorBody.detail)) {
          detalleError += `: ${errorBody.mensaje || errorBody.message || errorBody.detail}`;
        }
      } catch {
        // Fallback si la respuesta de error no es JSON
      }
      throw new Error(detalleError);
    }

    const json = await response.json();
    return procesarRespuestaBackend(json, payload, tiempoRespuestaMs);

  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      throw new Error(`Timeout de conexión: el backend en ${url} no respondió en ${timeoutMs}ms.`);
    }

    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error(`Servidor inalcanzable: no se pudo establecer conexión con ${API_BASE_URL}. Asegúrate de que el backend Spring Boot esté ejecutándose.`);
    }

    throw err;
  }
}

/**
 * Normaliza la respuesta del backend adaptándola a múltiples formatos posibles:
 * - Objeto SimulacionResponseDTO con { serieTemporal, estadisticas }
 * - Array directo de puntos [{ tiempo, presas, depredadores }]
 * - Objeto con envoltorio { puntos: [...] } o { serie: [...] }
 * 
 * @param {any} data Respuesta cruda del backend
 * @param {Object} params Parámetros enviados
 * @param {number} tiempoRespuestaMs Tiempo que tardó la llamada
 * @returns {{ serieTemporal: Array<Object>, estadisticas: Object, origen: string, tiempoRespuestaMs: number }}
 */
function procesarRespuestaBackend(data, params, tiempoRespuestaMs) {
  let serieCruda = [];
  let estadisticas = null;

  if (Array.isArray(data)) {
    serieCruda = data;
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.serieTemporal)) {
      serieCruda = data.serieTemporal;
    } else if (Array.isArray(data.puntos)) {
      serieCruda = data.puntos;
    } else if (Array.isArray(data.serie)) {
      serieCruda = data.serie;
    }

    if (data.estadisticas) {
      estadisticas = data.estadisticas;
    }
  }

  // Si no se obtuvo una serie válida, arrojar error
  if (!Array.isArray(serieCruda) || serieCruda.length === 0) {
    throw new Error('La respuesta del backend no contiene una serie temporal de puntos válida.');
  }

  // Normalizar puntos de la serie asegurando paso y cantidad conservada
  const serieNormalizada = serieCruda.map((p, index) => {
    const t = Number(p.tiempo ?? p.t ?? 0);
    const x = Number(p.presas ?? p.x ?? 0);
    const y = Number(p.depredadores ?? p.y ?? 0);
    const conservada = Number(p.conservada ?? cantidadConservada(params, x, y).toFixed(5));

    return {
      paso: index,
      tiempo: Number(t.toFixed(4)),
      presas: Number(x.toFixed(4)),
      depredadores: Number(y.toFixed(4)),
      conservada
    };
  });

  // Si el backend no proveyó estadísticas, calcularlas en el cliente
  if (!estadisticas) {
    estadisticas = calcularEstadisticas(serieNormalizada, params);
  }

  return {
    serieTemporal: serieNormalizada,
    estadisticas,
    origen: 'backend',
    tiempoRespuestaMs
  };
}

/**
 * Comprueba de forma no invasiva si el backend Spring Boot se encuentra activo y disponible.
 * 
 * @param {number} [timeoutMs=1800] Timeout para la prueba de conectividad
 * @returns {Promise<{ online: boolean, url: string, latenciaMs: number, detalle: string }>}
 */
export async function verificarConexionBackend(timeoutMs = 1800) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = performance.now();

  try {
    // Intentar consultar el endpoint de presets o la raíz de la API
    const res = await fetch(`${API_BASE_URL}/presets`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timer);
    const latenciaMs = Number((performance.now() - t0).toFixed(1));

    if (res.ok) {
      return {
        online: true,
        url: API_BASE_URL,
        latenciaMs,
        detalle: 'Conexión exitosa con API Spring Boot'
      };
    }

    return {
      online: false,
      url: API_BASE_URL,
      latenciaMs,
      detalle: `Backend respondió con status HTTP ${res.status}`
    };

  } catch (err) {
    clearTimeout(timer);
    return {
      online: false,
      url: API_BASE_URL,
      latenciaMs: 0,
      detalle: err.name === 'AbortError' ? 'Timeout de sondeo' : 'Sin conexión con el host'
    };
  }
}
