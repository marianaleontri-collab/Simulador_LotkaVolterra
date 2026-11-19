/**
 * ============================================================================
 * EcoFlux: Guardián del Bioma — Script de Build para Vercel
 * Archivo: scripts/build-vercel.js
 * 
 * Empaqueta la aplicación web del juego en dist/ y la presentación dinámica
 * en dist/presentacion/ asegurando que no se suban archivos pesados (.pptx, .pdf, .py).
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const PRESENTACION_DIR = path.join(ROOT_DIR, 'presentacion');

// Extensiones o carpetas excluidas del empaquetado de producción
const EXCLUDED_EXTENSIONS = new Set(['.py', '.ps1', '.pptx', '.pdf', '.tmp', '.docx']);
const EXCLUDED_DIRS = new Set(['.vercel', 'node_modules', '.git']);

function limpiarDirectorio(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copiarDirectorio(origen, destino) {
  if (!fs.existsSync(origen)) {
    console.warn(`[build-vercel] Advertencia: El directorio origen no existe: ${origen}`);
    return 0;
  }

  if (!fs.existsSync(destino)) {
    fs.mkdirSync(destino, { recursive: true });
  }

  const items = fs.readdirSync(origen, { withFileTypes: true });
  let copiados = 0;

  for (const item of items) {
    const rutaOrigen = path.join(origen, item.name);
    const rutaDestino = path.join(destino, item.name);

    if (item.isDirectory()) {
      if (EXCLUDED_DIRS.has(item.name)) continue;
      copiados += copiarDirectorio(rutaOrigen, rutaDestino);
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (EXCLUDED_EXTENSIONS.has(ext)) continue;
      if (item.name.startsWith('.env')) continue;

      fs.copyFileSync(rutaOrigen, rutaDestino);
      copiados++;
    }
  }

  return copiados;
}

console.log('🚀 Iniciando compilación de EcoFlux para Vercel...');

// 1. Limpiar y recrear dist/
console.log('🧹 Limpiando directorio dist/...');
limpiarDirectorio(DIST_DIR);

// 2. Copiar frontend a dist/
console.log('📦 Copiando juego y simulador (frontend/) -> dist/...');
const frontendArchivos = copiarDirectorio(FRONTEND_DIR, DIST_DIR);
console.log(`   ✓ ${frontendArchivos} archivos copiados para el juego interactivo.`);

// 3. Copiar presentacion a dist/presentacion/
console.log('📊 Copiando presentación dinámica (presentacion/) -> dist/presentacion/...');
const distPresentacion = path.join(DIST_DIR, 'presentacion');
const presArchivos = copiarDirectorio(PRESENTACION_DIR, distPresentacion);
console.log(`   ✓ ${presArchivos} archivos copiados para la presentación dinámica.`);

// 4. Verificación de archivos clave
const checks = [
  path.join(DIST_DIR, 'index.html'),
  path.join(DIST_DIR, 'js', 'gameLoop.js'),
  path.join(DIST_DIR, 'js', 'api.js'),
  path.join(distPresentacion, 'index.html'),
  path.join(distPresentacion, 'js', 'slides.js'),
  path.join(distPresentacion, 'css', 'styles.css')
];

let todosExisten = true;
for (const check of checks) {
  if (!fs.existsSync(check)) {
    console.error(`❌ Error crítico de build: Falta archivo requerido: ${path.relative(ROOT_DIR, check)}`);
    todosExisten = false;
  }
}

if (!todosExisten) {
  process.exit(1);
}

console.log('✅ Compilación exitosa para Vercel. Todo listo en dist/\n');
