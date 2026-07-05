/**
 * CONFIGURACIÓN CENTRALIZADA DEL SIMULADOR
 * Propuesta por el Integrante 4 (QA & Integración)
 */
const SimuladorConfig = {
    // Selectores del DOM basados en el contrato de IDs
    selectores: {
        inputs: {
            frecuencia: '#frecuencia-input',
            voltaje: '#voltaje-input',
            condensador: '#condensador-input',
            resistencia: '#resistencia-input'
        },
        botones: {
            iniciar: '#btn-iniciar',
            pausar: '#btn-pausar',
            reiniciar: '#btn-reiniciar'
        },
        componentes: {
            diodos: ['#diodo-1', '#diodo-2', '#diodo-3', '#diodo-4'],
            secundario: '#transformador-secundario',
            condensador: '#condensador-visual',
            resistencia: '#resistencia-visual',
            canvasGrafica: '#grafica-ondas' // ID oficial para tu canvas
        }
    },
    // Reglas estrictas de evaluación del Profesor
    reglasEvaluacion: {
        tiempoMinimoSemicicloMs: 1000, // Cada semiciclo DEBE durar mínimo 1s en pantalla
        estadoDiodos: {
            semicicloPositivo: { encendidos: [0, 3], apagados: [1, 2] }, // D1 y D4 activos
            semicicloNegativo: { encendidos: [1, 2], apagados: [0, 3] }  // D2 y D3 activos
        }
    }
};

// Objeto global para almacenar el estado actual de la simulación en tiempo real
let EstadoSimulacion = {
    corriendo: false,
    frecuenciaUsuario: 60,   // Hz introducidos por el usuario
    voltajeUsuario: 12,      // Voltios introducidos
    condensadorUF: 1000,     // µF introducidos
    resistenciaKOhm: 1,      // kΩ introducidos
    semicicloActual: 'positivo', // 'positivo' o 'negativo'
    tiempoTranscurridoVisual: 0   // Reloj ralentizado interno
};

const DIODE_DROP = 0.7; // Caída de tensión del diodo de silicio (0.7V)

/**
 * Lee los valores actuales de los inputs del usuario (contrato de IDs)
 * y actualiza EstadoSimulacion. Es el puente entre el panel de
 * controles (Integrante 1) y el motor de animación/gráficas.
 * Si un campo está vacío o es inválido, se conserva el último valor válido.
 */
function leerValoresUsuario() {
    const inputs = SimuladorConfig.selectores.inputs;

    const frecuenciaEl = document.querySelector(inputs.frecuencia);
    const voltajeEl = document.querySelector(inputs.voltaje);
    const condensadorEl = document.querySelector(inputs.condensador);
    const resistenciaEl = document.querySelector(inputs.resistencia);

    const frecuencia = frecuenciaEl ? parseFloat(frecuenciaEl.value) : NaN;
    const voltaje = voltajeEl ? parseFloat(voltajeEl.value) : NaN;
    const condensador = condensadorEl ? parseFloat(condensadorEl.value) : NaN;
    const resistencia = resistenciaEl ? parseFloat(resistenciaEl.value) : NaN;

    if (!isNaN(frecuencia) && frecuencia > 0) EstadoSimulacion.frecuenciaUsuario = frecuencia;
    if (!isNaN(voltaje) && voltaje >= 0) EstadoSimulacion.voltajeUsuario = voltaje;
    if (!isNaN(condensador) && condensador > 0) EstadoSimulacion.condensadorUF = condensador;
    if (!isNaN(resistencia) && resistencia > 0) EstadoSimulacion.resistenciaKOhm = resistencia;

    return EstadoSimulacion;
}

// --- MOTOR MATEMÁTICO ---

// Función para generar los datos de la onda de entrada (2 periodos completos)
function generarOndaEntrada(voltajePico, frecuencia, puntos = 200) {
    let datos = [];
    let etiquetas = [];
    let tiempos = [];
    let periodo = 1 / frecuencia;

    for (let i = 0; i <= puntos; i++) {
        let t = (i / puntos) * (2 * periodo);
        let v = voltajePico * Math.sin(2 * Math.PI * frecuencia * t);

        tiempos.push(t);
        datos.push(v);
        etiquetas.push((t * 1000).toFixed(2)); // etiqueta en milisegundos
    }
    return { etiquetas, datos, tiempos, periodo };
}

// Función para la onda rectificada (Onda completa, antes del filtro)
function generarOndaRectificada(voltajePico, frecuencia, puntos = 200) {
    let base = generarOndaEntrada(voltajePico, frecuencia, puntos);
    let datos = [];

    for (let i = 0; i < base.datos.length; i++) {
        let v_rect = Math.abs(base.datos[i]) - (2 * DIODE_DROP);
        datos.push(v_rect > 0 ? v_rect : 0);
    }
    return datos;
}

/**
 * Simula el filtro capacitivo (condensador en paralelo a la carga).
 * Modelo: si la onda rectificada supera el voltaje actual del
 * condensador, el diodo conduce y el condensador se carga casi
 * instantáneamente. Si no, el diodo queda en corte y el condensador
 * se descarga exponencialmente sobre la resistencia (constante RC).
 */
function generarOndaFiltrada(tiempos, datosRectificados, resistenciaOhm, capacitanciaFaradios) {
    const datos = [];
    const tau = resistenciaOhm * capacitanciaFaradios; // constante de tiempo RC
    let vCap = datosRectificados[0] || 0;

    for (let i = 0; i < datosRectificados.length; i++) {
        const vRect = datosRectificados[i];

        if (i === 0) {
            vCap = vRect;
        } else if (vRect >= vCap) {
            vCap = vRect; // diodo conduciendo: carga instantánea
        } else if (tau > 0) {
            const dt = tiempos[i] - tiempos[i - 1];
            vCap = vCap * Math.exp(-dt / tau); // diodo en corte: descarga RC
        }

        datos.push(vCap);
    }
    return datos;
}

/**
 * Calcula las métricas de salida (Vdc, ripple, corriente, potencia)
 * a partir de la onda ya filtrada por el condensador.
 */
function calcularMetricasSalida(datosFiltrados, resistenciaOhm) {
    const vMax = Math.max.apply(null, datosFiltrados);
    const vMin = Math.min.apply(null, datosFiltrados);
    const vRipplePP = vMax - vMin;
    const vPromedio = (vMax + vMin) / 2;
    const ripplePorcentaje = vPromedio > 0 ? (vRipplePP / vPromedio) * 100 : 0;
    const corrienteA = resistenciaOhm > 0 ? vPromedio / resistenciaOhm : 0;
    const potenciaW = vPromedio * corrienteA;

    return {
        voltajeSalida: vPromedio,
        rippleVpp: vRipplePP,
        ripplePorcentaje: ripplePorcentaje,
        corriente_mA: corrienteA * 1000,
        potencia_mW: potenciaW * 1000
    };
}

// Función para calcular los parámetros instantáneos al pasar el ratón (Hover)
function calcularEstadoComponente(voltajeFuente, resistenciaCarga) {
    let voltajeDespuesDeDiodos = voltajeFuente - (2 * DIODE_DROP);
    let corrienteInst = voltajeDespuesDeDiodos > 0 ? (voltajeDespuesDeDiodos / resistenciaCarga) : 0;
    let potenciaDiodo = DIODE_DROP * corrienteInst;

    return {
        corriente_mA: (corrienteInst * 1000).toFixed(2),
        voltaje_Diodo_V: DIODE_DROP,
        potencia_mW: (potenciaDiodo * 1000).toFixed(2)
    };
}
