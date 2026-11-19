package com.ecoflux.service;

import com.ecoflux.dto.PuntoTiempoDTO;
import com.ecoflux.dto.SimulacionRequestDTO;
import java.util.List;

public interface MotorLotkaVolterra {

    /**
     * Resuelve numéricamente el sistema diferencial de Lotka-Volterra
     * para los parámetros dados y retorna la serie temporal de puntos.
     *
     * @param params parámetros de configuración del ecosistema
     * @return lista ordenada en el tiempo con los valores de presas y depredadores
     */
    List<PuntoTiempoDTO> resolver(SimulacionRequestDTO params);
}
