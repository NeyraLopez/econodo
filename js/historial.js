// 📊 HISTORIAL — EcoNodo

// Colores de línea por sensor (consistentes con el dashboard)
const SENSOR_COLORS = {
  temperatura: { border: '#E64A19', background: 'rgba(230,74,25,0.08)' },
  humedad:     { border: '#1565C0', background: 'rgba(21,101,192,0.08)' },
  aire:        { border: '#00695C', background: 'rgba(0,105,92,0.08)'  },
  presion:     { border: '#3949AB', background: 'rgba(57,73,171,0.08)' }
};

// Módulo-nivel: se populan en init() antes de cualquier interacción del usuario
let historial = [];
let graficaTemperatura, graficaHumedad, graficaAire, graficaPresion;
let periodoActivo = 'hoy';

// ─── Sin datos ────────────────────────────────────────────────────────────────
function mostrarSinDatos() {
  const sinDatos = document.getElementById('sin-datos');
  const contenedor = document.querySelector('.contenedor-graficas');
  if (sinDatos) sinDatos.style.display = '';
  if (contenedor) contenedor.style.display = 'none';
}

function ocultarSinDatos() {
  const sinDatos = document.getElementById('sin-datos');
  const contenedor = document.querySelector('.contenedor-graficas');
  if (sinDatos) sinDatos.style.display = 'none';
  if (contenedor) contenedor.style.display = '';
}

// Devuelve la fecha local del dispositivo en formato YYYY-MM-DD
function obtenerFechaLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Convierte una lectura (fecha+hora en UTC de Supabase) a objeto Date UTC correcto
function obtenerDateLectura(d) {
  return new Date(`${d.fecha}T${d.hora}:00Z`);
}

// ─── Filtros de período ───────────────────────────────────────────────────────
function filtrarPorPeriodo(periodo) {
  periodoActivo = periodo;
  const ahora = new Date();
  let filtrados;

  if (periodo === 'hoy') {
    // Compara fecha local de "ahora" contra fecha local de cada lectura
    const hoy = obtenerFechaLocalISO(ahora);
    filtrados = historial.filter(d => obtenerFechaLocalISO(obtenerDateLectura(d)) === hoy);
  } else if (periodo === '7d') {
    const limite = new Date(ahora - 7 * 24 * 60 * 60 * 1000);
    filtrados = historial.filter(d => obtenerDateLectura(d) >= limite);
  } else if (periodo === '30d') {
    const limite = new Date(ahora - 30 * 24 * 60 * 60 * 1000);
    filtrados = historial.filter(d => obtenerDateLectura(d) >= limite);
  } else {
    filtrados = historial;
  }

  if (filtrados.length === 0) {
    mostrarSinDatos();
    return;
  }

  ocultarSinDatos();

  const labelFn = periodo === 'hoy'
    ? d => d.hora
    : d => `${d.fecha.slice(5)} ${d.hora}`;

  actualizarGraficasDatos(filtrados, labelFn);
}

// ─── Crear gráfica ────────────────────────────────────────────────────────────
function crearGrafica(id, label, datos, labels, colorKey) {
  const colores = SENSOR_COLORS[colorKey] || { border: '#2E7D32', background: 'rgba(46,125,50,0.08)' };

  return new Chart(document.getElementById(id), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: datos,
        borderColor: colores.border,
        backgroundColor: colores.background,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: colores.border
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#444', font: { size: 13 } }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#666',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
            font: { size: 11 }
          },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        y: {
          ticks: { color: '#666', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        }
      }
    }
  });
}

// ─── Actualizar gráficas ──────────────────────────────────────────────────────
function actualizarGraficasDatos(datos, callbackLabel) {
  actualizarGraficasCustom(
    datos.map(callbackLabel),
    datos.map(d => d.temperatura),
    datos.map(d => d.humedad),
    datos.map(d => d.aire),
    datos.map(d => d.presion)
  );
}

function actualizarGraficasCustom(labels, temperaturas, humedades, aires, presiones) {
  graficaTemperatura.data.labels = labels;
  graficaTemperatura.data.datasets[0].data = temperaturas;
  graficaTemperatura.update();

  graficaHumedad.data.labels = labels;
  graficaHumedad.data.datasets[0].data = humedades;
  graficaHumedad.update();

  graficaAire.data.labels = labels;
  graficaAire.data.datasets[0].data = aires;
  graficaAire.update();

  graficaPresion.data.labels = labels;
  graficaPresion.data.datasets[0].data = presiones;
  graficaPresion.update();
}

function promedio(array) {
  return (array.reduce((a, b) => a + b, 0) / array.length).toFixed(1);
}

// ─── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  historial = await obtenerHistorial();

  const labels = historial.map(d => d.hora);

  graficaTemperatura = crearGrafica(
    "graficaTemperatura",
    "Temperatura (°C)",
    historial.map(d => d.temperatura),
    labels,
    'temperatura'
  );

  graficaHumedad = crearGrafica(
    "graficaHumedad",
    "Humedad (%)",
    historial.map(d => d.humedad),
    labels,
    'humedad'
  );

  graficaAire = crearGrafica(
    "graficaAire",
    "Calidad del Aire (μg/m³)",
    historial.map(d => d.aire),
    labels,
    'aire'
  );

  graficaPresion = crearGrafica(
    "graficaPresion",
    "Presión (hPa)",
    historial.map(d => d.presion),
    labels,
    'presion'
  );

  // Aplicar filtro inicial (Hoy) después de crear las gráficas
  filtrarPorPeriodo('hoy');
}

// ─── Event listeners ──────────────────────────────────────────────────────────

// Selector de período
document.querySelectorAll('.btn-periodo').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-periodo').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    filtrarPorPeriodo(btn.dataset.periodo);
  });
});

// Mostrar la gráfica de temperatura al cargar
document.getElementById('temperatura').classList.add('activa');

// Selector de gráficas: mostrar solo la seleccionada
document.querySelectorAll('.btn-grafica').forEach(btn => {
  btn.addEventListener('click', () => {
    const objetivo = btn.dataset.grafica;
    document.querySelectorAll('.btn-grafica').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    document.querySelectorAll('.card-grafica').forEach(c => c.classList.remove('activa'));
    document.getElementById(objetivo).classList.add('activa');
  });
});

init();

// Actualizar fecha y hora del header (igual que el dashboard)
function actualizarReloj() {
  const ahora = new Date();
  const elFecha = document.getElementById('fecha');
  const elHora  = document.getElementById('hora');
  if (elFecha) elFecha.textContent = ahora.toLocaleDateString('es-MX');
  if (elHora)  elHora.textContent  = ahora.toLocaleTimeString('es-MX');
}
actualizarReloj();
setInterval(actualizarReloj, 1000);
