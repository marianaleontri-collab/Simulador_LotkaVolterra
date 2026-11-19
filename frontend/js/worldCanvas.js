/**
 * EcoFlux: Guardián del Bioma
 * WorldCanvas: Motor visual 2D y simulador de Boids para el ecosistema Lotka-Volterra.
 *
 * Características:
 * - Renderizado en Canvas 2D a 60 FPS con soporte High-DPI (devicePixelRatio).
 * - Temas visuales inmersivos para 3 biomas: BOSQUE, SABANA y TUNDRA.
 * - Simulación de criaturas basada en Boids (flocking, vagar suave, evasión y cacería activa).
 * - Sincronización continua de entidades matemáticas (x, y) con control suave de sprites.
 * - Efectos visuales de cartas: Lluvia Fértil, Refugio Natural, Migración y Control de Depredadores.
 */

// ============================================================================
// CONFIGURACIÓN DE BIOMAS Y TEMAS VISUALES
// ============================================================================
export const BIOME_CONFIGS = {
  BOSQUE: {
    name: 'Bosque Templado',
    bgGradient: ['#04120E', '#0B1F1A', '#061713'],
    groundColor: '#030E0B',
    accentColor: '#10B981',
    sceneryType: 'forest',
    ambientType: 'fireflies',
    ambientCount: 30,
    decorColor: 'rgba(16, 185, 129, 0.08)',
  },
  SABANA: {
    name: 'Sabana Africana',
    bgGradient: ['#120D0B', '#1C1917', '#17120F'],
    groundColor: '#0E0A08',
    accentColor: '#F59E0B',
    sceneryType: 'savanna',
    ambientType: 'dust',
    ambientCount: 35,
    decorColor: 'rgba(245, 158, 11, 0.07)',
  },
  TUNDRA: {
    name: 'Tundra Glacial',
    bgGradient: ['#060C18', '#0F172A', '#091020'],
    groundColor: '#040812',
    accentColor: '#38BDF8',
    sceneryType: 'tundra',
    ambientType: 'snow',
    ambientCount: 50,
    decorColor: 'rgba(56, 189, 248, 0.08)',
  }
};

// ============================================================================
// CLASE PRINCIPAL: WorldCanvas
// ============================================================================
export class WorldCanvas {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 800;
    this.height = 600;
    this.dpr = 1;

    // Bioma activo
    this.biomeKey = 'BOSQUE';
    this.biomeTheme = BIOME_CONFIGS.BOSQUE;

    // Entidades vivas (Sprites)
    this.preyList = [];
    this.predatorList = [];

    // Partículas y efectos
    this.ambientParticles = [];
    this.shockwaves = [];
    this.sparks = [];
    this.rainDrops = [];

    // Efectos de cartas activos
    this.rainActive = false;
    this.shelterActive = false;
    this.shelterZone = { x: 400, y: 300, radius: 100 };

    // Control de tiempo y renderizado
    this.animationFrameId = null;
    this.isRunning = false;
    this.isPaused = false;
    this.lastTime = 0;
    this.timeAccumulator = 0;
    this.globalTime = 0;

    // Métricas de rendimiento
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;

