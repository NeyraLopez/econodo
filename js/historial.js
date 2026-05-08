// 📊 DATOS SIMULADOS

const filtroDia = document.getElementById("filtro-dia");

for(let i = 1; i <= 30; i++) {

  const option = document.createElement("option");

  option.value = i;
  option.textContent = i;

  filtroDia.appendChild(option);

}

function aplicarFiltros() {
   console.log("FILTRO EJECUTADO");

  const anio =
    document.getElementById("filtro-anio").value;

  const mes =
    document.getElementById("filtro-mes").value;

  const dia =
    document.getElementById("filtro-dia").value;

  // =========================
  // SOLO AÑO
  // =========================
  if(
    anio !== "Todos" &&
    mes === "Todos" &&
    dia === "Todos"
  ) {

    promedioPorMes(anio);

  }

  // =========================
  // AÑO + MES
  // =========================
  else if(
    anio !== "Todos" &&
    mes !== "Todos" &&
    dia === "Todos"
  ) {

    datosPorMes(anio, mes);

  }

  // =========================
  // AÑO + MES + DÍA
  // =========================
  else if(
    anio !== "Todos" &&
    mes !== "Todos" &&
    dia !== "Todos"
  ) {

    datosPorDia(anio, mes, dia);

  }else {

    actualizarGraficasDatos(
        historial,
        d => `${d.fecha} ${d.hora}`
    );

    }

}

const historial = [];

for(let dia = 1; dia <= 30; dia++) {

  for(let hora = 0; hora < 24; hora += 4) {

    historial.push({

      fecha: `2026-04-${dia.toString().padStart(2, '0')}`,

      hora: `${hora.toString().padStart(2, '0')}:00`,

      temperatura: Math.floor(Math.random() * 15) + 25,

      humedad: Math.floor(Math.random() * 50) + 30,

      aire: Math.floor(Math.random() * 100) + 50,

      presion: Math.floor(Math.random() * 80) + 950

    });

  }

}

// 📈 GENERAR GRÁFICAS
function crearGrafica(id, label, datos, labels) {

  return new Chart(document.getElementById(id), {

    type: 'line',

    data: {
      labels: labels,

      datasets: [{
        label: label,
        data: datos,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: 'index',
        intersect: false
      },

      plugins: {
        legend: {
          labels: {
            color: 'black'
          }
        }
      },

      scales: {

        x: {
          ticks: {
            color: 'black',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          },

          grid: {
            color: 'rgba(255,255,255,0.05)'
          }
        },

        y: {
          ticks: {
            color: 'black'
          },

          grid: {
            color: 'rgba(255,255,255,0.05)'
          }
        }
      }
    }
  });
}

// 📊 DATOS
const labels = historial.map(d => d.fecha);

const graficaTemperatura = crearGrafica(
  "graficaTemperatura",
  "Temperatura °C",
  historial.map(d => d.temperatura),
  historial.map(d => `${d.fecha} ${d.hora}`)
);

const graficaHumedad = crearGrafica(
  "graficaHumedad",
  "Humedad %",
  historial.map(d => d.humedad),
  historial.map(d => `${d.fecha} ${d.hora}`)
);

const graficaAire = crearGrafica(
  "graficaAire",
  "Calidad Aire",
  historial.map(d => d.aire),
  historial.map(d => `${d.fecha} ${d.hora}`)
);

const graficaPresion = crearGrafica(
  "graficaPresion",
  "Presión",
  historial.map(d => d.presion),
  historial.map(d => `${d.fecha} ${d.hora}`)
);

function actualizarGraficasDatos(
  datos,
  callbackLabel
) {

  actualizarGraficasCustom(

    datos.map(callbackLabel),

    datos.map(d => d.temperatura),

    datos.map(d => d.humedad),

    datos.map(d => d.aire),

    datos.map(d => d.presion)

  );

}

function actualizarGraficasCustom(
  labels,
  temperaturas,
  humedades,
  aires,
  presiones
) {

  graficaTemperatura.data.labels = labels;
  graficaTemperatura.data.datasets[0].data =
    temperaturas;
  graficaTemperatura.update();

  graficaHumedad.data.labels = labels;
  graficaHumedad.data.datasets[0].data =
    humedades;
  graficaHumedad.update();

  graficaAire.data.labels = labels;
  graficaAire.data.datasets[0].data =
    aires;
  graficaAire.update();

  graficaPresion.data.labels = labels;
  graficaPresion.data.datasets[0].data =
    presiones;
  graficaPresion.update();

}

function promedioPorMes(anio) {

  const meses = {};

  historial.forEach(dato => {

    const [y, m] = dato.fecha.split("-");

    if(y === anio) {

      if(!meses[m]) {

        meses[m] = {
          temperatura: [],
          humedad: [],
          aire: [],
          presion: []
        };

      }

      meses[m].temperatura.push(dato.temperatura);
      meses[m].humedad.push(dato.humedad);
      meses[m].aire.push(dato.aire);
      meses[m].presion.push(dato.presion);

    }

  });

  const labels = Object.keys(meses);

  actualizarGraficasCustom(
    labels,

    labels.map(m =>
      promedio(meses[m].temperatura)
    ),

    labels.map(m =>
      promedio(meses[m].humedad)
    ),

    labels.map(m =>
      promedio(meses[m].aire)
    ),

    labels.map(m =>
      promedio(meses[m].presion)
    )
  );

}

function datosPorMes(anio, mes) {

  const dias = {};

  historial.forEach(dato => {

    const [y, m, d] = dato.fecha.split("-");

    if(y === anio && m === mes) {

      if(!dias[d]) {

        dias[d] = {
          temperatura: [],
          humedad: [],
          aire: [],
          presion: []
        };

      }

      dias[d].temperatura.push(dato.temperatura);
      dias[d].humedad.push(dato.humedad);
      dias[d].aire.push(dato.aire);
      dias[d].presion.push(dato.presion);

    }

  });

  const labels = Object.keys(dias);

  actualizarGraficasCustom(

    labels,

    labels.map(d =>
      promedio(dias[d].temperatura)
    ),

    labels.map(d =>
      promedio(dias[d].humedad)
    ),

    labels.map(d =>
      promedio(dias[d].aire)
    ),

    labels.map(d =>
      promedio(dias[d].presion)
    )

  );

}

function datosPorDia(anio, mes, dia) {

  const filtrados = historial.filter(d => {

    const [y, m, day] = d.fecha.split("-");

    return (
      y === anio &&
      m === mes &&
      day === dia.padStart(2, '0')
    );

  });

  actualizarGraficasDatos(
    filtrados,
    d => d.hora
  );

}

function promedio(array) {

  return (
    array.reduce((a, b) => a + b, 0)
    / array.length
  ).toFixed(1);

}

document
  .querySelector(".btn-filtrar")
  .addEventListener("click", aplicarFiltros);