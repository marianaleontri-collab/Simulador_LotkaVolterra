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
    @DisplayName("GET /api/v1/presets - Debe retornar HTTP 200 con los 4 presets canónicos sembrados en PostgreSQL por Flyway")
    void testObtenerPresetsExitoso() throws Exception {
        mockMvc.perform(get("/api/v1/presets")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(4)))
                // Validar nombres exactos de los 4 presets de la base de datos
                .andExpect(jsonPath("$[*].nombre", containsInAnyOrder(
                        "Lince y Liebre (Clásico Canadá)",
                        "Equilibrio Armónico",
                        "Al Borde de la Extinción",
                        "Sabana Africana (Gacelas y Leones)"
                )))
                // Validar identificadores
                .andExpect(jsonPath("$[*].id", containsInAnyOrder(
                        "lince-liebre",
                        "equilibrio-armonico",
                        "al-borde-de-la-extincion",
                        "sabana-africana"
                )))
                // Validar estructura de parámetros del preset Lince y Liebre
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.nombreEcosistema").value("Lince y Liebre (Clásico Canadá)"))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.nombrePresa").value("Liebres"))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.nombreDepredador").value("Linces"))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.poblacionInicialPresas").value(40.0))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.poblacionInicialDepredadores").value(9.0))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.alfa").value(0.55))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.beta").value(0.028))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.delta").value(0.024))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.gamma").value(0.84))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.tiempoTotal").value(50.0))
                .andExpect(jsonPath("$[?(@.id == 'lince-liebre')].parametros.pasoTiempo").value(0.05))
                // Validar que todos los presets tienen descripción no vacía
                .andExpect(jsonPath("$[0].descripcion", not(emptyOrNullString())))
                .andExpect(jsonPath("$[1].descripcion", not(emptyOrNullString())))
                .andExpect(jsonPath("$[2].descripcion", not(emptyOrNullString())))
                .andExpect(jsonPath("$[3].descripcion", not(emptyOrNullString())));
    }
}
