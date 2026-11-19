package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "Elemento de la tabla de clasificación de mejores guardianes")
public record RankingItemDTO(
        @Schema(description = "Identificador único de la entrada en el ranking", example = "1")
        Long id,

        @Schema(description = "Nombre o alias del jugador", example = "Guardián_Verde")
        String nombreJugador,

        @Schema(description = "Nombre descriptivo del bioma jugado", example = "Bosque Templado")
        String nombreNivel,

        @Schema(description = "Puntaje total alcanzado", example = "1250")
        int puntaje,

        @Schema(description = "Días de resistencia en el bioma", example = "60")
        int diasSobrevividos,

        @Schema(description = "Porcentaje de estabilidad ecológica promedio (0-100%)", example = "87.5")
        double estabilidadPromedio,

        @Schema(description = "Indica si la partida concluyó en victoria", example = "true")
        boolean victoria,

        @Schema(description = "Fecha y hora en que se completó la partida")
        LocalDateTime fecha
) {
}
