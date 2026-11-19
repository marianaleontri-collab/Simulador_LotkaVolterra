package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Métricas y estadísticas calculadas de la serie de tiempo simulada")
public record EstadisticasDTO(
        @Schema(description = "Población máxima alcanzada por las presas", example = "120.5")
        double maxPresas,

        @Schema(description = "Población mínima alcanzada por las presas", example = "15.2")
        double minPresas,

        @Schema(description = "Población máxima alcanzada por los depredadores", example = "45.8")
        double maxDepredadores,

        @Schema(description = "Población mínima alcanzada por los depredadores", example = "4.3")
        double minDepredadores,

        @Schema(description = "Punto de equilibrio no trivial de presas (gamma / delta)", example = "10.0")
        double puntoEquilibrioPresas,

        @Schema(description = "Punto de equilibrio no trivial de depredadores (alfa / beta)", example = "5.0")
        double puntoEquilibrioDepredadores,

        @Schema(description = "Indica si alguna población desciende por debajo de 1.0 individuo", example = "false")
        boolean riesgoExtincion
) {
}
