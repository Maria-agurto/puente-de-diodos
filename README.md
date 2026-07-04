# Simulador de Rectificación Web

### Proyecto de Física Electrónica — III Ciclo | Ingeniería de Software

![Status](https://img.shields.io/badge/status-en%20desarrollo-yellow)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?logo=chartdotjs&logoColor=white)

---

## Descripción General

El **Simulador de Rectificación Web** es una herramienta interactiva y educativa que permite visualizar, en tiempo real, el comportamiento de un **puente rectificador de onda completa** compuesto por 4 diodos en configuración de rombo, un transformador, un condensador de filtro y una resistencia de carga.

El objetivo es que el usuario pueda **observar de forma clara y didáctica** cómo la corriente alterna (AC) se transforma en corriente continua (DC), identificando visualmente:

- 🔀 La conmutación de los diodos según el semiciclo activo.
- 🌊 El flujo de corriente a través del circuito.
- 📈 Las gráficas de voltaje/corriente en tiempo real.

### Arquitectura

El proyecto está construido con una arquitectura **frontend ligera**, sin frameworks ni backend:

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura y layout del circuito |
| CSS3 | Estilos, animaciones y diseño responsivo |
| Vanilla JavaScript | Lógica de simulación, cálculos y animación DOM |
| Chart.js | Graficación en tiempo real de las señales |

> **Cero instalaciones necesarias.** El simulador se ejecuta directamente en el navegador, sin necesidad de servidores, dependencias ni configuraciones adicionales.

---

## Estructura del Repositorio

```
Puente-Rectificador/
├── index.html
├── README.md
├── css/
│   └── style.css
└── js/
    ├── animation.js
    ├── graphs.js
    └── calculations.js
```

---

## Distribución de Roles del Equipo

| Integrante | Rol | Responsabilidades |
|---|---|---|
| **Integrante 1** | Interfaz y Estructura (UI/UX) | Desarrollo de `index.html`, diseño del layout del circuito y construcción del panel de controles del usuario. |
| **Integrante 2** | Motor de Animación (DOM) | Desarrollo de `animation.js`: semáforo visual de diodos activos, animación del flujo de corriente y gestión del tiempo ralentizado (slow-motion). |
| **Integrante 3** | Matemáticas, Gráficas e Interactividad | Desarrollo de `graphs.js` y `calculations.js`: cálculos eléctricos del circuito, gráficas en tiempo real con Chart.js y tooltips dinámicos. |
| **Integrante 4** | Integración, QA y Liderazgo | Unificación del código de todo el equipo, pruebas de control de calidad (QA), coordinación general y documentación del proyecto. |

---

## Instrucciones de Ejecución

Este proyecto **no requiere instalación, dependencias ni servidor**. Para ejecutarlo:

1. **Clonar o descargar** el repositorio:
   ```bash
   git clone https://github.com/usuario/Puente-Rectificador.git
   ```
   O simplemente descargar el `.zip` y descomprimirlo.

2. **Abrir la carpeta** `Puente-Rectificador/`.

3. **Hacer doble clic** en el archivo `index.html`.

4. ¡Listo! El simulador se abrirá automáticamente en tu navegador predeterminado.

> Compatible con cualquier navegador web moderno: **Chrome, Edge o Firefox**.

---

## Características Clave y Reglas de Simulación

Estos son los criterios técnicos que el simulador garantiza para cumplir con los objetivos de evaluación del curso:

### Escalado de Tiempo (Slow-Motion)
La simulación visual se ejecuta de forma **ralentizada**, respetando un mínimo de **1 segundo por semiciclo**, independientemente de la frecuencia configurada por el usuario. Esto asegura que el fenómeno sea **siempre visible y comprensible** para el observador.

### Alternancia de Polaridad Visible
El secundario del transformador muestra de forma clara y visual el **cambio de polaridad** entre semiciclos, permitiendo identificar el sentido de la corriente en cada instante.

### Sincronía Total
Existe una **sincronización perfecta** entre:
- Los diodos activos en cada momento,
- El semiciclo que se está visualizando,
- Y las gráficas en tiempo real generadas con Chart.js.

Esto garantiza que lo que el usuario ve en la animación **coincide exactamente** con lo que se representa en los datos graficados.

---

## Estado del Proyecto

- [x] Estructura base del repositorio
- [ ] Interfaz y controles (Integrante 1)
- [ ] Motor de animación (Integrante 2)
- [ ] Cálculos y gráficas (Integrante 3)
- [ ] Integración final y QA (Integrante 4)

---

<p align="center">
  Proyecto académico desarrollado para el curso de <b>Física Electrónica</b> — III Ciclo, Ingeniería de Software.
</p>
