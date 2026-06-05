# Carrusel tipo marquee en LCD EcoNodo

**Archivo modificado:** `firmware/econodo_esp32/econodo_esp32.ino`  
**Fecha:** 2026-06-04

---

## 1. Objetivo del cambio

Reemplazar el carrusel estático de páginas (donde cada página se mostraba fija durante 3 segundos) por un sistema marquee que desplaza horizontalmente los textos que no caben en los 16 caracteres de la LCD, mientras mantiene fijos los textos cortos. El resultado es más legible y profesional para exposición.

---

## 2. Diferencia entre carrusel estático y marquee

| Comportamiento | Carrusel estático (anterior) | Carrusel marquee (actual) |
|---|---|---|
| Texto corto (≤16 chars) | Mostrar 3 s, pasar | Mostrar 3 s, pasar |
| Texto largo (>16 chars) | Texto truncado o cortado | Scroll horizontal suave |
| Implementación | `millis()` simple | Máquina de 4 estados + `millis()` |
| Bloquea el loop | No | No |
| Número de páginas | 9 | 10 (se agregó página introductoria) |

---

## 3. Pantallas mostradas

| Pág | Línea 1 | Línea 2 (ejemplo) | ¿Scroll? |
|-----|---------|-------------------|----------|
| 0 | `EcoNodo` | `Monitor ambiental` | Línea 2 (17 chars) |
| 1 | `Temperatura` | `33.0 C` | No |
| 2 | `Humedad` | `31 %` | No |
| 3 | `Presion` | `1010 hPa` | No |
| 4 | `PM2.5` | `3.4 ug/m3` | No |
| 5 | `PM10` | `17.7 ug/m3` | No |
| 6 | `VOC` | `123.4 kOhm` | No |
| 7 | `Calidad del aire` | `Bueno - 2.9 ug/m3` | Línea 2 (>16 chars) |
| 8 | `Envio a nube` | `HTTP: 201` | No |
| 9 | `WiFi` | `Conectado` | No |

El scroll solo se activa cuando el texto supera 16 caracteres. En todos los demás casos el texto se muestra fijo.

---

## 4. Cómo funciona el desplazamiento horizontal

### Función `obtenerVentanaScroll(texto, offset)`

Devuelve siempre exactamente **16 caracteres**:

- Si `texto.length() <= 16`: rellena con espacios a la derecha y retorna.
- Si `texto.length() > 16`: crea `textoExtendido = texto + "   "` (3 espacios finales para que el texto salga limpio al final), luego retorna `textoExtendido.substring(offset, offset + 16)`.

### Ejemplo con `"Monitor ambiental"` (17 chars)

```
textoExtendido = "Monitor ambiental   "  (20 chars)
maxOffset      = 20 - 16 = 4

offset=0 → "Monitor ambient"
offset=1 → "onitor ambienta"
offset=2 → "nitor ambientalL"  
offset=3 → "itor ambiental  "
offset=4 → "tor ambiental   "
```

### Máquina de estados

```
LCD_PAUSA_INICIAL → LCD_SCROLLING → LCD_PAUSA_FINAL → cambiarPaginaLCD()
```

| Estado | Descripción | Duración |
|---|---|---|
| `LCD_PAGINA_CORTA` | Texto corto: mostrar fijo | 3000 ms |
| `LCD_PAUSA_INICIAL` | Texto largo: esperar antes de scrollear | 900 ms |
| `LCD_SCROLLING` | Desplazar 1 char por tick | 300 ms/paso |
| `LCD_PAUSA_FINAL` | Scroll terminado: pausa antes de cambiar | 700 ms |

---

## 5. Intervalos usados

```cpp
const unsigned long INTERVALO_SCROLL_LCD_MS      = 300;   // ms entre cada paso
const unsigned long PAUSA_INICIAL_SCROLL_MS      = 900;   // ms antes de empezar
const unsigned long PAUSA_FINAL_SCROLL_MS        = 700;   // ms después de terminar
const unsigned long DURACION_PAGINA_CORTA_LCD_MS = 3000;  // ms para texto corto
```

**Tiempo total por página con scroll** (texto de 17 chars, maxOffset=4):  
`900 + (4+1)×300 + 700 = 900 + 1500 + 700 = 3100 ms`

**Tiempo total por página sin scroll:**  
`3000 ms`

**Ciclo completo (10 páginas, mayoría cortas):**  
~30 segundos aproximadamente.

---

## 6. Por qué se usa `millis()`

`millis()` devuelve el tiempo transcurrido desde el arranque del ESP32 en milisegundos, sin detener la ejecución. Esto permite que:

- Los sensores sigan leyendo en cada iteración del `loop()`
- El envío HTTP a Supabase no se retrase
- La LCD se actualice solo cuando corresponde, sin bloquear nada

Si se usara `delay(300)` en el scroll, el ESP32 quedaría congelado 300ms en cada paso, bloqueando lecturas y envíos.

---

## 7. Qué no se modificó

- Pines de la LCD (RS=13, E=14, D4=25, D5=26, D6=27, D7=32)
- Pines del BME680 (GPIO 5, 18, 19, 23)
- Pines del SDS011 (GPIO 16, 17)
- Librería `LiquidCrystal.h` (sin I2C)
- Funciones `imprimirLCDLinea()`, `limpiarLineaLCD()`, `inicializarLCD()`, `mostrarLCDInicio()`
- Lectura de sensores
- Envío a Supabase
- Reintentos HTTP
- Serial Monitor
- `secrets.h`

---

## 8. Cómo probarlo físicamente

1. Abrir Arduino IDE con el sketch
2. Compilar: **Sketch → Verify/Compile** — sin errores
3. Subir al ESP32: **Sketch → Upload**
4. Abrir **Serial Monitor** a 115200 baud
5. Observar la pantalla tras el arranque

**Secuencia de arranque:**
```
EcoNodo       →  EcoNodo   →  EcoNodo   →  Sistema listo
Iniciando        WiFi...      WiFi OK      ECONODO_001
```

**Luego (página 0, con scroll en línea 2):**
```
EcoNodo
Monitor ambien...  →  scroll suave hasta "tor ambiental   "  →  siguiente página
```

**Velocidad esperada:** suave y legible, 1 carácter cada 300ms.  
Si se ve muy rápido: aumentar `INTERVALO_SCROLL_LCD_MS` a 400 o 500.  
Si se ve muy lento: reducir a 200.

---

## 9. Diagnóstico rápido

| Síntoma | Causa probable | Solución |
|---------|---------------|---------|
| Texto se mueve demasiado rápido | `INTERVALO_SCROLL_LCD_MS` muy bajo | Subir a 400–500 ms |
| Texto se mueve demasiado lento | `INTERVALO_SCROLL_LCD_MS` muy alto | Bajar a 200 ms |
| Texto cortado sin scrollear | `necesitaScroll` no detecta el texto largo | Verificar que `texto.length() > 16` |
| Caracteres viejos visibles | `imprimirLCDLinea` no rellena hasta 16 | `obtenerVentanaScroll` debe devolver siempre 16 chars |
| Pantalla congela en una página | `estadoScrollLCD` quedó en estado inválido | Verificar la transición en `cambiarPaginaLCD → resetScrollLCD` |
| Envío HTTP se retrasa | `delay()` en el scroll | Confirmar que `actualizarLCD` usa solo `millis()` |
