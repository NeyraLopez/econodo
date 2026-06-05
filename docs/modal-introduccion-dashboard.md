# Modal introductorio de EcoNodo

**Fecha:** 2026-06-04

---

## 1. Objetivo del cambio

Dar contexto al visitante sobre qué es EcoNodo sin interferir con el dashboard. El modal aparece al cargar la página, presenta el proyecto de forma breve y profesional, y desaparece al hacer clic en "Empezar", dejando el dashboard como protagonista.

---

## 2. Por qué se reemplazó el hero

El hero anterior (`<section class="hero-econodo">`) presentaba varios problemas:

- Ocupaba toda la pantalla antes del dashboard, desplazándolo fuera del viewport
- Compite visualmente con el header verde y el dashboard simultáneamente
- En móvil la sección era excesivamente larga
- El dashboard —que es el propósito principal de la página— quedaba relegado
- Generaba solapamiento de estilos con el resto del layout

**El modal resuelve todo esto:** el dashboard es visible desde el primer scroll, el contexto se entrega de forma no intrusiva y el visitante puede cerrar la introducción con un clic.

---

## 3. Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `index.html` | Hero eliminado, modal agregado, `btn-acerca` agregado, `modal-intro.js` cargado |
| `src/scss/layout/_index.scss` | `@forward 'hero'` reemplazado por `@forward 'modal-intro'` |
| `src/scss/layout/_modal-intro.scss` | **Nuevo** — todos los estilos del modal |
| `js/modal-intro.js` | **Nuevo** — lógica de abrir/cerrar modal |
| `build/css/app.css` | Recompilado — estilos del hero eliminados, del modal agregados |

**Archivos que quedan sin usar (no eliminados):**
- `src/scss/layout/_hero.scss` — ya no se importa en `_index.scss`, el archivo existe pero no compila

---

## 4. Contenido del modal

| Elemento | Contenido |
|---|---|
| Badge | 🌿 Sistema IoT Ambiental |
| Título (Syne) | EcoNodo |
| Subtítulo | Sistema IoT de monitoreo ambiental |
| Descripción | Texto breve sobre el propósito del proyecto |
| Punto 1 | Mide temperatura, humedad, presión, PM2.5, PM10, VOC y calidad del aire. |
| Punto 2 | Envía lecturas a Supabase mediante HTTPS. |
| Punto 3 | Muestra dashboard, historial, alertas y configuración desde la web. |
| Arquitectura | ESP32 + Sensores → Supabase → Dashboard Web |
| Botón principal | Empezar (cierra el modal) |
| Botón secundario | Ver historial (navega a historial.html) |

---

## 5. Comportamiento del modal

| Acción | Resultado |
|---|---|
| Cargar `index.html` | Modal aparece automáticamente (clase `.activo` en el HTML) |
| Clic en "Empezar" | Modal se cierra |
| Clic en el overlay (fuera del modal) | Modal se cierra |
| Presionar `Escape` | Modal se cierra |
| Clic en "Acerca de EcoNodo" | Modal se vuelve a abrir |
| Clic en "×" (esquina superior derecha) | Modal se cierra |

El modal se controla añadiendo/quitando la clase `.activo`. No usa `localStorage` ni `sessionStorage` — aparece en cada carga de la página, ideal para exposición o demo.

---

## 6. Decisiones de diseño

### Overlay
- `rgba(10, 28, 18, 0.78)` con `backdrop-filter: blur(4px)` — oscurece el dashboard pero lo deja levemente visible, reforzando que sigue ahí detrás

### Tarjeta del modal
- Fondo blanco `#ffffff`, esquinas `2rem`
- Barra de acento de 4px en la parte superior: degradado `#2E7D32 → #00897B → #43A047` — marca visual de EcoNodo
- Sombra profunda `0 28px 64px rgba(0,0,0,0.38)` para que flote sobre el overlay

### Tipografía
- **Syne** (ya cargada en el `<head>`) para el título "EcoNodo" — geométrica, técnica, coherente con la sesión anterior
- **Montserrat** para el resto del modal, igual que el sitio

### Animación de entrada
- `modalEntrada`: `scale(0.93→1) + translateY(14px→0) + fade` con curva `cubic-bezier(0.34, 1.4, 0.64, 1)` — sensación de "materializarse", ni rebote exagerado ni slide plano

### Sección de arquitectura
- Pastilla con fondo `$verdeFondo` (#E8F5E9) — referencia al fondo del sitio, crea cohesión visual
- Nodo "Supabase" con borde y color verde — destaca la conexión a la nube

### Botón "Acerca de EcoNodo"
- Posicionado sobre el dashboard en una barra alineada a la derecha (`div.barra-acerca`)
- Estilo pill outline verde — discreto, no compite con el dashboard

---

## 7. Qué no se modificó

- Dashboard de sensores (`main#dashboard`)
- Lógica de JS: `js/app.js`, `js/api.js`, `js/config.js`
- Conexión a Supabase
- Firmware del ESP32
- `secrets.h`
- Páginas `historial.html`, `alertas.html`, `configuracion.html`
- Estilos de otras páginas
- Estructura del header y la navegación

---

## 8. Cómo probarlo localmente

```bash
cd /home/jaziel/Proyectos/Econodo/econodo
python3 -m http.server 4000
```

Abrir `http://localhost:4000` y verificar:

1. El modal aparece automáticamente sobre el dashboard
2. El dashboard es visible (aunque oscurecido) detrás del overlay
3. "Empezar" cierra el modal → dashboard queda limpio y funcional
4. "×" (esquina superior derecha) cierra el modal
5. Clic en el overlay (fuera de la tarjeta) cierra el modal
6. `Escape` cierra el modal
7. "Acerca de EcoNodo" (botón pequeño sobre el dashboard) vuelve a abrir el modal
8. "Ver historial" navega a `historial.html`
9. Las tarjetas del dashboard se actualizan normalmente una vez cerrado el modal
10. En móvil (DevTools → responsive): sin desbordamiento, scroll interno si el modal es más alto que la pantalla

---

## 9. Checklist final

- [x] Hero section eliminada completamente de `index.html`
- [x] Dashboard vuelve a ser el protagonista visual
- [x] Modal con clase `.activo` aparece al cargar
- [x] `id="dashboard"` conservado en `<main>`
- [x] `btn-empezar` cierra el modal (JS)
- [x] `btn-cerrar-modal` (×) cierra el modal (JS)
- [x] Clic en overlay cierra el modal (JS)
- [x] `Escape` cierra el modal (JS)
- [x] `btn-acerca` reabre el modal (JS)
- [x] `@forward 'hero'` eliminado de `_index.scss`
- [x] `@forward 'modal-intro'` agregado a `_index.scss`
- [x] `_modal-intro.scss` creado con estilos completos
- [x] `js/modal-intro.js` creado con lógica limpia
- [x] Sass compilado sin errores
- [x] No se tocaron credenciales, firmware ni Supabase
- [x] No se hizo commit ni push
