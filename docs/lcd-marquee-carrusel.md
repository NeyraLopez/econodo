# Carrusel marquee continuo en LCD EcoNodo

**Archivo modificado:** `firmware/econodo_esp32/econodo_esp32.ino`  
**Fecha:** 2026-06-04

---

## 1. Objetivo del cambio

Reemplazar el carrusel anterior (que solo hacía scroll en textos mayores a 16 caracteres) por un sistema de **marquee continuo**: todas las páginas desplazan horizontalmente sus dos líneas de forma suave, sin importar la longitud del texto.

El resultado es visual, dinámico, y usa lenguaje simple para público general en lugar de términos técnicos (PM2.5, VOC, kOhm).

---

## 2. Diferencia respecto a la versión anterior

| Comportamiento | Versión anterior | Versión actual |
|---|---|---|
| Texto corto (≤16 chars) | Se mostraba fijo 3 segundos | Se desplaza con marquee igual que el largo |
| Texto largo (>16 chars) | Scroll horizontal solo si superaba 16 | Scroll horizontal siempre |
| Páginas estáticas | Sí (texto corto = fijo) | No — todas las páginas tienen movimiento |
| Lenguaje en pantalla | PM2.5, PM10, VOC, kOhm | Polvo fino, Polvo ambiental, Gases |
| Contenido de líneas | Línea 1: nombre, Línea 2: valor | Línea 1: nombre + valor, Línea 2: estado/referencia |
| Estados de sensor | Solo valores numéricos | Bajo / Medio / Alto / Normal / Critico |
| Número de estados | 4 (PAGINA_CORTA, PAUSA_INICIAL, SCROLLING, PAUSA_FINAL) | 2 (SCROLLING, PAUSA) |

---

## 3. Cómo funciona el marquee continuo

### Preparación del texto

Cada línea se extiende con **16 espacios al inicio y 16 al final**:

```
textoExtendido = "                " + texto + "                "
```

Con 16 espacios de padding, el texto entra desde la derecha (pantalla en blanco), cruza los 16 caracteres visibles, y sale limpio por la izquierda.

### Ventana visible

```
ventana = textoExtendido.substring(offset, offset + 16)
```

La ventana siempre devuelve exactamente 16 caracteres. El offset avanza de 0 hasta `textoExtendido.length() - 16`.

### Ejemplo con "EcoNodo" (7 chars)

```
textoExtendido = "                EcoNodo                "  (39 chars)
maxOffset      = 39 - 16 = 23

offset=0  → "                "  (en blanco — texto aún no entró)
offset=9  → "       EcoNodo  "  (texto entrando desde la derecha)
offset=16 → "EcoNodo         "  (texto en posición izquierda)
offset=23 → "                "  (texto ya salió — en blanco)
```

### Sincronización de ambas líneas

Ambas líneas usan el mismo `offsetMarqueeLCD`. El `maxOffsetMarqueeLCD` se calcula como el máximo entre los offsets máximos de las dos líneas extendidas:

```
maxOffsetMarqueeLCD = max(maxOff_linea1, maxOff_linea2)
```

Así la línea más corta termina primero (queda en blanco) mientras la más larga sigue desplazándose hasta completarse.

---

## 4. Máquina de estados

```
LCD_SCROLLING → (offset >= maxOffset) → LCD_PAUSA → cambiarPaginaLCD()
      ↑                                                      |
      └──────────────── resetMarqueeLCD() ──────────────────┘
```

| Estado | Descripción | Duración |
|---|---|---|
| `LCD_SCROLLING` | Avanza offset un carácter por tick | 280 ms/paso |
| `LCD_PAUSA` | Pausa antes de cambiar de página | 500 ms |

---

## 5. Constantes de tiempo

```cpp
const unsigned long INTERVALO_MARQUEE_LCD_MS   = 280;  // ms entre cada paso
const unsigned long PAUSA_ENTRE_PAGINAS_LCD_MS = 500;  // ms antes de siguiente página
```

**Tiempo por página** (texto de 7 chars, textoExtendido=39, maxOffset=23):  
`23 pasos × 280 ms + 500 ms = 6440 ms + 500 ms ≈ 7 s`

**Ciclo completo (10 páginas):**  
Varía según la longitud de texto de cada página — entre 30 y 60 segundos aproximadamente.

**Ajuste de velocidad:**
- Se ve rápido → subir `INTERVALO_MARQUEE_LCD_MS` a 320–350 ms
- Se ve lento  → bajar a 220–250 ms

---

## 6. Pantallas del carrusel

| Pág | Línea 1 (ejemplo) | Línea 2 (ejemplo) |
|-----|-------------------|-------------------|
| 0 | `EcoNodo` | `Monitor ambiental` |
| 1 | `Temperatura: 33 C` | `Estado: Normal` |
| 2 | `Humedad: 45 %` | `Estado: Normal` |
| 3 | `Presion: 1012 hPa` | `Estado: Normal` |
| 4 | `Polvo fino: 12` | `Ref: Bajo` |
| 5 | `Polvo ambiental: 28` | `Ref: Bajo` |
| 6 | `Gases: Normal` | `Aire sin alerta` |
| 7 | `Calidad aire` | `Bueno` |
| 8 | `Nube` | `HTTP: 201` |
| 9 | `Conexion WiFi` | `Conectado` |

---

## 7. Equivalencias de lenguaje (para público general)

