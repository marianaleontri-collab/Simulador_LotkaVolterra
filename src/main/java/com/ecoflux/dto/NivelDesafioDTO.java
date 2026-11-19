package com.ecoflux.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Nivel o bioma desafiante con parámetros ecológicos y objetivos de supervivencia")
public record NivelDesafioDTO(
        @Schema(description = "Identificador único del nivel", example = "1")
        Long id,

        @Schema(description = "Nombre del bioma o nivel", example = "Bosque Templado")
        String nombre,

        @Schema(description = "Nivel de dificultad del bioma", allowableValues = {"FACIL", "MEDIO", "DIFICIL"}, example = "FACIL")
        String dificultad,

        @Schema(description = "Descripción narrativa y reto ecológico del bioma", example = "Ecosistema templado con variaciones moderadas de presas y depredadores")
        String descripcion,

        @Schema(description = "Nombre de la especie presa", example = "Conejos de Monte")
        String nombrePresa,

        @Schema(description = "Nombre de la especie depredadora", example = "Zorros Rojos")
        String nombreDepredador,

        @Schema(description = "Tema visual o bioma gráfico", allowableValues = {"BOSQUE", "SABANA", "TUNDRA"}, example = "BOSQUE")
        String temaVisual,

        @Schema(description = "Cantidad inicial de presas", example = "100.0")
        double poblacionInicialPresas,

        @Schema(description = "Cantidad inicial de depredadores", example = "20.0")
        double poblacionInicialDepredadores,

        @Schema(description = "Tasa de crecimiento intrínseco de presas (alfa)", example = "0.1")
        double alfa,

        @Schema(description = "Tasa de depredación o captura por encuentro (beta)", example = "0.02")
        double beta,

        @Schema(description = "Tasa de eficiencia reproductiva de depredadores (delta)", example = "0.01")
        double delta,

        @Schema(description = "Tasa de mortalidad natural de depredadores (gamma)", example = "0.1")
        double gamma,

        @Schema(description = "Duración objetivo de la partida en días para alcanzar la victoria", example = "60")
        int diasObjetivo,

        @Schema(description = "Punto de equilibrio no trivial de presas (gamma / delta)", example = "10.0")
        double puntoEquilibrioPresas,

        @Schema(description = "Punto de equilibrio no trivial de depredadores (alfa / beta)", example = "5.0")
        double puntoEquilibrioDepredadores
) {
}
