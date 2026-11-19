package com.ecoflux.repository;

import com.ecoflux.model.EcosistemaEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio Spring Data JPA para la gestion de ecosistemas y presets de Lotka-Volterra.
 */
@Repository
public interface EcosistemaRepository extends JpaRepository<EcosistemaEntity, Long> {

    /**
     * Consulta todos los ecosistemas configurados como presets del sistema.
     *
     * @return Lista de ecosistemas predeterminados.
     */
    List<EcosistemaEntity> findByEsPresetTrue();

    /**
     * Consulta los ecosistemas personalizados creados por usuarios,
     * ordenados del mas reciente al mas antiguo.
     *
     * @return Lista de simulaciones personalizadas ordenadas por fecha de creacion descendente.
     */
    List<EcosistemaEntity> findByEsPresetFalseOrderByFechaCreacionDesc();

    /**
     * Busca ecosistemas cuyo nombre contenga el texto indicado, ignorando mayusculas y minusculas.
     *
     * @param nombre Subcadena o nombre a buscar.
     * @return Lista de ecosistemas que coinciden con el criterio de busqueda.
     */
    List<EcosistemaEntity> findByNombreEcosistemaContainingIgnoreCase(String nombre);
}
