package com.ecoflux.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Pruebas de Integración y Contrato para NivelController")
class NivelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/niveles - Debe retornar HTTP 200 y la lista de biomas jugables con equilibrio")
    void testObtenerNivelesRetorna200YBiomasCalibrados() throws Exception {
        mockMvc.perform(get("/api/v1/niveles")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$[*].nombre", hasItems("Bosque Templado", "Sabana en Desbalance", "Tundra Ártica Crítica")))
                .andExpect(jsonPath("$[*].dificultad", hasItems("FACIL", "MEDIO", "DIFICIL")))
                .andExpect(jsonPath("$[*].temaVisual", hasItems("BOSQUE", "SABANA", "TUNDRA")))
                .andExpect(jsonPath("$[0].puntoEquilibrioPresas", greaterThan(0.0)))
                .andExpect(jsonPath("$[0].puntoEquilibrioDepredadores", greaterThan(0.0)))
                .andExpect(jsonPath("$[0].diasObjetivo", greaterThan(0)));
    }

    @Test
    @DisplayName("GET /api/v1/niveles/{id}/proyeccion - Con ID válido debe retornar HTTP 200 y serie temporal RK4")
    void testObtenerProyeccionValidaRetorna200YSerieNatural() throws Exception {
        mockMvc.perform(get("/api/v1/niveles/1/proyeccion")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.nivelId").value(1))
                .andExpect(jsonPath("$.seExtingueSinAyuda").isBoolean())
                .andExpect(jsonPath("$.diaExtincionNatural").isNumber())
                .andExpect(jsonPath("$.serieNatural", not(empty())))
                .andExpect(jsonPath("$.serieNatural[0].tiempo").value(0.0))
                .andExpect(jsonPath("$.serieNatural[0].presas", greaterThan(0.0)))
                .andExpect(jsonPath("$.serieNatural[0].depredadores", greaterThan(0.0)));
    }

    @Test
    @DisplayName("GET /api/v1/niveles/{id}/proyeccion - Con ID inexistente debe retornar HTTP 404")
    void testObtenerProyeccionInexistenteRetorna404() throws Exception {
        mockMvc.perform(get("/api/v1/niveles/9999/proyeccion")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.mensaje", containsString("No se encontró el nivel con ID: 9999")));
    }
}
