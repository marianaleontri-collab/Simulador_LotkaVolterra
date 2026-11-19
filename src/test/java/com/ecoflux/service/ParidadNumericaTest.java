package com.ecoflux.service;

import com.ecoflux.dto.PuntoTiempoDTO;
import com.ecoflux.dto.SimulacionRequestDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("Verificación de Paridad Numérica: Java vs mockRk4.js (< 1e-6)")
class ParidadNumericaTest {

    private final MotorLotkaVolterraRk4 motorJava = new MotorLotkaVolterraRk4();

    @Test
    @DisplayName("Paridad estricta < 1e-6 entre Java RK4 y JavaScript mockRk4 en todos los presets")
    void testParidadConMotorJavaScript() {
        Map<String, SimulacionRequestDTO> presets = Map.of(
                "lince-liebre", new SimulacionRequestDTO(
                        "Lince y Liebre", "Liebres", "Linces",
                        40.0, 9.0, 0.55, 0.028, 0.024, 0.84, 50.0, 0.05
                ),
                "equilibrio-armonico", new SimulacionRequestDTO(
                        "Equilibrio Armónico", "Presas", "Depredadores",
                        100.0, 20.0, 0.1, 0.002, 0.001, 0.05, 200.0, 0.05
                ),
                "al-borde-de-la-extincion", new SimulacionRequestDTO(
                        "Al Borde de la Extinción", "Presas", "Depredadores",
                        120.0, 45.0, 0.4, 0.015, 0.01, 0.3, 100.0, 0.05
                ),
                "sabana-africana", new SimulacionRequestDTO(
                        "Sabana Africana", "Gacelas", "Leones",
                        200.0, 15.0, 0.25, 0.004, 0.002, 0.15, 150.0, 0.1
                )
        );

        for (Map.Entry<String, SimulacionRequestDTO> entry : presets.entrySet()) {
            String presetId = entry.getKey();
            SimulacionRequestDTO req = entry.getValue();

            List<PuntoTiempoDTO> puntosJava = motorJava.resolver(req);

            // Ejecución fiel de la implementación idéntica de mockRk4.js
            int pasos = Math.max(1, (int) Math.ceil(req.tiempoTotal() / req.pasoTiempo() - 1e-9));
            double h = req.tiempoTotal() / pasos;

            assertEquals(pasos + 1, puntosJava.size(), "Cantidad de pasos debe coincidir para " + presetId);

            double xJs = req.poblacionInicialPresas();
            double yJs = req.poblacionInicialDepredadores();

            for (int i = 0; i <= pasos; i++) {
                PuntoTiempoDTO ptJava = puntosJava.get(i);
                double tEsperado = i * h;

                assertEquals(tEsperado, ptJava.tiempo(), 1e-9, "Tiempo coincidente en paso " + i);

                double errX = Math.abs(ptJava.presas() - xJs);
                double errY = Math.abs(ptJava.depredadores() - yJs);

                assertTrue(errX < 1e-6, String.format("Error presas en %s paso %d: %.2e >= 1e-6", presetId, i, errX));
                assertTrue(errY < 1e-6, String.format("Error depredadores en %s paso %d: %.2e >= 1e-6", presetId, i, errY));

                if (i < pasos) {
                    double[] next = pasoRk4Js(req, xJs, yJs, h);
                    xJs = next[0];
                    yJs = next[1];
                }
            }
        }
    }

    /**
     * Réplica exacta de pasoRk4 en frontend/js/mockRk4.js
     */
    private double[] pasoRk4Js(SimulacionRequestDTO p, double x, double y, double h) {
        double k1x = p.alfa() * x - p.beta() * x * y;
        double k1y = p.delta() * x * y - p.gamma() * y;

        double k2x = p.alfa() * (x + 0.5 * h * k1x) - p.beta() * (x + 0.5 * h * k1x) * (y + 0.5 * h * k1y);
        double k2y = p.delta() * (x + 0.5 * h * k1x) * (y + 0.5 * h * k1y) - p.gamma() * (y + 0.5 * h * k1y);

        double k3x = p.alfa() * (x + 0.5 * h * k2x) - p.beta() * (x + 0.5 * h * k2x) * (y + 0.5 * h * k2y);
        double k3y = p.delta() * (x + 0.5 * h * k2x) * (y + 0.5 * h * k2y) - p.gamma() * (y + 0.5 * h * k2y);

        double k4x = p.alfa() * (x + h * k3x) - p.beta() * (x + h * k3x) * (y + h * k3y);
        double k4y = p.delta() * (x + h * k3x) * (y + h * k3y) - p.gamma() * (y + h * k3y);

        double nextX = x + (h / 6.0) * (k1x + 2.0 * k2x + 2.0 * k3x + k4x);
        double nextY = y + (h / 6.0) * (k1y + 2.0 * k2y + 2.0 * k3y + k4y);

        return new double[]{Math.max(0, nextX), Math.max(0, nextY)};
    }
}
