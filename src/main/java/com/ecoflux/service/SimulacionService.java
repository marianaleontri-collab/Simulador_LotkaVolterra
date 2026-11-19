package com.ecoflux.service;

import com.ecoflux.dto.EstadisticasDTO;
import com.ecoflux.dto.PresetDTO;
import com.ecoflux.dto.PuntoTiempoDTO;
import com.ecoflux.dto.SimulacionRequestDTO;
import com.ecoflux.dto.SimulacionResponseDTO;
import com.ecoflux.dto.SimulacionResumenDTO;
import com.ecoflux.exception.RecursoNoEncontradoException;
import com.ecoflux.model.EcosistemaEntity;
import com.ecoflux.repository.EcosistemaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SimulacionService {

    private final MotorLotkaVolterra motorLotkaVolterra;
    private final EcosistemaPersistencePort persistencePort;
    private final EcosistemaRepository ecosistemaRepository;

    public SimulacionService(MotorLotkaVolterra motorLotkaVolterra,
                             EcosistemaPersistencePort persistencePort,
                             @Autowired(required = false) EcosistemaRepository ecosistemaRepository) {
        this.motorLotkaVolterra = motorLotkaVolterra;
        this.persistencePort = persistencePort;
        this.ecosistemaRepository = ecosistemaRepository;
    }

    /**
     * Limita de forma segura la cantidad de puntos devueltos al cliente para no
     * saturar el navegador ni la capa gráfica cuando tiempoTotal / pasoTiempo > 10000.
     */
    public List<PuntoTiempoDTO> limitarPuntosSeguro(List<PuntoTiempoDTO> serie, int maxPuntos) {
        if (serie == null || serie.size() <= maxPuntos) {
            return serie;
        }
        int total = serie.size();
        int paso = (int) Math.ceil((double) total / maxPuntos);
        List<PuntoTiempoDTO> reducida = new ArrayList<>(maxPuntos + 2);
        for (int i = 0; i < total; i += paso) {
            reducida.add(serie.get(i));
        }
        PuntoTiempoDTO ultimo = serie.get(total - 1);
        if (!reducida.get(reducida.size() - 1).equals(ultimo)) {
            reducida.add(ultimo);
        }
        return reducida;
    }

    /**
     * Ejecuta el motor numérico y calcula estadísticas SIN persistir el ecosistema.
     */
    public SimulacionResponseDTO calcular(SimulacionRequestDTO params) {
        List<PuntoTiempoDTO> serie = motorLotkaVolterra.resolver(params);
        EstadisticasDTO estadisticas = calcularEstadisticas(serie, params);
        List<PuntoTiempoDTO> serieSegura = limitarPuntosSeguro(serie, 10000);

        return new SimulacionResponseDTO(
                null,
                params.nombreEcosistema(),
                params.nombrePresa(),
                params.nombreDepredador(),
                LocalDateTime.now(),
                params,
                estadisticas,
                serieSegura
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
        List<PuntoTiempoDTO> serieSegura = limitarPuntosSeguro(serie, 10000);

        return new SimulacionResponseDTO(
                guardado.id(),
                guardado.nombreEcosistema(),
                guardado.nombrePresa(),
                guardado.nombreDepredador(),
                guardado.fechaCreacion(),
                guardado.parametros(),
                guardado.estadisticas(),
                serieSegura
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
        List<PuntoTiempoDTO> serieSegura = limitarPuntosSeguro(serie, 10000);

        return new SimulacionResponseDTO(
                registro.id(),
                registro.nombreEcosistema(),
                registro.nombrePresa(),
                registro.nombreDepredador(),
                registro.fechaCreacion(),
                registro.parametros(),
                registro.estadisticas(),
                serieSegura
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
     * Devuelve los 4 presets de ecosistemas clásicos preconfigurados consultados desde PostgreSQL
     * a través de EcosistemaRepository (con fallback si la base de datos no tiene datos).
     */
    public List<PresetDTO> obtenerPresets() {
        if (ecosistemaRepository != null) {
            try {
                List<EcosistemaEntity> presetsDb = ecosistemaRepository.findByEsPresetTrue();
                if (presetsDb != null && !presetsDb.isEmpty()) {
                    return presetsDb.stream()
                            .map(this::convertirEntityAPresetDTO)
                            .toList();
                }
            } catch (Exception ignored) {
                // Si la BD no está disponible, continúa con el fallback
            }
        }
        return presetsFallback();
    }

    private PresetDTO convertirEntityAPresetDTO(EcosistemaEntity e) {
        String slug = e.getNombreEcosistema().toLowerCase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");

        String id = switch (slug) {
            case "lince-y-liebre-clasico-canada", "lince-y-liebre" -> "lince-liebre";
            case "equilibrio-armonico" -> "equilibrio-armonico";
            case "al-borde-de-la-extincion" -> "al-borde-de-la-extincion";
            case "sabana-africana-gacelas-y-leones" -> "sabana-africana";
            default -> slug;
        };

        String descripcion = switch (id) {
            case "lince-liebre" ->
                    "Oscilación periódica sostenida clásica entre presa y depredador en el bosque boreal canadiense.";
            case "equilibrio-armonico" ->
                    "Órbita periódica cerrada conservativa alrededor del punto de equilibrio no trivial con conservación de V(x,y).";
            case "al-borde-de-la-extincion" ->
                    "Depredación intensiva donde las presas caen a niveles críticos bordeando la extinción biológica.";
            case "sabana-africana" ->
                    "Dinámica de sabana con gacelas y leones en interacción periódica estable.";
            default -> "Preset ecológico preconfigurado para el modelo Lotka-Volterra.";
        };

        SimulacionRequestDTO params = new SimulacionRequestDTO(
                e.getNombreEcosistema(),
                e.getNombrePresa(),
                e.getNombreDepredador(),
                e.getPoblacionInicialPresas(),
                e.getPoblacionInicialDepredadores(),
                e.getAlfa(),
                e.getBeta(),
                e.getDelta(),
                e.getGamma(),
                e.getTiempoTotal(),
                e.getPasoTiempo()
        );

        return new PresetDTO(id, e.getNombreEcosistema(), descripcion, params);
    }

    private List<PresetDTO> presetsFallback() {
        return List.of(
                new PresetDTO(
                        "lince-liebre",
                        "Lince y Liebre (Clásico Canadá)",
                        "Oscilación periódica sostenida clásica entre presa y depredador en el bosque boreal canadiense.",
                        new SimulacionRequestDTO(
                                "Lince y Liebre (Clásico Canadá)",
                                "Liebres",
                                "Linces",
                                40.0,
                                9.0,
                                0.55,
                                0.028,
                                0.024,
                                0.84,
                                50.0,
                                0.05
                        )
                ),
                new PresetDTO(
                        "equilibrio-armonico",
                        "Equilibrio Armónico",
                        "Órbita periódica cerrada conservativa alrededor del punto de equilibrio no trivial con conservación de V(x,y).",
                        new SimulacionRequestDTO(
                                "Equilibrio Armónico",
                                "Presas",
                                "Depredadores",
                                100.0,
                                20.0,
                                0.1,
                                0.002,
                                0.001,
                                0.05,
                                200.0,
                                0.05
                        )
                ),
                new PresetDTO(
                        "al-borde-de-la-extincion",
                        "Al Borde de la Extinción",
                        "Depredación intensiva donde las presas caen a niveles críticos bordeando la extinción biológica.",
                        new SimulacionRequestDTO(
                                "Al Borde de la Extinción",
                                "Presas",
                                "Depredadores",
                                120.0,
                                45.0,
                                0.4,
                                0.015,
                                0.01,
                                0.3,
                                100.0,
                                0.05
                        )
                ),
                new PresetDTO(
                        "sabana-africana",
                        "Sabana Africana (Gacelas y Leones)",
                        "Dinámica de sabana con gacelas y leones en interacción periódica estable.",
                        new SimulacionRequestDTO(
                                "Sabana Africana (Gacelas y Leones)",
                                "Gacelas",
                                "Leones",
                                200.0,
                                15.0,
                                0.25,
                                0.004,
                                0.002,
                                0.15,
                                150.0,
                                0.1
                        )
                )
        );
    }

    /**
     * Calcula métricas estadísticas derivadas de la serie temporal y de los coeficientes.
     */
    EstadisticasDTO calcularEstadisticas(List<PuntoTiempoDTO> serie, SimulacionRequestDTO p) {
        if (serie == null || serie.isEmpty()) {
            double eqPresas = p.delta() > 0 ? p.gamma() / p.delta() : 0.0;
            double eqDepredadores = p.beta() > 0 ? p.alfa() / p.beta() : 0.0;
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

        double puntoEqPresas = p.delta() > 0 ? p.gamma() / p.delta() : 0.0;
        double puntoEqDepredadores = p.beta() > 0 ? p.alfa() / p.beta() : 0.0;

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