    // Observador de dimensiones
    this.resizeObserver = null;
  }

  /**
   * Inicializa el lienzo, detecta DPR, ajusta eventos y carga el tema del bioma.
   * @param {HTMLCanvasElement} canvasElement 
   * @param {string} biomeType ('BOSQUE' | 'SABANA' | 'TUNDRA')
   */
  init(canvasElement, biomeType = 'BOSQUE') {
    if (!canvasElement) {
      console.error('[WorldCanvas] Error: Elemento canvas no proporcionado.');
      return;
    }

    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.dpr = window.devicePixelRatio || 1;

    this.setBiome(biomeType);
    this.handleResize();

    // ResizeObserver para adaptación fluida y responsiva
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
    } else {
      window.addEventListener('resize', () => this.handleResize());
    }

    // Iniciar partículas ambientales
    this.initAmbientParticles();

    // Comenzar bucle de animación
    this.start();
    console.log(`[WorldCanvas] Inicializado con éxito. Bioma: ${this.biomeKey}, DPR: ${this.dpr}`);
  }

  /**
   * Cambia el bioma en tiempo real y regenera elementos decorativos.
   * @param {string} biomeType 
   */
  setBiome(biomeType) {
    const key = (biomeType || 'BOSQUE').toUpperCase();
    this.biomeKey = BIOME_CONFIGS[key] ? key : 'BOSQUE';
    this.biomeTheme = BIOME_CONFIGS[this.biomeKey];
    this.initAmbientParticles();
  }

  /**
   * Ajuste de resolución y escalado para pantallas normales y Retina/Hi-DPI.
   */
  handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(100, Math.floor(rect.width));
    const height = Math.max(100, Math.floor(rect.height));

    this.width = width;
    this.height = height;

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);

    // Ajustar zona de refugio al centro del canvas
    this.shelterZone = {
      x: this.width * 0.5,
      y: this.height * 0.5,
      radius: Math.min(this.width, this.height) * 0.22
    };

    // Ajustar partículas si se redimensiona
    this.initAmbientParticles();
  }

  // ==========================================================================
  // INICIALIZACIÓN DE PARTÍCULAS AMBIENTALES
  // ==========================================================================
  initAmbientParticles() {
    this.ambientParticles = [];
    const count = this.biomeTheme.ambientCount || 30;

    for (let i = 0; i < count; i++) {
      this.ambientParticles.push(this.createAmbientParticle());
    }
  }

  createAmbientParticle() {
    const type = this.biomeTheme.ambientType;
    if (type === 'snow') {
      // Copos de nieve para TUNDRA
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random() * 2.5,
        vx: -0.5 + Math.random() * 1,
        vy: 1.2 + Math.random() * 2.2,
        alpha: 0.3 + Math.random() * 0.6,
        swaySpeed: 1 + Math.random() * 2,
        swayOffset: Math.random() * Math.PI * 2
      };
    } else if (type === 'dust') {
      // Polvo dorado cálido para SABANA
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1.2 + Math.random() * 2,
        vx: 0.8 + Math.random() * 1.8,
        vy: -0.3 + Math.random() * 0.6,
        alpha: 0.2 + Math.random() * 0.5,
        pulseSpeed: 1.5 + Math.random() * 2,
        pulseOffset: Math.random() * Math.PI * 2
      };
    } else {
      // Luciérnagas titilantes para BOSQUE
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1.5 + Math.random() * 2.5,
        vx: -0.4 + Math.random() * 0.8,
        vy: -0.4 + Math.random() * 0.8,
        alpha: 0.1,
        maxAlpha: 0.4 + Math.random() * 0.6,
        pulseSpeed: 1.2 + Math.random() * 2.5,
        pulseOffset: Math.random() * Math.PI * 2
      };
    }
  }

  // ==========================================================================
  // SINCRONIZACIÓN DE POBLACIÓN MATEMÁTICA CON SPRITES EN PANTALLA
  // ==========================================================================
  /**
   * Adapta el número de agentes visuales a los números matemáticos de Lotka-Volterra.
   * Utiliza un mapeo proporcional y suave para asegurar 60 FPS estables.
   * @param {number} targetPreyCount Población x
   * @param {number} targetPredatorCount Población y
   */
  syncEntities(targetPreyCount, targetPredatorCount) {
    const rawPrey = Math.max(0, targetPreyCount || 0);
    const rawPred = Math.max(0, targetPredatorCount || 0);

    // Mapeo suave con tope visual (~90 presas, ~35 depredadores)
    let desiredPrey = 0;
    if (rawPrey > 0) {
      if (rawPrey <= 60) {
        desiredPrey = Math.round(rawPrey);
      } else {
        desiredPrey = Math.min(95, Math.round(60 + (rawPrey - 60) * 0.35));
      }
    }

    let desiredPred = 0;
    if (rawPred > 0) {
      if (rawPred <= 20) {
        desiredPred = Math.round(rawPred);
      } else {
        desiredPred = Math.min(38, Math.round(20 + (rawPred - 20) * 0.45));
      }
    }

    // 1. Ajustar Presas
    while (this.preyList.length < desiredPrey) {
      const p = this.spawnPrey();
      this.createBirthParticles(p.x, p.y, '#10B981');
    }
    while (this.preyList.length > desiredPrey) {
      const removed = this.preyList.pop();
      if (removed) {
        this.createShockwave(removed.x, removed.y, 'rgba(16, 185, 129, 0.4)', 25);
      }
    }

    // 2. Ajustar Depredadores
    while (this.predatorList.length < desiredPred) {
      const pred = this.spawnPredator();
      this.createBirthParticles(pred.x, pred.y, '#F43F5E');
    }
    while (this.predatorList.length > desiredPred) {
      const removed = this.predatorList.pop();
      if (removed) {
        this.createShockwave(removed.x, removed.y, 'rgba(244, 63, 94, 0.7)', 35);
      }
    }
  }

  spawnPrey(customX = null, customY = null, customVx = null, customVy = null) {
    const margin = 40;
    const x = customX !== null ? customX : margin + Math.random() * (this.width - margin * 2);
    const y = customY !== null ? customY : margin + Math.random() * (this.height - margin * 2);
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 0.8;

    const prey = {
      x,
      y,
      vx: customVx !== null ? customVx : Math.cos(angle) * speed,
      vy: customVy !== null ? customVy : Math.sin(angle) * speed,
      radius: 5.5 + Math.random() * 1.5,
      color: '#10B981',
      glowColor: 'rgba(16, 185, 129, 0.8)',
      maxSpeed: 2.4,
      evadeSpeed: 4.0,
      wanderAngle: angle,
      trail: [],
      maxTrail: 4
    };
    this.preyList.push(prey);
    return prey;
  }

  spawnPredator(customX = null, customY = null) {
    const margin = 50;
    const x = customX !== null ? customX : margin + Math.random() * (this.width - margin * 2);
    const y = customY !== null ? customY : margin + Math.random() * (this.height - margin * 2);
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 0.6;

    const predator = {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 9.5 + Math.random() * 1.5,
      color: '#F43F5E',
      glowColor: 'rgba(244, 63, 94, 0.85)',
      maxSpeed: 1.6,
      chaseSpeed: 3.2,
      pulsePhase: Math.random() * Math.PI * 2,
      wanderAngle: angle,
      trail: [],
      maxTrail: 5
    };
    this.predatorList.push(predator);
    return predator;
  }

  // ==========================================================================
  // EFECTOS VISUALES DE CARTAS E INTERVENCIONES
  // ==========================================================================
  /**
   * Activa o desactiva la lluvia continua.
   * @param {boolean} active 
   */
  setRainEffect(active) {
    this.rainActive = !!active;
    if (this.rainActive && this.rainDrops.length === 0) {
      for (let i = 0; i < 70; i++) {
        this.rainDrops.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          length: 12 + Math.random() * 16,
          speed: 14 + Math.random() * 8,
          alpha: 0.3 + Math.random() * 0.4
        });
      }
    }
  }

  /**
   * Activa o desactiva el santuario de refugio natural.
   * @param {boolean} active 
   */
  setShelterEffect(active) {
    this.shelterActive = !!active;
    if (this.shelterActive) {
      this.createShockwave(this.shelterZone.x, this.shelterZone.y, 'rgba(16, 185, 129, 0.8)', this.shelterZone.radius);
    }
  }

  /**
   * Carta 3: Oleada de presas entrando desde los bordes con estelas de luz.
   */
  triggerMigrationEffect() {
    const waveCount = 15;
    for (let i = 0; i < waveCount; i++) {
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? -20 : this.width + 20;
      const startY = 50 + Math.random() * (this.height - 100);
      const targetX = this.width * 0.5 + (Math.random() - 0.5) * 200;
      const targetY = this.height * 0.5 + (Math.random() - 0.5) * 200;

      const angle = Math.atan2(targetY - startY, targetX - startX);
      const speed = 4.5 + Math.random() * 2.0;

      const prey = this.spawnPrey(startX, startY, Math.cos(angle) * speed, Math.sin(angle) * speed);
      prey.maxTrail = 8; // Estela más larga para el efecto visual
      this.createBirthParticles(startX, startY, '#34D399', 8);
    }

    // Ondas expansivas en los costados
    this.createShockwave(20, this.height * 0.5, 'rgba(52, 211, 153, 0.7)', 80);
    this.createShockwave(this.width - 20, this.height * 0.5, 'rgba(52, 211, 153, 0.7)', 80);
  }

  /**
   * Carta 4: Aros de energía sonora que dispersan o neutralizan depredadores.
   */
  triggerPredatorControlEffect() {
    // 3 ondas de choque concéntricas desde el centro
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    this.createShockwave(cx, cy, 'rgba(244, 63, 94, 0.9)', Math.max(this.width, this.height) * 0.65);
    setTimeout(() => {
      this.createShockwave(cx, cy, 'rgba(56, 189, 248, 0.8)', Math.max(this.width, this.height) * 0.45);
    }, 150);

    // Empujar físicamente a los depredadores lejos del centro y crear chispas
    this.predatorList.forEach(p => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      p.vx = (dx / dist) * 6;
      p.vy = (dy / dist) * 6;
      this.createBirthParticles(p.x, p.y, '#38BDF8', 6);
    });
  }

  // ==========================================================================
  // SISTEMA DE PARTÍCULAS Y ONDAS EXPANSIVAS
  // ==========================================================================
  createShockwave(x, y, color = 'rgba(244, 63, 94, 0.8)', maxRadius = 40) {
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius,
      color,
      lineWidth: 3,
      alpha: 1.0,
      growthRate: 3.5
    });
  }

  createBirthParticles(x, y, color = '#10B981', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.5;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 1.5 + Math.random() * 1.5,
        alpha: 1.0,
        decay: 0.03 + Math.random() * 0.04
      });
    }
  }

  createCaptureSparks(x, y) {
    // Chispas de cacería rojas/corales
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? '#F43F5E' : '#FDA4AF',
        radius: 2.0 + Math.random() * 1.5,
        alpha: 1.0,
        decay: 0.04 + Math.random() * 0.05
      });
    }
    this.createShockwave(x, y, 'rgba(244, 63, 94, 0.85)', 35);
  }

  // ==========================================================================
  // ACTUALIZACIÓN DE FÍSICA Y COMPORTAMIENTO BOIDS
  // ==========================================================================
  updatePhysics(dt) {
    const margin = 35;
    const turnFactor = 0.45;

    // 1. Actualizar Presas
    for (let i = 0; i < this.preyList.length; i++) {
      const prey = this.preyList[i];

      // Guardar estela
      prey.trail.push({ x: prey.x, y: prey.y });
      if (prey.trail.length > prey.maxTrail) prey.trail.shift();

      // Vagar suave
      prey.wanderAngle += (Math.random() - 0.5) * 0.4;
      let targetVx = Math.cos(prey.wanderAngle) * prey.maxSpeed;
      let targetVy = Math.sin(prey.wanderAngle) * prey.maxSpeed;

      // Evasión rápida si hay depredadores a menos de 75px
      let nearestPred = null;
      let minDist = 75;

      for (let j = 0; j < this.predatorList.length; j++) {
        const pred = this.predatorList[j];
        const dist = Math.hypot(pred.x - prey.x, pred.y - prey.y);
        if (dist < minDist) {
          minDist = dist;
          nearestPred = pred;
        }
      }

      if (nearestPred) {
        // Huir alejándose a velocidad máxima
        const dx = prey.x - nearestPred.x;
        const dy = prey.y - nearestPred.y;
        const dist = Math.hypot(dx, dy) || 1;
        targetVx = (dx / dist) * prey.evadeSpeed;
        targetVy = (dy / dist) * prey.evadeSpeed;
      }

      // Si el refugio está activo, las presas cercanas se sienten atraídas hacia el santuario
      if (this.shelterActive) {
        const distToShelter = Math.hypot(this.shelterZone.x - prey.x, this.shelterZone.y - prey.y);
        if (distToShelter > 20 && distToShelter < this.shelterZone.radius * 1.5) {
          const dx = this.shelterZone.x - prey.x;
          const dy = this.shelterZone.y - prey.y;
          const dist = Math.hypot(dx, dy) || 1;
          targetVx += (dx / dist) * 1.2;
          targetVy += (dy / dist) * 1.2;
        }
      }

      // Suavizado de velocidad
      prey.vx += (targetVx - prey.vx) * 0.15;
      prey.vy += (targetVy - prey.vy) * 0.15;

      // Rebotar en bordes suavemente
      if (prey.x < margin) prey.vx += turnFactor;
      if (prey.x > this.width - margin) prey.vx -= turnFactor;
      if (prey.y < margin) prey.vy += turnFactor;
      if (prey.y > this.height - margin) prey.vy -= turnFactor;

      prey.x += prey.vx * dt;
      prey.y += prey.vy * dt;

      // Constreñir dentro de la pantalla
      prey.x = Math.max(8, Math.min(this.width - 8, prey.x));
      prey.y = Math.max(8, Math.min(this.height - 8, prey.y));
    }

    // 2. Actualizar Depredadores
    for (let i = 0; i < this.predatorList.length; i++) {
      const pred = this.predatorList[i];

      // Animación de aura pulsante
      pred.pulsePhase += 0.08;

      // Guardar estela
      pred.trail.push({ x: pred.x, y: pred.y });
      if (pred.trail.length > pred.maxTrail) pred.trail.shift();

      // Persecución activa de la presa más cercana dentro de un radio de 130px
      let nearestPrey = null;
      let minPreyDist = 130;
      let caughtPreyIndex = -1;

      for (let j = 0; j < this.preyList.length; j++) {
        const prey = this.preyList[j];

        // Si el refugio está activo y la presa está dentro del domo, los depredadores no pueden atacarla
        if (this.shelterActive) {
          const preyInShelter = Math.hypot(this.shelterZone.x - prey.x, this.shelterZone.y - prey.y) < this.shelterZone.radius;
          if (preyInShelter) continue;
        }

        const dist = Math.hypot(prey.x - pred.x, prey.y - pred.y);
        if (dist < minPreyDist) {
          minPreyDist = dist;
          nearestPrey = prey;
          // Comprobar captura física
          if (dist < pred.radius + prey.radius * 0.7) {
            caughtPreyIndex = j;
          }
        }
      }

      // Si atrapó a una presa en el canvas
      if (caughtPreyIndex !== -1 && this.preyList.length > 5) {
        const caught = this.preyList.splice(caughtPreyIndex, 1)[0];
        this.createCaptureSparks(caught.x, caught.y);
      }

      let targetVx = 0;
      let targetVy = 0;

      if (nearestPrey) {
        // Persecución agresiva
        const dx = nearestPrey.x - pred.x;
        const dy = nearestPrey.y - pred.y;
        const dist = Math.hypot(dx, dy) || 1;
        targetVx = (dx / dist) * pred.chaseSpeed;
        targetVy = (dy / dist) * pred.chaseSpeed;
      } else {
        // Vagar suave
        pred.wanderAngle += (Math.random() - 0.5) * 0.3;
        targetVx = Math.cos(pred.wanderAngle) * pred.maxSpeed;
        targetVy = Math.sin(pred.wanderAngle) * pred.maxSpeed;
      }

      // Repulsión del refugio si está activo: los depredadores chocan con el domo
      if (this.shelterActive) {
        const distToShelter = Math.hypot(pred.x - this.shelterZone.x, pred.y - this.shelterZone.y);
        if (distToShelter < this.shelterZone.radius + 15) {
          const dx = pred.x - this.shelterZone.x;
          const dy = pred.y - this.shelterZone.y;
          const dist = Math.hypot(dx, dy) || 1;
          targetVx += (dx / dist) * 4.5;
          targetVy += (dy / dist) * 4.5;
        }
      }

      // Suavizado
      pred.vx += (targetVx - pred.vx) * 0.12;
      pred.vy += (targetVy - pred.vy) * 0.12;

      // Rebotar en bordes
      if (pred.x < margin) pred.vx += turnFactor * 1.2;
      if (pred.x > this.width - margin) pred.vx -= turnFactor * 1.2;
      if (pred.y < margin) pred.vy += turnFactor * 1.2;
      if (pred.y > this.height - margin) pred.vy -= turnFactor * 1.2;

      pred.x += pred.vx * dt;
      pred.y += pred.vy * dt;

      pred.x = Math.max(10, Math.min(this.width - 10, pred.x));
      pred.y = Math.max(10, Math.min(this.height - 10, pred.y));
    }
  }

  // ==========================================================================
  // RENDERIZADO VISUAL DEL BIOMA, SILUETAS Y AMBIENTE
  // ==========================================================================
  drawBackground() {
    const ctx = this.ctx;
    const theme = this.biomeTheme;

    // Fondo degradado sutil
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, theme.bgGradient[0]);
    grad.addColorStop(0.5, theme.bgGradient[1]);
    grad.addColorStop(1, theme.bgGradient[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Siluetas y decoraciones geométricas según el bioma
    ctx.save();
    if (this.biomeKey === 'BOSQUE') {
      this.drawForestScenery(ctx);
    } else if (this.biomeKey === 'SABANA') {
      this.drawSavannaScenery(ctx);
    } else if (this.biomeKey === 'TUNDRA') {
      this.drawTundraScenery(ctx);
    }
    ctx.restore();
  }

  drawForestScenery(ctx) {
    // Líneas sutiles de terreno orgánico
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.85);
    ctx.bezierCurveTo(this.width * 0.25, this.height * 0.82, this.width * 0.65, this.height * 0.88, this.width, this.height * 0.84);
    ctx.stroke();

    // Siluetas minimalistas de árboles
    ctx.fillStyle = 'rgba(6, 78, 59, 0.14)';
    const treePositions = [0.12, 0.28, 0.52, 0.76, 0.88];
    treePositions.forEach((pos, idx) => {
      const tx = this.width * pos;
      const ty = this.height * 0.86;
      const th = 40 + (idx % 3) * 15;
      
      // Tronco
      ctx.fillRect(tx - 2, ty - th * 0.3, 4, th * 0.3);
      // Follaje cónico
      ctx.beginPath();
      ctx.moveTo(tx, ty - th);
      ctx.lineTo(tx - 16, ty - th * 0.25);
      ctx.lineTo(tx + 16, ty - th * 0.25);
      ctx.closePath();
      ctx.fill();
    });
  }

  drawSavannaScenery(ctx) {
    // Terreno plano y colina suave
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.88);
    ctx.lineTo(this.width, this.height * 0.88);
    ctx.stroke();

    // Silueta estilizada de Acacia africana plana
    ctx.fillStyle = 'rgba(120, 53, 15, 0.12)';
    const acaciaX = this.width * 0.82;
    const acaciaY = this.height * 0.88;

    // Tronco retorcido
    ctx.beginPath();
    ctx.moveTo(acaciaX, acaciaY);
    ctx.quadraticCurveTo(acaciaX - 6, acaciaY - 30, acaciaX + 4, acaciaY - 55);
    ctx.lineTo(acaciaX + 8, acaciaY - 55);
    ctx.quadraticCurveTo(acaciaX - 2, acaciaY - 30, acaciaX + 4, acaciaY);
    ctx.closePath();
    ctx.fill();

    // Copa plana característica de la Acacia
    ctx.beginPath();
    ctx.ellipse(acaciaX + 6, acaciaY - 55, 38, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTundraScenery(ctx) {
    // Carámbanos de hielo sutiles en la parte superior
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    const icicleStep = 45;
    for (let x = 10; x < this.width; x += icicleStep) {
      const h = 12 + Math.sin(x * 0.2) * 8;
      ctx.beginPath();
      ctx.moveTo(x - 6, 0);
      ctx.lineTo(x + 6, 0);
      ctx.lineTo(x, h);
      ctx.closePath();
      ctx.fill();
    }

    // Suelo rocoso quebrado
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.9);
    for (let x = 0; x <= this.width; x += 50) {
      const y = this.height * 0.9 + ((x / 50) % 2 === 0 ? -4 : 4);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ==========================================================================
  // RENDERIZADO DE PARTÍCULAS AMBIENTALES
  // ==========================================================================
  drawAmbientParticles(dt) {
    const ctx = this.ctx;
    const type = this.biomeTheme.ambientType;

    for (let i = 0; i < this.ambientParticles.length; i++) {
      const p = this.ambientParticles[i];

      if (type === 'snow') {
        p.y += p.vy * dt;
        p.swayOffset += p.swaySpeed * 0.02;
        p.x += Math.sin(p.swayOffset) * 0.8 + p.vx * dt;

        if (p.y > this.height) { p.y = -5; p.x = Math.random() * this.width; }
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;

        ctx.fillStyle = `rgba(224, 242, 254, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'dust') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.pulseOffset += 0.03;
        const alpha = p.alpha * (0.6 + Math.sin(p.pulseOffset) * 0.4);

        if (p.x > this.width) { p.x = -10; p.y = Math.random() * this.height; }

        ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Fireflies
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.pulseOffset += 0.04;
        const currentAlpha = p.maxAlpha * Math.max(0, Math.sin(p.pulseOffset));

        if (p.x < 0 || p.x > this.width) p.vx *= -1;
        if (p.y < 0 || p.y > this.height) p.vy *= -1;

        if (currentAlpha > 0.05) {
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#34D399';
          ctx.fillStyle = `rgba(167, 243, 208, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  // ==========================================================================
  // RENDERIZADO DEL SANTUARIO / REFUGIO NATURAL
  // ==========================================================================
  drawShelterZone() {
    if (!this.shelterActive) return;
    const ctx = this.ctx;
    const { x, y, radius } = this.shelterZone;

    ctx.save();
    // Halo esmeralda pulsante
    const pulse = Math.sin(this.globalTime * 3) * 6;
    const currentRadius = radius + pulse;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.08)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    // Borde exterior del santuario con resplandor neón
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#10B981';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -this.globalTime * 20;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Pequeño glifo central de escudo
    ctx.setLineDash([]);
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(52, 211, 153, 0.5)';
    ctx.font = '12px "Font Awesome 6 Free", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('REFUGIO ACTIVO', x, y);

    ctx.restore();
  }

  // ==========================================================================
  // RENDERIZADO DE LLUVIA
  // ==========================================================================
  drawRain(dt) {
    if (!this.rainActive || this.rainDrops.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1.2;

    for (let i = 0; i < this.rainDrops.length; i++) {
      const drop = this.rainDrops[i];
      drop.y += drop.speed * dt;
      drop.x += (drop.speed * 0.2) * dt;

      if (drop.y > this.height) {
        // Splash al tocar el suelo
        this.createBirthParticles(drop.x, this.height - 4, '#7DD3FC', 2);
        drop.y = -10;
        drop.x = Math.random() * this.width;
      }

      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.length * 0.2, drop.y + drop.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ==========================================================================
  // RENDERIZADO DE CRIATURAS (PRESAS Y DEPREDADORES)
  // ==========================================================================
  drawCreatures() {
    const ctx = this.ctx;

    // 1. Dibujar Presas (Esmeralda #10B981)
    for (let i = 0; i < this.preyList.length; i++) {
      const p = this.preyList[i];

      // Estela suave
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let t = 1; t < p.trail.length; t++) {
          ctx.lineTo(p.trail[t].x, p.trail[t].y);
        }
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.lineWidth = p.radius * 0.8;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Cuerpo con resplandor neón
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.glowColor;

      // Orbe esmeralda
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Punto central brillante
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#A7F3D0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Dibujar Depredadores (Coral #F43F5E con Aura Pulsante)
    for (let i = 0; i < this.predatorList.length; i++) {
      const pred = this.predatorList[i];
      const pulseSize = Math.sin(pred.pulsePhase) * 3;

      // Estela coral
      if (pred.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pred.trail[0].x, pred.trail[0].y);
        for (let t = 1; t < pred.trail.length; t++) {
          ctx.lineTo(pred.trail[t].x, pred.trail[t].y);
        }
        ctx.lineTo(pred.x, pred.y);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
        ctx.lineWidth = pred.radius * 0.9;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.save();
      // Aura pulsante exterior
      ctx.shadowBlur = 15;
      ctx.shadowColor = pred.glowColor;
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.5)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(pred.x, pred.y, pred.radius + 4 + pulseSize, 0, Math.PI * 2);
      ctx.stroke();

      // Núcleo depredador
      ctx.fillStyle = pred.color;
      ctx.beginPath();
      ctx.arc(pred.x, pred.y, pred.radius, 0, Math.PI * 2);
      ctx.fill();

      // Ojo o brillo interior amenazante
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFE4E6';
      ctx.beginPath();
      ctx.arc(pred.x, pred.y, pred.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ==========================================================================
  // RENDERIZADO DE EFECTOS ESPECIALES (CHISPAS, ONDAS DE CHOQUE)
  // ==========================================================================
  drawEffects(dt) {
    const ctx = this.ctx;

    // 1. Ondas de choque
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.growthRate * dt;
      sw.alpha -= 0.025 * dt;

      if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Chispas de nacimiento y captura
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= 0.94;
      sp.vy *= 0.94;
      sp.alpha -= sp.decay * dt;

      if (sp.alpha <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.alpha);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ==========================================================================
  // BUCLE DE RENDERIZADO PRINCIPAL (60 FPS)
  // ==========================================================================
  /**
   * Renderiza un fotograma completo. Puede ser llamado externamente o por el bucle interno.
   * @param {number} deltaTime Factor de tiempo normalizado (1.0 = ~16.6ms)
   */
  render(deltaTime = 1.0) {
    if (!this.ctx || !this.canvas) return;

    this.globalTime += 0.016 * deltaTime;

    // 1. Limpiar fondo y dibujar escenario temático
    this.drawBackground();

    // 2. Dibujar partículas ambientales (luciérnagas, polvo, nieve)
    this.drawAmbientParticles(deltaTime);

    // 3. Dibujar domo del refugio si está activo
    this.drawShelterZone();

    // 4. Dibujar lluvia si está activa
    this.drawRain(deltaTime);

    // 5. Actualizar física de criaturas
    if (!this.isPaused) {
      this.updatePhysics(deltaTime);
    }

    // 6. Dibujar criaturas (presas y depredadores con resplandor neón)
    this.drawCreatures();

    // 7. Dibujar ondas de choque y chispas
    this.drawEffects(deltaTime);
  }

  /**
   * Bucle interno de requestAnimationFrame.
   */
  loop(timestamp) {
    if (!this.isRunning) return;

    if (!this.lastTime) this.lastTime = timestamp;
    const elapsed = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Medición de FPS
    this.frameCount++;
    this.fpsTimer += elapsed;
    if (this.fpsTimer >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;

      // Actualizar badge en UI si existe el elemento
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;
    }

    // Normalizar deltaTime (1.0 a 60 FPS)
    const dt = Math.min(2.5, elapsed / 16.67) || 1.0;

    this.render(dt);

    this.animationFrameId = requestAnimationFrame(t => this.loop(t));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(t => this.loop(t));
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  destroy() {
    this.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

export default WorldCanvas;
