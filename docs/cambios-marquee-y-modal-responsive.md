# Cambios: marquee continuo en LCD y modal responsive en móvil

**Fecha:** 2026-06-04  
**Commit de referencia anterior:** `fa9faf1` — Reemplazar hero por modal introductorio en dashboard

---

## Resumen

Dos cambios independientes realizados en esta tanda:

1. **Firmware LCD** — Refactorización completa del carrusel: ahora todas las páginas desplazan horizontalmente con marquee continuo, usando lenguaje simple para público general.
2. **Modal web** — Corrección responsive: el modal ya no se ve cortado ni comprimido en móvil.

---

## Cambio 1 — Marquee continuo en LCD 1602A

### Archivo modificado
`firmware/econodo_esp32/econodo_esp32.ino`

### Problema anterior
El sistema anterior solo hacía scroll en textos con más de 16 caracteres. Los textos cortos se mostraban estáticos. Además, las pantallas usaban términos técnicos (`PM2.5`, `PM10`, `VOC`, `kOhm`) que el público general no entiende.

### Solución implementada
Se reemplazó toda la lógica del carrusel por un sistema de **marquee continuo**: todas las páginas desplazan sus dos líneas horizontalmente, sin excepción.

#### Mecanismo del marquee

```
textoExtendido = "                " + texto + "                "
ventana        = textoExtendido.substring(offset, offset + 16)
```

El texto entra desde la derecha (pantalla en blanco), cruza los 16 caracteres visibles y sale limpio por la izquierda. Ambas líneas usan el mismo offset.

#### Máquina de estados — simplificada a 2 estados

| Estado | Qué hace | Duración |
|---|---|---|
| `LCD_SCROLLING` | Avanza offset cada tick | 280 ms/paso |
| `LCD_PAUSA` | Pausa entre páginas | 500 ms |

Antes había 4 estados (`PAGINA_CORTA`, `PAUSA_INICIAL`, `SCROLLING`, `PAUSA_FINAL`).

#### Ajuste de velocidad

```cpp
const unsigned long INTERVALO_MARQUEE_LCD_MS   = 280;  // subir a 320-350 si va rápido
const unsigned long PAUSA_ENTRE_PAGINAS_LCD_MS = 500;
```

#### Lenguaje simple (equivalencias)

| Término técnico anterior | Término en pantalla actual |
|---|---|
| PM2.5 | Polvo fino |
| PM10 | Polvo ambiental |
| VOC / gas_resistance | Gases |
| Calidad del aire | Calidad aire |
| WiFi | Conexion WiFi |
| HTTP | Nube |

#### Contenido de las 10 páginas

| Pág | Línea 1 | Línea 2 |
|-----|---------|---------|
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

#### Funciones nuevas / renombradas

| Función | Cambio |
|---|---|
| `prepararTextoMarquee()` | Nueva — agrega 16 espacios a cada lado |
| `obtenerVentanaMarquee()` | Nueva — reemplaza `obtenerVentanaScroll()` |
| `resetMarqueeLCD()` | Renombrada desde `resetScrollLCD()` |
| `estadoTemperatura()` | Nueva |
| `estadoHumedad()` | Nueva |
| `estadoPresion()` | Nueva |
| `estadoPolvoFino()` | Nueva |
| `estadoPolvoAmbiental()` | Nueva |
| `estadoGasesSimple()` | Nueva |

#### Funciones eliminadas

- `necesitaScroll()` — ya no aplica, todo hace marquee
- `obtenerVentanaScroll()` — reemplazada por `obtenerVentanaMarquee()`

#### Referencias de estado (orientativas — solo para exposición)

> Estos rangos son referenciales para demostración educativa, no norma médica oficial.

| Variable | Umbrales |
|---|---|
| Temperatura | < 10 = Baja · ≤ 35 = Normal · ≤ 40 = Alta · > 40 = Muy alta |
| Humedad | < 20% = Baja · ≤ 70% = Normal · > 70% = Alta |
| Presión | < 950 hPa = Baja · ≥ 950 = Normal |
| Polvo fino PM2.5 | ≤ 15 = Bajo · ≤ 35 = Medio · > 35 = Alto |
| Polvo ambiental PM10 | ≤ 45 = Bajo · ≤ 100 = Medio · > 100 = Alto |
| Gases (VOC) | Derivado de calidad aire: Bueno/Moderado = Normal · Malo/Critico = Alto |

#### Qué NO se modificó

