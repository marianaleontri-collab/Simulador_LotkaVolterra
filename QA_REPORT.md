# Reporte de Auditoría de Integración, QA y Bugs — EcoFlux

**Proyecto:** EcoFlux — Simulador de Dinámica Poblacional Lotka-Volterra  
**Rama de Integración:** `integration/qa-final`  
**Estado General de Pruebas:** **PASS (100% Exitoso — 19/19 Pruebas en Verde)**  
**Fecha de Certificación:** 18 de Noviembre de 2026  
**Auditor Principal:** Ingeniero Principal de Integración y QA  

---

## 1. Resumen Ejecutivo de la Integración

Se completó la unificación y estabilización de las tres ramas funcionales del proyecto:
- `feature/database-infra`: Infraestructura Docker PostgreSQL, migraciones Flyway (V1 y V2) y persistencia Spring Data JPA.
- `feature/backend-api`: API RESTful con Spring Boot 3.3.5, controladores, DTOs, validación Jakarta, OpenAPI 3 y motor numérico RK4.
- `feature/frontend-ui`: Interfaz web interactiva, visualizador con Chart.js, motor autónomo en JavaScript ES6 (`mockRk4.js`) y cliente REST resiliente.

Conforme a las directrices de la entrega de software, los artefactos de documentación académica y presentación interactiva permanecen preservados de manera limpia e independiente en sus respectivas ramas (`docs/marco-matematico-apa` y `docs/presentacion-dinamica`), manteniendo la rama de integración enfocada 100% en el código fuente, la infraestructura y las pruebas de la aplicación.

---

## 2. Matriz de Inconsistencias y Bugs Detectados y Corregidos

| Módulo | Bug / Inconsistencia Detectada | Causa Raíz | Solución Aplicada | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **Persistencia / JPA** | Backend operando en memoria sin persistir en PostgreSQL. | `EcosistemaPersistencePort` solo tenía activo el fallback `InMemoryEcosistemaPersistenceAdapter` (`ConcurrentHashMap`). | Se implementó `JpaEcosistemaPersistenceAdapter` como `@Component` y `@Primary`, inyectando `EcosistemaRepository` para persistencia real. | **CORREGIDO** |
| **Presets / Base de Datos** | `GET /api/v1/presets` devolvía datos en memoria y no los sembrados por Flyway. | `SimulacionService` tenía una lista estática cableada desconectada de la tabla `ecosistemas`. | Se conectó `SimulacionService` a `EcosistemaRepository.findByEsPresetTrue()`, mapeando los 4 presets de PostgreSQL con fallback seguro. | **CORREGIDO** |
| **Configuración** | Conflicto potencial de precedencia entre dos archivos de configuración. | Existían simultáneamente `application.properties` y `application.yml`. | Se migraron las propiedades de OpenAPI/Swagger a `application.yml` y se eliminó `application.properties`. | **CORREGIDO** |
| **Matemática / RK4** | Discrepancia numérica entre Java y JavaScript superior a la tolerancia ($5 \times 10^{-5} > 10^{-6}$). | En `mockRk4.js`, la serie temporal truncaba las poblaciones con `toFixed(4)` en cada paso. | Se eliminó el truncamiento a nivel de datos en `mockRk4.js`, conservando punto flotante IEEE 754 puro (paridad exacta $< 10^{-12}$). | **CORREGIDO** |
| **Matemática / Casos Borde** | Error 500 / Excepción cuando presas o depredadores iniciales eran 0. | `ParametrosSimulacion` exigía estrictamente valores $> 0$, aunque el DTO y la BD permiten $\ge 0$. | Se implementó `resolverCasoBorde` en `MotorLotkaVolterraRk4` resolviendo analíticamente el decaimiento de depredadores o crecimiento exponencial. | **CORREGIDO** |
| **Rendimiento / Estabilidad** | Riesgo de congelamiento del navegador ante series masivas ($T / dt > 10,000$). | Generación de hasta 1,000,000 de puntos enviándose a Chart.js y serializándose en JSON. | Se implementó submuestreo seguro uniforme a máximo 10,000 puntos en `SimulacionService.java` y `charts.js`, preservando el punto final. | **CORREGIDO** |
| **Conservación Invariante** | Error relativo de $V(x,y)$ en el preset "Equilibrio Armónico" alcanzaba 0.19% con $dt = 0.10$. | Anti-disipación de RK4 en integración a largo plazo ($T = 200$) con paso holgado. | Se fijó el paso de integración en $dt = 0.05$ en `V2__seed_presets.sql` y `SimulacionService`, reduciendo el error a $0.012\% \ll 0.1\%$. | **CORREGIDO** |
| **Frontend / CRUD** | Inexistencia de controles UI para guardar, listar y eliminar simulaciones en PostgreSQL. | El frontend solo contaba con descargas locales (CSV/JSON/PNG) sin integración a los endpoints POST/GET/DELETE. | Se implementó el botón `#btn-save-simulation`, el modal `#history-modal` con listado/carga/eliminación y notificaciones toast. | **CORREGIDO** |
| **Frontend / Gráficas** | Parpadeo y solapamiento de canvas al actualizar simulaciones consecutivas. | Las instancias de Chart.js no se destruían completamente en el registro global de la librería. | Se blindó `destruirGraficas()` limpiando referencias locales y el catálogo global `window.Chart.getChart(...)`. | **CORREGIDO** |
| **Frontend / Exportación** | Gráficas PNG exportadas con fondo transparente ilegibles en fondos claros. | `toBase64Image()` exportaba el fondo transparente por defecto de Chart.js. | Se configuró renderizado sobre un canvas auxiliar con fondo `#090d16` asegurando alto contraste en cualquier visor. | **CORREGIDO** |

