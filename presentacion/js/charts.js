/**
 * EcoFlux — Módulo de Gráficas y Simulaciones Numéricas (Chart.js 4)
 * Generación de curvas Lotka-Volterra, Retrato de Fase y Comparación RK4 vs. Euler.
 */

// Instancias activas de gráficos para evitar fugas de memoria
let chartTimeSeries = null;
let chartPhasePortrait = null;
let chartEuler = null;
let chartRK4 = null;

/**
 * Derivadas del sistema Lotka-Volterra
 * dx/dt = alpha * x - beta * x * y
 * dy/dt = delta * x * y - gamma * y
 */
function derivatives(x, y, alpha, beta, delta, gamma) {
  const dxdt = alpha * x - beta * x * y;
  const dydt = delta * x * y - gamma * y;
  return { dxdt, dydt };
}

/**
 * Generador de datos con Runge-Kutta de 4to Orden (RK4)
 */
function generateRK4Data(alpha = 1.1, beta = 0.4, delta = 0.1, gamma = 0.4, x0 = 10, y0 = 5, tMax = 35, dt = 0.05) {
  const times = [];
  const preys = [];
  const predators = [];
  const phasePoints = [];

  let x = x0;
  let y = y0;
  let t = 0;

  while (t <= tMax) {
    times.push(t.toFixed(1));
    preys.push(Number(x.toFixed(2)));
    predators.push(Number(y.toFixed(2)));
    phasePoints.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });

    // k1
    const k1 = derivatives(x, y, alpha, beta, delta, gamma);

    // k2
    const x_k2 = x + 0.5 * dt * k1.dxdt;
    const y_k2 = y + 0.5 * dt * k1.dydt;
    const k2 = derivatives(x_k2, y_k2, alpha, beta, delta, gamma);

    // k3
    const x_k3 = x + 0.5 * dt * k2.dxdt;
    const y_k3 = y + 0.5 * dt * k2.dydt;
    const k3 = derivatives(x_k3, y_k3, alpha, beta, delta, gamma);

    // k4
    const x_k4 = x + dt * k3.dxdt;
    const y_k4 = y + dt * k3.dydt;
    const k4 = derivatives(x_k4, y_k4, alpha, beta, delta, gamma);

    x += (dt / 6) * (k1.dxdt + 2 * k2.dxdt + 2 * k3.dxdt + k4.dxdt);
    y += (dt / 6) * (k1.dydt + 2 * k2.dydt + 2 * k3.dydt + k4.dydt);
    t += dt;
  }

  return { times, preys, predators, phasePoints };
}

/**
 * Generador con Método de Euler (para evidenciar el error O(h) y la divergencia espiral)
 */
function generateEulerData(alpha = 1.1, beta = 0.4, delta = 0.1, gamma = 0.4, x0 = 10, y0 = 5, tMax = 25, dt = 0.065) {
  const phasePoints = [];
  let x = x0;
  let y = y0;
  let t = 0;

  while (t <= tMax) {
    phasePoints.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
    const { dxdt, dydt } = derivatives(x, y, alpha, beta, delta, gamma);
    x += dt * dxdt;
    y += dt * dydt;
    t += dt;
  }

  return phasePoints;
}

/**
 * Diapositiva 5: Dinámica en el Tiempo (Oscilaciones Acopladas y Desfase)
 */
function renderSlide5Chart() {
  const canvas = document.getElementById('chart-timeseries');
  if (!canvas) return;

  if (chartTimeSeries) {
    chartTimeSeries.destroy();
    chartTimeSeries = null;
  }

  const simData = generateRK4Data(1.1, 0.4, 0.1, 0.4, 10, 5, 25, 0.05);

  const ctx = canvas.getContext('2d');
  chartTimeSeries = new Chart(ctx, {
    type: 'line',
    data: {
      labels: simData.times,
      datasets: [
        {
          label: 'Presas (x) — Liebres',
          data: simData.preys,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
        },
        {
          label: 'Depredadores (y) — Linces',
          data: simData.predators,
          borderColor: '#F43F5E',
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1800,
        easing: 'easeOutQuart'
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#F8FAFC',
            font: { family: 'Space Grotesk', size: 14, weight: '600' },
            boxWidth: 14,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor: '#F8FAFC',
          bodyColor: '#94A3B8',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          bodyFont: { family: 'JetBrains Mono' }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#94A3B8',
            font: { family: 'JetBrains Mono', size: 11 },
            maxTicksLimit: 12,
            callback: (val, idx) => `${simData.times[idx] || ''}s`
          },
          title: {
            display: true,
            text: 'Tiempo transcurrido (t)',
            color: '#64748B',
            font: { family: 'Space Grotesk', size: 12 }
          }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#94A3B8',
            font: { family: 'JetBrains Mono', size: 11 }
          },
          title: {
            display: true,
            text: 'Densidad Poblacional',
            color: '#64748B',
            font: { family: 'Space Grotesk', size: 12 }
          }
        }
      }
    }
  });
}