- Pines LCD (RS=13, E=14, D4=25, D5=26, D6=27, D7=32)
- Pines BME680 (GPIO 5, 18, 19, 23)
- Pines SDS011 (GPIO 16, 17)
- `LiquidCrystal.h` (modo paralelo 4 bits, sin I2C)
- Lectura de sensores
- Envío HTTP a Supabase
- `secrets.h`
- Serial Monitor

---

## Cambio 2 — Modal responsive en móvil

### Archivos modificados
- `src/scss/layout/_modal-intro.scss`
- `build/css/app.css` (recompilado)
- `docs/modal-introduccion-dashboard.md` (actualizado)

### Problema anterior
En celular:
- El título "EcoNodo" se cortaba horizontalmente
- El contenido ocupaba demasiada altura
- La sección de arquitectura se partía de forma desordenada
- Los botones quedaban muy abajo o fuera de vista
- El modal no se adaptaba al viewport móvil

### Solución implementada

Se adoptó un enfoque **mobile-first**: los estilos base ahora son para móvil, y los mixins `@tablet` / `@desktop` amplían el espacio en pantallas grandes.

#### Cambios clave en `_modal-intro.scss`

| Propiedad | Antes (desktop fijo) | Ahora (móvil base) | Tablet+ |
|---|---|---|---|
| `.modal-intro` padding | `2rem 1.6rem` | `0.8rem` | `2rem 1.6rem` |
| `.modal-intro` | — | `min-height: 100dvh` | — |
| `.contenido` padding | `3rem 3rem 2.6rem` | `1.6rem` | `3rem 3rem 2.6rem` |
| `.contenido` max-height | `90vh` | `calc(100dvh - 1.6rem)` | `90vh` |
| `.contenido` border-radius | `2rem` | `1.4rem` | `2rem` |
| `.contenido` ancho | `max-width: 50rem` | `width: 100%` | `width: min(92vw, 52rem)` |
| Título font-size | `4.8rem` | `clamp(3.8rem, 15vw, 5.2rem)` | `5.5rem` |
| Título letter-spacing | `-0.03em` | `-0.01em` | `-0.03em` |
| Título | sin restricción | `white-space: nowrap` | — |
| Subtítulo | `1.5rem` | `1.4rem` | `1.5rem` |
| Descripción | `1.5rem / lh 1.7` | `1.4rem / lh 1.45` | `1.5rem / lh 1.7` |
| Bullets | `1.4rem` | `1.3rem` | `1.4rem` |
| Arquitectura flex | `flex-wrap: wrap` | `nowrap + overflow-x: auto` | `flex-wrap: wrap` |
| Botón ✕ | `2.6rem` | `2rem` | `2.6rem` |
| Botones de acción | fila siempre | columna en móvil | fila desde ≥480px |

#### Por qué `clamp(3.8rem, 15vw, 5.2rem)` resuelve el corte

- A 375px: `15vw = 56px` < `3.8rem = 60.8px` → usa mínimo 60.8px
- Con padding reducido a 1.6rem, el contenido disponible es ≈298px
- "EcoNodo" en Syne 800 a 60.8px cabe en ≈230–250px — no se corta
- `white-space: nowrap` evita el quiebre aunque la fuente renderice más ancho

#### Arquitectura en una línea (móvil)

```
flex-wrap: nowrap + overflow-x: auto + scrollbar-width: none
```

La fila `ESP32 + Sensores → Supabase → Dashboard Web` no se parte. Si la pantalla es muy estrecha, el usuario puede deslizar horizontalmente de forma invisible (sin scrollbar visible).

#### Qué NO se modificó

- `index.html` — sin cambios de contenido ni estructura
- `js/modal-intro.js` — misma lógica de abrir/cerrar/escape/overlay
- `js/api.js`, `js/config.js`, `js/app.js`
- Supabase, firmware, `secrets.h`
- Páginas `historial.html`, `alertas.html`, `configuracion.html`

---

## Estado del repositorio después de estos cambios

```
M firmware/econodo_esp32/econodo_esp32.ino
M docs/lcd-marquee-carrusel.md
M src/scss/layout/_modal-intro.scss
M build/css/app.css
M docs/modal-introduccion-dashboard.md
+ docs/cambios-marquee-y-modal-responsive.md  (este archivo)
```

**Commits anteriores en esta sesión:**
```
fa9faf1  Reemplazar hero por modal introductorio en dashboard
0a722e7  Agregar carrusel marquee con scroll horizontal en LCD 1602A
```

**Pendiente de commit (listo para push manual):**
- Commit A: refactorización marquee LCD + docs actualizados
- Commit B: modal responsive + SCSS + CSS compilado + docs actualizados
