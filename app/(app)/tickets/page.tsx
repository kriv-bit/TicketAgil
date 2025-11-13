// app/(app)/tickets/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/SupabaseClient'

type TicketStatus = 'open' | 'pending' | 'closed'
type StatusFilter = 'all' | TicketStatus

type TicketRow = {
  id: string
  subject: string
  status: TicketStatus
  created_at: string
}

type TicketWithInsight = TicketRow & {
  hasSummary: boolean
}

type TicketInsightRow = {
  ticket_id: string
  summary: string | null
}

export default function TicketsPage() {
  const router = useRouter()

  const [tickets, setTickets] = useState<TicketWithInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true)
      setError(null)

      try {
        // 1. Traer tickets del usuario actual (RLS debe filtrar por user_id)
        let query = supabase
          .from('tickets')
          .select('id, subject, status, created_at')
          .order('created_at', { ascending: false })
          .limit(50)

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }

        const { data, error } = await query

        if (error) {
          console.error(error)
          setError('No se pudieron cargar los tickets.')
          setTickets([])
          setLoading(false)
          return
        }

        const ticketData = (data ?? []) as TicketRow[]

        if (ticketData.length === 0) {
          setTickets([])
          setLoading(false)
          return
        }

        // 2. Traer insights para saber si tienen resumen IA
        const ids = ticketData.map((t) => t.id)

        const { data: insightsData, error: insightsError } = await supabase
          .from('ticket_insights')
          .select('ticket_id, summary')
          .in('ticket_id', ids)

        if (insightsError) {
          console.error(insightsError)
        }

        const insights = (insightsData ?? []) as TicketInsightRow[]

        const summarySet = new Set(
          insights
            .filter((i) => i.summary && i.summary.trim().length > 0)
            .map((i) => i.ticket_id),
        )

        const withInsights: TicketWithInsight[] = ticketData.map((t) => ({
          ...t,
          hasSummary: summarySet.has(t.id),
        }))

        setTickets(withInsights)
      } catch (err) {
        console.error(err)
        setError('Ocurrió un error inesperado al cargar los tickets.')
        setTickets([])
      } finally {
        setLoading(false)
      }
    }

    void fetchTickets()
  }, [statusFilter])

  const handleRowClick = (id: string) => {
    router.push(`/tickets/${id}`)
  }

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

  const filters: { label: string; value: StatusFilter }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Abiertos', value: 'open' },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Cerrados', value: 'closed' },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Tickets
          </h1>
          <p className="text-sm text-slate-400">
            Revisa tus tickets recientes, filtra por estado y entra al detalle
            para usar el copilot de IA.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/50 px-2 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            {tickets.length} tickets mostrados
          </span>
        </div>
      </header>

      {/* Filtros de estado */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active = statusFilter === f.value
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-medium border transition',
                active
                  ? 'bg-sky-500/20 border-sky-500/60 text-sky-100'
                  : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-900/80',
              ].join(' ')}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Contenido principal: loader / error / tabla */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        {loading ? (
          <div className="p-6 flex items-center justify-center text-slate-400 text-sm">
            <span className="mr-2 h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin" />
            Cargando tickets...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-200 bg-rose-500/10 border-b border-rose-500/40">
            {error}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            <p className="mb-2">No hay tickets para este filtro.</p>
            <p>
              Importa un CSV en la sección{' '}
              <span className="font-medium text-slate-200">Importar</span> para
              empezar a trabajar con TicketAgil.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Ticket
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Creado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    IA
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => handleRowClick(t.id)}
                    className="border-b border-slate-900/60 hover:bg-slate-900/80 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-100 line-clamp-1">
                          {t.subject || '(Sin asunto)'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                          #{t.id.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {renderStatusBadge(t.status)}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-slate-300">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs">
                      {t.hasSummary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/40 px-2 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Resumido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 text-slate-300 border border-slate-700 px-2 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          Sin resumen
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
