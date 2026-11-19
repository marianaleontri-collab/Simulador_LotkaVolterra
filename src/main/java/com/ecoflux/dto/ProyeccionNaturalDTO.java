package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Proyección de evolución natural del bioma calculada con RK4 sin intervención del jugador")
public record ProyeccionNaturalDTO(
        @Schema(description = "Identificador del nivel evaluado", example = "1")
        Long nivelId,

        @Schema(description = "Indica si alguna especie colapsa por debajo de 1.0 individuo sin ayuda", example = "true")
        boolean seExtingueSinAyuda,

        @Schema(description = "Día en que ocurre la primera extinción, o -1.0 si ambas especies sobreviven", example = "24.5")
        double diaExtincionNatural,

        @Schema(description = "Serie temporal natural proyectada por el motor RK4 durante los días objetivo")
        List<PuntoTiempoDTO> serieNatural
) {
}
