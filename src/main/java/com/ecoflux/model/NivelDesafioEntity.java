package com.ecoflux.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;

/**
 * Entidad JPA que representa un nivel de desafio o bioma jugable en EcoFlux.
 */
@Entity
@Table(name = "niveles_desafio")
public class NivelDesafioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre", length = 80, nullable = false)
    private String nombre;

    @Column(name = "dificultad", length = 20, nullable = false)
    private String dificultad;

    @Column(name = "descripcion", length = 255, nullable = false)
    private String descripcion;

    @Column(name = "nombre_presa", length = 50, nullable = false)
    private String nombrePresa;

    @Column(name = "nombre_depredador", length = 50, nullable = false)
    private String nombreDepredador;

    @Column(name = "tema_visual", length = 20, nullable = false)
    private String temaVisual;

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

    @Column(name = "dias_objetivo", nullable = false)
    private Integer diasObjetivo = 60;

    public NivelDesafioEntity() {
    }

    public NivelDesafioEntity(
            String nombre,
            String dificultad,
            String descripcion,
            String nombrePresa,
            String nombreDepredador,
            String temaVisual,
            Double poblacionInicialPresas,
            Double poblacionInicialDepredadores,
            Double alfa,
            Double beta,
            Double delta,
            Double gamma,
            Integer diasObjetivo
    ) {
        this.nombre = nombre;
        this.dificultad = dificultad;
        this.descripcion = descripcion;
        this.nombrePresa = nombrePresa;
        this.nombreDepredador = nombreDepredador;
        this.temaVisual = temaVisual;
        this.poblacionInicialPresas = poblacionInicialPresas;
        this.poblacionInicialDepredadores = poblacionInicialDepredadores;
        this.alfa = alfa;
        this.beta = beta;
        this.delta = delta;
        this.gamma = gamma;
        this.diasObjetivo = diasObjetivo != null ? diasObjetivo : 60;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDificultad() {
        return dificultad;
    }

    public void setDificultad(String dificultad) {
        this.dificultad = dificultad;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
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

    public String getTemaVisual() {
        return temaVisual;
    }

    public void setTemaVisual(String temaVisual) {
        this.temaVisual = temaVisual;
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

    public Integer getDiasObjetivo() {
        return diasObjetivo;
    }

    public void setDiasObjetivo(Integer diasObjetivo) {
        this.diasObjetivo = diasObjetivo;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        NivelDesafioEntity that = (NivelDesafioEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "NivelDesafioEntity{" +
                "id=" + id +
                ", nombre='" + nombre + '\'' +
                ", dificultad='" + dificultad + '\'' +
                ", temaVisual='" + temaVisual + '\'' +
                ", diasObjetivo=" + diasObjetivo +
                '}';
    }
}
