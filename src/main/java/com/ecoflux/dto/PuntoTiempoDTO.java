package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Punto en el tiempo con los valores calculados para presas y depredadores")
public record PuntoTiempoDTO(
        @Schema(description = "Instante de tiempo de la simulación", example = "10.5")
        double tiempo,

        @Schema(description = "Cantidad poblacional de presas en dicho instante", example = "78.4")
        double presas,

        @Schema(description = "Cantidad poblacional de depredadores en dicho instante", example = "23.1")
        double depredadores
) {
}
