# Fase 3 — Edge Function ingest-lectura

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una Supabase Edge Function que reciba lecturas del ESP32, valide un token secreto e inserte en `public.lecturas` sin exponer la `service_role` key.

**Architecture:** El ESP32 hace HTTPS POST a la Edge Function con un token secreto. La función valida el token, valida el payload JSON, y usa el cliente Supabase interno (service_role inyectado automáticamente) para insertar. El frontend no cambia.

**Tech Stack:** Deno, TypeScript, Supabase Edge Functions, supabase-js v2 (ESM CDN), Supabase MCP para deploy.

---

## Archivos que se tocan

| Acción | Ruta | Por qué |
|---|---|---|
| Crear | `supabase/functions/ingest-lectura/index.ts` | Lógica completa de la Edge Function |
| Modificar | `.gitignore` | Agregar `supabase/functions/**/.env` |
| No tocar | `js/`, `*.html`, `src/` | Frontend intacto |

**Secretos — nunca en archivos del repo:**

| Secret | Dónde se configura | Lo usa |
|---|---|---|
| `NODO_SECRET_TOKEN` | Supabase → Settings → Edge Functions → Secrets | Edge Function para validar ESP32 |
| `SUPABASE_URL` | Inyectado automáticamente por Supabase | Edge Function (no configurar manualmente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Inyectado automáticamente por Supabase | Edge Function (no configurar manualmente) |

---

## Task 1: Actualizar .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1.1: Agregar exclusión de archivos .env de funciones**

Agregar al final de `.gitignore`:
```
supabase/functions/**/.env
```

- [ ] **Step 1.2: Verificar que el cambio está correcto**

```bash
cat .gitignore
```

Esperado: aparece la línea `supabase/functions/**/.env`.

---

## Task 2: Crear la Edge Function

**Files:**
- Create: `supabase/functions/ingest-lectura/index.ts`

- [ ] **Step 2.1: Crear directorio de la función**

```bash
mkdir -p supabase/functions/ingest-lectura
```

- [ ] **Step 2.2: Crear `index.ts` con la lógica completa**

Contenido de `supabase/functions/ingest-lectura/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ESTADOS_VALIDOS = ['Bueno', 'Moderado', 'Malo', 'Critico'] as const
type Estado = typeof ESTADOS_VALIDOS[number]

interface Lectura {
  nodo_id:      string
  temperatura:  number
  humedad:      number
  presion:      number
  voc:          number
  pm25:         number
  pm10:         number
  calidad_aire: number
  estado:       Estado
}

const CAMPOS_REQUERIDOS: (keyof Lectura)[] = [
  'nodo_id', 'temperatura', 'humedad', 'presion',
  'voc', 'pm25', 'pm10', 'calidad_aire', 'estado'
]

Deno.serve(async (req: Request) => {
  // 405 — solo POST
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // 401 — validar token
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const expected = Deno.env.get('NODO_SECRET_TOKEN')

  if (!token || !expected || token !== expected) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // 400 — parsear JSON
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const data = body as Record<string, unknown>

  // 400 — campos requeridos
  const faltantes = CAMPOS_REQUERIDOS.filter(f => data[f] === undefined || data[f] === null)
  if (faltantes.length > 0) {
    return json({ error: 'Missing fields', missing: faltantes }, 400)
  }

  // 400 — estado válido
  if (!ESTADOS_VALIDOS.includes(data.estado as Estado)) {
    return json({ error: 'Invalid estado', valid: [...ESTADOS_VALIDOS] }, 400)
  }

  // INSERT usando service_role (inyectado automáticamente por Supabase)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const lectura: Lectura = {
    nodo_id:      String(data.nodo_id),
    temperatura:  Number(data.temperatura),
    humedad:      Number(data.humedad),
    presion:      Number(data.presion),
    voc:          Number(data.voc),
    pm25:         Number(data.pm25),
    pm10:         Number(data.pm10),
    calidad_aire: Number(data.calidad_aire),
    estado:       data.estado as Estado
  }

  const { data: inserted, error } = await supabase
    .from('lecturas')
    .insert(lectura)
    .select('id')
    .single()

  if (error) {
    return json({ error: 'Insert failed', detail: error.message }, 500)
  }

  return json({ ok: true, id: inserted.id }, 201)
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

- [ ] **Step 2.3: Verificar que el archivo existe**

```bash
cat supabase/functions/ingest-lectura/index.ts
```

Esperado: el contenido completo del archivo.

---

## Task 3: Configurar el secret NODO_SECRET_TOKEN en Supabase

**No se guarda en ningún archivo del repo.**

- [ ] **Step 3.1: Generar un token secreto fuerte**

```bash
openssl rand -hex 32
```

Guardar el output (ej: `a3f8c2...`) — este es el `NODO_SECRET_TOKEN`.

- [ ] **Step 3.2: Configurar el secret en el proyecto Supabase**

Usar el MCP de Supabase. La herramienta a usar es el panel de Supabase:
- Dashboard → Project `qqpnzclvyrnwxgwfkuox` → Settings → Edge Functions → Secrets
- Agregar: `NODO_SECRET_TOKEN` = `<valor generado en step 3.1>`

O via MCP si está disponible el tool correspondiente.

- [ ] **Step 3.3: Guardar el token localmente para las pruebas**

Guardar el token en un lugar seguro local (no en el repo). Se necesita para los curl de prueba.

---

## Task 4: Desplegar la Edge Function

- [ ] **Step 4.1: Desplegar via Supabase MCP**

Usar `mcp__supabase__deploy_edge_function` con:
- `project_id`: `qqpnzclvyrnwxgwfkuox`
- `name`: `ingest-lectura`
- `entrypoint_path`: `supabase/functions/ingest-lectura/index.ts`

- [ ] **Step 4.2: Verificar que la función está desplegada**

Usar `mcp__supabase__list_edge_functions` para confirmar que `ingest-lectura` aparece como `active`.

---

## Task 5: Pruebas con curl

**Sustituir `<TOKEN>` con el valor real de `NODO_SECRET_TOKEN` en cada comando.**

### Prueba 1 — POST válido (debe responder 201)

- [ ] **Step 5.1: Ejecutar**

```bash
curl -s -w "\nHTTP: %{http_code}\n" \
  -X POST \
  "https://qqpnzclvyrnwxgwfkuox.supabase.co/functions/v1/ingest-lectura" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nodo_id":      "ECONODO_001",
    "temperatura":  28.50,
    "humedad":      60.00,
    "presion":      1010.50,
    "voc":          38.00,
    "pm25":         10.00,
    "pm10":         18.00,
    "calidad_aire": 48.00,
    "estado":       "Bueno"
  }'
