package com.ecosistema.motor;

/**
 * Un punto de la serie temporal. Es el contrato JSON acordado con la API:
 * <pre>{ "tiempo": 0.0, "presas": 100.0, "depredadores": 20.0 }</pre>
 */
public record PuntoPoblacion(double tiempo, double presas, double depredadores) {
}
