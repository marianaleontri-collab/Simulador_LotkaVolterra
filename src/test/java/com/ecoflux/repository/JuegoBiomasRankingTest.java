package com.ecoflux.repository;

import com.ecoflux.model.NivelDesafioEntity;
import com.ecoflux.model.PartidaRankingEntity;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JuegoBiomasRankingTest {

    @Autowired
    private NivelDesafioRepository nivelRepository;

    @Autowired
    private PartidaRankingRepository rankingRepository;

    @Test
    @DisplayName("Debe cargar exactamente los 3 biomas jugables sembrados por la migracion Flyway V3")
    void testCargarTresNivelesSeedFlyway() {
        List<NivelDesafioEntity> niveles = nivelRepository.findAll();

        assertThat(niveles).hasSize(3);
        assertThat(niveles)
                .extracting(NivelDesafioEntity::getNombre)
                .containsExactlyInAnyOrder("Bosque Boreal", "Sabana en Sequía", "Tundra Crítica");

        // 1. Validar Bosque Boreal (FACIL, BOSQUE)
        Optional<NivelDesafioEntity> bosque = nivelRepository.findByNombreIgnoreCase("Bosque Boreal");
        assertThat(bosque).isPresent();
        assertThat(bosque.get().getDificultad()).isEqualTo("FACIL");
        assertThat(bosque.get().getTemaVisual()).isEqualTo("BOSQUE");
        assertThat(bosque.get().getNombrePresa()).isEqualTo("Liebres");
        assertThat(bosque.get().getNombreDepredador()).isEqualTo("Linces");
        assertThat(bosque.get().getPoblacionInicialPresas()).isEqualTo(45.0);
        assertThat(bosque.get().getPoblacionInicialDepredadores()).isEqualTo(10.0);
        assertThat(bosque.get().getAlfa()).isEqualTo(0.50);
        assertThat(bosque.get().getBeta()).isEqualTo(0.025);
        assertThat(bosque.get().getDelta()).isEqualTo(0.020);
        assertThat(bosque.get().getGamma()).isEqualTo(0.70);
        assertThat(bosque.get().getDiasObjetivo()).isEqualTo(60);

        // 2. Validar Sabana en Sequia (MEDIO, SABANA)
        Optional<NivelDesafioEntity> sabana = nivelRepository.findByNombreIgnoreCase("Sabana en Sequía");
        assertThat(sabana).isPresent();
        assertThat(sabana.get().getDificultad()).isEqualTo("MEDIO");
        assertThat(sabana.get().getTemaVisual()).isEqualTo("SABANA");
        assertThat(sabana.get().getPoblacionInicialPresas()).isEqualTo(90.0);
        assertThat(sabana.get().getPoblacionInicialDepredadores()).isEqualTo(28.0);
        assertThat(sabana.get().getAlfa()).isEqualTo(0.40);
        assertThat(sabana.get().getBeta()).isEqualTo(0.018);
        assertThat(sabana.get().getDelta()).isEqualTo(0.014);
        assertThat(sabana.get().getGamma()).isEqualTo(0.35);
        assertThat(sabana.get().getDiasObjetivo()).isEqualTo(75);

        // 3. Validar Tundra Critica (DIFICIL, TUNDRA)
        Optional<NivelDesafioEntity> tundra = nivelRepository.findByNombreIgnoreCase("Tundra Crítica");
        assertThat(tundra).isPresent();
        assertThat(tundra.get().getDificultad()).isEqualTo("DIFICIL");
        assertThat(tundra.get().getTemaVisual()).isEqualTo("TUNDRA");
        assertThat(tundra.get().getPoblacionInicialPresas()).isEqualTo(120.0);
        assertThat(tundra.get().getPoblacionInicialDepredadores()).isEqualTo(45.0);
        assertThat(tundra.get().getAlfa()).isEqualTo(0.55);
        assertThat(tundra.get().getBeta()).isEqualTo(0.022);
        assertThat(tundra.get().getDelta()).isEqualTo(0.018);
        assertThat(tundra.get().getGamma()).isEqualTo(0.28);
        assertThat(tundra.get().getDiasObjetivo()).isEqualTo(90);
    }

    @Test
    @DisplayName("Debe consultar el Top 10 global ordenado descendentemente por puntaje")
    void testRankingGlobalTop10OrdenadoPorPuntaje() {
        NivelDesafioEntity bosque = nivelRepository.findByNombreIgnoreCase("Bosque Boreal").orElseThrow();

        // Insertar 12 partidas con puntajes variados
        for (int i = 1; i <= 12; i++) {
            PartidaRankingEntity partida = new PartidaRankingEntity(
                    "Jugador_" + i,
                    bosque,
                    i * 100, // 100, 200, ..., 1200
                    50 + i,
                    0.85,
                    3,
                    true
            );
            rankingRepository.save(partida);
        }

        List<PartidaRankingEntity> top10 = rankingRepository.findTop10ByOrderByPuntajeDesc();

        assertThat(top10).hasSize(10);
        // El primer puesto debe ser el de mayor puntaje (1200)
        assertThat(top10.get(0).getPuntaje()).isEqualTo(1200);
        assertThat(top10.get(0).getNombreJugador()).isEqualTo("Jugador_12");
        // El decimo puesto debe ser puntaje 300
        assertThat(top10.get(9).getPuntaje()).isEqualTo(300);

        // Verificar orden estrictamente decreciente
        for (int i = 0; i < top10.size() - 1; i++) {
            assertThat(top10.get(i).getPuntaje())
                    .isGreaterThanOrEqualTo(top10.get(i + 1).getPuntaje());
        }
    }

    @Test
    @DisplayName("Debe consultar el Top 10 filtrado por nivel especifico ordenado descendentemente por puntaje")
    void testRankingPorNivelTop10() {
        NivelDesafioEntity bosque = nivelRepository.findByNombreIgnoreCase("Bosque Boreal").orElseThrow();
        NivelDesafioEntity tundra = nivelRepository.findByNombreIgnoreCase("Tundra Crítica").orElseThrow();

        // 3 partidas en Bosque
        rankingRepository.save(new PartidaRankingEntity("Alice", bosque, 500, 60, 0.90, 2, true));
        rankingRepository.save(new PartidaRankingEntity("Bob", bosque, 900, 60, 0.95, 1, true));
        rankingRepository.save(new PartidaRankingEntity("Charlie", bosque, 750, 60, 0.92, 2, true));

        // 2 partidas en Tundra
        rankingRepository.save(new PartidaRankingEntity("David", tundra, 1500, 90, 0.98, 4, true));
        rankingRepository.save(new PartidaRankingEntity("Eve", tundra, 1200, 85, 0.88, 5, false));

        List<PartidaRankingEntity> rankingBosque = rankingRepository.findTop10ByNivelIdOrderByPuntajeDesc(bosque.getId());
        List<PartidaRankingEntity> rankingTundra = rankingRepository.findTop10ByNivelIdOrderByPuntajeDesc(tundra.getId());

        assertThat(rankingBosque).hasSize(3);
        assertThat(rankingBosque.get(0).getNombreJugador()).isEqualTo("Bob");
        assertThat(rankingBosque.get(0).getPuntaje()).isEqualTo(900);
        assertThat(rankingBosque.get(1).getNombreJugador()).isEqualTo("Charlie");
        assertThat(rankingBosque.get(2).getNombreJugador()).isEqualTo("Alice");

        assertThat(rankingTundra).hasSize(2);
        assertThat(rankingTundra.get(0).getNombreJugador()).isEqualTo("David");
        assertThat(rankingTundra.get(0).getPuntaje()).isEqualTo(1500);
        assertThat(rankingTundra.get(1).getNombreJugador()).isEqualTo("Eve");
        assertThat(rankingTundra.get(1).getPuntaje()).isEqualTo(1200);
    }
}