---

## 3. Coincidencia de Esquema (JPA ↔ Flyway ↔ PostgreSQL)

Se auditó columna a columna la entidad `EcosistemaEntity.java` contra la migración `V1__create_schema.sql`:

| Columna en Base de Datos | Tipo SQL PostgreSQL | Propiedad en Java | Tipo JPA | Restricciones / Checks |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `id` | `Long` | `PRIMARY KEY`, Auto-incremental |
| `nombre_ecosistema` | `VARCHAR(100)` | `nombreEcosistema` | `String` | `NOT NULL`, max 100 caracteres |
| `nombre_presa` | `VARCHAR(60)` | `nombrePresa` | `String` | `NOT NULL`, default 'Presas' |
| `nombre_depredador` | `VARCHAR(60)` | `nombreDepredador` | `String` | `NOT NULL`, default 'Depredadores' |
| `poblacion_inicial_presas` | `DOUBLE PRECISION` | `poblacionInicialPresas` | `Double` | `NOT NULL`, `CHECK (>= 0)` |
| `poblacion_inicial_depredadores` | `DOUBLE PRECISION` | `poblacionInicialDepredadores` | `Double` | `NOT NULL`, `CHECK (>= 0)` |
| `alfa` | `DOUBLE PRECISION` | `alfa` | `Double` | `NOT NULL`, `CHECK (> 0)` |
| `beta` | `DOUBLE PRECISION` | `beta` | `Double` | `NOT NULL`, `CHECK (> 0)` |
| `delta` | `DOUBLE PRECISION` | `delta` | `Double` | `NOT NULL`, `CHECK (> 0)` |
| `gamma` | `DOUBLE PRECISION` | `gamma` | `Double` | `NOT NULL`, `CHECK (> 0)` |
| `tiempo_total` | `DOUBLE PRECISION` | `tiempoTotal` | `Double` | `NOT NULL`, `CHECK (> 0)` |
| `paso_tiempo` | `DOUBLE PRECISION` | `pasoTiempo` | `Double` | `NOT NULL`, `CHECK (> 0)` |
| `max_presas` | `DOUBLE PRECISION` | `maxPresas` | `Double` | Opcional (calculado) |
| `min_presas` | `DOUBLE PRECISION` | `minPresas` | `Double` | Opcional (calculado) |
| `max_depredadores` | `DOUBLE PRECISION` | `maxDepredadores` | `Double` | Opcional (calculado) |
| `min_depredadores` | `DOUBLE PRECISION` | `minDepredadores` | `Double` | Opcional (calculado) |
| `riesgo_extincion` | `BOOLEAN` | `riesgoExtincion` | `Boolean` | `DEFAULT FALSE` |
| `es_preset` | `BOOLEAN` | `esPreset` | `Boolean` | `NOT NULL`, `DEFAULT FALSE` |
| `fecha_creacion` | `TIMESTAMP` | `fechaCreacion` | `LocalDateTime` | `NOT NULL`, gestionado por `@PrePersist` |

