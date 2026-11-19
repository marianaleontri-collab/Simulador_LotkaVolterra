package com.ecoflux.service;

import com.ecoflux.dto.EstadisticasDTO;
import com.ecoflux.dto.SimulacionRequestDTO;
import com.ecoflux.model.EcosistemaEntity;
import com.ecoflux.repository.EcosistemaRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Adaptador de persistencia real hacia PostgreSQL mediante Spring Data JPA.
 * Implementa EcosistemaPersistencePort desacoplando el dominio de la infraestructura.
 */
@Component
@Primary
public class JpaEcosistemaPersistenceAdapter implements EcosistemaPersistencePort {

    private final EcosistemaRepository ecosistemaRepository;

    public JpaEcosistemaPersistenceAdapter(EcosistemaRepository ecosistemaRepository) {
        this.ecosistemaRepository = ecosistemaRepository;
    }

    @Override
    public EcosistemaRegistro guardar(EcosistemaRegistro registro) {
        SimulacionRequestDTO p = registro.parametros();
        EstadisticasDTO s = registro.estadisticas();

        EcosistemaEntity entity = new EcosistemaEntity(
                registro.nombreEcosistema(),
                registro.nombrePresa(),
                registro.nombreDepredador(),
                p.poblacionInicialPresas(),
                p.poblacionInicialDepredadores(),
                p.alfa(),
                p.beta(),
                p.delta(),
                p.gamma(),
                p.tiempoTotal(),
                p.pasoTiempo(),
                s != null ? s.maxPresas() : null,
                s != null ? s.minPresas() : null,
                s != null ? s.maxDepredadores() : null,
                s != null ? s.minDepredadores() : null,
                s != null ? s.riesgoExtincion() : false,
                false
        );

        EcosistemaEntity guardado = ecosistemaRepository.save(entity);
        return toRegistro(guardado);
    }

    @Override
    public Optional<EcosistemaRegistro> buscarPorId(Long id) {
        return ecosistemaRepository.findById(id).map(this::toRegistro);
    }

    @Override
    public List<EcosistemaRegistro> listarTodos() {
        return ecosistemaRepository.findByEsPresetFalseOrderByFechaCreacionDesc().stream()
                .map(this::toRegistro)
                .toList();
    }

    @Override
    public boolean eliminarPorId(Long id) {
        if (ecosistemaRepository.existsById(id)) {
            ecosistemaRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    public boolean existePorId(Long id) {
        return ecosistemaRepository.existsById(id);
    }

    private EcosistemaRegistro toRegistro(EcosistemaEntity e) {
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

        double puntoEqPresas = e.getDelta() > 0 ? e.getGamma() / e.getDelta() : 0.0;
        double puntoEqDepredadores = e.getBeta() > 0 ? e.getAlfa() / e.getBeta() : 0.0;

        EstadisticasDTO stats = new EstadisticasDTO(
                e.getMaxPresas() != null ? e.getMaxPresas() : 0.0,
                e.getMinPresas() != null ? e.getMinPresas() : 0.0,
                e.getMaxDepredadores() != null ? e.getMaxDepredadores() : 0.0,
                e.getMinDepredadores() != null ? e.getMinDepredadores() : 0.0,
                Math.round(puntoEqPresas * 10000.0) / 10000.0,
                Math.round(puntoEqDepredadores * 10000.0) / 10000.0,
                Boolean.TRUE.equals(e.getRiesgoExtincion())
        );

        return new EcosistemaRegistro(
                e.getId(),
                e.getNombreEcosistema(),
                e.getNombrePresa(),
                e.getNombreDepredador(),
                e.getFechaCreacion(),
                params,
                stats
        );
    }
}
