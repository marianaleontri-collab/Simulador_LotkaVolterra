package com.ecoflux.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI ecofluxOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("EcoFlux - API REST de Dinámica Poblacional Lotka-Volterra")
                        .description("API REST para la simulación, análisis numérico (RK4) y gestión de ecosistemas depredador-presa.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Equipo EcoFlux")
                                .url("https://github.com/marianaleontri-collab/Simulador_LotkaVolterra"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")));
    }
}
