package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Respuesta completa de la simulación del ecosistema con serie temporal y estadísticas")
public record SimulacionResponseDTO(
        @Schema(description = "Identificador único asignado si la simulación fue guardada, o null si solo fue cálculo en tiempo real", example = "1")
        Long id,

        @Schema(description = "Nombre descriptivo del ecosistema", example = "Bosque Templado")
        String nombreEcosistema,

        @Schema(description = "Nombre de la especie presa", example = "Liebres")
        String nombrePresa,

        @Schema(description = "Nombre de la especie depredadora", example = "Linces")
        String nombreDepredador,

        @Schema(description = "Fecha y hora en que se procesó la simulación")
        LocalDateTime fechaCreacion,

        @Schema(description = "Parámetros de configuración utilizados para la ejecución")
        SimulacionRequestDTO parametros,

        @Schema(description = "Estadísticas agregadas calculadas")
        EstadisticasDTO estadisticas,

        @Schema(description = "Serie temporal con todos los puntos calculados por el motor RK4")
        List<PuntoTiempoDTO> serieTemporal
) {
}
