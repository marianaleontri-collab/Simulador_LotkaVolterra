package com.ecoflux.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Entidad JPA que representa una partida jugada y registrada en el ranking de EcoFlux.
 */
@Entity
@Table(name = "partidas_ranking")
public class PartidaRankingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre_jugador", length = 40, nullable = false)
    private String nombreJugador;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "nivel_id", nullable = false)
    private NivelDesafioEntity nivel;

    @Column(name = "nivel_id", insertable = false, updatable = false)
    private Long nivelId;

    @Column(name = "puntaje", nullable = false)
    private Integer puntaje;

    @Column(name = "dias_sobrevividos", nullable = false)
    private Integer diasSobrevividos;

    @Column(name = "estabilidad_promedio", nullable = false)
    private Double estabilidadPromedio;

    @Column(name = "intervenciones_usadas", nullable = false)
    private Integer intervencionesUsadas;

    @Column(name = "victoria", nullable = false)
    private Boolean victoria = false;

    @Column(name = "fecha", nullable = false, updatable = false)
    private LocalDateTime fecha;

    public PartidaRankingEntity() {
    }

    public PartidaRankingEntity(
            String nombreJugador,
            NivelDesafioEntity nivel,
            Integer puntaje,
            Integer diasSobrevividos,
            Double estabilidadPromedio,
            Integer intervencionesUsadas,
            Boolean victoria
    ) {
        this.nombreJugador = nombreJugador;
        this.nivel = nivel;
        this.nivelId = nivel != null ? nivel.getId() : null;
        this.puntaje = puntaje;
        this.diasSobrevividos = diasSobrevividos;
        this.estabilidadPromedio = estabilidadPromedio;
        this.intervencionesUsadas = intervencionesUsadas;
        this.victoria = victoria != null ? victoria : false;
    }

    @PrePersist
    public void prePersist() {
        if (this.fecha == null) {
            this.fecha = LocalDateTime.now();
        }
        if (this.victoria == null) {
            this.victoria = false;
        }
        if (this.nivel != null && this.nivelId == null) {
            this.nivelId = this.nivel.getId();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombreJugador() {
        return nombreJugador;
    }

    public void setNombreJugador(String nombreJugador) {
        this.nombreJugador = nombreJugador;
    }

    public NivelDesafioEntity getNivel() {
        return nivel;
    }

    public void setNivel(NivelDesafioEntity nivel) {
        this.nivel = nivel;
        this.nivelId = nivel != null ? nivel.getId() : null;
    }

    public Long getNivelId() {
        return nivelId != null ? nivelId : (nivel != null ? nivel.getId() : null);
    }

    public Integer getPuntaje() {
        return puntaje;
    }

    public void setPuntaje(Integer puntaje) {
        this.puntaje = puntaje;
    }

    public Integer getDiasSobrevividos() {
        return diasSobrevividos;
    }

    public void setDiasSobrevividos(Integer diasSobrevividos) {
        this.diasSobrevividos = diasSobrevividos;
    }

    public Double getEstabilidadPromedio() {
        return estabilidadPromedio;
    }

    public void setEstabilidadPromedio(Double estabilidadPromedio) {
        this.estabilidadPromedio = estabilidadPromedio;
    }

    public Integer getIntervencionesUsadas() {
        return intervencionesUsadas;
    }

    public void setIntervencionesUsadas(Integer intervencionesUsadas) {
        this.intervencionesUsadas = intervencionesUsadas;
    }

    public Boolean getVictoria() {
        return victoria;
    }

    public void setVictoria(Boolean victoria) {
        this.victoria = victoria;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PartidaRankingEntity that = (PartidaRankingEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "PartidaRankingEntity{" +
                "id=" + id +
                ", nombreJugador='" + nombreJugador + '\'' +
                ", nivelId=" + getNivelId() +
                ", puntaje=" + puntaje +
                ", diasSobrevividos=" + diasSobrevividos +
                ", victoria=" + victoria +
                ", fecha=" + fecha +
                '}';
    }
}
