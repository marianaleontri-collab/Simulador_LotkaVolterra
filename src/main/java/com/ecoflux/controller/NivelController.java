package com.ecoflux.controller;

import com.ecoflux.dto.NivelDesafioDTO;
import com.ecoflux.dto.ProyeccionNaturalDTO;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/niveles")
@Tag(name = "Niveles y Desafíos", description = "Endpoints para consultar biomas jugables y proyecciones de evolución natural con RK4")
public class NivelController {

    private final JuegoService juegoService;

    public NivelController(JuegoService juegoService) {
        this.juegoService = juegoService;
    }

    @GetMapping
    @Operation(
            summary = "Obtener niveles y biomas jugables",
            description = "Devuelve el catálogo de biomas de desafío con sus parámetros ecológicos Lotka-Volterra y puntos de equilibrio calculados."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de biomas jugables obtenida exitosamente",
                    content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = NivelDesafioDTO.class)))
            )
    })
    public ResponseEntity<List<NivelDesafioDTO>> obtenerNiveles() {
        List<NivelDesafioDTO> niveles = juegoService.listarNiveles();
        return ResponseEntity.ok(niveles);
    }

    @GetMapping("/{id}/proyeccion")
    @Operation(
            summary = "Calcular proyección natural sin intervención del jugador",
            description = "Ejecuta el motor numérico Runge-Kutta 4 (RK4) sobre las condiciones iniciales del nivel para proyectar el destino natural del bioma."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Proyección natural calculada exitosamente",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ProyeccionNaturalDTO.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Nivel no encontrado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponseDTO.class))
            )
    })
    public ResponseEntity<ProyeccionNaturalDTO> obtenerProyeccion(
            @Parameter(description = "Identificador único del nivel", example = "1")
            @PathVariable Long id
    ) {
        ProyeccionNaturalDTO proyeccion = juegoService.calcularProyeccionNatural(id);
        return ResponseEntity.ok(proyeccion);
    }
}
