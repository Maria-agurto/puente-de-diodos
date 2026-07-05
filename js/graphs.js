// graphs.js

let chartInstancia = null;

function inicializarGrafica(voltajePico, frecuencia) {
    const ctx = document.getElementById('miGrafica').getContext('2d');
    
    // Llamamos a tu motor matemático
    const datosEntrada = generarOndaEntrada(voltajePico, frecuencia);
    const datosRectificados = generarOndaRectificada(voltajePico, frecuencia);

    if (chartInstancia) {
        chartInstancia.destroy(); // Destruimos la gráfica anterior si existe
    }

    chartInstancia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datosEntrada.etiquetas,
            datasets: [
                {
                    label: 'Onda de Entrada (V)',
                    data: datosEntrada.datos,
                    borderColor: 'rgba(56, 189, 248, 1)', // Azul claro
                    borderWidth: 2,
                    tension: 0.4, // Suaviza la curva
                    pointRadius: 0
                },
                {
                    label: 'Onda Rectificada (V)',
                    data: datosRectificados,
                    borderColor: 'rgba(34, 197, 94, 1)', // Verde
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Tiempo (s)', color: '#fff' } },
                y: { title: { display: true, text: 'Voltaje (V)', color: '#fff' } }
            }
        }
    });
}