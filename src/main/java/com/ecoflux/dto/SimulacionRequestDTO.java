package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

@Schema(description = "Parámetros de entrada para la simulación Lotka-Volterra")
public record SimulacionRequestDTO(
        @NotBlank(message = "El nombre del ecosistema no puede estar vacío")
        @Size(max = 100, message = "El nombre del ecosistema no puede exceder 100 caracteres")
        @Schema(description = "Nombre descriptivo del ecosistema", example = "Bosque Templado")
        String nombreEcosistema,

        @NotBlank(message = "El nombre de la presa no puede estar vacío")
        @Schema(description = "Nombre de la especie presa", defaultValue = "Presas", example = "Liebres")
        String nombrePresa,

        @NotBlank(message = "El nombre del depredador no puede estar vacío")
        @Schema(description = "Nombre de la especie depredadora", defaultValue = "Depredadores", example = "Linces")
        String nombreDepredador,

        @PositiveOrZero(message = "La población inicial de presas debe ser mayor o igual a cero")
        @Schema(description = "Población inicial de presas", example = "80.0")
        double poblacionInicialPresas,

        @PositiveOrZero(message = "La población inicial de depredadores debe ser mayor o igual a cero")
        @Schema(description = "Población inicial de depredadores", example = "20.0")
        double poblacionInicialDepredadores,

        @Positive(message = "El valor alfa debe ser mayor que cero")
        @Schema(description = "Tasa de crecimiento intrínseco de las presas (alfa)", example = "0.1")
        double alfa,

        @Positive(message = "El valor beta debe ser mayor que cero")
        @Schema(description = "Tasa de depredación o encuentro efectivo (beta)", example = "0.02")
        double beta,

        @Positive(message = "El valor delta debe ser mayor que cero")
        @Schema(description = "Eficiencia de conversión de biomasa en nacimientos (delta)", example = "0.01")
        double delta,

        @Positive(message = "El valor gamma debe ser mayor que cero")
        @Schema(description = "Tasa de mortalidad natural de depredadores (gamma)", example = "0.1")
        double gamma,

        @Positive(message = "El tiempo total debe ser mayor que cero")
        @Max(value = 1000, message = "El tiempo total no puede superar 1000")
        @Schema(description = "Duración total de la simulación en unidades de tiempo", example = "200.0")
        double tiempoTotal,

        @DecimalMin(value = "0.001", inclusive = true, message = "El paso de tiempo mínimo es 0.001")
        @DecimalMax(value = "1.0", inclusive = true, message = "El paso de tiempo máximo es 1.0")
        @Schema(description = "Paso de integración RK4 (dt)", example = "0.05")
        double pasoTiempo
) {
    public SimulacionRequestDTO {
        if (nombrePresa == null || nombrePresa.isBlank()) {
            nombrePresa = "Presas";
        }
        if (nombreDepredador == null || nombreDepredador.isBlank()) {
            nombreDepredador = "Depredadores";
        }
    }
}
