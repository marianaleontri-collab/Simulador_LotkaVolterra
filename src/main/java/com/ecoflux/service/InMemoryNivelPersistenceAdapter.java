package com.ecoflux.service;

import com.ecoflux.dto.NivelDesafioDTO;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Adaptador en memoria con niveles jugables predeterminados y calibrados.
 */
public class InMemoryNivelPersistenceAdapter implements NivelPersistencePort {

    private final Map<Long, NivelDesafioDTO> niveles = new ConcurrentHashMap<>();

    public InMemoryNivelPersistenceAdapter() {
        inicializarNiveles();
    }

    private void inicializarNiveles() {
        // Nivel 1: Fácil - Bosque Templado
        double alfa1 = 0.1, beta1 = 0.02, delta1 = 0.01, gamma1 = 0.1;
        niveles.put(1L, new NivelDesafioDTO(
                1L,
                "Bosque Templado",
                "FACIL",
                "Ecosistema estable de introducción. Las oscilaciones son moderadas y permiten comprender el ciclo de caza y reproducción.",
                "Conejos de Monte",
                "Zorros Rojos",
                "BOSQUE",
                80.0,
                20.0,
                alfa1,
                beta1,
                delta1,
                gamma1,
                60,
                redondear(gamma1 / delta1),
                redondear(alfa1 / beta1)
        ));

        // Nivel 2: Medio - Sabana en Desbalance
        double alfa2 = 0.25, beta2 = 0.03, delta2 = 0.015, gamma2 = 0.2;
        niveles.put(2L, new NivelDesafioDTO(
                2L,
                "Sabana en Desbalance",
                "MEDIO",
                "Cacería veloz y agresiva en la sabana abierta. Requiere intervenciones para evitar caídas bruscas en la biomasa de presas.",
                "Gacelas",
                "Guepardos",
                "SABANA",
                50.0,
                25.0,
                alfa2,
                beta2,
                delta2,
                gamma2,
                75,
                redondear(gamma2 / delta2),
                redondear(alfa2 / beta2)
        ));

        // Nivel 3: Difícil - Tundra Ártica Crítica
        double alfa3 = 0.12, beta3 = 0.04, delta3 = 0.02, gamma3 = 0.08;
        niveles.put(3L, new NivelDesafioDTO(
                3L,
                "Tundra Ártica Crítica",
                "DIFICIL",
                "Ecosistema gélido con recursos muy limitados. Sin ayuda del guardián, la sobre-depredación colapsa a las presas en pocas semanas.",
                "Lemmings",
                "Búhos Níveos",
                "TUNDRA",
                30.0,
                18.0,
                alfa3,
                beta3,
                delta3,
                gamma3,
                90,
                redondear(gamma3 / delta3),
                redondear(alfa3 / beta3)
        ));
    }

    @Override
    public List<NivelDesafioDTO> obtenerTodos() {
        return new ArrayList<>(niveles.values());
    }

    @Override
    public Optional<NivelDesafioDTO> buscarPorId(Long id) {
        return Optional.ofNullable(niveles.get(id));
    }

    private double redondear(double valor) {
        return Math.round(valor * 10000.0) / 10000.0;
    }
}
