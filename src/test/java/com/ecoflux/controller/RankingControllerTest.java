package com.ecoflux.controller;

import com.ecoflux.dto.PartidaRequestDTO;
import com.ecoflux.service.InMemoryRankingPersistenceAdapter;
import com.ecoflux.service.RankingPersistencePort;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Pruebas de Integración y Contrato para RankingController")
class RankingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RankingPersistencePort rankingPersistencePort;

    @AfterEach
    void tearDown() {
        if (rankingPersistencePort instanceof InMemoryRankingPersistenceAdapter mem) {
            mem.limpiar();
        }
    }

    @Test
    @DisplayName("POST /api/v1/ranking - Con datos válidos debe registrar la partida y retornar HTTP 201")
    void testRegistrarPartidaValidaRetorna201() throws Exception {
        PartidaRequestDTO request = new PartidaRequestDTO(
                "Guardián_Bogotá",
                1L,
                1500,
                60,
                88.5,
                5,
                true
        );

        mockMvc.perform(post("/api/v1/ranking")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.nombreJugador").value("Guardián_Bogotá"))
                .andExpect(jsonPath("$.nombreNivel").value("Bosque Templado"))
                .andExpect(jsonPath("$.puntaje").value(1500))
                .andExpect(jsonPath("$.diasSobrevividos").value(60))
                .andExpect(jsonPath("$.estabilidadPromedio").value(88.5))
                .andExpect(jsonPath("$.victoria").value(true))
                .andExpect(jsonPath("$.fecha", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/v1/ranking - Con nombre vacío o puntaje negativo debe retornar HTTP 400")
    void testRegistrarPartidaInvalidaRetorna400() throws Exception {
        String jsonInvalido = """
                {
                    "nombreJugador": "",
                    "nivelId": 1,
                    "puntaje": -100,
                    "diasSobrevividos": 10,
                    "estabilidadPromedio": 50.0,
                    "intervencionesUsadas": 2,
                    "victoria": false
                }
                """;

        mockMvc.perform(post("/api/v1/ranking")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonInvalido))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.detalles.nombreJugador").exists())
                .andExpect(jsonPath("$.detalles.puntaje").exists());
    }

    @Test
    @DisplayName("POST /api/v1/ranking - Con nivel inexistente debe retornar HTTP 404")
    void testRegistrarPartidaNivelInexistenteRetorna404() throws Exception {
        PartidaRequestDTO request = new PartidaRequestDTO(
                "Jugador_X",
                9999L,
                500,
                20,
                40.0,
                3,
                false
        );

        mockMvc.perform(post("/api/v1/ranking")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.mensaje", containsString("No se encontró el nivel con ID: 9999")));
    }

    @Test
    @DisplayName("GET /api/v1/ranking - Debe retornar Top 10 ordenado por puntaje descendente")
    void testObtenerTop10RetornaOrdenadoPorPuntajeDesc() throws Exception {
        // Registrar varias partidas con distintos puntajes
        mockMvc.perform(post("/api/v1/ranking")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new PartidaRequestDTO("JugadorBajo", 1L, 400, 20, 50.0, 2, false))));

        mockMvc.perform(post("/api/v1/ranking")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new PartidaRequestDTO("JugadorAlto", 1L, 2500, 60, 95.0, 4, true))));

        mockMvc.perform(post("/api/v1/ranking")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new PartidaRequestDTO("JugadorMedio", 2L, 1200, 45, 75.0, 6, true))));

        // Consultar ranking general
        mockMvc.perform(get("/api/v1/ranking")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].nombreJugador").value("JugadorAlto"))
                .andExpect(jsonPath("$[0].puntaje").value(2500))
                .andExpect(jsonPath("$[1].nombreJugador").value("JugadorMedio"))
                .andExpect(jsonPath("$[1].puntaje").value(1200))
                .andExpect(jsonPath("$[2].nombreJugador").value("JugadorBajo"))
                .andExpect(jsonPath("$[2].puntaje").value(400));
    }

    @Test
    @DisplayName("GET /api/v1/ranking?nivelId=2 - Debe filtrar correctamente por nivel")
    void testObtenerRankingFiltradoPorNivel() throws Exception {
        mockMvc.perform(post("/api/v1/ranking")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new PartidaRequestDTO("Nivel1Player", 1L, 1000, 30, 60.0, 2, false))));

        mockMvc.perform(post("/api/v1/ranking")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new PartidaRequestDTO("Nivel2Player", 2L, 1800, 75, 90.0, 3, true))));

        // Filtrar solo para nivel 2
        mockMvc.perform(get("/api/v1/ranking?nivelId=2")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].nombreJugador").value("Nivel2Player"))
                .andExpect(jsonPath("$[0].nombreNivel").value("Sabana en Desbalance"))
                .andExpect(jsonPath("$[0].puntaje").value(1800));
    }
}
