package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "Resumen ligero de un ecosistema guardado sin la serie temporal completa")
public record SimulacionResumenDTO(
        @Schema(description = "Identificador único del ecosistema", example = "1")
        Long id,

        @Schema(description = "Nombre descriptivo del ecosistema", example = "Bosque Templado")
        String nombreEcosistema,

        @Schema(description = "Nombre de la presa", example = "Liebres")
        String nombrePresa,

        @Schema(description = "Nombre del depredador", example = "Linces")
        String nombreDepredador,

        @Schema(description = "Fecha de creación del registro")
        LocalDateTime fechaCreacion,

        @Schema(description = "Parámetros de configuración del modelo")
        SimulacionRequestDTO parametros,

        @Schema(description = "Estadísticas calculadas del ecosistema")
        EstadisticasDTO estadisticas
) {
}
