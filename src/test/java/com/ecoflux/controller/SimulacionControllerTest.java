package com.ecoflux.controller;

import com.ecoflux.dto.SimulacionRequestDTO;
import com.ecoflux.service.EcosistemaPersistencePort;
import com.ecoflux.service.InMemoryEcosistemaPersistenceAdapter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Pruebas de Integración y Contrato para SimulacionController")
class SimulacionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EcosistemaPersistencePort persistencePort;

    @AfterEach
    void tearDown() {
        if (persistencePort instanceof InMemoryEcosistemaPersistenceAdapter mem) {
            mem.limpiar();
        }
    }

    private SimulacionRequestDTO crearRequestValido(String nombreEcosistema) {
        return new SimulacionRequestDTO(
                nombreEcosistema,
                "Liebres",
                "Linces",
                80.0,
                20.0,
                0.1,
                0.02,
                0.01,
                0.1,
                50.0,
                0.05
        );
    }

    @Nested
    @DisplayName("Endpoint POST /api/v1/simulaciones/calcular")
    class CalcularSimulacionTests {

        @Test
        @DisplayName("POST /calcular - Con datos válidos debe retornar HTTP 200, serieTemporal no vacía, estadísticas y ID null")
        void testCalcularValidoRetorna200YSerieConEstadisticas() throws Exception {
            SimulacionRequestDTO request = crearRequestValido("Bosque Andino");

            mockMvc.perform(post("/api/v1/simulaciones/calcular")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                    // El id debe ser null en cálculo en tiempo real sin guardar
                    .andExpect(jsonPath("$.id").value(nullValue()))
                    .andExpect(jsonPath("$.nombreEcosistema").value("Bosque Andino"))
                    .andExpect(jsonPath("$.nombrePresa").value("Liebres"))
                    .andExpect(jsonPath("$.nombreDepredador").value("Linces"))
                    .andExpect(jsonPath("$.fechaCreacion").isNotEmpty())
                    // Serie temporal no vacía con puntos válidos
                    .andExpect(jsonPath("$.serieTemporal", not(empty())))
                    .andExpect(jsonPath("$.serieTemporal[0].tiempo").value(0.0))
                    .andExpect(jsonPath("$.serieTemporal[0].presas").value(80.0))
                    .andExpect(jsonPath("$.serieTemporal[0].depredadores").value(20.0))
                    // Estadísticas completas
                    .andExpect(jsonPath("$.estadisticas.maxPresas", greaterThan(0.0)))
                    .andExpect(jsonPath("$.estadisticas.minPresas", greaterThan(0.0)))
                    .andExpect(jsonPath("$.estadisticas.maxDepredadores", greaterThan(0.0)))
                    .andExpect(jsonPath("$.estadisticas.minDepredadores", greaterThan(0.0)))
                    // Puntos de equilibrio teóricos: presas = gamma/delta (0.1/0.01 = 10.0), depredadores = alfa/beta (0.1/0.02 = 5.0)
                    .andExpect(jsonPath("$.estadisticas.puntoEquilibrioPresas").value(10.0))
                    .andExpect(jsonPath("$.estadisticas.puntoEquilibrioDepredadores").value(5.0))
                    .andExpect(jsonPath("$.estadisticas.riesgoExtincion").isBoolean());
        }

        @Test
        @DisplayName("POST /calcular - Con alfa negativo debe retornar HTTP 400 y ErrorResponseDTO con campo en detalles")
        void testCalcularAlfaNegativoRetorna400() throws Exception {
            String jsonInvalido = """
                    {
                        "nombreEcosistema": "Ecosistema Alfa Negativo",
                        "nombrePresa": "Presas",
                        "nombreDepredador": "Depredadores",
                        "poblacionInicialPresas": 50.0,
                        "poblacionInicialDepredadores": 10.0,
                        "alfa": -0.2,
                        "beta": 0.02,
                        "delta": 0.01,
                        "gamma": 0.1,
                        "tiempoTotal": 100.0,
                        "pasoTiempo": 0.05
                    }
                    """;

            mockMvc.perform(post("/api/v1/simulaciones/calcular")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(jsonInvalido))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.mensaje").value("Error en la validación de los datos enviados"))
                    .andExpect(jsonPath("$.detalles.alfa", containsStringIgnoringCase("alfa")));
        }

        @Test
        @DisplayName("POST /calcular - Con tiempoTotal superior a 1000 debe retornar HTTP 400 y ErrorResponseDTO")
        void testCalcularTiempoTotalExcedidoRetorna400() throws Exception {
            String jsonInvalido = """
                    {
                        "nombreEcosistema": "Ecosistema Tiempo Excedido",
                        "nombrePresa": "Presas",
                        "nombreDepredador": "Depredadores",
                        "poblacionInicialPresas": 50.0,
                        "poblacionInicialDepredadores": 10.0,
                        "alfa": 0.1,
                        "beta": 0.02,
                        "delta": 0.01,
                        "gamma": 0.1,
                        "tiempoTotal": 1500.0,
                        "pasoTiempo": 0.05
                    }
                    """;

            mockMvc.perform(post("/api/v1/simulaciones/calcular")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(jsonInvalido))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.mensaje").value("Error en la validación de los datos enviados"))
                    .andExpect(jsonPath("$.detalles.tiempoTotal", containsStringIgnoringCase("1000")));
        }

        @Test
        @DisplayName("POST /calcular - Con pasoTiempo inferior a 0.001 debe retornar HTTP 400 y ErrorResponseDTO")
        void testCalcularPasoTiempoMenorAlMinimoRetorna400() throws Exception {
            String jsonInvalido = """
                    {
                        "nombreEcosistema": "Ecosistema Paso Diminuto",
                        "nombrePresa": "Presas",
                        "nombreDepredador": "Depredadores",
                        "poblacionInicialPresas": 50.0,
                        "poblacionInicialDepredadores": 10.0,
                        "alfa": 0.1,
                        "beta": 0.02,
                        "delta": 0.01,
                        "gamma": 0.1,
                        "tiempoTotal": 100.0,
                        "pasoTiempo": 0.0001
                    }
                    """;

            mockMvc.perform(post("/api/v1/simulaciones/calcular")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(jsonInvalido))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.mensaje").value("Error en la validación de los datos enviados"))
                    .andExpect(jsonPath("$.detalles.pasoTiempo", containsStringIgnoringCase("0.001")));
        }

        @Test
        @DisplayName("POST /calcular - Con múltiples parámetros inválidos simultáneos debe retornar 400 con todos en detalles")
        void testCalcularMultiplesParametrosInvalidosRetorna400ConDetalles() throws Exception {
            String jsonInvalido = """
                    {
                        "nombreEcosistema": "",
                        "nombrePresa": "Liebres",
                        "nombreDepredador": "Linces",
                        "poblacionInicialPresas": -10.0,
                        "poblacionInicialDepredadores": -5.0,
                        "alfa": -0.5,
                        "beta": -0.01,
                        "delta": -0.01,
                        "gamma": -0.1,
                        "tiempoTotal": 2000.0,
                        "pasoTiempo": 0.00001
                    }
                    """;

            mockMvc.perform(post("/api/v1/simulaciones/calcular")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(jsonInvalido))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.mensaje").value("Error en la validación de los datos enviados"))
                    .andExpect(jsonPath("$.detalles.nombreEcosistema").exists())
                    .andExpect(jsonPath("$.detalles.poblacionInicialPresas").exists())
                    .andExpect(jsonPath("$.detalles.poblacionInicialDepredadores").exists())
                    .andExpect(jsonPath("$.detalles.alfa").exists())
                    .andExpect(jsonPath("$.detalles.beta").exists())
                    .andExpect(jsonPath("$.detalles.delta").exists())
                    .andExpect(jsonPath("$.detalles.gamma").exists())
                    .andExpect(jsonPath("$.detalles.tiempoTotal").exists())
                    .andExpect(jsonPath("$.detalles.pasoTiempo").exists());
        }
    }

    @Nested
    @DisplayName("Endpoint POST /api/v1/simulaciones")
    class CrearSimulacionTests {

        @Test
        @DisplayName("POST /simulaciones - Con datos válidos debe retornar HTTP 201, ID generado y persistido")
        void testCrearSimulacionValidaRetorna201YPersistida() throws Exception {
            SimulacionRequestDTO request = crearRequestValido("Arrecife de Coral");

            MvcResult result = mockMvc.perform(post("/api/v1/simulaciones")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.id", notNullValue()))
                    .andExpect(jsonPath("$.nombreEcosistema").value("Arrecife de Coral"))
                    .andExpect(jsonPath("$.serieTemporal", not(empty())))
                    .andExpect(jsonPath("$.estadisticas.maxPresas", greaterThan(0.0)))
                    .andExpect(jsonPath("$.estadisticas.puntoEquilibrioPresas").value(10.0))
                    .andReturn();

            String responseContent = result.getResponse().getContentAsString();
            Number generatedId = com.jayway.jsonpath.JsonPath.read(responseContent, "$.id");

            // Verificar que el ID generado existe y se puede consultar vía GET
            mockMvc.perform(get("/api/v1/simulaciones/" + generatedId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(generatedId))
                    .andExpect(jsonPath("$.nombreEcosistema").value("Arrecife de Coral"));
        }

        @Test
        @DisplayName("POST /simulaciones - Con datos inválidos debe retornar HTTP 400 y no persistir")
        void testCrearSimulacionInvalidaRetorna400() throws Exception {
            String jsonInvalido = """
                    {
                        "nombreEcosistema": "",
                        "alfa": -1.0,
                        "tiempoTotal": 5000.0
                    }
                    """;

            mockMvc.perform(post("/api/v1/simulaciones")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(jsonInvalido))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.detalles").isMap());
        }
    }

    @Nested
    @DisplayName("Endpoint GET /api/v1/simulaciones")
    class ListarSimulacionesTests {

        @Test
        @DisplayName("GET /simulaciones - Debe retornar HTTP 200 y lista ligera de ecosistemas")
        void testListarEcosistemasRetorna200() throws Exception {
            // Guardar al menos una simulación previa
            SimulacionRequestDTO request = crearRequestValido("Tundra Ártica");
            mockMvc.perform(post("/api/v1/simulaciones")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            mockMvc.perform(get("/api/v1/simulaciones")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$", isA(java.util.List.class)))
                    .andExpect(jsonPath("$", not(empty())))
                    // La lista de resumen debe contener identificadores y estadísticas
                    .andExpect(jsonPath("$[0].id", notNullValue()))
                    .andExpect(jsonPath("$[0].nombreEcosistema", notNullValue()))
                    .andExpect(jsonPath("$[0].parametros", notNullValue()))
                    .andExpect(jsonPath("$[0].estadisticas", notNullValue()))
                    // La lista ligera NO debe incluir serieTemporal para optimizar carga
                    .andExpect(jsonPath("$[0].serieTemporal").doesNotExist());
        }
    }

    @Nested
    @DisplayName("Endpoint GET /api/v1/simulaciones/{id}")
    class BuscarPorIdTests {

        @Test
        @DisplayName("GET /{id} - Con ID existente debe retornar HTTP 200 y serie temporal recalculada")
        void testBuscarPorIdExistenteRetorna200ConSerieRecalculada() throws Exception {
            // Guardar simulación para obtener ID
            SimulacionRequestDTO request = crearRequestValido("Selva Tropical Húmeda");
            MvcResult postResult = mockMvc.perform(post("/api/v1/simulaciones")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andReturn();

            Number id = com.jayway.jsonpath.JsonPath.read(postResult.getResponse().getContentAsString(), "$.id");

            mockMvc.perform(get("/api/v1/simulaciones/" + id))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(id))
                    .andExpect(jsonPath("$.nombreEcosistema").value("Selva Tropical Húmeda"))
                    .andExpect(jsonPath("$.serieTemporal", not(empty())))
                    .andExpect(jsonPath("$.serieTemporal[0].tiempo").value(0.0))
                    .andExpect(jsonPath("$.estadisticas", notNullValue()));
        }

        @Test
        @DisplayName("GET /{id} - Con ID inexistente debe retornar HTTP 404 y ErrorResponseDTO")
        void testBuscarPorIdInexistenteRetorna404() throws Exception {
            long idInexistente = 999999L;

            mockMvc.perform(get("/api/v1/simulaciones/" + idInexistente))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.error").value("Not Found"))
                    .andExpect(jsonPath("$.mensaje", containsString("No se encontró el ecosistema con ID: " + idInexistente)));
        }
    }

    @Nested
    @DisplayName("Endpoint DELETE /api/v1/simulaciones/{id}")
    class EliminarSimulacionTests {

        @Test
        @DisplayName("DELETE /{id} - Con ID existente debe retornar HTTP 204 y luego 404 en consulta posterior")
        void testEliminarPorIdExistenteRetorna204() throws Exception {
            // Guardar simulación para luego eliminarla
            SimulacionRequestDTO request = crearRequestValido("Ecosistema a Eliminar");
            MvcResult postResult = mockMvc.perform(post("/api/v1/simulaciones")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andReturn();

            Number id = com.jayway.jsonpath.JsonPath.read(postResult.getResponse().getContentAsString(), "$.id");

            // Eliminar exitosamente
            mockMvc.perform(delete("/api/v1/simulaciones/" + id))
                    .andExpect(status().isNoContent());

            // Comprobar que ya no existe (404)
            mockMvc.perform(get("/api/v1/simulaciones/" + id))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));
        }

        @Test
        @DisplayName("DELETE /{id} - Con ID inexistente debe retornar HTTP 404 y ErrorResponseDTO")
        void testEliminarPorIdInexistenteRetorna404() throws Exception {
            long idInexistente = 888888L;

            mockMvc.perform(delete("/api/v1/simulaciones/" + idInexistente))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.error").value("Not Found"))
                    .andExpect(jsonPath("$.mensaje", containsString("No se encontró el ecosistema con ID: " + idInexistente)));
        }
    }
}
