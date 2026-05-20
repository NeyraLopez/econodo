// 🔴 Estado de alertas activas (evita duplicados)
let alertasActivas = {};

// 🟢 Calcular estado de calidad del aire (espejo del ESP32)
function calcularEstado(calidad_aire) {
  if (calidad_aire > 150) return 'Crítico';
  if (calidad_aire > 100) return 'Malo';
  if (calidad_aire > 50)  return 'Moderado';
  return 'Bueno';
}

function calcularEstadoTemp(temp) {
  if (temp > 40)  return 'Muy alta';
  if (temp > 35)  return 'Alta';
  if (temp < 10)  return 'Baja';
  return 'Normal';
}

function calcularEstadoHumedad(hum) {
  if (hum > 70) return 'Alta';
  if (hum < 20) return 'Baja';
  return 'Normal';
}

function calcularEstadoPresion(pres) {
  if (pres < 950) return 'Baja';
  return 'Normal';
}

const CLASE_ESTADO = {
  'Bueno':    'estado-bueno',
  'Moderado': 'estado-moderado',
  'Malo':     'estado-malo',
  'Crítico':  'estado-critico',
  'Normal':   'estado-normal',
  'Alta':     'estado-alta',
  'Muy alta': 'estado-muy-alta',
  'Baja':     'estado-baja'
};

// 🎲 Simulador de datos (como si fuera el ESP32)
function generarDatosFake() {
  return {
    temperatura: Math.floor(Math.random() * 50),
    humedad: Math.floor(Math.random() * 100),
    presion: Math.floor(Math.random() * 200) + 900,
    calidad_aire: Math.floor(Math.random() * 200)
  };
}

