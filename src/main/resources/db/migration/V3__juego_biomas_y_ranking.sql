-- ====================================================================
-- Migracion V3: Niveles de Desafio (Biomas) y Ranking de Partidas
-- Proyecto EcoFlux: Guardian del Bioma
-- ====================================================================

-- 1. Tabla de niveles de desafio configurados como biomas jugables
CREATE TABLE IF NOT EXISTS niveles_desafio (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    dificultad VARCHAR(20) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    nombre_presa VARCHAR(50) NOT NULL,
    nombre_depredador VARCHAR(50) NOT NULL,
    tema_visual VARCHAR(20) NOT NULL,
    poblacion_inicial_presas DOUBLE PRECISION NOT NULL,
    poblacion_inicial_depredadores DOUBLE PRECISION NOT NULL,
    alfa DOUBLE PRECISION NOT NULL CHECK (alfa > 0),
    beta DOUBLE PRECISION NOT NULL CHECK (beta > 0),
    delta DOUBLE PRECISION NOT NULL CHECK (delta > 0),
    gamma DOUBLE PRECISION NOT NULL CHECK (gamma > 0),
    dias_objetivo INTEGER NOT NULL DEFAULT 60
);

-- 2. Tabla de partidas y ranking de puntuaciones
CREATE TABLE IF NOT EXISTS partidas_ranking (
    id BIGSERIAL PRIMARY KEY,
    nombre_jugador VARCHAR(40) NOT NULL,
    nivel_id BIGINT NOT NULL REFERENCES niveles_desafio(id) ON DELETE CASCADE,
    puntaje INTEGER NOT NULL CHECK (puntaje >= 0),
    dias_sobrevividos INTEGER NOT NULL,
    estabilidad_promedio DOUBLE PRECISION NOT NULL,
    intervenciones_usadas INTEGER NOT NULL,
    victoria BOOLEAN NOT NULL DEFAULT FALSE,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices para optimizar consultas de ranking global y por nivel
CREATE INDEX IF NOT EXISTS idx_partidas_ranking_puntaje ON partidas_ranking(puntaje DESC);
CREATE INDEX IF NOT EXISTS idx_partidas_ranking_nivel_puntaje ON partidas_ranking(nivel_id, puntaje DESC);

-- 3. Datos iniciales: Seed de 3 biomas jugables disenados matematicamente
INSERT INTO niveles_desafio (
    nombre,
    dificultad,
    descripcion,
    nombre_presa,
    nombre_depredador,
    tema_visual,
    poblacion_inicial_presas,
    poblacion_inicial_depredadores,
    alfa,
    beta,
    delta,
    gamma,
    dias_objetivo
) VALUES
(
    'Bosque Boreal',
    'FACIL',
    'Oscilacion clasica manejable en taiga boscosa',
    'Liebres',
    'Linces',
    'BOSQUE',
    45.0,
    10.0,
    0.50,
    0.025,
    0.020,
    0.70,
    60
),
(
    'Sabana en Sequía',
    'MEDIO',
    'Alta presion de depredacion inicial en temporada seca',
    'Gacelas',
    'Leones',
    'SABANA',
    90.0,
    28.0,
    0.40,
    0.018,
    0.014,
    0.35,
    75
),
(
    'Tundra Crítica',
    'DIFICIL',
    'Al borde del colapso si el jugador no interviene',
    'Caribúes',
    'Lobos',
    'TUNDRA',
    120.0,
    45.0,
    0.55,
    0.022,
    0.018,
    0.28,
    90
);
