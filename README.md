# 🌱 EcoFlux: Guardián del Bioma
> **Simulador de Dinámica Poblacional Lotka-Volterra & Experiencia Interactiva**  
> *Universidad de Cundinamarca (UDEC) — 5to Semestre de Ingeniería de Sistemas*

---

## 📌 Descripción del Proyecto

**EcoFlux** es una plataforma educativa e interactiva diseñada para explorar la dinámica no lineal de ecosistemas basados en el modelo clásico de depredador-presa de **Lotka-Volterra**.

El proyecto unifica:
1. **EcoFlux: Guardián del Bioma (`/`)**: Simulador interactivo en tiempo real con canvas renderizado a 60 FPS, HUD matemático con series temporales y retrato de fase, sistema de intervenciones ecológicas y puntuación en biomas (Bosque Templado, Sabana Africana, Tundra Ártica).
2. **Presentación Dinámica (`/presentacion/`)**: Suite interactiva de 10 diapositivas responsive con fórmulas matemáticas en KaTeX, animaciones vectoriales SVG y retrato de fase dinámico para sustentaciones académicas.
3. **Backend REST & Persistencia**: API modular en Spring Boot 3 con motor Runge-Kutta de 4to Orden (RK4), endpoints de ranking/niveles y persistencia en PostgreSQL con migraciones versionadas Flyway.

---

## 🚀 Despliegue en Vercel

El repositorio está 100% preconfigurado para compilarse y desplegarse en **Vercel** sin necesidad de configuraciones manuales:

1. **Importar Repositorio en Vercel**:
   - Conecta tu cuenta de GitHub y selecciona el repositorio `Simulador_LotkaVolterra`.
2. **Detección Automática**:
   - Vercel detectará el archivo [`vercel.json`](./vercel.json) de forma automática.
   - **Framework Preset**: `Other` / `None` (controlado por `vercel.json`).
   - **Build Command**: `npm run build` (ejecuta `node scripts/build-vercel.js`).
   - **Output Directory**: `dist`
3. **Rutas Desplegadas Automáticamente**:
   - `https://<tu-app>.vercel.app/` $\rightarrow$ Juego y Simulador Interactivo (**EcoFlux: Guardián del Bioma**).
   - `https://<tu-app>.vercel.app/presentacion/` $\rightarrow$ Presentación Dinámica de Diapositivas (10 slides).
4. **Modo Autónomo Local (Cero Configuración de Backend Requerida)**:
   - En Vercel, si no se especifica una variable `window.ECOFLUX_API_URL`, el cliente activa de inmediato el **Modo Local Autónomo**. El motor RK4 local, los desafíos por bioma y el ranking persisten de manera transparente en `localStorage` sin arrojar errores de red ni Mixed Content en la consola.

---

## 💻 Ejecución Local

### Opción A: Servir Frontend y Presentación (Compilación Vercel)
```bash
# Instalar dependencias / empaquetar en dist/
npm run build

# Servir con cualquier servidor estático local (ej. npx serve o python)
npx serve dist
# O bien:
python -m http.server 8080 --directory dist
```
- Abre `http://localhost:8080/` para el juego interactivo.
- Abre `http://localhost:8080/presentacion/` para la presentación de diapositivas.

### Opción B: Levantar Backend Completo (Spring Boot + PostgreSQL)
```bash
# 1. Levantar base de datos PostgreSQL con Docker
docker-compose up -d

# 2. Compilar y levantar la API en Spring Boot
mvn spring-boot:run
```
La API quedará disponible en `http://localhost:8080/api/v1` con documentación Swagger en `http://localhost:8080/swagger-ui.html`.

---

## 📁 Estructura del Repositorio

```
EcoFlux/
├── frontend/               # Código fuente del simulador y juego
│   ├── index.html          # Interfaz principal (Guardián del Bioma)
│   └── js/
│       ├── api.js          # Cliente API con timeout y conmutación offline
│       ├── gameLoop.js     # Bucle de juego y ciclo día/noche
│       ├── hudCharts.js    # Renderizado Chart.js (Series y Retrato de Fase)
│       ├── rk4Engine.js    # Motor numérico Runge-Kutta 4 (RK4)
│       └── worldCanvas.js  # Renderizado gráfico 2D del ecosistema
├── presentacion/           # Presentación dinámica académica (10 diapositivas)
│   ├── index.html          # Diapositivas interactivas (16:9 responsive)
│   ├── css/styles.css      # Estilos y animaciones de presentación
│   └── js/
│       ├── charts.js       # Gráficas animadas de Euler vs RK4 y órbitas
│       └── slides.js       # Navegador de diapositivas y atajos de teclado
├── scripts/
│   └── build-vercel.js     # Script de empaquetado optimizado para dist/
├── src/                    # Backend Spring Boot 3 (Java 21)
├── package.json            # Configuración npm y script de build
├── vercel.json             # Enrutamiento, headers de seguridad y build de Vercel
├── .vercelignore           # Archivos excluidos del bundle web de Vercel
└── README.md               # Esta documentación
```

---

## 👥 Equipo de Desarrollo (UDEC 2026)

* **Mariana León Triana**
* **Juan Diego Cagua**
* **Juan Pablo Beltrán Bejarano** (@Juanpbb6811)
