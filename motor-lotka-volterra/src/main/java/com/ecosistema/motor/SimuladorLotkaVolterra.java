package com.ecosistema.motor;

import java.util.ArrayList;
import java.util.List;

/**
 * Resuelve el sistema Lotka-Volterra con el metodo de Runge-Kutta de 4to orden (RK4).
 *
 * <p>La clase no tiene estado, por lo que es segura entre hilos y puede registrarse
 * como bean singleton de Spring.</p>
 */
public final class SimuladorLotkaVolterra {

    /**
     * Simula el ecosistema y devuelve la serie de puntos (incluye el instante 0 y el instante final).
     *
     * <p>Si {@code tiempoTotal} no es multiplo de {@code dt}, se usa el paso uniforme
     * {@code h = tiempoTotal / ceil(tiempoTotal / dt)} (siempre &lt;= dt), de modo que el
     * ultimo punto cae exactamente en {@code tiempoTotal}.</p>
     */
    public List<PuntoPoblacion> simular(ParametrosSimulacion p) {
        int pasos = (int) Math.ceil(p.tiempoTotal() / p.dt() - 1e-9);
        double h = p.tiempoTotal() / pasos;

        List<PuntoPoblacion> serie = new ArrayList<>(pasos + 1);
        double x = p.presasIniciales();
        double y = p.depredadoresIniciales();
        serie.add(new PuntoPoblacion(0.0, x, y));

        for (int i = 1; i <= pasos; i++) {
            double[] siguiente = pasoRk4(p, x, y, h);
            x = siguiente[0];
            y = siguiente[1];
            // Se calcula t = i*h (no se acumula) para no arrastrar error de redondeo.
            serie.add(new PuntoPoblacion(i * h, x, y));
        }
        return serie;
    }

    /** Un paso de RK4: devuelve {presas, depredadores} en t + h. */
    static double[] pasoRk4(ParametrosSimulacion p, double x, double y, double h) {
        double k1x = dx(p, x, y);
        double k1y = dy(p, x, y);

        double k2x = dx(p, x + 0.5 * h * k1x, y + 0.5 * h * k1y);
        double k2y = dy(p, x + 0.5 * h * k1x, y + 0.5 * h * k1y);

        double k3x = dx(p, x + 0.5 * h * k2x, y + 0.5 * h * k2y);
        double k3y = dy(p, x + 0.5 * h * k2x, y + 0.5 * h * k2y);

        double k4x = dx(p, x + h * k3x, y + h * k3y);
        double k4y = dy(p, x + h * k3x, y + h * k3y);

        return new double[] {
                x + h / 6.0 * (k1x + 2 * k2x + 2 * k3x + k4x),
                y + h / 6.0 * (k1y + 2 * k2y + 2 * k3y + k4y)
        };
    }

    /** dx/dt = alfa*x - beta*x*y */
    static double dx(ParametrosSimulacion p, double x, double y) {
        return p.alfa() * x - p.beta() * x * y;
    }

    /** dy/dt = delta*x*y - gamma*y */
    static double dy(ParametrosSimulacion p, double x, double y) {
        return p.delta() * x * y - p.gamma() * y;
    }

    /**
     * Cantidad conservada del modelo: V = delta*x - gamma*ln(x) + beta*y - alfa*ln(y).
     * Es constante a lo largo de la solucion exacta; sirve para validar la precision numerica.
     */
    public static double cantidadConservada(ParametrosSimulacion p, double x, double y) {
        return p.delta() * x - p.gamma() * Math.log(x) + p.beta() * y - p.alfa() * Math.log(y);
    }
}