function obtenerFechaHora() {
  const ahora = new Date();

  return ahora.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// 🧠 Generar alertas
function generarAlertas(data) {
  let nuevas = [];

  // 🌡️ Temperatura
  if (data.temperatura > 40 && !alertasActivas["temperatura"]) {
    nuevas.push({
      tipo: "temperatura",
      mensaje: `Temperatura alta: ${data.temperatura}°C`,
      nivel: "peligro",
      fecha: obtenerFechaHora()
    });
    alertasActivas["temperatura"] = true;
  } else if (data.temperatura <= 40) {
    alertasActivas["temperatura"] = false;
  }

  // 💧 Humedad
  if (data.humedad >= 80 && !alertasActivas["humedad"]) {
    nuevas.push({
      tipo: "humedad",
      mensaje: `Humedad alta: ${data.humedad}%`,
      nivel: "peligro",
      fecha: obtenerFechaHora()
    });
    alertasActivas["humedad"] = true;
  } else if (data.humedad < 80) {
    alertasActivas["humedad"] = false;
  }

  // 🌪️ Presión
  if (data.presion < 950 && !alertasActivas["presion"]) {
    nuevas.push({
      tipo: "presion",
      mensaje: `Presión baja: ${data.presion} hPa`,
      nivel: "precaucion",
      fecha: obtenerFechaHora()
    });
    alertasActivas["presion"] = true;
  } else if (data.presion >= 950) {
    alertasActivas["presion"] = false;
  }

  // ☣️ Aire
  if (data.calidad_aire > 150 && !alertasActivas["aire"]) {
    nuevas.push({
      tipo: "aire",
      mensaje: `Aire contaminado: ${data.calidad_aire} μg/m³`,
      nivel: "peligro",
      fecha: obtenerFechaHora()
    });
    alertasActivas["aire"] = true;
  } else if (data.calidad_aire <= 150) {
    alertasActivas["aire"] = false;
  }

  return nuevas;
}

// 🎨 Iconos
function getIcono(tipo) {
  return {
    temperatura: "🌡️",
    humedad: "💧",
    presion: "🌪️",
    aire: "☣️"
  }[tipo] || "⚠️";
}

// 🎨 Etiqueta de nivel legible
function getNivelLabel(nivel) {
  return nivel === 'peligro' ? 'Peligro' : 'Precaución';
}

// 🖥️ Render alertas
function renderAlertas(alertas) {
  const panel = document.getElementById("panel-alertas");
  if (!panel) return;

  const sinAlertas = document.getElementById("sin-alertas");

  alertas.forEach(alerta => {
    if (sinAlertas) sinAlertas.style.display = 'none';

    const card = document.createElement("div");
    card.className = `alerta ${alerta.nivel}`;
    card.innerHTML = `
      <div class="alerta-header">
        <span class="alerta-icono">${getIcono(alerta.tipo)}</span>
        <span class="alerta-nivel-badge alerta-nivel-badge--${alerta.nivel}">${getNivelLabel(alerta.nivel)}</span>
        <span class="alerta-tiempo">🕒 ${alerta.fecha}</span>
      </div>
      <div class="alerta-mensaje">${alerta.mensaje}</div>
    `;

    panel.appendChild(card);

    setTimeout(() => {
      card.remove();
      if (sinAlertas && panel.querySelectorAll('.alerta').length === 0) {
        sinAlertas.style.display = '';
      }
    }, 20000);
  });
}


// 🔄 ACTUALIZACIÓN GENERAL
function actualizarSistema(data) {
  const el = (id) => document.getElementById(id);

  // Valores principales
  if (el('temperatura-valor')) el('temperatura-valor').textContent = `${data.temperatura} °C`;
  if (el('presion-valor'))     el('presion-valor').textContent     = `${data.presion} hPa`;
  if (el('humedad-valor'))     el('humedad-valor').textContent     = `${data.humedad} %`;
  if (el('aire-valor'))        el('aire-valor').textContent        = `${data.calidad_aire} μg/m³`;

  // Estados con badge para cada sensor
  const setBadge = (id, texto) => {
    const node = el(id);
    if (node) { node.textContent = texto; node.className = 'estado-badge ' + (CLASE_ESTADO[texto] || ''); }
  };

  setBadge('aire-estado',        calcularEstado(data.calidad_aire));
  setBadge('temperatura-estado', calcularEstadoTemp(data.temperatura));
  setBadge('humedad-estado',     calcularEstadoHumedad(data.humedad));
  setBadge('presion-estado',     calcularEstadoPresion(data.presion));

  // Sub-valores de partículas y VOC
  if (el('pm25-valor')) el('pm25-valor').textContent = isNaN(data.pm25) ? '--' : data.pm25.toFixed(1);
  if (el('pm10-valor')) el('pm10-valor').textContent = isNaN(data.pm10) ? '--' : data.pm10.toFixed(1);
  if (el('voc-valor'))  el('voc-valor').textContent  = isNaN(data.voc)  ? '--' : data.voc.toFixed(1);

  // Última actualización desde Supabase
  if (el('ultima-actualizacion') && data.created_at) {
    const dt = new Date(data.created_at);
    el('ultima-actualizacion').textContent =
      'Última lectura: ' + dt.toLocaleString('es-MX', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
  }

  // Reloj del header
  const ahora = new Date();
  if (el('fecha')) el('fecha').textContent = ahora.toLocaleDateString('es-MX');
  if (el('hora'))  el('hora').textContent  = ahora.toLocaleTimeString('es-MX');

  const alertas = generarAlertas(data);
  renderAlertas(alertas);
}

// 🔁 ACTUALIZACIÓN (cada 3 segundos)
setInterval(async () => {
  const data = await obtenerUltimaLectura();
  actualizarSistema(data);
}, 3000);


// 📈 GENERAR GRÁFICAS (solo si Chart.js y el canvas existen en la página)
function crearGrafica(id, label, datos, labels) {
  if (typeof Chart === 'undefined' || !document.getElementById(id)) return;

  return new Chart(
    document.getElementById(id),
    {
      type: 'line',

      data: {
        labels: labels,

        datasets: [{
          label: label,
          data: datos,
          tension: 0.3
        }]
      },

      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: 'white'
            }
          }
        },

        scales: {
          x: {
            ticks: {
              color: 'white'
            }
          },

          y: {
            ticks: {
              color: 'white'
            }
          }
        }
      }
    }
  );
}

// 📊 Inicializar gráficas del dashboard si existen en la página
(async () => {
  const historial = await obtenerHistorial();
  const labels = historial.map(d => d.fecha);

  crearGrafica(
    "graficaTemperatura",
    "Temperatura °C",
    historial.map(d => d.temperatura),
    labels
  );

  crearGrafica(
    "graficaHumedad",
    "Humedad %",
    historial.map(d => d.humedad),
    labels
  );

  crearGrafica(
    "graficaAire",
    "Calidad Aire",
    historial.map(d => d.aire),
    labels
  );

  crearGrafica(
    "graficaPresion",
    "Presión",
    historial.map(d => d.presion),
    labels
  );
})();