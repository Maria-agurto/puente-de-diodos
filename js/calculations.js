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
    semicicloActual: 'positivo', // 'positivo' o 'negativo'
    tiempoTranscurridoVisual: 0   // Reloj ralentizado interno
};

const DIODE_DROP = 0.7; // Caída de tensión del diodo de silicio (0.7V)

// --- MOTOR MATEMÁTICO ---

// Función para generar los datos de la onda de entrada
function generarOndaEntrada(voltajePico, frecuencia, puntos = 100) {
    let datos = [];
    let etiquetas = [];
    let periodo = 1 / frecuencia;
    
    for (let i = 0; i <= puntos; i++) {
        let t = (i / puntos) * (2 * periodo);
        let v = voltajePico * Math.sin(2 * Math.PI * frecuencia * t);
        
        datos.push(v);
        etiquetas.push(t.toFixed(4)); 
    }
    return { etiquetas, datos };
}

// Función para la onda rectificada (Onda completa)
function generarOndaRectificada(voltajePico, frecuencia, puntos = 100) {
    let datos = [];
    let base = generarOndaEntrada(voltajePico, frecuencia, puntos);
    
    for (let i = 0; i < base.datos.length; i++) {
        let v_rect = Math.abs(base.datos[i]) - (2 * DIODE_DROP);
        datos.push(v_rect > 0 ? v_rect : 0); 
    }
    return datos;
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