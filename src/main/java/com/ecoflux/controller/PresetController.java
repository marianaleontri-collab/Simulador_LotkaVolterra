package com.ecoflux.controller;

import com.ecoflux.dto.PresetDTO;
import com.ecoflux.service.SimulacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/presets")
@Tag(name = "Presets", description = "Endpoints para consultar configuraciones canónicas y educativas de ecosistemas")
public class PresetController {

    private final SimulacionService simulacionService;

    public PresetController(SimulacionService simulacionService) {
        this.simulacionService = simulacionService;
    }

    @GetMapping
    @Operation(
            summary = "Obtener presets clásicos de ecosistemas",
            description = "Devuelve 4 configuraciones predeterminadas del modelo Lotka-Volterra: Lince y Liebre, Equilibrio Estable, Colapso por Sobredepredación y Ciclo Rápido."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Presets obtenidos correctamente",
                    content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = PresetDTO.class)))
            )
    })
    public ResponseEntity<List<PresetDTO>> obtenerPresets() {
        List<PresetDTO> presets = simulacionService.obtenerPresets();
        return ResponseEntity.ok(presets);
    }
}
