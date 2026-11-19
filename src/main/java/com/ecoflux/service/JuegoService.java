package com.ecoflux.service;

import com.ecoflux.dto.NivelDesafioDTO;
import com.ecoflux.dto.PartidaRequestDTO;
import com.ecoflux.dto.ProyeccionNaturalDTO;
import com.ecoflux.dto.PuntoTiempoDTO;
import com.ecoflux.dto.RankingItemDTO;
import com.ecoflux.dto.SimulacionRequestDTO;
import com.ecoflux.exception.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class JuegoService {

    private final NivelPersistencePort nivelPersistencePort;
    private final RankingPersistencePort rankingPersistencePort;
    private final MotorLotkaVolterra motorLotkaVolterra;

    public JuegoService(
            NivelPersistencePort nivelPersistencePort,
            RankingPersistencePort rankingPersistencePort,
            MotorLotkaVolterra motorLotkaVolterra
    ) {
        this.nivelPersistencePort = nivelPersistencePort;
        this.rankingPersistencePort = rankingPersistencePort;
        this.motorLotkaVolterra = motorLotkaVolterra;
    }

    /**
     * Lista todos los biomas y niveles de desafío disponibles en el juego.
     */
    public List<NivelDesafioDTO> listarNiveles() {
        return nivelPersistencePort.obtenerTodos();
    }

    /**
     * Busca un nivel por su identificador.
     */
    public NivelDesafioDTO obtenerNivelPorId(Long id) {
        return nivelPersistencePort.buscarPorId(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el nivel con ID: " + id));
    }

    /**
     * Ejecuta el motor matemático RK4 sobre los parámetros base del bioma durante sus días objetivo
     * para proyectar qué sucedería si el jugador no realiza ninguna intervención.
     */
    public ProyeccionNaturalDTO calcularProyeccionNatural(Long nivelId) {
        NivelDesafioDTO nivel = obtenerNivelPorId(nivelId);

        SimulacionRequestDTO params = new SimulacionRequestDTO(
                nivel.nombre(),
                nivel.nombrePresa(),
                nivel.nombreDepredador(),
                nivel.poblacionInicialPresas(),
                nivel.poblacionInicialDepredadores(),
                nivel.alfa(),
                nivel.beta(),
                nivel.delta(),
                nivel.gamma(),
                (double) nivel.diasObjetivo(),
                0.05
        );

        List<PuntoTiempoDTO> serieNatural = motorLotkaVolterra.resolver(params);

        boolean seExtingue = false;
        double diaExtincion = -1.0;

        for (PuntoTiempoDTO p : serieNatural) {
            if (p.presas() < 1.0 || p.depredadores() < 1.0) {
                seExtingue = true;
                diaExtincion = Math.round(p.tiempo() * 100.0) / 100.0;
                break;
            }
        }

        return new ProyeccionNaturalDTO(
                nivelId,
                seExtingue,
                diaExtincion,
                serieNatural
        );
    }

    /**
     * Registra el resultado de una partida finalizada y lo añade a la tabla de clasificación.
     */
    public RankingItemDTO registrarPartida(PartidaRequestDTO request) {
        NivelDesafioDTO nivel = obtenerNivelPorId(request.nivelId());

        RankingItemDTO item = new RankingItemDTO(
                null,
                request.nombreJugador(),
                nivel.nombre(),
                request.puntaje(),
                request.diasSobrevividos(),
                Math.round(request.estabilidadPromedio() * 100.0) / 100.0,
                request.victoria(),
                LocalDateTime.now()
        );

        return rankingPersistencePort.guardar(item, request.nivelId());
    }

    /**
     * Obtiene el Top 10 de mejores puntajes de la clasificación, opcionalmente filtrado por bioma.
     */
    public List<RankingItemDTO> obtenerTop10(Optional<Long> nivelId) {
        return rankingPersistencePort.obtenerTop10(nivelId);
    }
}
