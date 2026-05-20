# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

EcoNodo is a static frontend for an IoT environmental monitoring system. The intended architecture is:

```
Sensores → ESP32 → API/Backend → Base de datos → Sitio web EcoNodo
```

The site currently uses **simulated (fake) data** via `generarDatosFake()` in `js/app.js` and hardcoded arrays in `js/historial.js`. When a real backend is available, those data sources must be replaced with API calls. The ESP32 must never serve the website directly.

## Commands

```bash
# Compile SCSS once
npm run sass

# Watch SCSS for changes (compiles on save)
npm run dev
```

`gulp dev` watches `src/scss/**/*.scss` and outputs to `build/css/app.css` via `gulpfile.js`. There is no build step for JS or HTML.

## Architecture

**Pages** — four static HTML files at the root, each with the same `<header>` + `<nav>` + `<main>` shell:

| File | JS dependency | Purpose |
|---|---|---|
| `index.html` | `js/app.js` | Dashboard — live sensor cards + alert panel |
| `historial.html` | `js/historial.js` + Chart.js CDN | Time-series charts with date filters |
| `alertas.html` | `js/app.js` | Alert feed with auto-dismiss (20 s) |
| `configuracion.html` | — | Settings page (no JS yet) |

**SCSS structure** — all styles compile from `src/scss/app.scss` via two `@forward` rules:

- `src/scss/base/` — `_variables.scss` (color palette + breakpoints), `_mixins.scss` (responsive breakpoints), `_normalize.scss`, `_globales.scss`
- `src/scss/layout/` — one partial per page (`_dashboard.scss`, `_historial.scss`, `_alertas.scss`, `_configuracion.scss`) plus `_header.scss`, `_navegacion.scss`

Mixins (`@mixin telefono`, `@mixin tablet`, `@mixin desktop`) use mobile-first `min-width` media queries. Always `@use 'base/variables' as *` when accessing variables from within layout partials.

**Alert thresholds** (defined in `js/app.js`):
- Temperatura > 40 °C → peligro
- Humedad < 20 % → peligro
- Presión < 950 hPa → precaucion
- Calidad aire > 150 → peligro

`alertasActivas` is module-level state that prevents duplicate alerts per sensor type.

**Chart.js** is loaded from CDN only in `historial.html`. The four chart instances (`graficaTemperatura`, `graficaHumedad`, `graficaAire`, `graficaPresion`) are updated in-place via `actualizarGraficasCustom()` — never recreated. Filter logic aggregates the flat `historial` array by year → month → day depending on which selects are set to non-"Todos" values.
