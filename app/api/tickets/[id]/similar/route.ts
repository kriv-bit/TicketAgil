// app/api/tickets/[id]/similar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

type TicketRow = {
  id: string
  user_id: string
  subject: string | null
  description: string | null
  status: string
  created_at: string
}

// Tokenizar texto en palabras “limpias”
function tokenize(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    // quitamos signos raros, dejamos letras/números/espacios
    .replace(/[^a-zA-Z0-9áéíóúñüÁÉÍÓÚÑÜ\s]+/g, ' ')

  const parts = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3) // ignorar palabras muy cortas tipo "de", "la", etc.

  return new Set(parts)
}

// Similitud tipo Jaccard: |intersección| / |unión|
function similarityScore(a: string, b: string): number {
  if (!a.trim() || !b.trim()) return 0

  const tokensA = tokenize(a)
  const tokensB = tokenize(b)

  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let intersection = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++
  }

  const union = tokensA.size + tokensB.size - intersection
  return union === 0 ? 0 : intersection / union
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await context.params

    // 1) Cargar ticket base
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(
        'id, user_id, subject, description, status, created_at',
      )
      .eq('id', ticketId)
      .single<TicketRow>()

    if (ticketError || !ticket) {
      console.error(
        'Supabase ticket error (similar):',
        ticketError,
      )
      return NextResponse.json(
        { error: 'Ticket no encontrado.' },
        { status: 404 },
      )
    }

    const baseText = `${ticket.subject ?? ''}\n${ticket.description ?? ''}`

    if (!baseText.trim()) {
      return NextResponse.json({
        similar: [],
        message:
          'El ticket no tiene suficiente contenido para calcular similitud.',
      })
    }

    // 2) Cargar otros tickets del MISMO usuario
    const { data: otherTickets, error: othersError } = await supabase
      .from('tickets')
      .select(
        'id, user_id, subject, description, status, created_at',
      )
      .eq('user_id', ticket.user_id)
      .neq('id', ticketId)
      .order('created_at', { ascending: false })
      .limit(200) // límite para que no se vaya de madre

    if (othersError) {
      console.error(
        'Supabase other tickets error (similar):',
        othersError,
      )
      return NextResponse.json(
        { error: 'No se pudieron obtener los tickets para comparar.' },
        { status: 500 },
      )
    }

    if (!otherTickets || otherTickets.length === 0) {
      return NextResponse.json({
        similar: [],
      })
    }

    // 3) Calcular similitud con cada ticket
    const scored = otherTickets
      .map((t) => {
        const text = `${t.subject ?? ''}\n${t.description ?? ''}`
        const score = similarityScore(baseText, text)
        return {
          id: t.id,
          subject: t.subject ?? '(sin asunto)',
          status: t.status,
          created_at: t.created_at,
          similarity: score,
        }
      })
      // filtrar cosas muy poco parecidas
      .filter((t) => t.similarity >= 0.1)
      // ordenar de mayor a menor similitud
      .sort((a, b) => b.similarity - a.similarity)
      // top 5
      .slice(0, 5)

    return NextResponse.json({
      similar: scored,
    })
  } catch (error) {
    console.error('Unhandled error (similar):', error)
    return NextResponse.json(
      { error: 'Error interno al buscar tickets similares.' },
      { status: 500 },
    )
  }
}
