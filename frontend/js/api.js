/**
 * ============================================================================
 * EcoFlux: Guardián del Bioma — Cliente API y Manejo de Datos Dual
 * Módulo: api.js
 * 
 * Gestiona la comunicación con la API REST Spring Boot (puerto 8080)
 * y conmuta transparentemente a Modo Autónomo / Offline (localStorage + rk4Engine)
 * cuando el backend no está disponible o falla por timeout (2000 ms).
 * ============================================================================
 */

import { simularProyeccionNatural, calcularEquilibrio } from './rk4Engine.js';

export const API_BASE_URL = (typeof window !== 'undefined' && window.ECOFLUX_API_URL)
  ? window.ECOFLUX_API_URL
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080/api/v1'
    : '');

const TIMEOUT_MS = 2000;
const STORAGE_RANKING_KEY = 'ecoflux_ranking_offline';

/**
 * Catálogo maestro de Biomas / Niveles de Desafío.
 */
export const BIOMAS = {
  BOSQUE: {
    id: 1,
    key: 'BOSQUE',
    nombre: 'Bosque Templado',
    dificultad: 'FACIL',
    descripcion: 'Oscilación clásica manejable en taiga boscosa.',
    nombrePresa: 'Ciervos',
    nombreDepredador: 'Lobos',
    temaVisual: 'BOSQUE',
    poblacionInicialPresas: 80,
    poblacionInicialDepredadores: 20,
    x0: 80,
    y0: 20,
    alfa: 0.8,
    beta: 0.02,
    delta: 0.01,
    gamma: 0.4,
    diasObjetivo: 60
  },
  SABANA: {
    id: 2,
    key: 'SABANA',
    nombre: 'Sabana Africana',
    dificultad: 'MEDIO',
    descripcion: 'Alta presión de depredación y ciclos rápidos en temporada seca.',
    nombrePresa: 'Gacelas',
    nombreDepredador: 'Guepardos',
    temaVisual: 'SABANA',
    poblacionInicialPresas: 100,
    poblacionInicialDepredadores: 25,
    x0: 100,
    y0: 25,
    alfa: 1.0,
    beta: 0.02,
    delta: 0.008,
    gamma: 0.5,
    diasObjetivo: 75
  },
  TUNDRA: {
    id: 3,
    key: 'TUNDRA',
    nombre: 'Tundra Ártica (Desafío)',
    dificultad: 'DIFICIL',
    descripcion: 'Ecosistema extremo al borde del colapso sin intervenciones.',
    nombrePresa: 'Liebres',
    nombreDepredador: 'Zorros',
    temaVisual: 'TUNDRA',
    poblacionInicialPresas: 60,
    poblacionInicialDepredadores: 15,
    x0: 60,
    y0: 15,
    alfa: 0.6,
    beta: 0.025,
    delta: 0.015,
    gamma: 0.45,
    diasObjetivo: 90
  }
};

/**
 * Ejecuta una petición HTTP con AbortController para timeout estricto de 2000 ms.
 * Si API_BASE_URL está vacío (ej. en Vercel sin backend configurado), conmuta de inmediato
 * al modo autónomo local sin disparar peticiones de red ni ensuciar la consola.
 * 
 * @param {string} endpoint Ruta relativa o URL completa
 * @param {RequestInit} [options={}] Opciones de fetch
 * @param {number} [timeout=TIMEOUT_MS] Límite en ms
 * @returns {Promise<Response>}
 */