```

Esperado:
```json
{"ok":true,"id":2}
HTTP: 201
```

### Prueba 2 — Token incorrecto (debe responder 401)

- [ ] **Step 5.2: Ejecutar**

```bash
curl -s -w "\nHTTP: %{http_code}\n" \
  -X POST \
  "https://qqpnzclvyrnwxgwfkuox.supabase.co/functions/v1/ingest-lectura" \
  -H "Authorization: Bearer token_incorrecto" \
  -H "Content-Type: application/json" \
  -d '{"nodo_id":"ECONODO_001","temperatura":25}'
```

Esperado:
```json
{"error":"Unauthorized"}
HTTP: 401
```

### Prueba 3 — Campo faltante (debe responder 400)

- [ ] **Step 5.3: Ejecutar**

```bash
curl -s -w "\nHTTP: %{http_code}\n" \
  -X POST \
  "https://qqpnzclvyrnwxgwfkuox.supabase.co/functions/v1/ingest-lectura" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nodo_id": "ECONODO_001",
    "temperatura": 28.50
  }'
```

Esperado:
```json
{"error":"Missing fields","missing":["humedad","presion","voc","pm25","pm10","calidad_aire","estado"]}
HTTP: 400
```

### Prueba 4 — Método GET (debe responder 405)

- [ ] **Step 5.4: Ejecutar**

```bash
curl -s -w "\nHTTP: %{http_code}\n" \
  "https://qqpnzclvyrnwxgwfkuox.supabase.co/functions/v1/ingest-lectura"
```

Esperado:
```json
{"error":"Method not allowed"}
HTTP: 405
```

---

## Task 6: Verificar inserción en Supabase y dashboard

- [ ] **Step 6.1: Consultar la tabla lecturas via MCP**

```sql
SELECT id, nodo_id, temperatura, estado, created_at
FROM public.lecturas
ORDER BY created_at DESC
LIMIT 3;
```

Esperado: aparece la fila insertada en Prueba 1 (id=2 o superior).

- [ ] **Step 6.2: Recargar index.html y confirmar que el dashboard muestra los nuevos valores**

Abrir `http://localhost:4000/index.html` con hard refresh (Ctrl+Shift+R).

Esperado: temperatura = `28.5 °C`, humedad = `60 %`, etc. (valores de la Prueba 1).

- [ ] **Step 6.3: Recargar historial.html y confirmar que la gráfica muestra 2 puntos**

Abrir `http://localhost:4000/historial.html`.

Esperado: las gráficas muestran 2 puntos en lugar de 1.

---

## Resumen de archivos

| Archivo | Commit |
|---|---|
| `.gitignore` | Sí — agregar exclusión `.env` |
| `supabase/functions/ingest-lectura/index.ts` | Sí — nueva Edge Function |
| `NODO_SECRET_TOKEN` | **No** — solo en Supabase Secrets |
| `supabase/functions/ingest-lectura/.env` | **No** — gitignored |
