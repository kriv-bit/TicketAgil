// app/(app)/tickets/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/SupabaseClient'

type TicketStatus = 'open' | 'pending' | 'closed'

type Ticket = {
  id: string
  subject: string | null
  description: string | null
  status: TicketStatus
  customer_name: string | null
  created_at: string
  updated_at: string
}

type TicketInsights = {
  id: string
  summary: string | null
  category: string | null
  severity: string | null
  suggested_reply: string | null
}

type IaQuota = {
  daily_limit: number
  used_credits: number
  remaining_credits: number
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [insights, setInsights] = useState<TicketInsights | null>(null)

  const [loadingTicket, setLoadingTicket] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingClassify, setLoadingClassify] = useState(false)
  const [loadingReply, setLoadingReply] = useState(false)
  const [iaError, setIaError] = useState<string | null>(null)

  const [quota, setQuota] = useState<IaQuota | null>(null)
  const [loadingQuota, setLoadingQuota] = useState(false)

  // 1) Cargar ticket + insights
  useEffect(() => {
    const fetchData = async () => {
      setLoadingTicket(true)
      setError(null)
      setIaError(null)

      try {
        const {
          data: ticketData,
          error: ticketError,
        } = await supabase
          .from('tickets')
          .select(
            'id, subject, description, status, customer_name, created_at, updated_at',
          )
          .eq('id', ticketId)
          .single()

        if (ticketError || !ticketData) {
          console.error(ticketError)
          setError('No se encontró el ticket.')
          setLoadingTicket(false)
          return
        }

        setTicket(ticketData as Ticket)

        const {
          data: insightsData,
          error: insightsError,
        } = await supabase
          .from('ticket_insights')
          .select('id, summary, category, severity, suggested_reply')
          .eq('ticket_id', ticketId)
          .maybeSingle()

        if (insightsError) {
          console.error(insightsError)
        }

        if (insightsData) {
          setInsights(insightsData as TicketInsights)
        } else {
          setInsights(null)
        }
      } catch (err) {
        console.error(err)
        setError('Error al cargar el ticket.')
      } finally {
        setLoadingTicket(false)
      }
    }

    if (ticketId) {
      void fetchData()
    }
  }, [ticketId])

  // 2) Cargar cuota IA del usuario logueado
  useEffect(() => {
    const fetchQuota = async () => {
      setLoadingQuota(true)
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error('Error obteniendo user (quota):', userError)
          setLoadingQuota(false)
          return
        }

        if (!user) {
          setLoadingQuota(false)
          return
        }

        const res = await fetch('/api/ia/quota', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        })

        const text = await res.text()
        let data: any = null

        try {
          data = JSON.parse(text)
        } catch (err) {
          console.error('Respuesta no JSON desde /api/ia/quota:', text)
          setLoadingQuota(false)
          return
        }

        if (!res.ok) {
          console.error('Error cuota IA:', data.error)
          setLoadingQuota(false)
          return
        }

        setQuota({
          daily_limit: data.daily_limit,
          used_credits: data.used_credits,
          remaining_credits: data.remaining_credits,
        })
      } catch (err) {
        console.error('Error inesperado al obtener cuota IA:', err)
      } finally {
        setLoadingQuota(false)
      }
    }

    void fetchQuota()
  }, [])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const renderStatusBadge = (status: TicketStatus) => {
    const base =
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium'
    if (status === 'open') {
      return (
        <span className={`${base} bg-emerald-500/10 text-emerald-200 border border-emerald-500/40`}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Abierto
        </span>
      )
    }
    if (status === 'pending') {
      return (
        <span className={`${base} bg-amber-500/10 text-amber-200 border border-amber-500/40`}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Pendiente
        </span>
      )
    }
    return (
      <span className={`${base} bg-slate-600/20 text-slate-200 border border-slate-500/60`}>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        Cerrado
      </span>
    )
  }

  const description = ticket?.description ?? ''

  // Helpers para actualizar cuota localmente (para UX)
  const decrementQuota = (cost: number) => {
    setQuota((prev) =>
      prev
        ? {
            ...prev,
            used_credits: prev.used_credits + cost,
            remaining_credits: Math.max(0, prev.remaining_credits - cost),
          }
        : prev,
    )
  }

  // HANDLERS IA
  const handleSummarize = async () => {
    if (!ticketId) return
    setLoadingSummary(true)
    setIaError(null)

    try {
      const res = await fetch(`/api/tickets/${ticketId}/summary`, {
        method: 'POST',
      })

      const text = await res.text()
      let data: any = null

      try {
        data = JSON.parse(text)
      } catch (err) {
        console.error('Respuesta no JSON desde /summary:', text)
        setIaError('Error inesperado en el servidor al resumir el ticket.')
        return
      }

      if (!res.ok) {
        setIaError(data.error ?? 'No se pudo generar el resumen.')
        return
      }

      setInsights((prev) => ({
        ...(prev ?? {
          id: '',
          summary: null,
          category: null,
          severity: null,
          suggested_reply: null,
        }),
        summary: data.summary as string,
      }))

      // Esta acción cuesta 1 crédito
      decrementQuota(1)
    } catch (err) {
      console.error(err)
      setIaError('Error inesperado al resumir el ticket.')
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleClassify = async () => {
    if (!ticketId) return
    setLoadingClassify(true)
    setIaError(null)

    try {
      const res = await fetch(`/api/tickets/${ticketId}/classify`, {
        method: 'POST',
      })

      const text = await res.text()
      let data: any = null

      try {
        data = JSON.parse(text)
      } catch (err) {
        console.error('Respuesta no JSON desde /classify:', text)
        setIaError('Error inesperado en el servidor al clasificar el ticket.')
        return
      }

      if (!res.ok) {
        setIaError(data.error ?? 'No se pudo clasificar el ticket.')
        return
      }

      setInsights((prev) => ({
        ...(prev ?? {
          id: '',
          summary: null,
          category: null,
          severity: null,
          suggested_reply: null,
        }),
        category: data.category as string,
        severity: data.severity as string,
      }))

      // Clasificar = 1 crédito
      decrementQuota(1)
    } catch (err) {
      console.error(err)
      setIaError('Error inesperado al clasificar el ticket.')
    } finally {
      setLoadingClassify(false)
    }
  }

  const handleSuggestReply = async () => {
    if (!ticketId) return
    setLoadingReply(true)
    setIaError(null)

    try {
      const res = await fetch(`/api/tickets/${ticketId}/suggest-reply`, {
        method: 'POST',
      })

      const text = await res.text()
      let data: any = null

      try {
        data = JSON.parse(text)
      } catch (err) {
        console.error('Respuesta no JSON desde /suggest-reply:', text)
        setIaError('Error inesperado en el servidor al generar la respuesta.')
        return
      }

      if (!res.ok) {
        setIaError(data.error ?? 'No se pudo generar la respuesta.')
        return
      }

      setInsights((prev) => ({
        ...(prev ?? {
          id: '',
          summary: null,
          category: null,
          severity: null,
          suggested_reply: null,
        }),
        suggested_reply: data.suggested_reply as string,
      }))

      // Respuesta sugerida = 2 créditos
      decrementQuota(2)
    } catch (err) {
      console.error(err)
      setIaError('Error inesperado al generar la respuesta.')
    } finally {
      setLoadingReply(false)
    }
  }

  if (loadingTicket) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        <span className="mr-2 h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin" />
        Cargando ticket...
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push('/tickets')}
          className="text-xs inline-flex items-center gap-1 text-slate-400 hover:text-slate-100"
        >
          ← Volver a tickets
        </button>
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error ?? 'No se pudo cargar el ticket.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push('/tickets')}
            className="text-xs inline-flex items-center gap-1 text-slate-400 hover:text-slate-100 mb-2"
          >
            ← Volver a tickets
          </button>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50">
            {ticket.subject || '(Sin asunto)'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {renderStatusBadge(ticket.status)}
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span>
              Creado:{' '}
              <span className="text-slate-200">
                {formatDate(ticket.created_at)}
              </span>
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span>
              Actualizado:{' '}
              <span className="text-slate-200">
                {formatDate(ticket.updated_at)}
              </span>
            </span>
            {ticket.customer_name && (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-700" />
                <span>
                  Cliente:{' '}
                  <span className="text-slate-200">
                    {ticket.customer_name}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs text-slate-300 max-w-xs">
          <p className="uppercase tracking-[0.16em] text-slate-500 mb-1">
            IA · Panel de acciones
          </p>
          <p>
            Resúmenes, clasificación y respuesta sugerida para que puedas
            responder más rápido y con mejor contexto.
          </p>

          {/* Créditos IA */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              Créditos de IA hoy
            </span>
            {quota ? (
              <span className="text-[11px] font-semibold text-sky-300">
                {quota.remaining_credits} / {quota.daily_limit}
              </span>
            ) : loadingQuota ? (
              <span className="text-[11px] text-slate-500">
                Cargando…
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Layout 2 columnas */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(320px,1.3fr)]">
        {/* Columna izquierda: contenido del ticket */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-2">
              Descripción del ticket
            </h2>
            {description ? (
              <p className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed">
                {description}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Este ticket no tiene descripción.
              </p>
            )}
          </div>

          {insights?.suggested_reply && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-emerald-100">
                  Respuesta sugerida (IA)
                </h2>
                <span className="text-[11px] text-emerald-200 bg-emerald-500/20 rounded-full px-2 py-0.5">
                  Editable
                </span>
              </div>
              <textarea
                className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/60 text-sm text-emerald-50 p-3 min-h-[160px] outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 resize-vertical"
                value={insights.suggested_reply ?? ''}
                onChange={(e) =>
                  setInsights((prev) =>
                    prev
                      ? { ...prev, suggested_reply: e.target.value }
                      : {
                          id: '',
                          summary: null,
                          category: null,
                          severity: null,
                          suggested_reply: e.target.value,
                        },
                  )
                }
              />
              <p className="mt-2 text-[11px] text-emerald-200/80">
                Ajusta el texto antes de enviarlo al cliente desde tu herramienta
                de soporte (Zendesk, Intercom, etc.).
              </p>
            </div>
          )}
        </section>

        {/* Columna derecha: panel IA */}
        <aside className="space-y-4">
          {/* Errores IA */}
          {iaError && (
            <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {iaError}
            </div>
          )}

          {/* Resumen */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Resumen IA
                </h2>
                <p className="text-xs text-slate-400">
                  Entiende el problema en 1–3 frases.
                </p>
              </div>
              <button
                type="button"
                disabled={loadingSummary || !description}
                onClick={handleSummarize}
                className="inline-flex items-center gap-1 rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-500/20 transition"
              >
                {loadingSummary && (
                  <span className="h-3 w-3 rounded-full border-2 border-sky-200 border-t-transparent animate-spin" />
                )}
                {loadingSummary ? 'Resumiendo...' : 'Resumir ticket'}
              </button>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2 text-sm text-slate-200 min-h-[70px]">
              {insights?.summary ? (
                <p className="whitespace-pre-wrap">{insights.summary}</p>
              ) : description ? (
                <p className="text-slate-500 text-xs">
                  Aún no hay resumen. Haz clic en{' '}
                  <span className="text-sky-300 font-medium">
                    “Resumir ticket”
                  </span>{' '}
                  para generarlo.
                </p>
              ) : (
                <p className="text-slate-500 text-xs">
                  No hay descripción para resumir este ticket.
                </p>
              )}
            </div>
          </div>

          {/* Clasificación */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Clasificación IA
                </h2>
                <p className="text-xs text-slate-400">
                  Category + severity para reporting.
                </p>
              </div>
              <button
                type="button"
                disabled={loadingClassify || !description}
                onClick={handleClassify}
                className="inline-flex items-center gap-1 rounded-full border border-violet-500/60 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-500/20 transition"
              >
                {loadingClassify && (
                  <span className="h-3 w-3 rounded-full border-2 border-violet-200 border-t-transparent animate-spin" />
                )}
                {loadingClassify ? 'Clasificando...' : 'Clasificar ticket'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 inline-flex items-center gap-2">
                <span className="text-slate-400">Categoría</span>
                <span className="font-mono text-[11px] text-slate-100">
                  {insights?.category ?? '—'}
                </span>
              </div>
              <div className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 inline-flex items-center gap-2">
                <span className="text-slate-400">Severidad</span>
                <span className="font-mono text-[11px] text-slate-100">
                  {insights?.severity ?? '—'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Categorías válidas: <span className="font-mono">bug</span>,{' '}
              <span className="font-mono">payment</span>,{' '}
              <span className="font-mono">account</span>,{' '}
              <span className="font-mono">question</span>,{' '}
              <span className="font-mono">other</span>. Severidad:{' '}
              <span className="font-mono">low</span>,{' '}
              <span className="font-mono">medium</span>,{' '}
              <span className="font-mono">high</span>.
            </p>
          </div>

          {/* Respuesta sugerida */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Respuesta sugerida
                </h2>
                <p className="text-xs text-slate-400">
                  Draft para responder al cliente con buen tono.
                </p>
              </div>
              <button
                type="button"
                disabled={loadingReply || !description}
                onClick={handleSuggestReply}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500/20 transition"
              >
                {loadingReply && (
                  <span className="h-3 w-3 rounded-full border-2 border-emerald-200 border-t-transparent animate-spin" />
                )}
                {loadingReply ? 'Generando...' : 'Sugerir respuesta'}
              </button>
            </div>
            {!insights?.suggested_reply && (
              <p className="text-[11px] text-slate-500">
                Usa la descripción, el resumen y la clasificación para generar
                una respuesta en tono profesional. El texto aparecerá como
                editable en la columna izquierda.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
