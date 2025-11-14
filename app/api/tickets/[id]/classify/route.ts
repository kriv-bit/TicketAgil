// app/api/tickets/[id]/classify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const groqApiKey = process.env.GROQ_API_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const groq = new Groq({ apiKey: groqApiKey })

const VALID_CATEGORIES = ['bug', 'payment', 'account', 'question', 'other'] as const
const VALID_SEVERITIES = ['low', 'medium', 'high'] as const
type Category = (typeof VALID_CATEGORIES)[number]
type Severity = (typeof VALID_SEVERITIES)[number]

// Créditos
const DAILY_LIMIT = 50
const COST_CLASSIFY = 1

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await context.params

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, user_id, subject, description, status')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      console.error('Supabase ticket error (classify):', ticketError)
      return NextResponse.json(
        { error: 'Ticket no encontrado.' },
        { status: 404 },
      )
    }

    if (!ticket.description || ticket.description.trim().length === 0) {
      return NextResponse.json(
        { error: 'El ticket no tiene descripción para clasificar.' },
        { status: 400 },
      )
    }

    const userId = ticket.user_id as string
    const today = new Date().toISOString().slice(0, 10)

    const {
      data: usage,
      error: usageError,
    } = await supabase
      .from('ia_usage')
      .select('id, used_credits')
      .eq('user_id', userId)
      .eq('window_start', today)
      .maybeSingle()

    if (usageError) {
      console.error('Supabase usage error (classify):', usageError)
    }

    const usedCredits = usage?.used_credits ?? 0
    const newTotal = usedCredits + COST_CLASSIFY

    if (newTotal > DAILY_LIMIT) {
      return NextResponse.json(
        {
          error:
            'Has alcanzado el límite diario de acciones de IA. Vuelve a intentarlo mañana.',
        },
        { status: 429 },
      )
    }

    if (usage) {
      const { error: updateUsageError } = await supabase
        .from('ia_usage')
        .update({ used_credits: newTotal })
        .eq('id', usage.id)

      if (updateUsageError) {
        console.error('Supabase update usage error (classify):', updateUsageError)
      }
    } else {
      const { error: insertUsageError } = await supabase
        .from('ia_usage')
        .insert({
          user_id: userId,
          window_start: today,
          used_credits: COST_CLASSIFY,
        })

      if (insertUsageError) {
        console.error('Supabase insert usage error (classify):', insertUsageError)
      }
    }

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que clasifica tickets de soporte. Devuelve ÚNICAMENTE un JSON válido con las claves "category" y "severity". ' +
            'category debe ser una de: "bug", "payment", "account", "question", "other". ' +
            'severity debe ser una de: "low", "medium", "high". Sin texto adicional.',
        },
        {
          role: 'user',
          content: `Clasifica el siguiente ticket:\n\nAsunto: ${ticket.subject ?? '(sin asunto)'}\n\nDescripción:\n${ticket.description}`,
        },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    })

    const raw = chatCompletion.choices[0]?.message?.content ?? ''
    const jsonString = typeof raw === 'string' ? raw.trim() : ''

    let parsed: { category?: string; severity?: string }
    try {
      parsed = JSON.parse(jsonString)
    } catch (err) {
      console.error('Error parseando JSON de clasificación:', jsonString)
      return NextResponse.json(
        { error: 'La IA devolvió un formato inesperado.' },
        { status: 500 },
      )
    }

    let category = (parsed.category ?? 'other').toLowerCase()
    let severity = (parsed.severity ?? 'medium').toLowerCase()

    if (!VALID_CATEGORIES.includes(category as Category)) {
      category = 'other'
    }
    if (!VALID_SEVERITIES.includes(severity as Severity)) {
      severity = 'medium'
    }

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from('ticket_insights')
      .select('id')
      .eq('ticket_id', ticketId)
      .maybeSingle()

    if (existingError) {
      console.error('Supabase existing error (classify):', existingError)
    }

    const now = new Date().toISOString()

    if (existing) {
      const { error: updateError } = await supabase
        .from('ticket_insights')
        .update({
          category,
          severity,
          updated_at: now,
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Supabase update error (classify):', updateError)
        return NextResponse.json(
          {
            error:
              'No se pudo actualizar la clasificación en la base de datos.',
          },
          { status: 500 },
        )
      }
    } else {
      const { error: insertError } = await supabase
        .from('ticket_insights')
        .insert({
          ticket_id: ticketId,
          summary: null,
          category,
          severity,
          suggested_reply: null,
          created_at: now,
          updated_at: now,
        })

      if (insertError) {
        console.error('Supabase insert error (classify):', insertError)
        return NextResponse.json(
          { error: 'No se pudo guardar la clasificación en la base de datos.' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ category, severity })
  } catch (error) {
    console.error('Unhandled error (classify):', error)
    return NextResponse.json(
      { error: 'Error interno al clasificar el ticket.' },
      { status: 500 },
    )
  }
}
