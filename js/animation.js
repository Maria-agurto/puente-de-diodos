/**
 * ============================================================
 *  ANIMATION.JS - Motor de Animación (DOM)
 *  Proyecto: Simulador de Rectificación Web
 * ------------------------------------------------------------
 *  Este módulo consume:
 *   - SimuladorConfig  (definido en config.js / calculations.js)
 *   - EstadoSimulacion (definido en config.js / calculations.js)
 *
 *  Cumple las reglas estrictas de evaluación del profesor:
 *   1) Cada semiciclo dura como mínimo 1000ms (slow-motion),
 *      independientemente de la frecuencia real ingresada.
 *   2) El secundario del transformador alterna polaridad de forma
 *      visible (1s arriba / 1s abajo).
 *   3) Los diodos correctos se encienden en sincronía con la
 *      alternancia, y se emite un evento para que graphs.js
 *      dibuje la onda correspondiente al mismo tiempo.
 * ============================================================
 */

(function () {
    'use strict';

    // --- Verificación de dependencias del contrato ---
    if (typeof SimuladorConfig === 'undefined' || typeof EstadoSimulacion === 'undefined') {
        console.error('[animation.js] Error: SimuladorConfig o EstadoSimulacion no están definidos. ' +
            'Verifica que config.js/calculations.js se cargue ANTES que animation.js en el index.html.');
        return;
    }

    const selectores = SimuladorConfig.selectores;
    const reglas = SimuladorConfig.reglasEvaluacion;

    // --- Referencias a elementos del DOM (según diccionario de IDs del contrato) ---
    const diodosEls = selectores.componentes.diodos.map(function (sel) {
        return document.querySelector(sel);
    });
    const secundarioEl = document.querySelector(selectores.componentes.secundario);
    const condensadorEl = document.querySelector(selectores.componentes.condensador);
    const resistenciaEl = document.querySelector(selectores.componentes.resistencia);

    const btnIniciar = document.querySelector(selectores.botones.iniciar);
    const btnPausar = document.querySelector(selectores.botones.pausar);
    const btnReiniciar = document.querySelector(selectores.botones.reiniciar);

    // --- Constantes de tiempo (regla estricta: mínimo 1000ms por semiciclo) ---
    const TIEMPO_SEMICICLO_MS = reglas.tiempoMinimoSemicicloMs || 1000;
    const ESTADO_DIODOS = reglas.estadoDiodos;

    // --- Variables internas del reloj ralentizado (NO usa tiempo real del navegador) ---
    let ultimoTimestamp = null;
    let rafId = null;

    /**
     * Enciende/apaga los diodos correspondientes según el semiciclo actual,
     * usando la clase .diodo-activo definida por Integrante 1 en el CSS.
     */
    function encenderDiodos(nombreSemiciclo) {
        const regla = nombreSemiciclo === 'positivo'
            ? ESTADO_DIODOS.semicicloPositivo
            : ESTADO_DIODOS.semicicloNegativo;

        diodosEls.forEach(function (el, idx) {
            if (!el) return;
            if (regla.encendidos.indexOf(idx) !== -1) {
                el.classList.add('diodo-activo');
            } else {
                el.classList.remove('diodo-activo');
            }
        });
    }

    /**
     * Anima la alternancia visible de polaridad en el secundario del transformador.
     * Integrante 1 debe definir en el CSS las clases:
     *   .polaridad-positiva  -> ej. desplazamiento/color hacia arriba
     *   .polaridad-negativa  -> ej. desplazamiento/color hacia abajo
     */
    function animarSecundario(nombreSemiciclo) {
        if (!secundarioEl) return;
        secundarioEl.classList.toggle('polaridad-positiva', nombreSemiciclo === 'positivo');
        secundarioEl.classList.toggle('polaridad-negativa', nombreSemiciclo === 'negativo');
    }

    /**
     * Efecto visual simple de carga/descarga del condensador.
     * Requiere la clase .condensador-cargando (CSS de Integrante 1, opcional).
     */
    function animarCondensador(nombreSemiciclo) {
        if (!condensadorEl) return;
        condensadorEl.classList.toggle('condensador-cargando', nombreSemiciclo === 'positivo');
    }

    /**
     * Efecto visual simple de "flujo de corriente" sobre la resistencia,
     * activo mientras la simulación corre.
     */
    function animarFlujoCorriente(activo) {
        if (!resistenciaEl) return;
        resistenciaEl.classList.toggle('flujo-activo', activo);
    }

    /**
     * Emite un evento personalizado para que graphs.js (Integrante 3)
     * dibuje la cresta de la onda correcta en el mismo instante en que
     * cambian las luces de los diodos. Así se garantiza la "Sincronía Total".
     */
    function notificarCambioSemiciclo(nombreSemiciclo) {
        document.dispatchEvent(new CustomEvent('semicicloCambio', {
            detail: {
                semiciclo: nombreSemiciclo,
                frecuenciaUsuario: EstadoSimulacion.frecuenciaUsuario,
                voltajeUsuario: EstadoSimulacion.voltajeUsuario
            }
        }));
    }

    /**
     * Cambia el semiciclo activo en EstadoSimulacion (fuente única de verdad)
     * y dispara todas las actualizaciones visuales correspondientes.
     */
    function cambiarSemiciclo() {
        EstadoSimulacion.semicicloActual =
            EstadoSimulacion.semicicloActual === 'positivo' ? 'negativo' : 'positivo';

        encenderDiodos(EstadoSimulacion.semicicloActual);
        animarSecundario(EstadoSimulacion.semicicloActual);
        animarCondensador(EstadoSimulacion.semicicloActual);
        notificarCambioSemiciclo(EstadoSimulacion.semicicloActual);
    }

    /**
     * Bucle principal de animación basado en requestAnimationFrame.
     * IMPORTANTE: el avance del semiciclo se mide con un acumulador propio
     * (tiempoTranscurridoVisual), NO con el reloj real del navegador,
     * cumpliendo así la regla de "reloj ralentizado interno".
     */
    function bucleAnimacion(timestampActual) {
        if (!EstadoSimulacion.corriendo) return;

        if (ultimoTimestamp === null) {
            ultimoTimestamp = timestampActual;
        }

        const delta = timestampActual - ultimoTimestamp;
        ultimoTimestamp = timestampActual;

        EstadoSimulacion.tiempoTranscurridoVisual += delta;

        if (EstadoSimulacion.tiempoTranscurridoVisual >= TIEMPO_SEMICICLO_MS) {
            EstadoSimulacion.tiempoTranscurridoVisual = 0;
            cambiarSemiciclo();
        }

        rafId = requestAnimationFrame(bucleAnimacion);
    }

    // ------------------------------------------------------------
    // Controles: Iniciar / Pausar / Reiniciar
    // ------------------------------------------------------------

    function iniciarSimulacion() {
        if (EstadoSimulacion.corriendo) return;

        // Integración: leer los valores actuales de los inputs y
        // redibujar la gráfica/panel con esos valores antes de animar.
        leerValoresUsuario();
        if (window.GraficasSimulador) {
            window.GraficasSimulador.iniciar(EstadoSimulacion);
        }

        EstadoSimulacion.corriendo = true;
        ultimoTimestamp = null;
        animarFlujoCorriente(true);
        rafId = requestAnimationFrame(bucleAnimacion);
    }

    function pausarSimulacion() {
        EstadoSimulacion.corriendo = false;
        animarFlujoCorriente(false);
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function reiniciarSimulacion() {
        pausarSimulacion();
        EstadoSimulacion.semicicloActual = 'positivo';
        EstadoSimulacion.tiempoTranscurridoVisual = 0;
        ultimoTimestamp = null;

        // Integración: releer inputs (por si el usuario los cambió) y
        // redibujar la gráfica desde cero, sincronizada al inicio del ciclo.
        leerValoresUsuario();
        if (window.GraficasSimulador) {
            window.GraficasSimulador.iniciar(EstadoSimulacion);
        }

        encenderDiodos('positivo');
        animarSecundario('positivo');
        animarCondensador('positivo');
        notificarCambioSemiciclo('positivo');
    }

    // --- Evitar que la rueda del mouse altere los <input type="number">
    //     (comportamiento nativo del navegador: si el input está enfocado
    //     y el usuario hace scroll sobre la página, el valor sube/baja
    //     según el "step" del campo — por eso un 15 podía convertirse
    //     en 15.9 al desplazarse por la página con el campo activo). ---
    Object.values(selectores.inputs).forEach(function (sel) {
        const el = document.querySelector(sel);
        if (!el) return;
        el.addEventListener('wheel', function (e) {
            if (document.activeElement === el) {
                e.preventDefault();
            }
        }, { passive: false });
    });

    // --- Vincular botones según el diccionario de IDs del contrato ---
    if (btnIniciar) btnIniciar.addEventListener('click', iniciarSimulacion);
    if (btnPausar) btnPausar.addEventListener('click', pausarSimulacion);
    if (btnReiniciar) btnReiniciar.addEventListener('click', reiniciarSimulacion);

    // --- Estado visual inicial al cargar la página (antes de presionar "Iniciar") ---
    document.addEventListener('DOMContentLoaded', function () {
        encenderDiodos(EstadoSimulacion.semicicloActual || 'positivo');
        animarSecundario(EstadoSimulacion.semicicloActual || 'positivo');

        // Pre-cargar la gráfica y el panel de información con los
        // valores por defecto de los inputs, para que no se vean vacíos.
        leerValoresUsuario();
        if (window.GraficasSimulador) {
            window.GraficasSimulador.iniciar(EstadoSimulacion);
        }
    });

    // --- API expuesta para depuración o uso desde otros módulos ---
    window.AnimacionSimulador = {
        iniciar: iniciarSimulacion,
        pausar: pausarSimulacion,
        reiniciar: reiniciarSimulacion
    };

})();
