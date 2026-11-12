package com.ecosistema.motor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class SimuladorLotkaVolterraTest {

    private final SimuladorLotkaVolterra simulador = new SimuladorLotkaVolterra();

    /** Parametros clasicos: alfa=1.1, beta=0.4, delta=0.1, gamma=0.4. */
    private static ParametrosSimulacion clasico(double tiempoTotal, double dt) {
        return new ParametrosSimulacion(1.1, 0.4, 0.1, 0.4, 10, 5, tiempoTotal, dt);
    }

    @Test
    void primerPuntoEsLaCondicionInicial() {
        List<PuntoPoblacion> serie = simulador.simular(clasico(10, 0.01));
        PuntoPoblacion p0 = serie.get(0);
        assertEquals(0.0, p0.tiempo());
        assertEquals(10.0, p0.presas());
        assertEquals(5.0, p0.depredadores());
    }

    @Test
    void cantidadDePuntosYTiempoFinalSonExactos() {
        List<PuntoPoblacion> serie = simulador.simular(clasico(10, 0.01));
        assertEquals(1001, serie.size());
        assertEquals(10.0, serie.get(serie.size() - 1).tiempo(), 1e-9);
    }

    @Test
    void tiempoTotalNoMultiploDeDtTerminaExactamenteEnTiempoTotal() {
        List<PuntoPoblacion> serie = simulador.simular(clasico(1.0, 0.3));
        assertEquals(5, serie.size()); // ceil(1.0/0.3) = 4 pasos
        assertEquals(1.0, serie.get(serie.size() - 1).tiempo(), 1e-12);
    }

    @Test
    void elPuntoDeEquilibrioPermaneceConstante() {
        // En (gamma/delta, alfa/beta) las derivadas son cero: la poblacion no debe moverse.
        ParametrosSimulacion base = clasico(50, 0.01);
        ParametrosSimulacion p = new ParametrosSimulacion(
                1.1, 0.4, 0.1, 0.4, base.equilibrioPresas(), base.equilibrioDepredadores(), 50, 0.01);

        List<PuntoPoblacion> serie = simulador.simular(p);
        for (PuntoPoblacion punto : serie) {
            assertEquals(4.0, punto.presas(), 1e-9);
            assertEquals(2.75, punto.depredadores(), 1e-9);
        }
    }

    @Test
    void conservaLaCantidadInvariante() {
        ParametrosSimulacion p = clasico(100, 0.01);
        double v0 = SimuladorLotkaVolterra.cantidadConservada(p, p.presasIniciales(), p.depredadoresIniciales());

        List<PuntoPoblacion> serie = simulador.simular(p);
        for (PuntoPoblacion punto : serie) {
            double v = SimuladorLotkaVolterra.cantidadConservada(p, punto.presas(), punto.depredadores());
            assertEquals(v0, v, 1e-6, "V se desvio en t=" + punto.tiempo());
        }
    }

    @Test
    void lasPoblacionesNuncaSeVuelvenNegativasNiNoFinitas() {
        List<PuntoPoblacion> serie = simulador.simular(clasico(200, 0.01));
        for (PuntoPoblacion punto : serie) {
            assertTrue(punto.presas() > 0 && Double.isFinite(punto.presas()));
            assertTrue(punto.depredadores() > 0 && Double.isFinite(punto.depredadores()));
        }
    }

    @Test
    void laSolucionEsPeriodicaYLasPresasOscilan() {
        List<PuntoPoblacion> serie = simulador.simular(clasico(100, 0.01));
        double min = Double.MAX_VALUE;
        double max = 0;
        for (PuntoPoblacion punto : serie) {
            min = Math.min(min, punto.presas());
            max = Math.max(max, punto.presas());
        }
        // Parte de 10 (por encima del equilibrio 4) y debe bajar por debajo de 4 y volver a subir.
        assertTrue(min < 4.0, "las presas deben caer por debajo del equilibrio");
        assertTrue(max >= 10.0 - 1e-6, "las presas deben volver a su nivel inicial");
    }

    @Test
    void elMetodoEsDeCuartoOrden() {
        // Al dividir dt entre 2 el error global de un metodo de orden 4 se reduce ~16 veces.
        double tFinal = 5.0;
        double ref = estadoFinalPresas(clasico(tFinal, 0.0005));
        double e1 = Math.abs(estadoFinalPresas(clasico(tFinal, 0.05)) - ref);
        double e2 = Math.abs(estadoFinalPresas(clasico(tFinal, 0.025)) - ref);

        double razon = e1 / e2;
        assertTrue(razon > 12 && razon < 20, "razon de error esperada ~16, obtenida " + razon);
    }

    @Test
    void esMuchoMasPrecisoQueEulerConElMismoPaso() {
        ParametrosSimulacion p = clasico(20, 0.01);
        double v0 = SimuladorLotkaVolterra.cantidadConservada(p, p.presasIniciales(), p.depredadoresIniciales());

        // Euler explicito de referencia
        double x = p.presasIniciales();
        double y = p.depredadoresIniciales();
        int pasos = 2000;
        for (int i = 0; i < pasos; i++) {
            double dxdt = SimuladorLotkaVolterra.dx(p, x, y);
            double dydt = SimuladorLotkaVolterra.dy(p, x, y);
            x += 0.01 * dxdt;
            y += 0.01 * dydt;
        }
        double derivaEuler = Math.abs(SimuladorLotkaVolterra.cantidadConservada(p, x, y) - v0);

        PuntoPoblacion ultimo = simulador.simular(p).get(pasos);
        double derivaRk4 = Math.abs(
                SimuladorLotkaVolterra.cantidadConservada(p, ultimo.presas(), ultimo.depredadores()) - v0);

        assertTrue(derivaRk4 < derivaEuler / 1000, "RK4=" + derivaRk4 + " Euler=" + derivaEuler);
    }

    @Test
    void rechazaParametrosInvalidos() {
        assertThrows(IllegalArgumentException.class,
                () -> new ParametrosSimulacion(-1, 0.4, 0.1, 0.4, 10, 5, 10, 0.01));
        assertThrows(IllegalArgumentException.class,
                () -> new ParametrosSimulacion(1.1, 0.4, 0.1, 0.4, 0, 5, 10, 0.01));
        assertThrows(IllegalArgumentException.class,
                () -> new ParametrosSimulacion(1.1, 0.4, 0.1, 0.4, 10, 5, 10, 0));
        assertThrows(IllegalArgumentException.class,
                () -> new ParametrosSimulacion(Double.NaN, 0.4, 0.1, 0.4, 10, 5, 10, 0.01));
        assertThrows(IllegalArgumentException.class,
                () -> new ParametrosSimulacion(1.1, 0.4, 0.1, 0.4, 10, 5, Double.POSITIVE_INFINITY, 0.01));
    }

    @Test
    void rechazaSimulacionesConDemasiadosPasos() {
        assertThrows(IllegalArgumentException.class,
                () -> new ParametrosSimulacion(1.1, 0.4, 0.1, 0.4, 10, 5, 1_000_000, 0.5));
    }

    private double estadoFinalPresas(ParametrosSimulacion p) {
        List<PuntoPoblacion> serie = simulador.simular(p);
        return serie.get(serie.size() - 1).presas();
    }
}
