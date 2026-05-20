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

  // 401 — validar token del nodo
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
  const faltantes = CAMPOS_REQUERIDOS.filter(
    f => data[f] === undefined || data[f] === null
  )
  if (faltantes.length > 0) {
    return json({ error: 'Missing fields', missing: faltantes }, 400)
  }

  // 400 — estado válido
  if (!ESTADOS_VALIDOS.includes(data.estado as Estado)) {
    return json({ error: 'Invalid estado', valid: [...ESTADOS_VALIDOS] }, 400)
  }

  // INSERT usando service_role inyectado automáticamente por Supabase
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
