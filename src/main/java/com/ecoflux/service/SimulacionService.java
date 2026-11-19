package com.ecoflux.service;

import com.ecoflux.dto.EstadisticasDTO;
import com.ecoflux.dto.PresetDTO;
import com.ecoflux.dto.PuntoTiempoDTO;
import com.ecoflux.dto.SimulacionRequestDTO;
import com.ecoflux.dto.SimulacionResponseDTO;
import com.ecoflux.dto.SimulacionResumenDTO;
import com.ecoflux.exception.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SimulacionService {

    private final MotorLotkaVolterra motorLotkaVolterra;
    private final EcosistemaPersistencePort persistencePort;

    public SimulacionService(MotorLotkaVolterra motorLotkaVolterra, EcosistemaPersistencePort persistencePort) {
        this.motorLotkaVolterra = motorLotkaVolterra;
        this.persistencePort = persistencePort;
    }

    /**
     * Ejecuta el motor numérico y calcula estadísticas SIN persistir el ecosistema.
     */
    public SimulacionResponseDTO calcular(SimulacionRequestDTO params) {
        List<PuntoTiempoDTO> serie = motorLotkaVolterra.resolver(params);
        EstadisticasDTO estadisticas = calcularEstadisticas(serie, params);

        return new SimulacionResponseDTO(
                null,
                params.nombreEcosistema(),
                params.nombrePresa(),
                params.nombreDepredador(),
                LocalDateTime.now(),
                params,
                estadisticas,
                serie
        );
    }

    /**
     * Ejecuta el motor numérico, calcula estadísticas y persiste el ecosistema.
     */
    public SimulacionResponseDTO crearYGuardar(SimulacionRequestDTO params) {
        List<PuntoTiempoDTO> serie = motorLotkaVolterra.resolver(params);
        EstadisticasDTO estadisticas = calcularEstadisticas(serie, params);
        LocalDateTime ahora = LocalDateTime.now();

        EcosistemaRegistro registro = new EcosistemaRegistro(
                null,
                params.nombreEcosistema(),
                params.nombrePresa(),
                params.nombreDepredador(),
                ahora,
                params,
                estadisticas
        );

        EcosistemaRegistro guardado = persistencePort.guardar(registro);

        return new SimulacionResponseDTO(
                guardado.id(),
                guardado.nombreEcosistema(),
                guardado.nombrePresa(),
                guardado.nombreDepredador(),
                guardado.fechaCreacion(),
                guardado.parametros(),
                guardado.estadisticas(),
                serie
        );
    }

    /**
     * Devuelve la lista ligera de todos los ecosistemas guardados.
     */
    public List<SimulacionResumenDTO> listar() {
        return persistencePort.listarTodos().stream()
                .map(r -> new SimulacionResumenDTO(
                        r.id(),
                        r.nombreEcosistema(),
                        r.nombrePresa(),
                        r.nombreDepredador(),
                        r.fechaCreacion(),
                        r.parametros(),
                        r.estadisticas()
                ))
                .toList();
    }

    /**
     * Busca un ecosistema por ID y recalcula su serie temporal en tiempo de ejecución.
     */
    public SimulacionResponseDTO buscarPorId(Long id) {
        EcosistemaRegistro registro = persistencePort.buscarPorId(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el ecosistema con ID: " + id));

        List<PuntoTiempoDTO> serie = motorLotkaVolterra.resolver(registro.parametros());

        return new SimulacionResponseDTO(
                registro.id(),
                registro.nombreEcosistema(),
                registro.nombrePresa(),
                registro.nombreDepredador(),
                registro.fechaCreacion(),
                registro.parametros(),
                registro.estadisticas(),
                serie
        );
    }

    /**
     * Elimina un ecosistema por su identificador.
     */
    public void eliminarPorId(Long id) {
        if (!persistencePort.existePorId(id)) {
            throw new RecursoNoEncontradoException("No se encontró el ecosistema con ID: " + id);
        }
        persistencePort.eliminarPorId(id);
    }

    /**
     * Devuelve los 4 presets de ecosistemas clásicos preconfigurados.
     */
    public List<PresetDTO> obtenerPresets() {
        return List.of(
                new PresetDTO(
                        "lince-liebre",
                        "Lince y Liebre",
                        "Oscilación periódica sostenida clásica entre presa y depredador en el bosque boreal.",
                        new SimulacionRequestDTO(
                                "Lince y Liebre del Boreal",
                                "Liebres",
                                "Linces",
                                80.0,
                                20.0,
                                0.1,
                                0.02,
                                0.01,
                                0.1,
                                200.0,
                                0.05
                        )
                ),
                new PresetDTO(
                        "equilibrio-estable",
                        "Equilibrio Estable",
                        "Poblaciones fijadas exactamente en el punto de equilibrio no trivial (gamma/delta y alfa/beta).",
                        new SimulacionRequestDTO(
                                "Sabana en Equilibrio",
                                "Gacelas",
                                "Guepardos",
                                10.0,
                                10.0,
                                0.4,
                                0.04,
                                0.02,
                                0.2,
                                100.0,
                                0.05
                        )
                ),
                new PresetDTO(
                        "colapso-sobredepredacion",
                        "Colapso por Sobredepredación",
                        "Depredación intensiva donde las presas caen a niveles críticos bordeando la extinción biológica.",
                        new SimulacionRequestDTO(
                                "Arrecife en Colapso",
                                "Peces Herbívoros",
                                "Tiburones de Arrecife",
                                30.0,
                                25.0,
                                0.15,
                                0.05,
                                0.03,
                                0.05,
                                150.0,
                                0.05
                        )
                ),
                new PresetDTO(
                        "ciclo-rapido",
                        "Ciclo Rápido",
                        "Especies con alta tasa de renovación y crecimiento acelerado con oscilaciones frecuentes.",
                        new SimulacionRequestDTO(
                                "Pradera de Roedores",
                                "Ratones de Campo",
                                "Búhos",
                                15.0,
                                8.0,
                                1.2,
                                0.6,
                                0.3,
                                0.8,
                                50.0,
                                0.02
                        )
                )
        );
    }

    /**
     * Calcula métricas estadísticas derivadas de la serie temporal y de los coeficientes.
     */
    EstadisticasDTO calcularEstadisticas(List<PuntoTiempoDTO> serie, SimulacionRequestDTO p) {
        if (serie == null || serie.isEmpty()) {
            double eqPresas = p.gamma() / p.delta();
            double eqDepredadores = p.alfa() / p.beta();
            return new EstadisticasDTO(
                    p.poblacionInicialPresas(), p.poblacionInicialPresas(),
                    p.poblacionInicialDepredadores(), p.poblacionInicialDepredadores(),
                    eqPresas, eqDepredadores,
                    p.poblacionInicialPresas() < 1.0 || p.poblacionInicialDepredadores() < 1.0
            );
        }

        double maxP = Double.NEGATIVE_INFINITY;
        double minP = Double.POSITIVE_INFINITY;
        double maxD = Double.NEGATIVE_INFINITY;
        double minD = Double.POSITIVE_INFINITY;
        boolean riesgo = false;

        for (PuntoTiempoDTO punto : serie) {
            double pr = punto.presas();
            double dp = punto.depredadores();

            if (pr > maxP) maxP = pr;
            if (pr < minP) minP = pr;
            if (dp > maxD) maxD = dp;
            if (dp < minD) minD = dp;

            if (pr < 1.0 || dp < 1.0) {
                riesgo = true;
            }
        }

        double puntoEqPresas = p.gamma() / p.delta();
        double puntoEqDepredadores = p.alfa() / p.beta();

        return new EstadisticasDTO(
                redondear(maxP),
                redondear(minP),
                redondear(maxD),
                redondear(minD),
                redondear(puntoEqPresas),
                redondear(puntoEqDepredadores),
                riesgo
        );
    }

    private double redondear(double valor) {
        return Math.round(valor * 10000.0) / 10000.0;
    }
}
