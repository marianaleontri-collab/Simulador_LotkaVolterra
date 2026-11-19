package com.ecoflux.service;

import com.ecoflux.dto.NivelDesafioDTO;
import java.util.List;
import java.util.Optional;

/**
 * Puerto de persistencia desacoplado para consultar niveles/biomas de desafío del juego.
 */
public interface NivelPersistencePort {

    List<NivelDesafioDTO> obtenerTodos();

    Optional<NivelDesafioDTO> buscarPorId(Long id);
}
