package com.ecoflux.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Adaptador en memoria con ConcurrentHashMap para pruebas y desacoplamiento.
 * Se desactiva automáticamente cuando el Agente/Rol 3 suministre una implementación JPA de EcosistemaPersistencePort.
 */
public class InMemoryEcosistemaPersistenceAdapter implements EcosistemaPersistencePort {

    private final Map<Long, EcosistemaRegistro> almacenamiento = new ConcurrentHashMap<>();
    private final AtomicLong secuenciaId = new AtomicLong(1);

    @Override
    public EcosistemaRegistro guardar(EcosistemaRegistro registro) {
        Long id = (registro.id() != null) ? registro.id() : secuenciaId.getAndIncrement();
        EcosistemaRegistro guardado = registro.conId(id);
        almacenamiento.put(id, guardado);
        return guardado;
    }

    @Override
    public Optional<EcosistemaRegistro> buscarPorId(Long id) {
        return Optional.ofNullable(almacenamiento.get(id));
    }

    @Override
    public List<EcosistemaRegistro> listarTodos() {
        List<EcosistemaRegistro> lista = new ArrayList<>(almacenamiento.values());
        lista.sort(Comparator.comparing(EcosistemaRegistro::id));
        return lista;
    }

    @Override
    public boolean eliminarPorId(Long id) {
        return almacenamiento.remove(id) != null;
    }

    @Override
    public boolean existePorId(Long id) {
        return almacenamiento.containsKey(id);
    }

    public void limpiar() {
        almacenamiento.clear();
        secuenciaId.set(1);
    }
}
