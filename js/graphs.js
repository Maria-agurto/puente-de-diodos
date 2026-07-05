/**
 * ============================================================
 *  GRAPHS.JS - Gráficas en tiempo real + Tooltips dinámicos
 *  Proyecto: Simulador de Rectificación Web
 * ------------------------------------------------------------
 *  Este módulo consume:
 *   - SimuladorConfig / EstadoSimulacion (definidos en calculations.js)
 *   - generarOndaEntrada / generarOndaRectificada / generarOndaFiltrada
 *     / calcularMetricasSalida / calcularEstadoComponente (calculations.js)
 *   - El evento personalizado 'semicicloCambio' emitido por animation.js
 *
 *  Cumple las reglas estrictas de evaluación del profesor:
 *   - "Sincronía Total": un marcador vertical sobre la gráfica se
 *     mueve exactamente cuando cambian los diodos activos.
 * ============================================================
 */

let chartInstancia = null;
let ultimasMetricas = null;

// --- Estado del "barrido" en vivo de la gráfica (estilo osciloscopio) ---
// La onda no se queda fija: su fase avanza con el mismo reloj lento que ya
// usa animation.js para los semiciclos (1s por semiciclo == PI rad / 1000ms),
// así que la velocidad de la onda en pantalla NO depende de la frecuencia
// que escribe el usuario (esa regla es la misma que ya rige el semáforo de
// diodos), solo su FORMA (cuántos ciclos caben en la ventana) depende de ella.
let faseAcumuladaRad = 0;
let ultimoTsGrafica = null;

// Plugin propio de Chart.js: dibuja una línea vertical que indica
// en qué punto del ciclo está la animación en este instante.
const PLUGIN_MARCADOR_SEMICICLO = {
    id: 'marcadorSemiciclo',
    afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea || typeof chart.$marcadorX !== 'number') return;

        const x = scales.x.getPixelForValue(chart.$marcadorX);
        if (Number.isNaN(x)) return;

        ctx.save();
        ctx.strokeStyle = chart.$marcadorColor || 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.restore();
    }
};

/**
 * (Re)genera la gráfica de Entrada / Rectificada / Filtrada a partir
 * del estado actual (frecuencia, voltaje, C y R introducidos por el
 * usuario), y actualiza el panel de información numérica.
 */
function inicializarGrafica(estado) {
    const idCanvas = (typeof SimuladorConfig !== 'undefined')
        ? SimuladorConfig.selectores.componentes.canvasGrafica.replace('#', '')
        : 'grafica-ondas';

    const canvas = document.getElementById(idCanvas);
    if (!canvas || typeof Chart === 'undefined') {
        console.error('[graphs.js] No se encontró el canvas o Chart.js no está cargado.');
        return null;
    }

    // Cada (re)dibujo completo arranca el barrido desde fase 0.
    faseAcumuladaRad = 0;
    ultimoTsGrafica = null;

    const voltajePico = estado.voltajeUsuario;
    const frecuencia = estado.frecuenciaUsuario;
    const resistenciaOhm = estado.resistenciaKOhm * 1000;
    const capacitanciaFaradios = estado.condensadorUF * 1e-6;

    const entrada = generarOndaEntrada(voltajePico, frecuencia);
    const rectificada = generarOndaRectificada(voltajePico, frecuencia);
    const filtrada = generarOndaFiltrada(entrada.tiempos, rectificada, resistenciaOhm, capacitanciaFaradios);

    // Las métricas (Vdc, ripple) se calculan solo sobre el 2do periodo
    // simulado, para no contaminar el resultado con el arranque en frío
    // del condensador (que parte descargado en t=0).
    const mitad = Math.floor(filtrada.length / 2);
    ultimasMetricas = calcularMetricasSalida(filtrada.slice(mitad), resistenciaOhm);

    // Puntos {x,y} en milisegundos para poder usar un eje X numérico
    // (necesario para posicionar el marcador de sincronía con precisión).
    const puntos = (serie) => puntosDesdeSerie(entrada.tiempos, serie);

    if (chartInstancia) {
        chartInstancia.destroy();
    }

    if (Chart.registry && !Chart.registry.plugins.get('marcadorSemiciclo')) {
        Chart.register(PLUGIN_MARCADOR_SEMICICLO);
    }

    const ctx = canvas.getContext('2d');
    chartInstancia = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Onda de Entrada (V)',
                    data: puntos(entrada.datos),
                    borderColor: 'rgba(56, 189, 248, 1)',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 0
                },
                {
                    label: 'Onda Rectificada (V)',
                    data: puntos(rectificada),
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 2,
                    tension: 0.15,
                    pointRadius: 0
                },
                {
                    label: 'Onda Filtrada / Salida (V)',
                    data: puntos(filtrada),
                    borderColor: 'rgba(197, 150, 26, 1)',
                    borderWidth: 2,
                    borderDash: [6, 3],
                    tension: 0.05,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#c3cfe6' } }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Tiempo (ms)', color: '#c3cfe6' },
                    ticks: { color: '#7f8db3', maxTicksLimit: 10 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    title: { display: true, text: 'Voltaje (V)', color: '#c3cfe6' },
                    ticks: { color: '#7f8db3' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        },
        plugins: [PLUGIN_MARCADOR_SEMICICLO]
    });

    sincronizarMarcador(estado.semicicloActual || 'positivo', frecuencia);
    actualizarPanelInformacion(estado, ultimasMetricas);

    return chartInstancia;
}