/**
 * Diapositiva 7: Retrato de Fase (Órbitas Cerradas y Punto de Equilibrio E1)
 */
function renderSlide7Chart() {
  const canvas = document.getElementById('chart-phase');
  if (!canvas) return;

  if (chartPhasePortrait) {
    chartPhasePortrait.destroy();
    chartPhasePortrait = null;
  }

  // Generamos múltiples órbitas para enriquecer el retrato de fase
  const orbit1 = generateRK4Data(1.1, 0.4, 0.1, 0.4, 8, 4, 30, 0.03).phasePoints;
  const orbit2 = generateRK4Data(1.1, 0.4, 0.1, 0.4, 12, 6, 30, 0.03).phasePoints;
  const orbit3 = generateRK4Data(1.1, 0.4, 0.1, 0.4, 6, 2, 30, 0.03).phasePoints;

  // Punto E1 = (gamma/delta, alpha/beta) = (0.4/0.1, 1.1/0.4) = (4.0, 2.75)
  const e1Point = [{ x: 4.0, y: 2.75 }];

  const ctx = canvas.getContext('2d');
  chartPhasePortrait = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Órbita Principal',
          data: orbit1,
          showLine: true,
          borderColor: '#10B981',
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.1
        },
        {
          label: 'Órbita Externa',
          data: orbit2,
          showLine: true,
          borderColor: 'rgba(56, 189, 248, 0.7)',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.1
        },
        {
          label: 'Órbita Interna',
          data: orbit3,
          showLine: true,
          borderColor: 'rgba(244, 63, 94, 0.65)',
          borderWidth: 1.5,
          borderDash: [3, 3],
          pointRadius: 0,
          tension: 0.1
        },
        {
          label: 'Equilibrio E1 (4.0, 2.75)',
          data: e1Point,
          showLine: false,
          pointBackgroundColor: '#F59E0B',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 7,
          pointHoverRadius: 10
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 2000,
        easing: 'easeInOutCubic'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#F8FAFC',
            font: { family: 'Space Grotesk', size: 12 },
            boxWidth: 10,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor: '#F8FAFC',
          bodyColor: '#94A3B8',
          bodyFont: { family: 'JetBrains Mono' },
          callbacks: {
            label: (ctx) => `Presas: ${ctx.parsed.x} | Depredadores: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94A3B8', font: { family: 'JetBrains Mono', size: 11 } },
          title: {
            display: true,
            text: 'Población de Presas (x)',
            color: '#10B981',
            font: { family: 'Space Grotesk', size: 13, weight: 'bold' }
          }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94A3B8', font: { family: 'JetBrains Mono', size: 11 } },
          title: {
            display: true,
            text: 'Población de Depredadores (y)',
            color: '#F43F5E',
            font: { family: 'Space Grotesk', size: 13, weight: 'bold' }
          }
        }
      }
    }
  });
}

/**
 * Diapositiva 8: Comparativa de Métodos (Euler Divergente vs RK4 Estable)
 */
function renderSlide8Charts() {
  const canvasEuler = document.getElementById('chart-euler');
  const canvasRK4 = document.getElementById('chart-rk4');

  if (canvasEuler) {
    if (chartEuler) chartEuler.destroy();
    const dataEuler = generateEulerData(1.1, 0.4, 0.1, 0.4, 8, 4, 30, 0.08);

    chartEuler = new Chart(canvasEuler.getContext('2d'), {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Euler — Espiral Divergente',
          data: dataEuler,
          showLine: true,
          borderColor: '#F43F5E',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1600, easing: 'easeOutQuad' },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: '#F1F5F9' },
            ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 9 } }
          },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 9 } }
          }
        }
      }
    });
  }

  if (canvasRK4) {
    if (chartRK4) chartRK4.destroy();
    const dataRK4 = generateRK4Data(1.1, 0.4, 0.1, 0.4, 8, 4, 30, 0.04).phasePoints;

    chartRK4 = new Chart(canvasRK4.getContext('2d'), {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'RK4 — Órbita Conservativa',
          data: dataRK4,
          showLine: true,
          borderColor: '#10B981',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1600, easing: 'easeOutQuad' },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: '#F1F5F9' },
            ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 9 } }
          },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 9 } }
          }
        }
      }
    });
  }
}

/**
 * Despachador de renderizado según la diapositiva activa
 */
export function triggerChartAnimation(slideIndex) {
  // Las diapositivas son 1-indexadas (1 a 10)
  if (slideIndex === 5) {
    setTimeout(renderSlide5Chart, 100);
  } else if (slideIndex === 7) {
    setTimeout(renderSlide7Chart, 100);
  } else if (slideIndex === 8) {
    setTimeout(renderSlide8Charts, 100);
  }
}
