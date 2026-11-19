package com.ecoflux.repository;

import com.ecoflux.model.NivelDesafioEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio Spring Data JPA para la gestion de niveles y biomas jugables de EcoFlux.
 */
@Repository
public interface NivelDesafioRepository extends JpaRepository<NivelDesafioEntity, Long> {

    /**
     * Consulta niveles por dificultad, ignorando mayusculas y minusculas.
     *
     * @param dificultad Dificultad del bioma (FACIL, MEDIO, DIFICIL).
     * @return Lista de niveles correspondientes.
     */
    List<NivelDesafioEntity> findByDificultadIgnoreCase(String dificultad);

    /**
     * Busca un nivel por su nombre exacto, ignorando mayusculas y minusculas.
     *
     * @param nombre Nombre del nivel (ej: "Bosque Boreal").
     * @return Nivel encontrado o vacio.
     */
    Optional<NivelDesafioEntity> findByNombreIgnoreCase(String nombre);
}
