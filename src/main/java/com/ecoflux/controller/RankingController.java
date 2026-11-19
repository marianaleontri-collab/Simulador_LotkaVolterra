package com.ecoflux.controller;

import com.ecoflux.dto.PartidaRequestDTO;
import com.ecoflux.dto.RankingItemDTO;
import com.ecoflux.exception.ErrorResponseDTO;
import com.ecoflux.service.JuegoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/ranking")
@Tag(name = "Tabla de Clasificación", description = "Endpoints para registrar partidas y consultar el Top 10 de mejores guardianes del bioma")
public class RankingController {

    private final JuegoService juegoService;

    public RankingController(JuegoService juegoService) {
        this.juegoService = juegoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Registrar resultado de partida finalizada",
            description = "Guarda las estadísticas y puntaje alcanzado por el jugador al concluir una partida en un bioma."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "Partida registrada en el ranking exitosamente",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = RankingItemDTO.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos de partida inválidos",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponseDTO.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Nivel referenciado no encontrado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponseDTO.class))
            )
    })
    public ResponseEntity<RankingItemDTO> registrarPartida(@Valid @RequestBody PartidaRequestDTO request) {
        RankingItemDTO guardado = juegoService.registrarPartida(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @GetMapping
    @Operation(
            summary = "Consultar Top 10 del ranking",
            description = "Obtiene los 10 mejores puntajes ordenados de mayor a menor, con soporte para filtrar por nivel/bioma específico."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Top 10 de clasificación obtenido correctamente",
                    content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = RankingItemDTO.class)))
            )
    })
    public ResponseEntity<List<RankingItemDTO>> obtenerTop10(
            @Parameter(description = "Identificador opcional del nivel para filtrar los puntajes", example = "1")
            @RequestParam(required = false) Long nivelId
    ) {
        List<RankingItemDTO> top10 = juegoService.obtenerTop10(Optional.ofNullable(nivelId));
        return ResponseEntity.ok(top10);
    }
}