**Presupuestos y Semillas (`V2__seed_presets.sql`):**
1. *Lince y Liebre (Clásico Canadá)*: $x_0 = 40, y_0 = 9, \alpha = 0.55, \beta = 0.028, \delta = 0.024, \gamma = 0.84, T = 50, dt = 0.05$.
2. *Equilibrio Armónico*: $x_0 = 100, y_0 = 20, \alpha = 0.1, \beta = 0.002, \delta = 0.001, \gamma = 0.05, T = 200, dt = 0.05$.
3. *Al Borde de la Extinción*: $x_0 = 120, y_0 = 45, \alpha = 0.4, \beta = 0.015, \delta = 0.01, \gamma = 0.3, T = 100, dt = 0.05$.
4. *Sabana Africana (Gacelas y Leones)*: $x_0 = 200, y_0 = 15, \alpha = 0.25, \beta = 0.004, \delta = 0.002, \gamma = 0.15, T = 150, dt = 0.1$.

---

## 4. Cobertura de Endpoints REST (API Contract)

| Método | Endpoint | Respuesta Exitosa | Códigos de Error | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/presets` | `200 OK` | `500` | Devuelve los 4 presets sembrados en PostgreSQL. |
| `POST` | `/api/v1/simulaciones/calcular` | `200 OK` | `400` | Ejecuta el motor numérico en tiempo real sin guardar en BD. |
| `POST` | `/api/v1/simulaciones` | `201 Created` | `400` | Ejecuta el motor numérico y persiste el ecosistema en BD. |
| `GET` | `/api/v1/simulaciones` | `200 OK` | `500` | Lista los resúmenes de ecosistemas personalizados creados. |
| `GET` | `/api/v1/simulaciones/{id}` | `200 OK` | `404` | Obtiene un ecosistema por ID y recalcula su serie temporal. |
| `DELETE` | `/api/v1/simulaciones/{id}` | `204 No Content` | `404` | Elimina un ecosistema personalizado por su identificador. |

Documentación viva interactiva disponible en:
- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON Spec:** `http://localhost:8080/v3/api-docs`

---

## 5. Guía de Puesta en Marcha y Verificación

### Prerrequisitos
- Docker y Docker Compose instalados.
- Java 21 JDK y Apache Maven 3.9+.
- Navegador web moderno (Chrome, Edge, Firefox).

### Paso 1: Levantar la Base de Datos PostgreSQL
En la raíz del proyecto, ejecuta:
```bash
docker compose up -d
```
Verifica que el contenedor esté saludable:
```bash
docker compose ps
```
*(Puerto expuesto: `5432`, BD: `ecoflux_db`, Usuario: `ecoflux_user`, Clave: `ecoflux_pass`)*.

### Paso 2: Compilar y Ejecutar el Backend Spring Boot
Instala el módulo del motor RK4 en el repositorio local y levanta el backend:
```bash
# 1. Instalar el motor numérico local
cd motor-lotka-volterra
mvn clean install -DskipTests
cd ..

# 2. Ejecutar la suite completa de pruebas de regresión
mvn clean test

# 3. Iniciar el servidor Spring Boot
mvn spring-boot:run
```
Flyway aplicará automáticamente las migraciones `V1__create_schema.sql` y `V2__seed_presets.sql`. El servidor quedará listo en `http://localhost:8080`.

### Paso 3: Abrir y Usar el Frontend
Abre el archivo `frontend/index.html` en tu navegador (puedes hacer doble clic o levantarlo con un servidor local estático):
```bash
# Opción con Python:
cd frontend
python -m http.server 3000
# Abrir en navegador: http://localhost:3000
```
- **Verificación:** El badge en el encabezado se tornará en verde indicando conexión con el backend Spring Boot.
- **Acciones disponibles:**
  - Seleccionar presets canónicos desde la lista desplegable.
  - Ajustar parámetros con los sliders y hacer clic en **Ejecutar Simulación**.
  - Guardar el ecosistema con **Guardar en BD**.
  - Abrir el modal de **Historial** para cargar o eliminar ecosistemas almacenados.
  - Exportar imágenes en alta definición con el botón de cámara (PNG).
  - Descargar reportes en formato CSV y JSON.
