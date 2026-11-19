package com.ecoflux.service;

import com.ecoflux.dto.EstadisticasDTO;
import com.ecoflux.dto.SimulacionRequestDTO;
import java.time.LocalDateTime;

public record EcosistemaRegistro(
        Long id,
        String nombreEcosistema,
        String nombrePresa,
        String nombreDepredador,
        LocalDateTime fechaCreacion,
        SimulacionRequestDTO parametros,
        EstadisticasDTO estadisticas
) {
    public EcosistemaRegistro conId(Long nuevoId) {
        return new EcosistemaRegistro(
                nuevoId,
                nombreEcosistema,
                nombrePresa,
                nombreDepredador,
                fechaCreacion,
                parametros,
                estadisticas
        );
    }
}
