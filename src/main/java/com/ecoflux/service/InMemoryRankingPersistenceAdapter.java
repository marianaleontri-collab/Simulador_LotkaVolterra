package com.ecoflux.service;

import com.ecoflux.dto.RankingItemDTO;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Adaptador en memoria con ConcurrentHashMap para la tabla de clasificación.
 */
public class InMemoryRankingPersistenceAdapter implements RankingPersistencePort {

    private record EntradaRanking(RankingItemDTO item, Long nivelId) {}

    private final Map<Long, EntradaRanking> partidas = new ConcurrentHashMap<>();
    private final AtomicLong secuenciaId = new AtomicLong(1);

    @Override
    public RankingItemDTO guardar(RankingItemDTO item, Long nivelId) {
        Long id = (item.id() != null) ? item.id() : secuenciaId.getAndIncrement();
        RankingItemDTO guardado = new RankingItemDTO(
                id,
                item.nombreJugador(),
                item.nombreNivel(),
                item.puntaje(),
                item.diasSobrevividos(),
                item.estabilidadPromedio(),
                item.victoria(),
                item.fecha()
        );

        partidas.put(id, new EntradaRanking(guardado, nivelId));
        return guardado;
    }

    @Override
    public List<RankingItemDTO> obtenerTop10(Optional<Long> nivelId) {
        return partidas.values().stream()
                .filter(e -> nivelId.isEmpty() || e.nivelId().equals(nivelId.get()))
                .map(EntradaRanking::item)
                .sorted(Comparator.comparingInt(RankingItemDTO::puntaje).reversed())
                .limit(10)
                .toList();
    }

    public void limpiar() {
        partidas.clear();
        secuenciaId.set(1);
    }
}
