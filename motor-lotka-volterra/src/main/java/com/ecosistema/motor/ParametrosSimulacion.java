package com.ecosistema.motor;

/**
 * Parametros de entrada del modelo Lotka-Volterra.
 *
 * <pre>
 *   dx/dt = alfa * x - beta * x * y        (presas)
 *   dy/dt = delta * x * y - gamma * y      (depredadores)
 * </pre>
 *
 * @param alfa                  tasa de natalidad de las presas (&gt; 0)
 * @param beta                  tasa de depredacion: mortalidad de presas por encuentro con depredadores (&gt; 0)
 * @param delta                 eficiencia con que los depredadores convierten presas en nacimientos (&gt; 0)
 * @param gamma                 tasa de mortalidad de los depredadores (&gt; 0)
 * @param presasIniciales       poblacion inicial de presas (&gt; 0)
 * @param depredadoresIniciales poblacion inicial de depredadores (&gt; 0)
 * @param tiempoTotal           duracion total de la simulacion (&gt; 0)
 * @param dt                    paso de integracion (&gt; 0)
 */
public record ParametrosSimulacion(
        double alfa,
        double beta,
        double delta,
        double gamma,
        double presasIniciales,
        double depredadoresIniciales,
        double tiempoTotal,
        double dt) {

    /** Limite de pasos para proteger al servidor de peticiones que consuman memoria sin control. */
    public static final int MAX_PASOS = 1_000_000;

    public ParametrosSimulacion {
        exigirPositivoFinito(alfa, "alfa");
        exigirPositivoFinito(beta, "beta");
        exigirPositivoFinito(delta, "delta");
        exigirPositivoFinito(gamma, "gamma");
        exigirPositivoFinito(presasIniciales, "presasIniciales");
        exigirPositivoFinito(depredadoresIniciales, "depredadoresIniciales");
        exigirPositivoFinito(tiempoTotal, "tiempoTotal");
        exigirPositivoFinito(dt, "dt");
        if (Math.ceil(tiempoTotal / dt - 1e-9) > MAX_PASOS) {
            throw new IllegalArgumentException(
                    "tiempoTotal/dt supera el maximo de " + MAX_PASOS + " pasos; aumente dt o reduzca tiempoTotal");
        }
    }

    /** Punto de equilibrio no trivial de las presas: gamma / delta. */
    public double equilibrioPresas() {
        return gamma / delta;
    }

    /** Punto de equilibrio no trivial de los depredadores: alfa / beta. */
    public double equilibrioDepredadores() {
        return alfa / beta;
    }

    private static void exigirPositivoFinito(double valor, String nombre) {
        if (!Double.isFinite(valor) || valor <= 0) {
            throw new IllegalArgumentException(nombre + " debe ser un numero finito mayor que 0 (recibido: " + valor + ")");
        }
    }
}
