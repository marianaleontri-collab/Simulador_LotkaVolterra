package com.ecoflux.controller;

import com.ecoflux.dto.SimulacionRequestDTO;
import com.ecoflux.dto.SimulacionResponseDTO;
import com.ecoflux.dto.SimulacionResumenDTO;
import com.ecoflux.exception.ErrorResponseDTO;
import com.ecoflux.service.SimulacionService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/simulaciones")
@Tag(name = "Simulaciones", description = "Endpoints para la ejecución numérica y gestión persistente de ecosistemas")
public class SimulacionController {

    private final SimulacionService simulacionService;

    public SimulacionController(SimulacionService simulacionService) {
        this.simulacionService = simulacionService;
    }

    @PostMapping("/calcular")
    @Operation(
            summary = "Calcular simulación en tiempo real (Vista previa)",
            description = "Ejecuta el motor numérico Runge-Kutta 4 (RK4) y genera la serie temporal junto con las estadísticas agregadas sin guardar el resultado en la base de datos."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Cálculo completado exitosamente",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = SimulacionResponseDTO.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Parámetros de simulación inválidos o fuera de rango",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponseDTO.class))
            )
    })
    public ResponseEntity<SimulacionResponseDTO> calcular(@Valid @RequestBody SimulacionRequestDTO request) {
        SimulacionResponseDTO response = simulacionService.calcular(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Crear y persistir una nueva simulación de ecosistema",
            description = "Ejecuta la simulación con RK4, calcula estadísticas y almacena el ecosistema en el repositorio para consultas posteriores."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "Ecosistema simulado y guardado correctamente",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = SimulacionResponseDTO.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos de entrada inválidos",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponseDTO.class))
            )
    })
    public ResponseEntity<SimulacionResponseDTO> crearYGuardar(@Valid @RequestBody SimulacionRequestDTO request) {
        SimulacionResponseDTO response = simulacionService.crearYGuardar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(
            summary = "Listar ecosistemas guardados (Resumen ligero)",
            description = "Devuelve el catálogo de todos los ecosistemas guardados con sus parámetros y estadísticas, omitiendo la serie temporal para optimizar el rendimiento."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de ecosistemas obtenida exitosamente",
                    content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = SimulacionResumenDTO.class)))
            )
    })
    public ResponseEntity<List<SimulacionResumenDTO>> listar() {
        List<SimulacionResumenDTO> lista = simulacionService.listar();
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Obtener ecosistema guardado por ID con recálculo dinámico",
            description = "Recupera la definición de un ecosistema por su ID y recalcula en memoria su serie temporal completa para visualizarla en el cliente."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Ecosistema encontrado y serie temporal generada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = SimulacionResponseDTO.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "No se encontró ningún ecosistema con el ID especificado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponseDTO.class))
            )
    })
    public ResponseEntity<SimulacionResponseDTO> buscarPorId(
            @Parameter(description = "Identificador único de la simulación", example = "1")
            @PathVariable Long id
    ) {
        SimulacionResponseDTO response = simulacionService.buscarPorId(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Eliminar ecosistema guardado",
            description = "Elimina permanentemente el registro del ecosistema especificado por su ID."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "204",
                    description = "Ecosistema eliminado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "El ecosistema a eliminar no existe",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponseDTO.class))
            )
    })
    public ResponseEntity<Void> eliminar(
            @Parameter(description = "Identificador único del ecosistema a eliminar", example = "1")
            @PathVariable Long id
    ) {
        simulacionService.eliminarPorId(id);
        return ResponseEntity.noContent().build();
    }
}
