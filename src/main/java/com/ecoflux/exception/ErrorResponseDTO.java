package com.ecoflux.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.Map;

@Schema(description = "Estructura estándar para respuestas de error de la API")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponseDTO(
        @Schema(description = "Marca de tiempo del error")
        LocalDateTime timestamp,

        @Schema(description = "Código de estado HTTP", example = "400")
        int status,

        @Schema(description = "Nombre o descripción corta del error", example = "Bad Request")
        String error,

        @Schema(description = "Mensaje comprensible explicando la causa", example = "Parámetros de solicitud inválidos")
        String mensaje,

        @Schema(description = "Detalles específicos por campo o causa del error")
        Map<String, String> detalles
) {
}