async function fetchConTimeout(endpoint, options = {}, timeout = TIMEOUT_MS) {
  if (!API_BASE_URL) {
    throw new Error('Modo local autónomo activo: sin servidor backend configurado.');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Obtiene la configuración de un bioma por su ID numérico (1, 2, 3) o clave ('BOSQUE', 'SABANA', 'TUNDRA').
 * 
 * @param {number|string} idBioma ID o clave del bioma
 * @returns {Object} Configuración del bioma con punto de equilibrio calculado
 */
export function obtenerConfiguracionBioma(idBioma) {
  let bioma = null;

  if (typeof idBioma === 'string') {
    const clave = idBioma.toUpperCase().trim();
    bioma = BIOMAS[clave] || Object.values(BIOMAS).find(b => b.nombre.toUpperCase().includes(clave));
  } else if (typeof idBioma === 'number') {
    bioma = Object.values(BIOMAS).find(b => b.id === idBioma);
  }

  if (!bioma) {
    // Por defecto retornar BOSQUE si no se encuentra
    bioma = BIOMAS.BOSQUE;
  }

  const copia = JSON.parse(JSON.stringify(bioma));
  copia.puntoEquilibrio = calcularEquilibrio(copia);
  return copia;
}

/**
 * Inicializa los registros de ranking offline por defecto si no existen en localStorage.
 */
function obtenerRankingStorage() {
  try {
    const data = localStorage.getItem(STORAGE_RANKING_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignorar error de parsing en localStorage
  }

  // Semilla offline inicial
  const semilla = [
    {
      id: 1,
      nombreJugador: 'Ada Lovelace',
      nombreNivel: 'Bosque Templado',
      nivelId: 1,
      puntaje: 1850,
      diasSobrevividos: 60,
      estabilidadPromedio: 95.4,
      victoria: true,
      fecha: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 2,
      nombreJugador: 'Alan Turing',
      nombreNivel: 'Sabana Africana',
      nivelId: 2,
      puntaje: 1680,
      diasSobrevividos: 75,
      estabilidadPromedio: 89.2,
      victoria: true,
      fecha: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 3,
      nombreJugador: 'Vito Volterra',
      nombreNivel: 'Tundra Ártica',
      nivelId: 3,
      puntaje: 1520,
      diasSobrevividos: 90,
      estabilidadPromedio: 84.1,
      victoria: true,
      fecha: new Date().toISOString()
    }
  ];

  try {
    localStorage.setItem(STORAGE_RANKING_KEY, JSON.stringify(semilla));
  } catch {}

  return semilla;
}

/**
 * Consulta la tabla de clasificación de mejores puntuaciones.
 * Si el backend está disponible consulta GET /api/v1/ranking?nivelId=...,
 * de lo contrario lee de localStorage de forma transparente.
 * 
 * @param {number|string} [idBioma] Filtro opcional por bioma
 * @returns {Promise<Array<Object>>} Top 10 de jugadores
 */
export async function obtenerRanking(idBioma = null) {
  let nivelIdNum = null;
  if (idBioma) {
    if (typeof idBioma === 'number') nivelIdNum = idBioma;
    else if (typeof idBioma === 'string' && BIOMAS[idBioma.toUpperCase()]) {
      nivelIdNum = BIOMAS[idBioma.toUpperCase()].id;
    }
  }

  // 1. Intentar backend si hay URL configurada
  if (API_BASE_URL) {
    try {
      const endpoint = nivelIdNum ? `/ranking?nivelId=${nivelIdNum}` : '/ranking';
      const res = await fetchConTimeout(endpoint, { method: 'GET' });
      if (res.ok) {
        const lista = await res.json();
        if (Array.isArray(lista)) {
          return lista;
        }
      }
    } catch (err) {
      // Backend no disponible, proceder al almacenamiento local autónomo silencioso
    }
  }

  // 2. Fallback offline: localStorage
  let partidas = obtenerRankingStorage();

  if (nivelIdNum) {
    partidas = partidas.filter(p => p.nivelId === nivelIdNum);
  }

  // Ordenar por puntaje descendente y tomar los mejores 10
  partidas.sort((a, b) => b.puntaje - a.puntaje);
  return partidas.slice(0, 10);
}

/**
 * Registra el resultado de una partida finalizada.
 * Si el backend está disponible envía POST /api/v1/ranking,
 * de lo contrario guarda en localStorage en modo autónomo.
 * 
 * @param {Object} registro Objeto con estructura de PartidaRequestDTO
 * @returns {Promise<Object>} Registro confirmado guardado
 */
export async function guardarEnRanking(registro) {
  const biomaConfig = obtenerConfiguracionBioma(registro.nivelId);

  const payload = {
    nombreJugador: (registro.nombreJugador || 'Guardián Anónimo').trim().slice(0, 40),
    nivelId: Number(registro.nivelId) || biomaConfig.id,
    puntaje: Math.max(0, Math.round(registro.puntaje || 0)),
    diasSobrevividos: Math.max(0, Math.round(registro.diasSobrevividos || 0)),
    estabilidadPromedio: Math.max(0, Math.min(100, Math.round((registro.estabilidadPromedio || 0) * 10) / 10)),
    intervencionesUsadas: Math.max(0, Math.round(registro.intervencionesUsadas || 0)),
    victoria: Boolean(registro.victoria)
  };

  // 1. Intentar backend si hay URL configurada
  if (API_BASE_URL) {
    try {
      const res = await fetchConTimeout('/ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok || res.status === 201) {
        const guardado = await res.json();
        return guardado;
      }
    } catch (err) {
      // Backend no disponible, proceder al almacenamiento local silencioso
    }
  }

  // 2. Fallback offline: localStorage
  const itemOffline = {
    id: Date.now(),
    nombreJugador: payload.nombreJugador,
    nombreNivel: biomaConfig.nombre,
    nivelId: payload.nivelId,
    puntaje: payload.puntaje,
    diasSobrevividos: payload.diasSobrevividos,
    estabilidadPromedio: payload.estabilidadPromedio,
    victoria: payload.victoria,
    fecha: new Date().toISOString()
  };

  try {
    const lista = obtenerRankingStorage();
    lista.push(itemOffline);
    lista.sort((a, b) => b.puntaje - a.puntaje);
    // Limitar histórico a 50 partidas
    const recortada = lista.slice(0, 50);
    localStorage.setItem(STORAGE_RANKING_KEY, JSON.stringify(recortada));
  } catch (storageErr) {
    console.warn('[api] No se pudo persistir en localStorage:', storageErr);
  }

  return itemOffline;
}

/**
 * Obtiene la serie temporal de evolución natural sin intervención del jugador.
 * Consulta al backend GET /api/v1/niveles/{id}/proyeccion o calcula localmente
 * con rk4Engine.simularProyeccionNatural.
 * 
 * @param {number|string} idBioma ID o clave del bioma
 * @param {Object} [params] Parámetros Lotka-Volterra opcionales
 * @param {number} [x0] Población inicial de presas
 * @param {number} [y0] Población inicial de depredadores
 * @param {number} [diasObjetivo] Días totales
 * @returns {Promise<Array<{ dia: number, presas: number, depredadores: number }>>}
 */
export async function obtenerProyeccionNatural(idBioma, params = null, x0 = null, y0 = null, diasObjetivo = null) {
  const cfg = obtenerConfiguracionBioma(idBioma);
  const nivelId = cfg.id;
  const p = params || { alfa: cfg.alfa, beta: cfg.beta, delta: cfg.delta, gamma: cfg.gamma };
  const px0 = (x0 !== null && x0 !== undefined) ? x0 : cfg.poblacionInicialPresas;
  const py0 = (y0 !== null && y0 !== undefined) ? y0 : cfg.poblacionInicialDepredadores;
  const dias = (diasObjetivo !== null && diasObjetivo !== undefined) ? diasObjetivo : cfg.diasObjetivo;

  // 1. Intentar backend si hay URL configurada
  if (API_BASE_URL) {
    try {
      const res = await fetchConTimeout(`/niveles/${nivelId}/proyeccion`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.serieNatural)) {
          return data.serieNatural.map(punto => ({
            dia: punto.tiempo,
            presas: punto.presas,
            depredadores: punto.depredadores
          }));
        }
      }
    } catch (err) {
      // Usar motor RK4 local
    }
  }

  // 2. Cálculo local de alta precisión con rk4Engine
  return simularProyeccionNatural(px0, py0, p, dias);
}

/**
 * Verifica si el backend Spring Boot está en línea y respondiendo.
 * 
 * @returns {Promise<boolean>} true si está en línea, false en caso contrario
 */
export async function verificarEstadoBackend() {
  if (!API_BASE_URL) {
    return false;
  }
  try {
    const res = await fetchConTimeout('/niveles', { method: 'GET' }, 2000);
    return res.ok;
  } catch {
    return false;
  }
}

export default {
  API_BASE_URL,
  BIOMAS,
  obtenerConfiguracionBioma,
  obtenerRanking,
  guardarEnRanking,
  obtenerProyeccionNatural,
  verificarEstadoBackend
};
