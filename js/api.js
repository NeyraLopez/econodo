// =============================================
// CAPA DE DATOS — EcoNodo
// Fase 2: lee datos reales desde Supabase si USE_SUPABASE === true.
// Fallback a datos simulados si:
//   - USE_SUPABASE es false o no está definido
//   - la petición falla (red, CORS, error HTTP)
//   - la tabla devuelve 0 filas
// =============================================

async function obtenerUltimaLectura() {
  if (typeof USE_SUPABASE === 'undefined' || !USE_SUPABASE) {
    return generarDatosFake();
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lecturas?select=*&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    if (!res.ok) return generarDatosFake();
    const rows = await res.json();
    if (!rows.length) return generarDatosFake();
    const f = rows[0];
    return {
      temperatura:  parseFloat(f.temperatura),
      humedad:      parseFloat(f.humedad),
      presion:      parseFloat(f.presion),
      calidad_aire: parseFloat(f.calidad_aire),
      pm25:         parseFloat(f.pm25),
      pm10:         parseFloat(f.pm10),
      voc:          parseFloat(f.voc),
      created_at:   f.created_at
    };
  } catch {
    return generarDatosFake();
  }
}

async function obtenerHistorial() {
  if (typeof USE_SUPABASE === 'undefined' || !USE_SUPABASE) {
    return generarDatosFakeHistorial();
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lecturas?select=*&order=created_at.asc&limit=200`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    if (!res.ok) return generarDatosFakeHistorial();
    const rows = await res.json();
    if (!rows.length) return generarDatosFakeHistorial();
    return rows.map(f => ({
      fecha:       f.created_at.slice(0, 10),
      hora:        f.created_at.slice(11, 16),
      temperatura: parseFloat(f.temperatura),
      humedad:     parseFloat(f.humedad),
      aire:        parseFloat(f.calidad_aire),
      presion:     parseFloat(f.presion)
    }));
  } catch {
    return generarDatosFakeHistorial();
  }
}

// 180 lecturas simuladas: 30 días × 6 lecturas por día
function generarDatosFakeHistorial() {
  const datos = [];
  for (let dia = 1; dia <= 30; dia++) {
    for (let hora = 0; hora < 24; hora += 4) {
      datos.push({
        fecha:       `2026-04-${dia.toString().padStart(2, '0')}`,
        hora:        `${hora.toString().padStart(2, '0')}:00`,
        temperatura: Math.floor(Math.random() * 15) + 25,
        humedad:     Math.floor(Math.random() * 50) + 30,
        aire:        Math.floor(Math.random() * 100) + 50,
        presion:     Math.floor(Math.random() * 80) + 950
      });
    }
  }
  return datos;
}
