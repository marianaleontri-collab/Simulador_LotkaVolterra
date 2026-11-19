package com.ecoflux.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Entidad JPA para la persistencia de configuraciones de ecosistemas
 * y resumen de metricas del simulador Lotka-Volterra.
 */
@Entity
@Table(name = "ecosistemas")
public class EcosistemaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre_ecosistema", length = 100, nullable = false)
    private String nombreEcosistema;

    @Column(name = "nombre_presa", length = 60, nullable = false)
    private String nombrePresa = "Presas";

    @Column(name = "nombre_depredador", length = 60, nullable = false)
    private String nombreDepredador = "Depredadores";

    @Column(name = "poblacion_inicial_presas", nullable = false)
    private Double poblacionInicialPresas;

    @Column(name = "poblacion_inicial_depredadores", nullable = false)
    private Double poblacionInicialDepredadores;

    @Column(name = "alfa", nullable = false)
    private Double alfa;

    @Column(name = "beta", nullable = false)
    private Double beta;

    @Column(name = "delta", nullable = false)
    private Double delta;

    @Column(name = "gamma", nullable = false)
    private Double gamma;

    @Column(name = "tiempo_total", nullable = false)
    private Double tiempoTotal;

    @Column(name = "paso_tiempo", nullable = false)
    private Double pasoTiempo;

    @Column(name = "max_presas")
    private Double maxPresas;

    @Column(name = "min_presas")
    private Double minPresas;

    @Column(name = "max_depredadores")
    private Double maxDepredadores;

    @Column(name = "min_depredadores")
    private Double minDepredadores;

    @Column(name = "riesgo_extincion")
    private Boolean riesgoExtincion = false;

    @Column(name = "es_preset", nullable = false)
    private Boolean esPreset = false;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    public EcosistemaEntity() {
    }

    public EcosistemaEntity(
            String nombreEcosistema,
            String nombrePresa,
            String nombreDepredador,
            Double poblacionInicialPresas,
            Double poblacionInicialDepredadores,
            Double alfa,
            Double beta,
            Double delta,
            Double gamma,
            Double tiempoTotal,
            Double pasoTiempo,
            Double maxPresas,
            Double minPresas,
            Double maxDepredadores,
            Double minDepredadores,
            Boolean riesgoExtincion,
            Boolean esPreset
    ) {
        this.nombreEcosistema = nombreEcosistema;
        this.nombrePresa = (nombrePresa != null && !nombrePresa.isBlank()) ? nombrePresa : "Presas";
        this.nombreDepredador = (nombreDepredador != null && !nombreDepredador.isBlank()) ? nombreDepredador : "Depredadores";
        this.poblacionInicialPresas = poblacionInicialPresas;
        this.poblacionInicialDepredadores = poblacionInicialDepredadores;
        this.alfa = alfa;
        this.beta = beta;
        this.delta = delta;
        this.gamma = gamma;
        this.tiempoTotal = tiempoTotal;
        this.pasoTiempo = pasoTiempo;
        this.maxPresas = maxPresas;
        this.minPresas = minPresas;
        this.maxDepredadores = maxDepredadores;
        this.minDepredadores = minDepredadores;
        this.riesgoExtincion = (riesgoExtincion != null) ? riesgoExtincion : false;
        this.esPreset = (esPreset != null) ? esPreset : false;
    }

    @PrePersist
    public void prePersist() {
        if (this.fechaCreacion == null) {
            this.fechaCreacion = LocalDateTime.now();
        }
        if (this.nombrePresa == null || this.nombrePresa.isBlank()) {
            this.nombrePresa = "Presas";
        }
        if (this.nombreDepredador == null || this.nombreDepredador.isBlank()) {
            this.nombreDepredador = "Depredadores";
        }
        if (this.esPreset == null) {
            this.esPreset = false;
        }
        if (this.riesgoExtincion == null) {
            this.riesgoExtincion = false;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombreEcosistema() {
        return nombreEcosistema;
    }

    public void setNombreEcosistema(String nombreEcosistema) {
        this.nombreEcosistema = nombreEcosistema;
    }

    public String getNombrePresa() {
        return nombrePresa;
    }

    public void setNombrePresa(String nombrePresa) {
        this.nombrePresa = nombrePresa;
    }

    public String getNombreDepredador() {
        return nombreDepredador;
    }

    public void setNombreDepredador(String nombreDepredador) {
        this.nombreDepredador = nombreDepredador;
    }

    public Double getPoblacionInicialPresas() {
        return poblacionInicialPresas;
    }

    public void setPoblacionInicialPresas(Double poblacionInicialPresas) {
        this.poblacionInicialPresas = poblacionInicialPresas;
    }

    public Double getPoblacionInicialDepredadores() {
        return poblacionInicialDepredadores;
    }

    public void setPoblacionInicialDepredadores(Double poblacionInicialDepredadores) {
        this.poblacionInicialDepredadores = poblacionInicialDepredadores;
    }

    public Double getAlfa() {
        return alfa;
    }

    public void setAlfa(Double alfa) {
        this.alfa = alfa;
    }

    public Double getBeta() {
        return beta;
    }

    public void setBeta(Double beta) {
        this.beta = beta;
    }

    public Double getDelta() {
        return delta;
    }

    public void setDelta(Double delta) {
        this.delta = delta;
    }

    public Double getGamma() {
        return gamma;
    }

    public void setGamma(Double gamma) {
        this.gamma = gamma;
    }

    public Double getTiempoTotal() {
        return tiempoTotal;
    }

    public void setTiempoTotal(Double tiempoTotal) {
        this.tiempoTotal = tiempoTotal;
    }

    public Double getPasoTiempo() {
        return pasoTiempo;
    }

    public void setPasoTiempo(Double pasoTiempo) {
        this.pasoTiempo = pasoTiempo;
    }

    public Double getMaxPresas() {
        return maxPresas;
    }

    public void setMaxPresas(Double maxPresas) {
        this.maxPresas = maxPresas;
    }

    public Double getMinPresas() {
        return minPresas;
    }

    public void setMinPresas(Double minPresas) {
        this.minPresas = minPresas;
    }

    public Double getMaxDepredadores() {
        return maxDepredadores;
    }

    public void setMaxDepredadores(Double maxDepredadores) {
        this.maxDepredadores = maxDepredadores;
    }

    public Double getMinDepredadores() {
        return minDepredadores;
    }

    public void setMinDepredadores(Double minDepredadores) {
        this.minDepredadores = minDepredadores;
    }

    public Boolean getRiesgoExtincion() {
        return riesgoExtincion;
    }

    public void setRiesgoExtincion(Boolean riesgoExtincion) {
        this.riesgoExtincion = riesgoExtincion;
    }

    public Boolean getEsPreset() {
        return esPreset;
    }

    public void setEsPreset(Boolean esPreset) {
        this.esPreset = esPreset;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EcosistemaEntity that = (EcosistemaEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "EcosistemaEntity{" +
                "id=" + id +
                ", nombreEcosistema='" + nombreEcosistema + '\'' +
                ", nombrePresa='" + nombrePresa + '\'' +
                ", nombreDepredador='" + nombreDepredador + '\'' +
                ", poblacionInicialPresas=" + poblacionInicialPresas +
                ", poblacionInicialDepredadores=" + poblacionInicialDepredadores +
                ", alfa=" + alfa +
                ", beta=" + beta +
                ", delta=" + delta +
                ", gamma=" + gamma +
                ", tiempoTotal=" + tiempoTotal +
                ", pasoTiempo=" + pasoTiempo +
                ", esPreset=" + esPreset +
                ", fechaCreacion=" + fechaCreacion +
                '}';
    }
}
