# Carrusel de datos en LCD EcoNodo

**Archivo modificado:** `firmware/econodo_esp32/econodo_esp32.ino`  
**Fecha:** 2026-06-04

---

## 1. Objetivo del cambio

Reemplazar la visualización anterior de la LCD — que agrupaba varios datos por pantalla — por un carrusel de pantallas individuales donde cada lectura ocupa toda la pantalla con su nombre en la línea 1 y su valor en la línea 2.

El objetivo es mejorar la legibilidad en la LCD 1602A (16 columnas × 2 filas), ya que los datos agrupados anteriores eran difíciles de leer a distancia.

---

## 2. Qué se modificó

| Elemento | Cambio |
|---|---|
| Constante `TOTAL_PAGINAS_LCD` | Nueva — valor `9` |
| `paginaLCD = (paginaLCD + 1) % 4` | Cambiado a `% TOTAL_PAGINAS_LCD` |
| Función `actualizarLCD()` | Reemplazada — de 4 casos a 9 casos individuales |
| Setup — pantalla inicial | Cambiada de `"EcoNodo" / "T:-- H:--"` a `"Temperatura" / "--"` |

**Nada más fue tocado.** Los pines, sensores, lógica de envío y credenciales permanecen intactos.

---

## 3. Pantallas del carrusel

| Página | Línea 1 | Línea 2 (ejemplo) | Condición |
|--------|---------|-------------------|-----------|
| 0 | `Temperatura` | `33.0 C` | `bmeListo` |
| 1 | `Humedad` | `31 %` | `bmeListo` |
| 2 | `Presion` | `1010 hPa` | `bmeListo` |
| 3 | `PM2.5` | `3.4 ug/m3` | `sdsListo` |
| 4 | `PM10` | `17.7 ug/m3` | `sdsListo` |
| 5 | `VOC` | `123.4 kOhm` | `bmeListo` |
| 6 | `Aire` | `Bueno` | `sdsListo` |
| 7 | `Envio` | `HTTP: 201` | `ultimoCodigoHTTP != 0` |
| 8 | `WiFi` | `Conectado` | siempre visible |

Si el sensor correspondiente aún no tiene lectura válida, la línea 2 muestra `--`.  
Si aún no se realizó ningún envío HTTP, la página 7 muestra `--` en vez de `HTTP: 0`.

---

## 4. Intervalo de rotación

```cpp
const unsigned long INTERVALO_LCD_MS = 3000;  // 3 segundos por pantalla
const int          TOTAL_PAGINAS_LCD = 9;
```

Un ciclo completo dura **27 segundos** (9 páginas × 3 s).  
El intervalo puede cambiarse modificando `INTERVALO_LCD_MS` sin tocar el resto del código.

---

## 5. Qué variables usa

| Variable | Tipo | Fuente | Usado en página |
|---|---|---|---|
| `v_temperatura` | `float` | BME680 | 0 |
| `v_humedad` | `float` | BME680 | 1 |
| `v_presion` | `float` | BME680 | 2 |
| `v_voc` | `float` | BME680 | 5 |
| `v_pm25` | `float` | SDS011 | 3, 6 |
| `v_pm10` | `float` | SDS011 | 4 |
| `bmeListo` | `bool` | flag | 0, 1, 2, 5 |
| `sdsListo` | `bool` | flag | 3, 4, 6 |
| `ultimoCodigoHTTP` | `int` | HTTP response | 7 |
| `calcularEstado(calcularCalidadAire())` | `const char*` | helpers | 6 |
| `WiFi.status()` | `wl_status_t` | WiFi | 8 |

---

## 6. Qué no se modificó

- Pines de la LCD (RS=13, E=14, D4=25, D5=26, D6=27, D7=32)
- Pines del BME680 (GPIO 5, 18, 19, 23)
- Pines del SDS011 (GPIO 16, 17)
- Funciones `imprimirLCDLinea()`, `limpiarLineaLCD()`, `inicializarLCD()`, `mostrarLCDInicio()`
- Lógica de lectura de sensores
- Lógica de envío a Supabase
- Reintentos HTTP
- Serial Monitor
- `secrets.h`
- Credenciales de red

---

## 7. Cómo probarlo físicamente

1. Abrir Arduino IDE con el sketch
2. Compilar: **Sketch → Verify/Compile** (no debe haber errores)
3. Subir al ESP32: **Sketch → Upload**
4. Abrir **Serial Monitor** a 115200 baud para confirmar arranque
5. Observar la pantalla: debe mostrar la secuencia de arranque y luego rotar datos

**Secuencia de arranque:**
```
EcoNodo       →  EcoNodo   →  EcoNodo   →  Sistema listo
Iniciando        WiFi...      WiFi OK      ECONODO_001
```

**Luego, en operación (ciclo de 27 s):**
```
Temperatura  →  Humedad  →  Presion  →  PM2.5  →  PM10
33.0 C          31 %        1010 hPa    3.4 ug/m3  17.7 ug/m3

  →  VOC     →  Aire     →  Envio    →  WiFi
     123.4 kOhm   Bueno      HTTP: 201   Conectado
```

---

## 8. Diagnóstico rápido

| Síntoma | Causa probable | Solución |
|---------|---------------|---------|
| Todas las páginas muestran `--` | Sensores no inicializados todavía | Esperar unos segundos tras el arranque |
| Página `Envio` muestra `--` | Aún no se realizó el primer envío | Esperar hasta que pasen 30 s desde el arranque |
| Página `Aire` muestra `--` pero PM2.5/PM10 tienen valor | El SDS011 necesita calentamiento (~30 s) | Normal, esperar |
| Texto sobreimpreso con caracteres viejos | `imprimirLCDLinea()` no está rellenando con espacios | Verificar que `LCD_COLS = 16` coincide con la pantalla real |
| La pantalla se congela en una página | Error de conexión WiFi bloqueando el loop | Revisar Serial Monitor para mensajes de error |