/**
 * Convierte una serie de valores a puntos {x,y} en milisegundos, listos
 * para Chart.js (eje X numérico, necesario para el marcador de sincronía).
 */
function puntosDesdeSerie(tiempos, serie) {
    return tiempos.map((t, i) => ({ x: t * 1000, y: serie[i] }));
}

/**
 * Recalcula únicamente las 3 ondas (con la fase acumulada actual) y las
 * vuelca en el chart ya existente, sin reconstruirlo — así el "barrido"
 * es fluido y barato en cada frame.
 */
function actualizarOndaEnMovimiento() {
    if (!chartInstancia) return;

    const estado = EstadoSimulacion;
    const voltajePico = estado.voltajeUsuario;
    const frecuencia = estado.frecuenciaUsuario;
    const resistenciaOhm = estado.resistenciaKOhm * 1000;
    const capacitanciaFaradios = estado.condensadorUF * 1e-6;

    const entrada = generarOndaEntrada(voltajePico, frecuencia, 200, faseAcumuladaRad);
    const rectificada = generarOndaRectificada(voltajePico, frecuencia, 200, faseAcumuladaRad);
    const filtrada = generarOndaFiltrada(entrada.tiempos, rectificada, resistenciaOhm, capacitanciaFaradios);

    const mitad = Math.floor(filtrada.length / 2);
    ultimasMetricas = calcularMetricasSalida(filtrada.slice(mitad), resistenciaOhm);

    chartInstancia.data.datasets[0].data = puntosDesdeSerie(entrada.tiempos, entrada.datos);
    chartInstancia.data.datasets[1].data = puntosDesdeSerie(entrada.tiempos, rectificada);
    chartInstancia.data.datasets[2].data = puntosDesdeSerie(entrada.tiempos, filtrada);
    chartInstancia.update('none'); // 'none' = sin animación propia de Chart.js (nosotros ya controlamos el movimiento)

    actualizarPanelInformacion(estado, ultimasMetricas);
}

/**
 * Bucle propio (independiente del de animation.js) que hace avanzar la
 * fase de la onda mientras la simulación está corriendo. Usa el MISMO
 * reloj lento (tiempoMinimoSemicicloMs) que ya obliga a que cada semiciclo
 * dure 1s, así que la gráfica y el semáforo de diodos quedan sincronizados
 * en velocidad, sin depender del reloj real del navegador más que para
 * medir el delta de cada frame.
 */
function bucleGrafica(timestampActual) {
    if (EstadoSimulacion.corriendo) {
        if (ultimoTsGrafica === null) {
            ultimoTsGrafica = timestampActual;
        }
        const deltaMs = timestampActual - ultimoTsGrafica;
        ultimoTsGrafica = timestampActual;

        const tiempoSemicicloMs = (typeof SimuladorConfig !== 'undefined' && SimuladorConfig.reglasEvaluacion)
            ? SimuladorConfig.reglasEvaluacion.tiempoMinimoSemicicloMs
            : 1000;

        // Medio periodo (PI rad) debe tardar exactamente tiempoSemicicloMs.
        faseAcumuladaRad += (Math.PI / tiempoSemicicloMs) * deltaMs;

        actualizarOndaEnMovimiento();
    } else {
        ultimoTsGrafica = null; // evita un salto de fase al reanudar
    }
    requestAnimationFrame(bucleGrafica);
}

/**
 * Mueve el marcador vertical de la gráfica al punto del semiciclo
 * activo. Se llama automáticamente cada vez que animation.js dispara
 * 'semicicloCambio', garantizando la sincronía diodos <-> gráfica.
 */
