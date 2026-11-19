package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

@Schema(description = "Datos de resumen de una partida finalizada para registrar en la tabla de clasificación")
public record PartidaRequestDTO(
        @NotBlank(message = "El nombre del jugador no puede estar vacío")
        @Size(max = 40, message = "El nombre del jugador no puede exceder 40 caracteres")
        @Schema(description = "Nombre o alias del jugador", example = "Guardián_Verde")
        String nombreJugador,

        @NotNull(message = "El identificador del nivel es obligatorio")
        @Schema(description = "Identificador del nivel jugado", example = "1")
        Long nivelId,

        @PositiveOrZero(message = "El puntaje no puede ser negativo")
        @Schema(description = "Puntaje total obtenido en la partida", example = "1250")
        int puntaje,

        @PositiveOrZero(message = "Los días sobrevividos no pueden ser negativos")
        @Schema(description = "Cantidad de días que el bioma resistió antes de colapsar o ganar", example = "60")
        int diasSobrevividos,

        @DecimalMin(value = "0.0", message = "La estabilidad promedio mínima es 0.0")
        @DecimalMax(value = "100.0", message = "La estabilidad promedio máxima es 100.0")
        @Schema(description = "Porcentaje promedio de cercanía al punto de equilibrio (0-100%)", example = "87.5")
        double estabilidadPromedio,

        @PositiveOrZero(message = "La cantidad de intervenciones usadas no puede ser negativa")
        @Schema(description = "Número de acciones de manejo ecológico ejecutadas por el jugador", example = "8")
        int intervencionesUsadas,

        @Schema(description = "Indica si el jugador completó exitosamente los días objetivo", example = "true")
        boolean victoria
) {
}
