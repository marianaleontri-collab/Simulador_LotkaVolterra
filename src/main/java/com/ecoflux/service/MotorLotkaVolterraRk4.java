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

@Component
@Primary
@ConditionalOnClass(SimuladorLotkaVolterra.class)
public class MotorLotkaVolterraRk4 implements MotorLotkaVolterra {

    private final SimuladorLotkaVolterra simulador = new SimuladorLotkaVolterra();

    @Override
    public List<PuntoTiempoDTO> resolver(SimulacionRequestDTO params) {
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
}
