/**
 * ============================================================================
 * EcoFlux — Módulo Puente / Alias: mockRk4.js -> rk4Engine.js
 * 
 * Mantiene compatibilidad hacia atrás con cualquier módulo que importe mockRk4.js.
 * ============================================================================
 */

export * from './rk4Engine.js';
import rk4Default from './rk4Engine.js';
export default rk4Default;
