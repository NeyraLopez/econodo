// =============================================
// CONFIGURACIÓN — EcoNodo
// Lee y escribe preferencias del frontend en localStorage.
// No toca el ESP32 ni Supabase.
// =============================================

const CONFIG_KEY = 'econodo_config';

const DEFAULTS = {
  umbral_temperatura: 40,
  umbral_humedad:     80,
  umbral_presion:     950,
  umbral_aire:        150,
  sonido:             false,
  duracion_alerta:    20,
  tipos_alerta: {
    temperatura: true,
    humedad:     true,
    presion:     true,
    aire:        true
  }
};

function obtenerConfigGuardada() {
  try {
    const guardado = localStorage.getItem(CONFIG_KEY);
    if (!guardado) return { ...DEFAULTS };
    const parsed = JSON.parse(guardado);
    return {
      ...DEFAULTS,
      ...parsed,
      tipos_alerta: { ...DEFAULTS.tipos_alerta, ...(parsed.tipos_alerta || {}) }
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function cargarEnFormulario() {
  const c = obtenerConfigGuardada();
  document.getElementById('umbral-temperatura').value = c.umbral_temperatura;
  document.getElementById('umbral-humedad').value     = c.umbral_humedad;
  document.getElementById('umbral-presion').value     = c.umbral_presion;
  document.getElementById('umbral-aire').value        = c.umbral_aire;
  document.getElementById('alerta-sonido').checked    = c.sonido;
  document.getElementById('alerta-duracion').value    = c.duracion_alerta;
  document.getElementById('tipo-temperatura').checked = c.tipos_alerta.temperatura;
  document.getElementById('tipo-humedad').checked     = c.tipos_alerta.humedad;
  document.getElementById('tipo-presion').checked     = c.tipos_alerta.presion;
  document.getElementById('tipo-aire').checked        = c.tipos_alerta.aire;
}

function leerFormulario() {
  return {
    umbral_temperatura: Number(document.getElementById('umbral-temperatura').value) || DEFAULTS.umbral_temperatura,
    umbral_humedad:     Number(document.getElementById('umbral-humedad').value)     || DEFAULTS.umbral_humedad,
    umbral_presion:     Number(document.getElementById('umbral-presion').value)     || DEFAULTS.umbral_presion,
    umbral_aire:        Number(document.getElementById('umbral-aire').value)        || DEFAULTS.umbral_aire,
    sonido:             document.getElementById('alerta-sonido').checked,
    duracion_alerta:    Number(document.getElementById('alerta-duracion').value)    || DEFAULTS.duracion_alerta,
    tipos_alerta: {
      temperatura: document.getElementById('tipo-temperatura').checked,
      humedad:     document.getElementById('tipo-humedad').checked,
      presion:     document.getElementById('tipo-presion').checked,
      aire:        document.getElementById('tipo-aire').checked
    }
  };
}

function guardarConfig() {
  const config = leerFormulario();
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  mostrarMensaje('✓ Configuración guardada');
}

function restaurarDefaults() {
  localStorage.removeItem(CONFIG_KEY);
  cargarEnFormulario();
  mostrarMensaje('↺ Valores restaurados al estado original');
}

function mostrarMensaje(texto) {
  const msg = document.getElementById('mensaje-guardado');
  if (!msg) return;
  msg.textContent = texto;
  msg.classList.add('visible');
  setTimeout(() => msg.classList.remove('visible'), 3000);
}

// Reloj del header
function actualizarReloj() {
  const ahora = new Date();
  const elFecha = document.getElementById('fecha');
  const elHora  = document.getElementById('hora');
  if (elFecha) elFecha.textContent = ahora.toLocaleDateString('es-MX');
  if (elHora)  elHora.textContent  = ahora.toLocaleTimeString('es-MX');
}
actualizarReloj();
setInterval(actualizarReloj, 1000);

document.getElementById('btn-guardar').addEventListener('click', guardarConfig);
document.getElementById('btn-restaurar').addEventListener('click', restaurarDefaults);

cargarEnFormulario();
