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
@DisplayName("Pruebas de Integración para PresetController")
class PresetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/presets - Debe retornar HTTP 200 con exactamente los 4 presets requeridos")
    void testObtenerPresetsExitoso() throws Exception {
        mockMvc.perform(get("/api/v1/presets")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(4)))
                // Validar nombres exactos de los 4 presets
                .andExpect(jsonPath("$[*].nombre", containsInAnyOrder(
                        "Lince y Liebre",
                        "Equilibrio Estable",
                        "Colapso por Sobredepredación",
                        "Ciclo Rápido"
                )))
                // Validar identificadores
                .andExpect(jsonPath("$[*].id", containsInAnyOrder(
                        "lince-liebre",
                        "equilibrio-estable",
                        "colapso-sobredepredacion",
                        "ciclo-rapido"
                )))
                // Validar estructura de parámetros del primer preset (Lince y Liebre)
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.nombreEcosistema").value("Lince y Liebre del Boreal"))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.nombrePresa").value("Liebres"))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.nombreDepredador").value("Linces"))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.poblacionInicialPresas").value(80.0))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.poblacionInicialDepredadores").value(20.0))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.alfa").value(0.1))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.beta").value(0.02))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.delta").value(0.01))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.gamma").value(0.1))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.tiempoTotal").value(200.0))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.pasoTiempo").value(0.05))
                // Validar que todos los presets tienen descripción no vacía
                .andExpect(jsonPath("$[0].descripcion", not(emptyOrNullString())))
                .andExpect(jsonPath("$[1].descripcion", not(emptyOrNullString())))
                .andExpect(jsonPath("$[2].descripcion", not(emptyOrNullString())))
                .andExpect(jsonPath("$[3].descripcion", not(emptyOrNullString())));
    }
}
