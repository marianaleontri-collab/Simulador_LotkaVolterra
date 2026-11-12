# Motor Lotka-Volterra (RK4)

Motor numerico del simulador de ecosistemas. Resuelve el sistema depredador-presa con Runge-Kutta de 4to orden.

```
dx/dt = alfa*x - beta*x*y        x = presas
dy/dt = delta*x*y - gamma*y      y = depredadores
```

| Parametro | Significado |
|---|---|
| `alfa` | natalidad de las presas |
| `beta` | tasa de depredacion (presas muertas por encuentro) |
| `delta` | eficiencia de reproduccion del depredador al comer presas |
| `gamma` | mortalidad de los depredadores |

Todos los parametros deben ser numeros finitos mayores que 0.

## Uso (Java 21)

```java
var motor = new SimuladorLotkaVolterra();
var params = new ParametrosSimulacion(
        1.1, 0.4, 0.1, 0.4,   // alfa, beta, delta, gamma
        10, 5,                // presas y depredadores iniciales
        100, 0.01);           // tiempoTotal, dt
List<PuntoPoblacion> serie = motor.simular(params);
```

## Contrato JSON (para el integrante 2 y el 4)

`PuntoPoblacion` es un `record`, Jackson lo serializa directo:

```json
[
  { "tiempo": 0.0,  "presas": 10.0,  "depredadores": 5.0 },
  { "tiempo": 0.01, "presas": 10.09, "depredadores": 4.97 }
]
```

`ParametrosSimulacion` tambien es un `record`, sirve como DTO de entrada:

```json
{ "alfa": 1.1, "beta": 0.4, "delta": 0.1, "gamma": 0.4,
  "presasIniciales": 10, "depredadoresIniciales": 5,
  "tiempoTotal": 100, "dt": 0.01 }
```

Parametros invalidos lanzan `IllegalArgumentException` desde el constructor: en Spring se captura con un `@ExceptionHandler` y se responde 400.

## Notas para integrar

- `SimuladorLotkaVolterra` no tiene estado: se puede declarar como `@Bean` singleton.
- Limite de 1.000.000 pasos (`tiempoTotal / dt`) para que una peticion no agote la memoria. Para graficar, `dt` entre 0.01 y 0.1 es mas que suficiente.
- Si `tiempoTotal` no es multiplo de `dt`, el paso se ajusta a la baja para que el ultimo punto caiga exactamente en `tiempoTotal`.
- Equilibrio no trivial: `presas = gamma/delta`, `depredadores = alfa/beta` (`equilibrioPresas()` / `equilibrioDepredadores()`), util para mostrar una linea de referencia en el grafico.

## Pruebas

```
mvn test
```

Cubren: condicion inicial, numero de puntos, tiempo final, punto de equilibrio constante, conservacion de la cantidad invariante `V = delta*x - gamma*ln x + beta*y - alfa*ln y`, positividad, periodicidad, orden de convergencia 4 (el error baja ~16x al reducir `dt` a la mitad), comparacion contra Euler y validacion de entradas.
