// app/api/tickets/[id]/suggest-reply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const groqApiKey = process.env.GROQ_API_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const groq = new Groq({ apiKey: groqApiKey })

const DAILY_LIMIT = 50
const COST_SUGGEST_REPLY = 2   

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await context.params

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, user_id, subject, description, customer_name')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      console.error('Supabase ticket error (suggest-reply):', ticketError)
      return NextResponse.json(
        { error: 'Ticket no encontrado.' },
        { status: 404 },
      )
    }

    if (!ticket.description || ticket.description.trim().length === 0) {
      return NextResponse.json(
        { error: 'El ticket no tiene descripción para generar respuesta.' },
        { status: 400 },
      )
    }

    const {
      data: insights,
      error: insightsError,
    } = await supabase
      .from('ticket_insights')
      .select('summary, category, severity')
      .eq('ticket_id', ticketId)
      .maybeSingle()

    if (insightsError) {
      console.error('Supabase insights error (suggest-reply):', insightsError)
    }

    const summary = insights?.summary ?? null
    const category = insights?.category ?? null
    const severity = insights?.severity ?? null

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
      console.error('Supabase usage error (suggest-reply):', usageError)
    }

    const usedCredits = usage?.used_credits ?? 0
    const newTotal = usedCredits + COST_SUGGEST_REPLY

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
        console.error('Supabase update usage error (suggest-reply):', updateUsageError)
      }
    } else {
      const { error: insertUsageError } = await supabase
        .from('ia_usage')
        .insert({
          user_id: userId,
          window_start: today,
          used_credits: COST_SUGGEST_REPLY,
        })

      if (insertUsageError) {
        console.error('Supabase insert usage error (suggest-reply):', insertUsageError)
      }
    }

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'Eres un agente de soporte profesional. Redactas respuestas claras, empáticas y concisas. ' +
            'Incluye: saludo, referencia al problema, explicación o pasos siguientes y un cierre cordial. ' +
            'Responde siempre en el mismo idioma que el ticket (en este caso español).',
        },
        {
          role: 'user',
          content: [
            `Asunto: ${ticket.subject ?? '(sin asunto)'}`,
            `Cliente: ${ticket.customer_name ?? 'N/A'}`,
            `Categoría: ${category ?? 'desconocida'}`,
            `Severidad: ${severity ?? 'desconocida'}`,
            summary ? `Resumen del ticket: ${summary}` : '',
            '',
            'Descripción original del ticket:',
            ticket.description,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      temperature: 0.4,
      max_tokens: 280,
    })

    const content = chatCompletion.choices[0]?.message?.content ?? ''
    const suggested_reply = typeof content === 'string' ? content.trim() : ''

    if (!suggested_reply) {
      return NextResponse.json(
        { error: 'No se pudo generar una respuesta sugerida.' },
        { status: 500 },
      )
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
      console.error('Supabase existing error (suggest-reply):', existingError)
    }

    const now = new Date().toISOString()

    if (existing) {
      const { error: updateError } = await supabase
        .from('ticket_insights')
        .update({
          suggested_reply,
          updated_at: now,
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Supabase update error (suggest-reply):', updateError)
        return NextResponse.json(
          {
            error:
              'No se pudo actualizar la respuesta en la base de datos.',
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
          category: null,
          severity: null,
          suggested_reply,
          created_at: now,
          updated_at: now,
        })

      if (insertError) {
        console.error('Supabase insert error (suggest-reply):', insertError)
        return NextResponse.json(
          { error: 'No se pudo guardar la respuesta en la base de datos.' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ suggested_reply })
  } catch (error) {
    console.error('Unhandled error (suggest-reply):', error)
    return NextResponse.json(
      { error: 'Error interno al generar la respuesta sugerida.' },
      { status: 500 },
    )
  }
}
