package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Ecosistema clásico preconfigurado para pruebas y simulaciones rápidas")
public record PresetDTO(
        @Schema(description = "Identificador único del preset", example = "lince-liebre")
        String id,

        @Schema(description = "Nombre amigable del preset", example = "Lince y Liebre")
        String nombre,

        @Schema(description = "Descripción detallada del comportamiento del ecosistema", example = "Ciclo clásico de depredador y presa en oscilación sostenida")
        String descripcion,

        @Schema(description = "Parámetros precargados de la simulación")
        SimulacionRequestDTO parametros
) {
}
