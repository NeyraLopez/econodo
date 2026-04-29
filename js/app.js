// 🔴 Estado de alertas activas (evita duplicados)
let alertasActivas = {};

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
  if (data.humedad < 20 && !alertasActivas["humedad"]) {
    nuevas.push({
      tipo: "humedad",
      mensaje: `Humedad baja: ${data.humedad}%`,
      nivel: "peligro",
      fecha: obtenerFechaHora()
    });
    alertasActivas["humedad"] = true;
  } else if (data.humedad >= 20) {
    alertasActivas["humedad"] = false;
  }

  // 🌪️ Presión
  if (data.presion < 950 && !alertasActivas["presion"]) {
    nuevas.push({
      tipo: "presion",
      mensaje: `Presión baja: ${data.presion}`,
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
      mensaje: `Aire contaminado: ${data.calidad_aire}`,
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

// 🖥️ Render alertas
function renderAlertas(alertas) {
  const panel = document.getElementById("panel-alertas");

  alertas.forEach(alerta => {
    const card = document.createElement("div");
    card.className = `alerta ${alerta.nivel}`;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap: 20rem; flex-direction:row; ">
        <div>
          ${getIcono(alerta.tipo)} ${alerta.mensaje}
        </div>

        <small style="opacity:0.8;">
          🕒 ${alerta.fecha}
          </small>
      </div>
    `;

    panel.appendChild(card);

    // ❌ se elimina después de 20 seg
    setTimeout(() => card.remove(), 20000);
  });
}


// 🔄 ACTUALIZACIÓN GENERAL
function actualizarSistema(data) {

  const alertas = generarAlertas(data);
  renderAlertas(alertas);
}

// 🔁 SIMULACIÓN (cada 3 segundos)
setInterval(() => {
  const data = generarDatosFake(); // 👈 luego cambias esto por ESP32
  actualizarSistema(data);
}, 3000);