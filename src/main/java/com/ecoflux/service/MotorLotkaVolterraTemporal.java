package com.ecoflux.service;

import com.ecoflux.dto.PuntoTiempoDTO;
import com.ecoflux.dto.SimulacionRequestDTO;

import java.util.ArrayList;
import java.util.List;

public class MotorLotkaVolterraTemporal implements MotorLotkaVolterra {

    @Override
    public List<PuntoTiempoDTO> resolver(SimulacionRequestDTO p) {
        int pasos = (int) Math.ceil(p.tiempoTotal() / p.pasoTiempo() - 1e-9);
        double h = p.tiempoTotal() / pasos;

        List<PuntoTiempoDTO> serie = new ArrayList<>(pasos + 1);
        double x = p.poblacionInicialPresas();
        double y = p.poblacionInicialDepredadores();
        serie.add(new PuntoTiempoDTO(0.0, x, y));

        for (int i = 1; i <= pasos; i++) {
            double[] sig = pasoRk4(p, x, y, h);
            x = sig[0];
            y = sig[1];
            serie.add(new PuntoTiempoDTO(i * h, x, y));
        }

        return serie;
    }

    private static double[] pasoRk4(SimulacionRequestDTO p, double x, double y, double h) {
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

    private static double dx(SimulacionRequestDTO p, double x, double y) {
        return p.alfa() * x - p.beta() * x * y;
    }

    private static double dy(SimulacionRequestDTO p, double x, double y) {
        return p.delta() * x * y - p.gamma() * y;
    }
}