function sincronizarMarcador(semiciclo, frecuencia) {
    if (!chartInstancia || !frecuencia) return;

    const periodoMs = (1 / frecuencia) * 1000;
    const posicionMs = semiciclo === 'positivo'
        ? periodoMs / 4
        : periodoMs + periodoMs / 4;

    chartInstancia.$marcadorX = posicionMs;
    chartInstancia.$marcadorColor = semiciclo === 'positivo'
        ? 'rgba(34,197,94,0.9)'   // verde: D1-D4 activos
        : 'rgba(251,191,36,0.9)'; // ámbar: D2-D3 activos

    chartInstancia.update('none'); // sin animación, para no desfasar el instante
}

/**
 * Actualiza los valores numéricos del panel derecho (Información del
 * Sistema) en tiempo real con los resultados del cálculo.
 */
function actualizarPanelInformacion(estado, metricas) {
    const periodoMs = (1 / estado.frecuenciaUsuario) * 1000;

    escribirValor('info-frecuencia', estado.frecuenciaUsuario.toFixed(2));
    escribirValor('info-periodo', periodoMs.toFixed(2));
    escribirValor('info-voltaje-entrada', estado.voltajeUsuario.toFixed(2));
    escribirValor('info-voltaje-salida', metricas.voltajeSalida.toFixed(2));
    escribirValor('info-ripple', metricas.ripplePorcentaje.toFixed(2));
    escribirValor('info-corriente', metricas.corriente_mA.toFixed(2));
    escribirValor('info-potencia', metricas.potencia_mW.toFixed(2));
}

function escribirValor(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

// ------------------------------------------------------------
// TOOLTIPS DINÁMICOS (hover sobre diodos y componentes)
// ------------------------------------------------------------

function inicializarTooltips() {
    const tooltip = document.getElementById('tooltip-dinamico');
    if (!tooltip) return;

    const elementos = document.querySelectorAll('.diode, .component');

    elementos.forEach(function (el) {
        el.addEventListener('mouseenter', function () {
            tooltip.innerHTML = contenidoTooltip(el.dataset.component);
            tooltip.classList.add('visible');
        });
        el.addEventListener('mousemove', function (e) {
            tooltip.style.left = e.clientX + 'px';
            tooltip.style.top = e.clientY + 'px';
        });
        el.addEventListener('mouseleave', function () {
            tooltip.classList.remove('visible');
        });
    });
}

function contenidoTooltip(componente) {
    const resistenciaOhm = (EstadoSimulacion.resistenciaKOhm || 1) * 1000;
    const estadoDiodo = calcularEstadoComponente(EstadoSimulacion.voltajeUsuario, resistenciaOhm);
    const metricas = ultimasMetricas || calcularMetricasSalida([0], resistenciaOhm);

    switch (componente) {
        case 'diodo-1':
        case 'diodo-2':
        case 'diodo-3':
        case 'diodo-4':
            return '<strong>' + componente.toUpperCase() + '</strong><br>' +
                'I: ' + estadoDiodo.corriente_mA + ' mA<br>' +
                'Vd: ' + estadoDiodo.voltaje_Diodo_V + ' V<br>' +
                'P: ' + estadoDiodo.potencia_mW + ' mW';
        case 'transformador':
            return '<strong>Transformador</strong><br>' +
                'Vp entrada: ' + EstadoSimulacion.voltajeUsuario + ' V<br>' +
                'f: ' + EstadoSimulacion.frecuenciaUsuario + ' Hz';
        case 'condensador':
            return '<strong>Condensador</strong><br>' +
                'C: ' + EstadoSimulacion.condensadorUF + ' &micro;F<br>' +
                'Ripple: ' + metricas.ripplePorcentaje.toFixed(2) + ' %';
        case 'resistencia':
            return '<strong>Resistencia de Carga</strong><br>' +
                'Vout: ' + metricas.voltajeSalida.toFixed(2) + ' V<br>' +
                'I: ' + metricas.corriente_mA.toFixed(2) + ' mA<br>' +
                'P: ' + metricas.potencia_mW.toFixed(2) + ' mW';
        default:
            return '<strong>' + componente + '</strong>';
    }
}

// ------------------------------------------------------------
// Escucha de eventos y arranque
// ------------------------------------------------------------

document.addEventListener('semicicloCambio', function (e) {
    sincronizarMarcador(e.detail.semiciclo, e.detail.frecuenciaUsuario);
});

document.addEventListener('DOMContentLoaded', inicializarTooltips);
document.addEventListener('DOMContentLoaded', function () {
    // El bucle vive todo el tiempo; internamente solo avanza la fase
    // mientras EstadoSimulacion.corriendo === true (ver bucleGrafica).
    requestAnimationFrame(bucleGrafica);
});

// API pública para que animation.js dispare el (re)dibujo al
// presionar "Iniciar" o "Reiniciar", con los valores más recientes.
window.GraficasSimulador = {
    iniciar: inicializarGrafica,
    sincronizarMarcador: sincronizarMarcador
};
