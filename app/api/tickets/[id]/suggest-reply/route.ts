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

// Créditos IA
const DAILY_LIMIT = 50
const COST_SUGGEST_REPLY = 2

type TicketInsightsRow = {
  summary: string | null
  category: string | null
  severity: string | null
}

type UserSettingsRow = {
  company_name: string | null
  default_tone: string | null
  language: string | null
  reply_guidelines: string | null
}

// Construye el prompt del sistema usando settings
function buildSystemPrompt(options: {
  companyName: string
  tone: string
  language: string
  guidelines: string
}) {
  const { companyName, tone, language, guidelines } = options

  const toneDescriptions: Record<string, string> = {
    neutral: 'tono neutral y profesional',
    formal: 'tono formal y respetuoso, tratando de usted',
    friendly: 'tono cercano, cálido y empático',
    technical:
      'tono técnico, dirigido a usuarios con conocimientos técnicos',
    brief: 'respuestas breves y directas, sin mucho relleno',
    detailed:
      'respuestas detalladas, con contexto y pasos explicados de forma clara',
  }

  const toneText = toneDescriptions[tone] ?? toneDescriptions.neutral

  const languageText =
    language === 'en'
      ? 'Responde siempre en inglés. Si el ticket está en otro idioma, tradúcelo y responde en inglés.'
      : 'Responde siempre en español. Si el ticket está en otro idioma, tradúcelo y responde en español.'

  const effectiveGuidelines =
    guidelines?.trim().length > 0
      ? guidelines.trim()
      : '- Sé amable y claro.\n- No prometas cosas que no estén confirmadas.\n- Mantén un tono profesional y respetuoso.\n- No menciones que sigues políticas internas.'

  return `
Eres un agente de soporte al cliente de la empresa "${companyName}".
Tu objetivo es redactar respuestas por email o chat al cliente de forma clara, empática y profesional.

${languageText}
Tono deseado: ${toneText}.

Políticas internas que debes respetar SIEMPRE (no las menciones al cliente):
${effectiveGuidelines}

Instrucciones importantes:
- Responde únicamente con el mensaje que enviarías al cliente.
- No expliques que eres un modelo de IA ni cómo generaste la respuesta.
- No uses formato Markdown, solo texto plano.
- No inventes datos sobre el producto o el cliente.
- No incluyas nada fuera del cuerpo del mensaje al cliente (sin notas internas).
`
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await context.params

    // 1) Cargar ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, user_id, subject, description, customer_name, status')
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
        {
          error:
            'El ticket no tiene descripción para generar una respuesta sugerida.',
        },
        { status: 400 },
      )
    }

    const userId = ticket.user_id as string

    // 2) Cargar insights existentes (summary, category, severity)
    const {
      data: insights,
      error: insightsError,
    } = await supabase
      .from('ticket_insights')
      .select('id, summary, category, severity')
      .eq('ticket_id', ticketId)
      .maybeSingle<TicketInsightsRow & { id: string }>()

    if (insightsError) {
      console.error(
        'Supabase insights error (suggest-reply):',
        insightsError,
      )
    }

    const summary = insights?.summary ?? null
    const category = insights?.category ?? null
    const severity = insights?.severity ?? null

    // 3) Créditos IA (por usuario y día)
    const today = new Date().toISOString().slice(0, 10)

    const {
      data: usage,
      error: usageError,
    } = await supabase
      .from('ia_usage')
      .select('id, used_credits')
      .eq('user_id', userId)
      .eq('window_start', today)
      .maybeSingle<{ id: string; used_credits: number }>()

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

    // Actualizar / crear registro de uso
    if (usage) {
      const { error: updateUsageError } = await supabase
        .from('ia_usage')
        .update({ used_credits: newTotal })
        .eq('id', usage.id)

      if (updateUsageError) {
        console.error(
          'Supabase update usage error (suggest-reply):',
          updateUsageError,
        )
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
        console.error(
          'Supabase insert usage error (suggest-reply):',
          insertUsageError,
        )
      }
    }

    const remainingCredits = Math.max(0, DAILY_LIMIT - newTotal)

    // 4) Cargar settings de usuario (tono, idioma, políticas)
    const {
      data: settings,
      error: settingsError,
    } = await supabase
      .from('user_settings')
      .select(
        'company_name, default_tone, language, reply_guidelines',
      )
      .eq('user_id', userId)
      .maybeSingle<UserSettingsRow>()

    if (settingsError) {
      console.error('Supabase settings error (suggest-reply):', settingsError)
    }

    const companyName =
      settings?.company_name?.trim() || 'tu empresa'
    const tone = settings?.default_tone?.trim() || 'neutral'
    const language = settings?.language?.trim() || 'es'
    const guidelines = settings?.reply_guidelines ?? ''

    const systemPrompt = buildSystemPrompt({
      companyName,
      tone,
      language,
      guidelines,
    })

    // 5) Construir prompt de usuario con contexto del ticket
    const contextLines: string[] = []

    contextLines.push(`Asunto: ${ticket.subject ?? '(sin asunto)'}`)
    contextLines.push(`Estado actual del ticket: ${ticket.status}`)
    contextLines.push(
      `Cliente: ${ticket.customer_name ?? 'Cliente sin nombre'}`,
    )
    contextLines.push(
      `Descripción original del ticket:\n${ticket.description}`,
    )

    if (summary) {
      contextLines.push(
        `Resumen del ticket (generado por la IA):\n${summary}`,
      )
    }

    if (category || severity) {
      contextLines.push(
        `Clasificación IA: categoría = ${
          category ?? 'desconocida'
        }, severidad = ${severity ?? 'desconocida'}.`,
      )
    }

    const userPrompt = [
      'Necesito que redactes una respuesta para este ticket de soporte.',
      '',
      'Contexto del ticket:',
      contextLines.join('\n\n'),
      '',
      'Objetivo de la respuesta:',
      '- Responde al problema del cliente de forma clara y empática.',
      '- Si falta información para resolver el problema, pide los datos necesarios de forma amable.',
      '- Si el problema implica pasos concretos, descríbelos de forma ordenada.',
      '- Cierra el mensaje con una despedida cordial acorde al tono configurado.',
    ].join('\n')

    // 6) Llamada a Groq
    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.4,
      max_completion_tokens: 280,
    })

    const content = chatCompletion.choices[0]?.message?.content ?? ''
    const suggested_reply =
      typeof content === 'string' ? content.trim() : ''

    if (!suggested_reply) {
      return NextResponse.json(
        { error: 'No se pudo generar una respuesta sugerida.' },
        { status: 500 },
      )
    }

    // 7) Guardar suggested_reply en ticket_insights
    const now = new Date().toISOString()

    if (insights?.id) {
      const { error: updateError } = await supabase
        .from('ticket_insights')
        .update({
          suggested_reply,
          updated_at: now,
        })
        .eq('id', insights.id)

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
          {
            error:
              'No se pudo guardar la respuesta en la base de datos.',
          },
          { status: 500 },
        )
      }
    }

    // 8) Respuesta al frontend
    return NextResponse.json({
      suggested_reply,
      remaining_credits: remainingCredits,
    })
  } catch (error) {
    console.error('Unhandled error (suggest-reply):', error)
    return NextResponse.json(
      { error: 'Error interno al generar la respuesta sugerida.' },
      { status: 500 },
    )
  }
}
