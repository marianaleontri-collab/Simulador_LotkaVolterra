package com.ecoflux.service;

import com.ecoflux.dto.RankingItemDTO;
import java.util.List;
import java.util.Optional;

/**
 * Puerto de persistencia desacoplado para almacenar y consultar el ranking de partidas.
 */
public interface RankingPersistencePort {

    RankingItemDTO guardar(RankingItemDTO item, Long nivelId);

    List<RankingItemDTO> obtenerTop10(Optional<Long> nivelId);
}
