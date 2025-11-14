'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/SupabaseClient'
import { useRouter } from 'next/navigation'

type TicketStatus = 'open' | 'pending' | 'closed'

type TimeFilter = '7d' | '30d' | '90d' | 'all'
type StatusFilter = 'all' | TicketStatus

type Ticket = {
  id: string
  subject: string | null
  status: TicketStatus
  customer_name: string | null
  created_at: string
  closed_at: string | null
}

type TicketWithInsights = Ticket & {
  category: string | null
  severity: string | null
  has_summary: boolean
  has_classification: boolean
  has_reply: boolean
}

export default function DashboardPage() {
  const router = useRouter()

  const [tickets, setTickets] = useState<TicketWithInsights[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  // 🔹 Cargar tickets + insights
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error('Error obteniendo user:', userError)
          setError('No se pudo obtener el usuario actual.')
          setLoading(false)
          return
        }

        // Traemos hasta 500 tickets del usuario
        const { data: ticketData, error: ticketsError } = await supabase
          .from('tickets')
          .select(
            'id, subject, status, customer_name, created_at, closed_at',
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500)

        if (ticketsError) {
          console.error('Error cargando tickets:', ticketsError)
          setError('No se pudieron cargar los tickets.')
          setLoading(false)
          return
        }

        const baseTickets = (ticketData ?? []) as Ticket[]

        if (baseTickets.length === 0) {
          setTickets([])
          setLoading(false)
          return
        }

        const ticketIds = baseTickets.map((t) => t.id)

        const {
          data: insightsData,
          error: insightsError,
        } = await supabase
          .from('ticket_insights')
          .select('ticket_id, summary, category, severity, suggested_reply')
          .in('ticket_id', ticketIds)

        if (insightsError) {
          console.error('Error cargando insights:', insightsError)
        }

        const insightsMap = new Map<
          string,
          {
            category: string | null
            severity: string | null
            has_summary: boolean
            has_classification: boolean
            has_reply: boolean
          }
        >()

        if (insightsData && insightsData.length > 0) {
          for (const row of insightsData as any[]) {
            const has_summary = !!row.summary && row.summary.trim().length > 0
            const has_classification =
              !!row.category && row.category.trim().length > 0
            const has_reply =
              !!row.suggested_reply && row.suggested_reply.trim().length > 0

            insightsMap.set(row.ticket_id, {
              category: row.category ?? null,
              severity: row.severity ?? null,
              has_summary,
              has_classification,
              has_reply,
            })
          }
        }

        const merged: TicketWithInsights[] = baseTickets.map((t) => {
          const ia = insightsMap.get(t.id) ?? {
            category: null,
            severity: null,
            has_summary: false,
            has_classification: false,
            has_reply: false,
          }
          return {
            ...t,
            ...ia,
          }
        })

        setTickets(merged)
      } catch (err) {
        console.error(err)
        setError('Error inesperado al cargar el dashboard.')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const formatResolutionTime = (avgHours: number | null) => {
    if (avgHours === null || Number.isNaN(avgHours)) return '—'
    if (avgHours < 1) {
      const minutes = Math.round(avgHours * 60)
      return `${minutes} min`
    }
    if (avgHours >= 48) {
      const days = avgHours / 24
      return `${days.toFixed(1)} días`
    }
    return `${avgHours.toFixed(1)} h`
  }

  // 🔹 Tickets filtrados según periodo, estado y search
  const filteredTickets = useMemo(() => {
    let list = [...tickets]

    // Filtro por periodo
    if (timeFilter !== 'all') {
      const now = new Date()
      const days =
        timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 90
      const startDate = new Date(now)
      startDate.setDate(now.getDate() - days + 1)

      list = list.filter((ticket) => {
        const created = new Date(ticket.created_at)
        return created >= startDate
      })
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      list = list.filter((ticket) => ticket.status === statusFilter)
    }

    // Search por asunto
    if (search.trim().length > 0) {
      const q = search.toLowerCase()
      list = list.filter((ticket) =>
        (ticket.subject ?? '').toLowerCase().includes(q),
      )
    }

    return list
  }, [tickets, timeFilter, statusFilter, search])

  // 🔹 KPIs y métricas derivadas
  const metrics = useMemo(() => {
    const total = filteredTickets.length
    const open = filteredTickets.filter((t) => t.status === 'open').length
    const pending = filteredTickets.filter((t) => t.status === 'pending').length
    const closed = filteredTickets.filter((t) => t.status === 'closed').length

    const closedWithDates = filteredTickets.filter(
      (t) => t.status === 'closed' && t.closed_at,
    )

    let avgResolutionHours: number | null = null
    if (closedWithDates.length > 0) {
      let sumHours = 0
      for (const t of closedWithDates) {
        const created = new Date(t.created_at).getTime()
        const closedAt = new Date(t.closed_at as string).getTime()
        const diffHours = (closedAt - created) / 36e5
        sumHours += diffHours
      }
      avgResolutionHours = sumHours / closedWithDates.length
    }

    // IA
    const withAnyIa = filteredTickets.filter(
      (t) => t.has_summary || t.has_classification || t.has_reply,
    ).length

    const withSummary = filteredTickets.filter((t) => t.has_summary).length
    const withClassification = filteredTickets.filter(
      (t) => t.has_classification,
    ).length
    const withReply = filteredTickets.filter((t) => t.has_reply).length

    const iaCoverage =
      total > 0 ? Math.round((withAnyIa / total) * 100) : 0

    // Categorías
    const categoryCounts: Record<string, number> = {
      bug: 0,
      payment: 0,
      account: 0,
      question: 0,
      other: 0,
    }

    for (const t of filteredTickets) {
      const cat = (t.category ?? '').toLowerCase()
      if (cat && categoryCounts[cat] !== undefined) {
        categoryCounts[cat]++
      } else if (cat) {
        categoryCounts.other++
      }
    }

    return {
      total,
      open,
      pending,
      closed,
      avgResolutionHours,
      withAnyIa,
      withSummary,
      withClassification,
      withReply,
      iaCoverage,
      categoryCounts,
    }
  }, [filteredTickets])

  // 🔹 Data para gráfico "tickets por día"
  const ticketsByDay = useMemo(() => {
    if (tickets.length === 0) return []

    // Cuántos días mostramos en el gráfico
    const daysBack =
      timeFilter === '7d'
        ? 7
        : timeFilter === '30d'
        ? 30
        : timeFilter === '90d'
        ? 90
        : 30 // para "all" mostramos últimos 30 días

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(now.getDate() - daysBack + 1)

    const buckets: { date: string; label: string; count: number }[] = []

    // Inicializamos días
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const dayKey = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
      })
      buckets.push({ date: dayKey, label, count: 0 })
    }

    for (const t of filteredTickets) {
      const dayKey = t.created_at.slice(0, 10)
      const bucket = buckets.find((b) => b.date === dayKey)
      if (bucket) {
        bucket.count++
      }
    }

    return buckets
  }, [filteredTickets, tickets, timeFilter])

  const maxTicketsPerDay =
    ticketsByDay.length > 0
      ? Math.max(...ticketsByDay.map((b) => b.count))
      : 0

  // 🔹 Data para gráfico "tickets por estado"
  const ticketsByStatus = useMemo(() => {
    const { open, pending, closed } = metrics
    const rows = [
      { label: 'Abiertos', value: open, color: 'bg-emerald-500' },
      { label: 'Pendientes', value: pending, color: 'bg-amber-400' },
      { label: 'Cerrados', value: closed, color: 'bg-slate-400' },
    ]
    const max = Math.max(1, ...rows.map((r) => r.value))
    return { rows, max }
  }, [metrics])

  // 🔹 Data para "tickets por categoría"
  const categoriesForChart = useMemo(() => {
    const entries = Object.entries(metrics.categoryCounts)
    const max = entries.length
      ? Math.max(...entries.map(([_, v]) => v))
      : 0
    const niceLabels: Record<string, string> = {
      bug: 'Bug',
      payment: 'Pago',
      account: 'Cuenta',
      question: 'Pregunta',
      other: 'Otro',
    }

    return {
      rows: entries.map(([key, value]) => ({
        key,
        label: niceLabels[key] ?? key,
        value,
      })),
      max,
    }
  }, [metrics])

  const latestTickets = useMemo(() => {
    return [...filteredTickets]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8)
  }, [filteredTickets])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        <span className="mr-2 h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin" />
        Cargando dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50">
          Dashboard de soporte
        </h1>
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50">
            Dashboard de soporte
          </h1>
          <p className="text-sm text-slate-400">
            Importa tus tickets y ve métricas clave de tu equipo de soporte.
          </p>
        </header>

        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-4 py-8 text-center text-sm text-slate-400">
          Aún no has importado tickets. Empieza en la sección{' '}
          <button
            type="button"
            onClick={() => router.push('/import')}
            className="font-medium text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline"
          >
            Importar
          </button>{' '}
          para ver KPIs, gráficos y distribución por estado/categoría.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER + FILTROS */}
      <header className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50">
              Dashboard de soporte
            </h1>
            <p className="text-sm text-slate-400">
              Overview de tus tickets: volumen, estados, tiempos de resolución y
              cobertura de IA.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-start md:justify-end text-xs">
            {/* Filtro periodo */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Periodo:</span>
              {(['7d', '30d', '90d', 'all'] as TimeFilter[]).map((v) => {
                const label =
                  v === '7d'
                    ? '7 días'
                    : v === '30d'
                    ? '30 días'
                    : v === '90d'
                    ? '90 días'
                    : 'Todo'
                const active = timeFilter === v
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTimeFilter(v)}
                    className={`rounded-full px-3 py-1 border text-[11px] transition ${
                      active
                        ? 'bg-slate-100 text-slate-900 border-slate-100'
                        : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Filtro estado */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Estado:</span>
              {(['all', 'open', 'pending', 'closed'] as StatusFilter[]).map(
                (s) => {
                  const label =
                    s === 'all'
                      ? 'Todos'
                      : s === 'open'
                      ? 'Abiertos'
                      : s === 'pending'
                      ? 'Pendientes'
                      : 'Cerrados'
                  const active = statusFilter === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-full px-3 py-1 border text-[11px] transition ${
                        active
                          ? 'bg-slate-100 text-slate-900 border-slate-100'
                          : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {label}
                    </button>
                  )
                },
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar asunto..."
                className="w-44 md:w-56 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* KPIs PRINCIPALES */}
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
          <p className="text-[11px] text-slate-400 uppercase tracking-[0.18em]">
            Tickets totales
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {metrics.total}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            En el periodo y filtros seleccionados.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <p className="text-[11px] text-emerald-200 uppercase tracking-[0.18em]">
            Abiertos
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-100">
            {metrics.open}
          </p>
          <p className="mt-1 text-[11px] text-emerald-200/80">
            Tickets activos que aún requieren atención.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="text-[11px] text-amber-200 uppercase tracking-[0.18em]">
            Pendientes
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-100">
            {metrics.pending}
          </p>
          <p className="mt-1 text-[11px] text-amber-200/80">
            Esperando respuesta del cliente o de otro equipo.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3">
          <p className="text-[11px] text-slate-300 uppercase tracking-[0.18em]">
            Cerrados
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {metrics.closed}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Tickets resueltos y cerrados en el periodo.
          </p>
        </div>
      </section>

      {/* KPIs SECUNDARIOS: TIEMPOS + IA */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/5 px-4 py-3">
          <p className="text-[11px] text-sky-200 uppercase tracking-[0.18em]">
            Tiempo promedio de resolución
          </p>
          <p className="mt-2 text-2xl font-semibold text-sky-100">
            {formatResolutionTime(metrics.avgResolutionHours)}
          </p>
          <p className="mt-1 text-[11px] text-sky-200/80">
            Calculado solo sobre tickets cerrados con fecha de cierre.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3">
          <p className="text-[11px] text-emerald-200 uppercase tracking-[0.18em]">
            Tickets con IA aplicada
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-100">
            {metrics.withAnyIa}
          </p>
          <p className="mt-1 text-[11px] text-emerald-200/80">
            Al menos un resumen, clasificación o respuesta sugerida.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3">
          <p className="text-[11px] text-slate-300 uppercase tracking-[0.18em]">
            Cobertura IA
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {metrics.iaCoverage}%
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Proporción de tickets del periodo donde la IA ya ayudó.
          </p>
        </div>
      </section>

      {/* GRAFICOS */}
      <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
        {/* Tickets por día */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Tickets creados por día
              </h2>
              <p className="text-xs text-slate-400">
                Volumen diario en el periodo seleccionado.
              </p>
            </div>
            <span className="text-[11px] text-slate-500">
              {ticketsByDay.length} días
            </span>
          </div>

          {ticketsByDay.length === 0 ? (
            <p className="text-xs text-slate-500">
              No hay datos suficientes para este periodo.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {ticketsByDay.map((b) => {
                const pct =
                  maxTicketsPerDay > 0
                    ? (b.count / maxTicketsPerDay) * 100
                    : 0
                return (
                  <div
                    key={b.date}
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <span className="w-12 text-right text-slate-500">
                      {b.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-sky-500/80"
                        style={{ width: `${pct || 3}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-slate-300">
                      {b.count}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Estado + categoría */}
        <div className="space-y-4">
          {/* Por estado */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Tickets por estado
            </h2>
            <p className="text-xs text-slate-400">
              Distribución de tickets en el periodo filtrado.
            </p>

            <div className="space-y-2 mt-1">
              {ticketsByStatus.rows.map((row) => {
                const pct =
                  ticketsByStatus.max > 0
                    ? (row.value / ticketsByStatus.max) * 100
                    : 0
                return (
                  <div
                    key={row.label}
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <span className="w-16 text-slate-300">{row.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${row.color}`}
                        style={{ width: `${pct || 3}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-slate-300">
                      {row.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Por categoría */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Tickets por categoría (IA)
            </h2>
            <p className="text-xs text-slate-400">
              Basado en la clasificación automática de la IA.
            </p>

            {categoriesForChart.rows.every((r) => r.value === 0) ? (
              <p className="text-[11px] text-slate-500 mt-1">
                Todavía no hay tickets clasificados por IA en este periodo.
              </p>
            ) : (
              <div className="space-y-2 mt-1">
                {categoriesForChart.rows.map((row) => {
                  const pct =
                    categoriesForChart.max > 0
                      ? (row.value / categoriesForChart.max) * 100
                      : 0
                  return (
                    <div
                      key={row.key}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <span className="w-16 text-slate-300">
                        {row.label}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-violet-500/80"
                          style={{ width: `${pct || 3}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-slate-300">
                        {row.value}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TABLA DE ÚLTIMOS TICKETS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Últimos tickets del periodo
          </h2>
          <button
            type="button"
            onClick={() => router.push('/tickets')}
            className="text-[11px] text-sky-300 hover:text-sky-200 hover:underline"
          >
            Ver todos los tickets →
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-slate-400">
                  Asunto
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-slate-400">
                  Cliente
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-slate-400">
                  Estado
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-slate-400">
                  Categoría (IA)
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-slate-400">
                  Creado
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium text-slate-400">
                  IA
                </th>
              </tr>
            </thead>
            <tbody>
              {latestTickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    No hay tickets que coincidan con los filtros del dashboard.
                  </td>
                </tr>
              ) : (
                latestTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-800/70 hover:bg-slate-900/60 transition"
                  >
                    <td className="px-3 py-2 align-middle text-slate-100">
                      {t.subject || '(Sin asunto)'}
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-300 text-xs">
                      {t.customer_name ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-300">
                      {t.status === 'open' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300 border border-emerald-500/40">
                          ● Abierto
                        </span>
                      )}
                      {t.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300 border border-amber-500/40">
                          ● Pendiente
                        </span>
                      )}
                      {t.status === 'closed' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-600/20 px-2 py-0.5 text-[11px] text-slate-200 border border-slate-500/60">
                          ● Cerrado
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-300">
                      {t.category ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-400">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-3 py-2 align-middle text-right text-[11px] text-slate-300">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            t.has_summary ? 'bg-sky-400' : 'bg-slate-700'
                          }`}
                          title="Resumen IA"
                        />
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            t.has_classification
                              ? 'bg-violet-400'
                              : 'bg-slate-700'
                          }`}
                          title="Clasificación IA"
                        />
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            t.has_reply ? 'bg-emerald-400' : 'bg-slate-700'
                          }`}
                          title="Respuesta sugerida IA"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
