# Hero introductorio de EcoNodo

## 1. Objetivo del cambio

Agregar una sección de bienvenida profesional antes del dashboard en `index.html` para que los visitantes entiendan qué es EcoNodo, qué problema resuelve y cómo funciona, antes de ver los datos de sensores en vivo.

---

## 2. Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `index.html` | Sección hero agregada, `id="dashboard"` en main, link a Syne (Google Fonts) |
| `src/scss/layout/_hero.scss` | Nuevo archivo — todos los estilos del hero |
| `src/scss/layout/_index.scss` | Se agregó `@forward 'hero'` |
| `src/scss/base/_globales.scss` | Se agregó `scroll-behavior: smooth` al selector `html` |
| `build/css/app.css` | Recompilado con los estilos del hero incluidos |

---

## 3. Descripción de la nueva sección

Se agregó `<section class="hero-econodo">` directamente entre el `<header>` y el `<div class="contenedor">` (que contiene la navegación y el dashboard). La sección es full-width, no está dentro del layout nav+main.

Estructura HTML de la sección:

```
section.hero-econodo
├── div.hero-contenido
│   ├── span.hero-badge         ("🌿 Sistema IoT Ambiental")
│   ├── h1.hero-titulo          ("EcoNodo")
│   ├── p.hero-subtitulo        ("Monitoreo ambiental en tiempo real")
│   ├── p.hero-descripcion      (Descripción breve del proyecto)
│   ├── div.hero-acciones
│   │   ├── a.btn-hero          ("Empezar" → scroll a #dashboard)
│   │   └── a.btn-hero-secundario ("Ver historial" → historial.html)
│   └── div.hero-arquitectura
│       └── (ESP32 + Sensores → Supabase → Dashboard Web)
└── div.hero-cards
    ├── div.hero-card--temp     ("Mide el ambiente")
    ├── div.hero-card--cloud    ("Conecta con la nube")
    └── div.hero-card--web      ("Visualiza resultados")
```

---

## 4. Contenido agregado

### Textos

| Elemento | Texto |
|---|---|
| Badge | 🌿 Sistema IoT Ambiental |
| Título | EcoNodo |
| Subtítulo | Monitoreo ambiental en tiempo real |
| Descripción | EcoNodo captura datos del entorno mediante sensores conectados a un ESP32, los envía a la nube y los presenta en una plataforma web clara y accesible. |
| Botón principal | Empezar |
| Botón secundario | Ver historial |

### Arquitectura (diagrama textual)

```
ESP32 + Sensores  →  Supabase  →  Dashboard Web
```

El nodo "Supabase" tiene una animación de pulso verde para destacar que es el punto de conexión entre hardware y web.

### Feature cards

| Ícono | Título | Descripción |
|---|---|---|
| 🌡️ | Mide el ambiente | Temperatura, humedad, presión, PM2.5, PM10, VOC y calidad del aire. |
| ☁️ | Conecta con la nube | Las lecturas se envían mediante HTTPS a Supabase para su almacenamiento y consulta. |
| 📊 | Visualiza resultados | Dashboard, historial, alertas y configuración desde el navegador. |

---

## 5. Decisiones de diseño

### Paleta
- Fondo del hero: gradiente radial `#0F2318 → #1A3D28` (bosque profundo)
- Overlay de grilla de datos: dos `repeating-linear-gradient` cruzados, opacity 3.5% — da textura técnica sin distraer
- Acentos: verde `#4CAF50` y blanco semitransparente
- Bordes izquierdos de cards: naranja, verde y azul (mismos colores de acento del dashboard)

### Tipografía
- **Syne** (Google Fonts, peso 700/800): solo para `.hero-titulo`. Geométrica, técnica, memorable. No afecta el resto del sitio.
- El resto del hero usa **Montserrat** (fuente principal ya cargada en el sitio).

### Animaciones
- `@keyframes heroFadeUp`: todos los elementos del hero entran con `opacity: 0 → 1` + `translateY(28px → 0)` en stagger de 0.1s entre cada uno.
- `@keyframes pulsoNodo`: el nodo "Supabase" tiene un glow verde pulsante cada 2.8s.
- Sin JavaScript. Todo CSS puro.

### Cards del hero
- Glassmorphism oscuro: `rgba(255,255,255,0.065)` de fondo con borde `rgba(255,255,255,0.09)`
- Franja izquierda de 3px con color del sensor correspondiente
- Hover sutil sin distracciones

---

## 6. Comportamiento del botón "Empezar"

```html
<a href="#dashboard" class="btn-hero">Empezar</a>
```

- El `<main>` del dashboard tiene ahora `id="dashboard"`.
- El scroll suave está activado globalmente con `scroll-behavior: smooth` en el selector `html` de `_globales.scss`.
- No requiere JavaScript.

---

## 7. Consideraciones responsive

| Breakpoint | Comportamiento |
|---|---|
| Mobile (< 480px) | Columna única: contenido arriba, cards apiladas abajo |
| Tablet (≥ 768px) | Columna única: contenido arriba, cards en fila horizontal |
| Desktop (≥ 1080px) | Dos columnas: contenido a la izquierda, cards en columna a la derecha |

El padding del hero aumenta en cada breakpoint para aprovechar el espacio disponible. Los tamaños del `.hero-titulo` escalan de 8rem (mobile) → 10rem (tablet) → 11rem (desktop).

---

## 8. Qué no se modificó

- Dashboard de sensores (ninguna tarjeta fue tocada)
- Lógica de JS: `js/app.js`, `js/api.js`, `js/config.js`
- Conexión a Supabase
- Firmware del ESP32
- `secrets.h`
- Páginas `historial.html`, `alertas.html`, `configuracion.html`
- Estilos de las otras páginas (`_dashboard.scss`, `_alertas.scss`, etc.)
- Estructura de navegación
- Header del sitio

El hero es una capa puramente visual e informativa que no interfiere con la funcionalidad existente.

---

## 9. Cómo probarlo localmente

```bash
cd /home/jaziel/Proyectos/Econodo/econodo
python3 -m http.server 4000
```

Abrir `http://localhost:4000` y verificar:

1. La sección hero aparece encima del dashboard (con fondo verde oscuro)
2. El título "EcoNodo" carga con animación suave
3. Los tres elementos del diagrama de arquitectura son visibles
4. El nodo "Supabase" tiene pulso verde animado
5. Clic en "Empezar" → scroll suave hasta el dashboard
6. Clic en "Ver historial" → navega a `historial.html`
7. Las tarjetas del dashboard siguen actualizándose normalmente
8. En móvil (DevTools → modo responsive) no hay desbordamiento horizontal

---

## 10. Checklist final

- [x] Sección hero agregada en `index.html` antes de `.contenedor`
- [x] `id="dashboard"` añadido al `<main>` del dashboard
- [x] Fuente Syne cargada con `<link>` en `<head>` de `index.html` (solo esa página)
- [x] `scroll-behavior: smooth` en `html` (`_globales.scss`)
- [x] `_hero.scss` creado con estilos completos
- [x] `_hero.scss` registrado en `src/scss/layout/_index.scss`
- [x] Sass compilado sin errores → `build/css/app.css` actualizado
- [x] No se tocaron credenciales, firmware ni Supabase
- [x] No se rompió el dashboard existente
- [x] No se hizo commit ni push
