/**
 * ============================================================================
 * EcoFlux — Cliente de Integración API REST Backend
 * Módulo: api.js
 * 
 * Conexión resiliente con la API Spring Boot (puerto 8080).
 * Maneja timeouts con AbortController, validación y normalización
 * de la respuesta del backend para el visualizador.
 * Endpoints CRUD y Presets soportados:
 * - POST   /api/v1/simulaciones/calcular  (Cálculo en memoria)
 * - POST   /api/v1/simulaciones           (Persistir simulación)
 * - GET    /api/v1/simulaciones           (Listar resumen de simulaciones)
 * - GET    /api/v1/simulaciones/{id}      (Cargar simulación por ID)
 * - DELETE /api/v1/simulaciones/{id}      (Eliminar simulación)
 * - GET    /api/v1/presets                (Obtener presets del backend)
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
 * Helper para extraer mensajes descriptivos de error desde respuestas HTTP.
 */
async function extraerMensajeError(response) {
  let detalle = `Error HTTP ${response.status} (${response.statusText})`;
  try {
    const errorBody = await response.json();
    if (errorBody) {
      if (errorBody.mensaje) return `${detalle}: ${errorBody.mensaje}`;
      if (errorBody.message) return `${detalle}: ${errorBody.message}`;
      if (errorBody.detail) return `${detalle}: ${errorBody.detail}`;
      if (errorBody.errores && Array.isArray(errorBody.errores)) {
        return `${detalle}: ${errorBody.errores.join(', ')}`;
      }
    }
  } catch {
    // Respuesta no es JSON
  }
  return detalle;
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
 * @returns {{ id: number|null, nombreEcosistema: string, nombrePresa: string, nombreDepredador: string, fechaCreacion: string|null, parametros: Object, serieTemporal: Array<Object>, estadisticas: Object, origen: string, tiempoRespuestaMs: number }}
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

  // Normalizar puntos de la serie asegurando paso y cantidad conservada con precisión nativa
  let serieNormalizada = serieCruda.map((p, index) => {
    const t = Number(p.tiempo ?? p.t ?? 0);
    const x = Number(p.presas ?? p.x ?? 0);
    const y = Number(p.depredadores ?? p.y ?? 0);
    const conservada = Number(p.conservada ?? cantidadConservada(params, x, y));

    return {
      paso: p.paso ?? index,
      tiempo: t,
      presas: x,
      depredadores: y,
      conservada
    };
  });

  // Si excede 10,000 puntos, submuestrear para proteger el rendimiento del navegador y Chart.js
  if (serieNormalizada.length > 10000) {
    const factor = Math.ceil(serieNormalizada.length / 10000);
    const subserie = [];
    for (let i = 0; i < serieNormalizada.length; i += factor) {
      subserie.push(serieNormalizada[i]);
    }
    const ultimoPunto = serieNormalizada[serieNormalizada.length - 1];
    if (subserie[subserie.length - 1] !== ultimoPunto) {
      subserie.push(ultimoPunto);
    }
    serieNormalizada = subserie;
  }

  // Si el backend no proveyó estadísticas, calcularlas en el cliente
  if (!estadisticas) {
    estadisticas = calcularEstadisticas(serieNormalizada, params);
  }

  return {
    id: data && data.id != null ? data.id : null,
    nombreEcosistema: data?.nombreEcosistema || params.nombreEcosistema || 'Ecosistema',
    nombrePresa: data?.nombrePresa || params.nombrePresa || 'Presas',
    nombreDepredador: data?.nombreDepredador || params.nombreDepredador || 'Depredadores',
    fechaCreacion: data?.fechaCreacion || null,
    parametros: data?.parametros || params,
    serieTemporal: serieNormalizada,
    estadisticas,
    origen: 'backend',
    tiempoRespuestaMs
  };
}

