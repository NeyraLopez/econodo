// =============================================
// CAPA DE DATOS — EcoNodo
// Fase 0: todas las funciones retornan datos simulados.
//
// Para conectar backend real (Fase 2):
//   obtenerUltimaLectura() → fetch('/api/lecturas/ultima').then(r => r.json())
//   obtenerHistorial()     → fetch('/api/lecturas').then(r => r.json())
//   generarDatosFakeHistorial() puede eliminarse en Fase 4.
// =============================================

function obtenerUltimaLectura() {
  return generarDatosFake();
}

function obtenerHistorial() {
  return generarDatosFakeHistorial();
}

// 180 lecturas simuladas: 30 días × 6 lecturas por día
function generarDatosFakeHistorial() {
  const datos = [];

  for (let dia = 1; dia <= 30; dia++) {
    for (let hora = 0; hora < 24; hora += 4) {
      datos.push({
        fecha: `2026-04-${dia.toString().padStart(2, '0')}`,
        hora: `${hora.toString().padStart(2, '0')}:00`,
        temperatura: Math.floor(Math.random() * 15) + 25,
        humedad: Math.floor(Math.random() * 50) + 30,
        aire: Math.floor(Math.random() * 100) + 50,
        presion: Math.floor(Math.random() * 80) + 950
      });
    }
  }

  return datos;
}
