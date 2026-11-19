package com.ecoflux.repository;

import com.ecoflux.model.EcosistemaEntity;
import java.time.LocalDateTime;
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
class EcosistemaRepositoryTest {

    @Autowired
    private EcosistemaRepository repository;

    @Test
    @DisplayName("Debe consultar los 4 presets cargados inicialmente por la migracion Flyway V2")
    void testConsultarPresetsInicialesFlyway() {
        List<EcosistemaEntity> presets = repository.findByEsPresetTrue();

        assertThat(presets).hasSize(4);
        assertThat(presets)
                .extracting(EcosistemaEntity::getNombreEcosistema)
                .containsExactlyInAnyOrder(
                        "Lince y Liebre (Clásico Canadá)",
                        "Equilibrio Armónico",
                        "Al Borde de la Extinción",
                        "Sabana Africana (Gacelas y Leones)"
                );

        Optional<EcosistemaEntity> linceYLiebre = presets.stream()
                .filter(p -> p.getNombreEcosistema().equals("Lince y Liebre (Clásico Canadá)"))
                .findFirst();

        assertThat(linceYLiebre).isPresent();
        assertThat(linceYLiebre.get().getPoblacionInicialPresas()).isEqualTo(40.0);
        assertThat(linceYLiebre.get().getPoblacionInicialDepredadores()).isEqualTo(9.0);
        assertThat(linceYLiebre.get().getAlfa()).isEqualTo(0.55);
        assertThat(linceYLiebre.get().getBeta()).isEqualTo(0.028);
        assertThat(linceYLiebre.get().getDelta()).isEqualTo(0.024);
        assertThat(linceYLiebre.get().getGamma()).isEqualTo(0.84);
        assertThat(linceYLiebre.get().getTiempoTotal()).isEqualTo(50.0);
        assertThat(linceYLiebre.get().getPasoTiempo()).isEqualTo(0.05);
    }

    @Test
    @DisplayName("Debe guardar un nuevo ecosistema personalizado y asignar fecha de creacion via @PrePersist")
    void testGuardarEcosistemaPersonalizado() {
        EcosistemaEntity nuevo = new EcosistemaEntity(
                "Bosque Andino Simulado",
                "Chigüiros",
                "Jaguares",
                80.0,
                12.0,
                0.3,
                0.005,
                0.002,
                0.1,
                120.0,
                0.05,
                150.0,
                40.0,
                30.0,
                5.0,
                false,
                false
        );

        EcosistemaEntity guardado = repository.save(nuevo);

        assertThat(guardado.getId()).isNotNull();
        assertThat(guardado.getFechaCreacion()).isNotNull();
        assertThat(guardado.getNombreEcosistema()).isEqualTo("Bosque Andino Simulado");

        Optional<EcosistemaEntity> recuperado = repository.findById(guardado.getId());
        assertThat(recuperado).isPresent();
        assertThat(recuperado.get().getNombrePresa()).isEqualTo("Chigüiros");
        assertThat(recuperado.get().getNombreDepredador()).isEqualTo("Jaguares");
    }

    @Test
    @DisplayName("Debe consultar solo ecosistemas no presets ordenados por fecha de creacion descendente")
    void testConsultarNoPresetsOrdenadosPorFechaDesc() {
        EcosistemaEntity sim1 = new EcosistemaEntity(
                "Simulacion Antigua",
                "Presas",
                "Depredadores",
                50.0,
                10.0,
                0.2,
                0.01,
                0.01,
                0.2,
                60.0,
                0.1,
                null,
                null,
                null,
                null,
                false,
                false
        );
        sim1.setFechaCreacion(LocalDateTime.now().minusHours(2));
        repository.save(sim1);

        EcosistemaEntity sim2 = new EcosistemaEntity(
                "Simulacion Reciente",
                "Presas",
                "Depredadores",
                60.0,
                15.0,
                0.25,
                0.012,
                0.011,
                0.22,
                70.0,
                0.1,
                null,
                null,
                null,
                null,
                false,
                false
        );
        sim2.setFechaCreacion(LocalDateTime.now().minusMinutes(10));
        repository.save(sim2);

        List<EcosistemaEntity> noPresets = repository.findByEsPresetFalseOrderByFechaCreacionDesc();

        assertThat(noPresets).hasSizeGreaterThanOrEqualTo(2);
        assertThat(noPresets.get(0).getNombreEcosistema()).isEqualTo("Simulacion Reciente");
        assertThat(noPresets.stream().anyMatch(EcosistemaEntity::getEsPreset)).isFalse();
    }

    @Test
    @DisplayName("Debe buscar ecosistemas por nombre conteniendo texto sin distinguir mayusculas/minusculas")
    void testBuscarPorNombreContainingIgnoreCase() {
        List<EcosistemaEntity> resultadosMinuscula = repository.findByNombreEcosistemaContainingIgnoreCase("lince");
        List<EcosistemaEntity> resultadosMayuscula = repository.findByNombreEcosistemaContainingIgnoreCase("SABANA");

        assertThat(resultadosMinuscula)
                .hasSize(1)
                .extracting(EcosistemaEntity::getNombreEcosistema)
                .contains("Lince y Liebre (Clásico Canadá)");

        assertThat(resultadosMayuscula)
                .hasSize(1)
                .extracting(EcosistemaEntity::getNombreEcosistema)
                .contains("Sabana Africana (Gacelas y Leones)");
    }

    @Test
    @DisplayName("Debe eliminar un ecosistema y confirmar su eliminacion en la base de datos")
    void testEliminarEcosistema() {
        EcosistemaEntity temporal = new EcosistemaEntity(
                "Ecosistema Temporal Para Borrar",
                "Presas",
                "Depredadores",
                30.0,
                5.0,
                0.1,
                0.01,
                0.01,
                0.1,
                40.0,
                0.1,
                null,
                null,
                null,
                null,
                false,
                false
        );

        EcosistemaEntity guardado = repository.save(temporal);
        Long id = guardado.getId();
        assertThat(repository.existsById(id)).isTrue();

        repository.delete(guardado);

        assertThat(repository.existsById(id)).isFalse();
        assertThat(repository.findById(id)).isEmpty();
    }
}
