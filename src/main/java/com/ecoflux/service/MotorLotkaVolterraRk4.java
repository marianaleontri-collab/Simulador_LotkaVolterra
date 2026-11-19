package com.ecoflux.service;

import com.ecoflux.dto.PuntoTiempoDTO;
import com.ecoflux.dto.SimulacionRequestDTO;
import com.ecosistema.motor.ParametrosSimulacion;
import com.ecosistema.motor.PuntoPoblacion;
import com.ecosistema.motor.SimuladorLotkaVolterra;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Adaptador del motor numérico Lotka-Volterra RK4 que delega el cálculo matemático
 * al núcleo com.ecosistema.motor, gestionando adicionalmente casos borde como poblaciones iniciales nulas.
 */
@Component
@Primary
@ConditionalOnClass(SimuladorLotkaVolterra.class)
public class MotorLotkaVolterraRk4 implements MotorLotkaVolterra {

    private final SimuladorLotkaVolterra simulador = new SimuladorLotkaVolterra();

    @Override
    public List<PuntoTiempoDTO> resolver(SimulacionRequestDTO params) {
        // Gestión analítica exacta para casos borde de poblaciones iniciales nulas
        if (params.poblacionInicialPresas() <= 0.0 || params.poblacionInicialDepredadores() <= 0.0) {
            return resolverCasoBorde(params);
        }

        ParametrosSimulacion parametrosSimulacion = new ParametrosSimulacion(
                params.alfa(),
                params.beta(),
                params.delta(),
                params.gamma(),
                params.poblacionInicialPresas(),
                params.poblacionInicialDepredadores(),
                params.tiempoTotal(),
                params.pasoTiempo()
        );

        List<PuntoPoblacion> puntos = simulador.simular(parametrosSimulacion);
        List<PuntoTiempoDTO> resultado = new ArrayList<>(puntos.size());

        for (PuntoPoblacion p : puntos) {
            resultado.add(new PuntoTiempoDTO(p.tiempo(), p.presas(), p.depredadores()));
        }

        return resultado;
    }

    private List<PuntoTiempoDTO> resolverCasoBorde(SimulacionRequestDTO p) {
        int pasos = (int) Math.ceil(p.tiempoTotal() / p.pasoTiempo() - 1e-9);
        double h = p.tiempoTotal() / pasos;
        List<PuntoTiempoDTO> serie = new ArrayList<>(pasos + 1);

        double x0 = Math.max(0.0, p.poblacionInicialPresas());
        double y0 = Math.max(0.0, p.poblacionInicialDepredadores());

        for (int i = 0; i <= pasos; i++) {
            double t = i * h;
            double x = (x0 == 0.0) ? 0.0 : x0 * Math.exp(p.alfa() * t);
            double y = (y0 == 0.0) ? 0.0 : y0 * Math.exp(-p.gamma() * t);
            serie.add(new PuntoTiempoDTO(t, x, y));
        }
        return serie;
    }
}
