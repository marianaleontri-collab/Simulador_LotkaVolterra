CREATE TABLE IF NOT EXISTS ecosistemas (
    id BIGSERIAL PRIMARY KEY,
    nombre_ecosistema VARCHAR(100) NOT NULL,
    nombre_presa VARCHAR(60) NOT NULL DEFAULT 'Presas',
    nombre_depredador VARCHAR(60) NOT NULL DEFAULT 'Depredadores',
    poblacion_inicial_presas DOUBLE PRECISION NOT NULL CHECK (poblacion_inicial_presas >= 0),
    poblacion_inicial_depredadores DOUBLE PRECISION NOT NULL CHECK (poblacion_inicial_depredadores >= 0),
    alfa DOUBLE PRECISION NOT NULL CHECK (alfa > 0),
    beta DOUBLE PRECISION NOT NULL CHECK (beta > 0),
    delta DOUBLE PRECISION NOT NULL CHECK (delta > 0),
    gamma DOUBLE PRECISION NOT NULL CHECK (gamma > 0),
    tiempo_total DOUBLE PRECISION NOT NULL CHECK (tiempo_total > 0),
    paso_tiempo DOUBLE PRECISION NOT NULL CHECK (paso_tiempo > 0),
    max_presas DOUBLE PRECISION,
    min_presas DOUBLE PRECISION,
    max_depredadores DOUBLE PRECISION,
    min_depredadores DOUBLE PRECISION,
    riesgo_extincion BOOLEAN DEFAULT FALSE,
    es_preset BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ecosistemas_es_preset ON ecosistemas(es_preset);
CREATE INDEX IF NOT EXISTS idx_ecosistemas_fecha_creacion ON ecosistemas(fecha_creacion DESC);
