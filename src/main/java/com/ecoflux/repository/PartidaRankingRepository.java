package com.ecoflux.repository;

import com.ecoflux.model.PartidaRankingEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio Spring Data JPA para la gestion de partidas y rankings de EcoFlux.
 */
@Repository
public interface PartidaRankingRepository extends JpaRepository<PartidaRankingEntity, Long> {

    /**
     * Obtiene el Top 10 historico de partidas con mayor puntaje a nivel global.
     *
     * @return Lista de hasta 10 partidas ordenadas por puntaje descendente.
     */
    List<PartidaRankingEntity> findTop10ByOrderByPuntajeDesc();

    /**
     * Obtiene el Top 10 de partidas con mayor puntaje para un nivel o bioma especifico.
     *
     * @param nivelId Identificador del nivel de desafio.
     * @return Lista de hasta 10 partidas ordenadas por puntaje descendente.
     */
    List<PartidaRankingEntity> findTop10ByNivelIdOrderByPuntajeDesc(Long nivelId);
}
