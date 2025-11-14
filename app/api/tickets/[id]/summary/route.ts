// app/api/tickets/[id]/summary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const groqApiKey = process.env.GROQ_API_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const groq = new Groq({ apiKey: groqApiKey })

// Config de límites
const DAILY_LIMIT = 50           // créditos máximos por día
const COST_SUMMARY = 1           // costo de esta acción

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await context.params

    // 1) Traer ticket con user_id
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, user_id, subject, description')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      console.error('Supabase ticket error (summary):', ticketError)
      return NextResponse.json(
        { error: 'Ticket no encontrado.' },
        { status: 404 },
      )
    }

    if (!ticket.description || ticket.description.trim().length === 0) {
      return NextResponse.json(
        { error: 'El ticket no tiene descripción para resumir.' },
        { status: 400 },
      )
    }

    const userId = ticket.user_id as string
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // 2) Consultar uso de créditos de hoy
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
      console.error('Supabase usage error (summary):', usageError)
    }

    const usedCredits = usage?.used_credits ?? 0
    const newTotal = usedCredits + COST_SUMMARY

    if (newTotal > DAILY_LIMIT) {
      return NextResponse.json(
        {
          error:
            'Has alcanzado el límite diario de acciones de IA. Vuelve a intentarlo mañana.',
        },
        { status: 429 },
      )
    }

    // 3) Actualizar contador de créditos antes de llamar a la IA
    if (usage) {
      const { error: updateUsageError } = await supabase
        .from('ia_usage')
        .update({ used_credits: newTotal })
        .eq('id', usage.id)

      if (updateUsageError) {
        console.error('Supabase update usage error (summary):', updateUsageError)
      }
    } else {
      const { error: insertUsageError } = await supabase
        .from('ia_usage')
        .insert({
          user_id: userId,
          window_start: today,
          used_credits: COST_SUMMARY,
        })

      if (insertUsageError) {
        console.error('Supabase insert usage error (summary):', insertUsageError)
      }
    }

    // 4) Llamar a Groq para generar el resumen
    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que resume tickets de soporte de forma breve y clara. Máximo 3 frases.',
        },
        {
          role: 'user',
          content: `Asunto: ${ticket.subject ?? '(sin asunto)'}\n\nDescripción del ticket:\n${ticket.description}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 180,
    })

    const content = chatCompletion.choices[0]?.message?.content ?? ''
    const summary = typeof content === 'string' ? content.trim() : ''

    if (!summary) {
      return NextResponse.json(
        { error: 'No se pudo generar un resumen.' },
        { status: 500 },
      )
    }

    // 5) Guardar en ticket_insights
    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from('ticket_insights')
      .select('id')
      .eq('ticket_id', ticketId)
      .maybeSingle()

    if (existingError) {
      console.error('Supabase existing error (summary):', existingError)
    }

    const now = new Date().toISOString()

    if (existing) {
      const { error: updateError } = await supabase
        .from('ticket_insights')
        .update({
          summary,
          updated_at: now,
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Supabase update error (summary):', updateError)
        return NextResponse.json(
          { error: 'No se pudo actualizar el resumen en la base de datos.' },
          { status: 500 },
        )
      }
    } else {
      const { error: insertError } = await supabase
        .from('ticket_insights')
        .insert({
          ticket_id: ticketId,
          summary,
          category: null,
          severity: null,
          suggested_reply: null,
          created_at: now,
          updated_at: now,
        })

      if (insertError) {
        console.error('Supabase insert error (summary):', insertError)
        return NextResponse.json(
          { error: 'No se pudo guardar el resumen en la base de datos.' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Unhandled error (summary):', error)
    return NextResponse.json(
      { error: 'Error interno al generar el resumen.' },
      { status: 500 },
    )
  }
}