/**
 * Realiza una petición POST al endpoint de cálculo de simulaciones en el backend Java.
 * Si el servidor tarda más de 3.5s o no responde (red caída, backend apagado),
 * cancela la petición y arroja un error descriptivo para permitir el fallback al motor JS.
 * 
 * @param {Object} params Configuración del ecosistema
 * @param {number} [timeoutMs=3500] Tiempo límite de espera en ms
 * @returns {Promise<Object>} Resultado con serie temporal y estadísticas
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
      const detalle = await extraerMensajeError(response);
      throw new Error(detalle);
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
 * Guarda y persiste una nueva simulación en la base de datos a través de POST /api/v1/simulaciones.
 * 
 * @param {Object} params Parámetros de la simulación
 * @param {number} [timeoutMs=4500] Tiempo de espera máximo
 * @returns {Promise<Object>} Simulación persistida con su ID generado y serie calculada
 */
export async function guardarSimulacionAPI(params, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const payload = estructurarPayloadDTO(params);
  const url = `${API_BASE_URL}/simulaciones`;
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
      const detalle = await extraerMensajeError(response);
      throw new Error(detalle);
    }

    const json = await response.json();
    return procesarRespuestaBackend(json, payload, tiempoRespuestaMs);

  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      throw new Error(`Timeout al guardar: el backend en ${url} no respondió en ${timeoutMs}ms.`);
    }

    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error(`Servidor inalcanzable: no se pudo conectar con ${API_BASE_URL} para guardar la simulación.`);
    }

    throw err;
  }
}

/**
 * Obtiene el catálogo de simulaciones guardadas (resumen ligero) mediante GET /api/v1/simulaciones.
 * 
 * @param {number} [timeoutMs=3500]
 * @returns {Promise<Array<Object>>} Lista de simulaciones resumidas
 */
export async function listarSimulacionesAPI(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_BASE_URL}/simulaciones`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const detalle = await extraerMensajeError(response);
      throw new Error(detalle);
    }

    const lista = await response.json();
    return Array.isArray(lista) ? lista : [];

  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      throw new Error(`Timeout al listar simulaciones desde ${url}.`);
    }

    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error(`Servidor inalcanzable: no se pudo listar simulaciones desde ${API_BASE_URL}.`);
    }

    throw err;
  }
}

/**
 * Recupera un ecosistema guardado por su ID con recálculo dinámico de serie temporal mediante GET /api/v1/simulaciones/{id}.
 * 
 * @param {number|string} id Identificador único de la simulación
 * @param {number} [timeoutMs=3500]
 * @returns {Promise<Object>} Simulación completa con serie temporal y estadísticas
 */
export async function cargarSimulacionAPI(id, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!id) throw new Error('Se requiere un ID de simulación válido.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_BASE_URL}/simulaciones/${id}`;
  const tInicio = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timer);
    const tiempoRespuestaMs = Number((performance.now() - tInicio).toFixed(1));

    if (!response.ok) {
      const detalle = await extraerMensajeError(response);
      throw new Error(detalle);
    }

    const json = await response.json();
    return procesarRespuestaBackend(json, json.parametros || {}, tiempoRespuestaMs);

  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      throw new Error(`Timeout al cargar la simulación #${id}.`);
    }

    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error(`Servidor inalcanzable al cargar la simulación #${id}.`);
    }

    throw err;
  }
}

/**
 * Elimina una simulación guardada permanentemente mediante DELETE /api/v1/simulaciones/{id}.
 * 
 * @param {number|string} id Identificador de la simulación a eliminar
 * @param {number} [timeoutMs=3500]
 * @returns {Promise<boolean>} True si la eliminación fue exitosa
 */
export async function eliminarSimulacionAPI(id, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!id) throw new Error('Se requiere un ID de simulación válido.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_BASE_URL}/simulaciones/${id}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok && response.status !== 204) {
      const detalle = await extraerMensajeError(response);
      throw new Error(detalle);
    }

    return true;

  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      throw new Error(`Timeout al eliminar la simulación #${id}.`);
    }

    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error(`Servidor inalcanzable al eliminar la simulación #${id}.`);
    }

    throw err;
  }
}

/**
 * Obtiene el catálogo de presets clásicos desde GET /api/v1/presets.
 * 
 * @param {number} [timeoutMs=2500]
 * @returns {Promise<Array<Object>>} Lista de presets disponibles en el backend
 */
export async function obtenerPresetsAPI(timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_BASE_URL}/presets`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const detalle = await extraerMensajeError(response);
      throw new Error(detalle);
    }

    const lista = await response.json();
    return Array.isArray(lista) ? lista : [];

  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
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