| Término técnico | Término en pantalla |
|---|---|
| PM2.5 | Polvo fino |
| PM10 | Polvo ambiental |
| VOC / gas_resistance | Gases |
| Calidad del aire | Calidad aire |
| HTTP / nube | Nube |
| WiFi | Conexion WiFi |
| kOhm | *(no se muestra — solo el estado)* |
| ug/m3 (PM) | *(no se muestra en línea 1 — solo el número)* |

---

## 8. Referencias de estado (orientativas — solo para exposición)

> Estos rangos son referenciales para demostración educativa, no norma médica oficial.

**Temperatura:**

| Valor | Estado en pantalla |
|---|---|
| < 10 °C | Baja |
| 10–35 °C | Normal |
| 35–40 °C | Alta |
| > 40 °C | Muy alta |

**Humedad:**

| Valor | Estado |
|---|---|
| < 20 % | Baja |
| 20–70 % | Normal |
| > 70 % | Alta |

**Presión:**

| Valor | Estado |
|---|---|
| < 950 hPa | Baja |
| ≥ 950 hPa | Normal |

**Polvo fino (PM2.5):**

| Valor | Referencia |
|---|---|
| ≤ 15 ug/m3 | Bajo |
| 15–35 ug/m3 | Medio |
| > 35 ug/m3 | Alto |

**Polvo ambiental (PM10):**

| Valor | Referencia |
|---|---|
| ≤ 45 ug/m3 | Bajo |
| 45–100 ug/m3 | Medio |
| > 100 ug/m3 | Alto |

**Gases (derivado del estado de calidad del aire):**

| Estado de calidad | Gases en pantalla |
|---|---|
| Bueno / Moderado | Normal |
| Malo / Critico | Alto |

---

## 9. Funciones principales

| Función | Propósito |
|---|---|
| `prepararTextoMarquee(texto)` | Agrega 16 espacios antes y después |
| `obtenerVentanaMarquee(ext, offset)` | Extrae ventana de 16 chars en el offset dado |
| `obtenerContenidoPaginaLCD(pagina, l1, l2)` | Construye líneas 1 y 2 con lenguaje simple |
| `resetMarqueeLCD()` | Reinicia marquee para la página actual |
| `cambiarPaginaLCD()` | Avanza página y llama resetMarqueeLCD |
| `actualizarLCD()` | Máquina de estados no bloqueante (millis) |
| `estadoTemperatura()` | Devuelve "Normal / Alta / Baja / Muy alta" |
| `estadoHumedad()` | Devuelve "Normal / Alta / Baja" |
| `estadoPresion()` | Devuelve "Normal / Baja" |
| `estadoPolvoFino()` | Devuelve "Bajo / Medio / Alto" |
| `estadoPolvoAmbiental()` | Devuelve "Bajo / Medio / Alto" |
| `estadoGasesSimple()` | Devuelve "Normal / Alto" |

---

## 10. Por qué se usa `millis()`

`millis()` permite avanzar el marquee frame a frame sin detener el `loop()`. Si se usara `delay(280)` en cada paso, el ESP32 quedaría bloqueado y no podría leer sensores ni enviar datos a Supabase.

---

## 11. Qué no se modificó

- Pines de la LCD (RS=13, E=14, D4=25, D5=26, D6=27, D7=32)
- Pines del BME680 (GPIO 5, 18, 19, 23)
- Pines del SDS011 (GPIO 16, 17)
- `LiquidCrystal.h` (modo paralelo 4 bits, sin I2C)
- Funciones `imprimirLCDLinea()`, `limpiarLineaLCD()`, `inicializarLCD()`, `mostrarLCDInicio()`
- Lectura de sensores (BME680 y SDS011)
- Envío a Supabase (HTTP POST)
- Reintentos HTTP
- Serial Monitor (115200 baud)
- `secrets.h` — no tocado

---

## 12. Cómo probarlo

1. Abrir Arduino IDE con `firmware/econodo_esp32/econodo_esp32.ino`
2. Compilar: **Sketch → Verify/Compile**
3. Subir: **Sketch → Upload**
4. Abrir **Serial Monitor** a 115200 baud
5. Observar la pantalla LCD

**Secuencia de arranque:**
```
EcoNodo          →  EcoNodo   →  EcoNodo   →  Sistema listo
Iniciando           WiFi...      WiFi OK      ECONODO_001
```

**Luego (marquee activo en todas las páginas):**
```
"                "  →  "  EcoNodo      "  →  "EcoNodo        "  →  "                "
```

**Si se ve rápido:** aumentar `INTERVALO_MARQUEE_LCD_MS` a 320–350 ms  
**Si se ve lento:** reducir a 220–250 ms

---

## 13. Diagnóstico rápido

| Síntoma | Causa probable | Solución |
|---------|---------------|---------|
| Texto entra demasiado rápido | `INTERVALO_MARQUEE_LCD_MS` bajo | Subir a 320–350 ms |
| Texto entra demasiado lento | `INTERVALO_MARQUEE_LCD_MS` alto | Bajar a 220–250 ms |
| Pantalla en blanco al inicio | Normal — el padding inicial es 16 espacios | Esperar a que el texto entre |
| Caracteres viejos visibles | `imprimirLCDLinea` no rellena hasta 16 | Verificar que `obtenerVentanaMarquee` devuelva 16 chars |
| Página no avanza | `estadoMarqueeLCD` no llega a `LCD_PAUSA` | Verificar `maxOffsetMarqueeLCD` y transición en `actualizarLCD` |
| Envío HTTP se retrasa | `delay()` accidental en el scroll | Confirmar que `actualizarLCD` usa solo `millis()` |
