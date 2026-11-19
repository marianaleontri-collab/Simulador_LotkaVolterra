package com.ecoflux.service;

import java.util.List;
import java.util.Optional;

/**
 * Puerto de persistencia desacoplado para almacenar y recuperar ecosistemas.
 * El Rol 3 (Persistencia) conectará este puerto a PostgreSQL con Spring Data JPA.
 */
public interface EcosistemaPersistencePort {

    EcosistemaRegistro guardar(EcosistemaRegistro registro);

    Optional<EcosistemaRegistro> buscarPorId(Long id);

    List<EcosistemaRegistro> listarTodos();

    boolean eliminarPorId(Long id);

    boolean existePorId(Long id);
}
