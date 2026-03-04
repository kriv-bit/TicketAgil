'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/SupabaseClient'

type TicketStatus = 'open' | 'pending' | 'closed'

type TicketRow = {
  id: string
  subject: string | null
  status: TicketStatus
  customer_name: string | null
  created_at: string
  // indicadores IA
  has_summary: boolean
  has_classification: boolean
  has_reply: boolean
}

type IaQuota = {
  daily_limit: number
  used_credits: number
  remaining_credits: number
}

type StatusFilter = 'all' | TicketStatus
type SortOrder = 'desc' | 'asc'
type BatchType = 'summary' | 'classify' | 'reply'

export default function TicketsPage() {
  const router = useRouter()

  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchMessage, setBatchMessage] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(
    null,
  )

  const [quota, setQuota] = useState<IaQuota | null>(null)
  const [loadingQuota, setLoadingQuota] = useState(false)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const [bulkSelectCount, setBulkSelectCount] = useState<string>('')

  // 🔹 Cargar tickets + insights IA
  useEffect(() => {
    const fetchTickets = async () => {
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

        const { data, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, subject, status, customer_name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(200)

        if (ticketsError) {
          console.error(ticketsError)
          setError('No se pudieron cargar los tickets.')
          setLoading(false)
          return
        }

        const baseTickets = (data ?? []) as {
          id: string
          subject: string | null
          status: TicketStatus
          customer_name: string | null
          created_at: string
        }[]

        if (baseTickets.length === 0) {
          setTickets([])
          setLoading(false)
          return
        }

        const ticketIds = baseTickets.map((t) => t.id)

        const { data: insightsData, error: insightsError } = await supabase
          .from('ticket_insights')
          .select('ticket_id, summary, category, severity, suggested_reply')
          .in('ticket_id', ticketIds)

        if (insightsError) {
          console.error('Error cargando insights:', insightsError)
        }

        const insightsMap = new Map<
          string,
          { has_summary: boolean; has_classification: boolean; has_reply: boolean }
        >()

        if (insightsData && insightsData.length > 0) {
          for (const row of insightsData as any[]) {
            const has_summary = !!row.summary && row.summary.trim().length > 0
            const has_classification =
              !!row.category && row.category.trim().length > 0
            const has_reply =
              !!row.suggested_reply && row.suggested_reply.trim().length > 0

            insightsMap.set(row.ticket_id, {
              has_summary,
              has_classification,
              has_reply,
            })
          }
        }

        const merged: TicketRow[] = baseTickets.map((t) => {
          const ia = insightsMap.get(t.id) ?? {
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
        setError('Error inesperado al cargar los tickets.')
      } finally {
        setLoading(false)
      }
    }

    void fetchTickets()
  }, [])

  // 🔹 Cargar cuota IA
  const refreshQuota = async () => {
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
        headers: { 'Content-Type': 'application/json' },
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

  useEffect(() => {
    void refreshQuota()
  }, [])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  // 🔹 Filtros + orden local
  const filteredTickets = useMemo(() => {
    let t = [...tickets]

    if (statusFilter !== 'all') {
      t = t.filter((ticket) => ticket.status === statusFilter)
    }

    if (search.trim().length > 0) {
      const q = search.toLowerCase()
      t = t.filter((ticket) =>
        (ticket.subject ?? '').toLowerCase().includes(q),
      )
    }

    t.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.created_at.localeCompare(a.created_at)
      }
      return a.created_at.localeCompare(b.created_at)
    })

    return t
  }, [tickets, statusFilter, search, sortOrder])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleSelectAll = () => {
    const filteredIds = filteredTickets.map((t) => t.id)
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])))
    }
  }

  const canRunBatch = selectedIds.length > 0 && !batchRunning

  // 🔹 Selección rápida: primeros N filtrados
  const handleApplyBulkSelect = () => {
    const n = parseInt(bulkSelectCount, 10)
    if (Number.isNaN(n) || n <= 0) {
      setSelectedIds([])
      return
    }
    const idsToSelect = filteredTickets.slice(0, n).map((t) => t.id)
    setSelectedIds(idsToSelect)
  }

  // 🔹 Ajuste suave de cuota en UI (el backend manda de verdad)
  const softDecrementQuota = (cost: number) => {
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

  // 🔹 Actualizar IA flags localmente
  const markTicketIa = (id: string, type: BatchType) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        if (type === 'summary') {
          return { ...t, has_summary: true }
        }
        if (type === 'classify') {
          return { ...t, has_classification: true }
        }
        return { ...t, has_reply: true }
      }),
    )
  }

  // 🔹 Batch IA (summary / classify / reply)
  const runBatch = async (type: BatchType) => {
    if (!canRunBatch) return
    if (selectedIds.length === 0) return

    setBatchRunning(true)
    setBatchMessage(null)
    setBatchProgress({ done: 0, total: selectedIds.length })

    const costPerItem = type === 'reply' ? 2 : 1
    const endpointSegment =
      type === 'summary'
        ? 'summary'
        : type === 'classify'
        ? 'classify'
        : 'suggest-reply'

    if (quota && quota.remaining_credits <= 0) {
      setBatchMessage('No te quedan créditos de IA hoy.')
      setBatchRunning(false)
      setBatchProgress(null)
      return
    }

    let processed = 0
    let success = 0
    let failed = 0
    let stoppedByLimit = false

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/tickets/${id}/${endpointSegment}`, {
          method: 'POST',
        })

        const text = await res.text()
        let data: any = null
        try {
          data = JSON.parse(text)
        } catch (err) {
          console.error(`Respuesta no JSON en batch /${endpointSegment}:`, text)
        }

        if (res.status === 429) {
          stoppedByLimit = true
          setBatchMessage(
            'Has alcanzado el límite diario de IA. Se procesaron algunos tickets antes de llegar al límite.',
          )
          break
        }

        if (!res.ok) {
          console.error(`Error en batch ${endpointSegment}:`, data?.error)
          failed++
        } else {
          success++
          softDecrementQuota(costPerItem)
          markTicketIa(id, type)
        }
      } catch (err) {
        console.error(`Error inesperado en batch ${endpointSegment}:`, err)
        failed++
      } finally {
        processed++
        setBatchProgress({ done: processed, total: selectedIds.length })
      }
    }

    if (!stoppedByLimit) {
      if (failed === 0) {
        setBatchMessage(
          `Batch completado: ${success}/${selectedIds.length} tickets procesados correctamente.`,
        )
      } else {
        setBatchMessage(
          `Batch parcial: ${success} OK, ${failed} con error. Revisa los tickets o inténtalo de nuevo.`,
        )
      }
    }

    await refreshQuota()
    setBatchRunning(false)
  }

  const handleBatchSummary = () => runBatch('summary')
  const handleBatchClassify = () => runBatch('classify')
  const handleBatchReply = () => runBatch('reply')

  // 🔹 Batch: actualizar estado
  const runBatchStatus = async (targetStatus: TicketStatus) => {
    if (!canRunBatch || selectedIds.length === 0) return

    const label =
      targetStatus === 'open'
        ? 'abiertos'
        : targetStatus === 'pending'
        ? 'pendientes'
        : 'cerrados'

    const confirmed = window.confirm(
      `¿Seguro que quieres marcar ${selectedIds.length} tickets como ${label}?`,
    )
    if (!confirmed) return

    setBatchRunning(true)
    setBatchMessage(null)
    setBatchProgress({ done: 0, total: selectedIds.length })

    let processed = 0
    let success = 0
    let failed = 0

    const now = new Date().toISOString()
    const closedAt = targetStatus === 'closed' ? now : null

    for (const id of selectedIds) {
      try {
        const { error: updateError } = await supabase
          .from('tickets')
          .update({
            status: targetStatus,
            updated_at: now,
            closed_at: closedAt,
          })
          .eq('id', id)

        if (updateError) {
          console.error('Error actualizando estado (batch):', updateError)
          failed++
        } else {
          success++
          setTickets((prev) =>
            prev.map((t) =>
              t.id === id ? { ...t, status: targetStatus } : t,
            ),
          )
        }
      } catch (err) {
        console.error('Error inesperado en batch status:', err)
        failed++
      } finally {
        processed++
        setBatchProgress({ done: processed, total: selectedIds.length })
      }
    }

    if (failed === 0) {
      setBatchMessage(
        `Estados actualizados: ${success}/${selectedIds.length} tickets marcados como ${label}.`,
      )
    } else {
      setBatchMessage(
        `Actualización parcial: ${success} OK, ${failed} con error. Revisa los tickets o inténtalo de nuevo.`,
      )
    }

    setBatchRunning(false)
  }

  const handleBatchStatusOpen = () => runBatchStatus('open')
  const handleBatchStatusPending = () => runBatchStatus('pending')
  const handleBatchStatusClosed = () => runBatchStatus('closed')

  // 🔹 Batch: eliminar tickets
  const runBatchDelete = async () => {
    if (!canRunBatch || selectedIds.length === 0) return

    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar ${selectedIds.length} tickets? Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setBatchRunning(true)
    setBatchMessage(null)
    setBatchProgress(null)

    try {
      // Eliminar insights primero (por si no hay cascade)
      const { error: insightsError } = await supabase
        .from('ticket_insights')
        .delete()
        .in('ticket_id', selectedIds)

      if (insightsError) {
        console.error('Error eliminando insights (batch delete):', insightsError)
      }

      const { error: ticketsError } = await supabase
        .from('tickets')
        .delete()
        .in('id', selectedIds)

      if (ticketsError) {
        console.error('Error eliminando tickets (batch delete):', ticketsError)
        setBatchMessage(
          'No se pudieron eliminar todos los tickets seleccionados.',
        )
      } else {
        setTickets((prev) => prev.filter((t) => !selectedIds.includes(t.id)))
        setSelectedIds([])
        setBatchMessage('Tickets eliminados correctamente.')
      }
    } catch (err) {
      console.error('Error inesperado en batch delete:', err)
      setBatchMessage('Error inesperado al eliminar los tickets.')
    } finally {
      setBatchRunning(false)
    }
  }

  const renderIaDots = (ticket: TicketRow) => {
    const cell = 'inline-flex h-5 min-w-5 items-center justify-center rounded-md border px-1 text-[9px] font-semibold'

    return (
      <div className="flex items-center gap-1">
        <span className={`${cell} ${ticket.has_summary ? 'border-sky-400/60 bg-sky-500/15 text-sky-200' : 'border-slate-700 text-slate-500'}`} title={ticket.has_summary ? 'Resumen generado' : 'Sin resumen IA'}>S</span>
        <span className={`${cell} ${ticket.has_classification ? 'border-violet-400/60 bg-violet-500/15 text-violet-200' : 'border-slate-700 text-slate-500'}`} title={ticket.has_classification ? 'Clasificación generada' : 'Sin clasificación IA'}>C</span>
        <span className={`${cell} ${ticket.has_reply ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-500'}`} title={ticket.has_reply ? 'Respuesta sugerida generada' : 'Sin respuesta sugerida'}>R</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        <span className="mr-2 h-4 w-4 rounded-md border-2 border-slate-600 border-t-transparent animate-spin" />
        Cargando tickets...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-50">Tickets</h1>
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50">
            Tickets
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Lista de tickets importados. Filtra, ordena, selecciona rápido y aplica acciones de IA o estado en lote.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs text-slate-300 max-w-xs">
          <p className="uppercase tracking-[0.16em] text-slate-500 mb-1">
            Créditos de IA
          </p>
          {quota ? (
            <>
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-slate-400">Disponibles hoy</span>
                <span className="font-semibold text-sky-300">
                  {quota.remaining_credits} / {quota.daily_limit}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Resumir y clasificar consumen 1 crédito por ticket.
                Sugerir respuesta consume 2 créditos. El límite se resetea cada día.
              </p>
            </>
          ) : loadingQuota ? (
            <p className="text-slate-500">Cargando cuota…</p>
          ) : (
            <p className="text-slate-500">No se pudo obtener la cuota.</p>
          )}
        </div>
      </div>

      {/* Batch status */}
      {batchMessage && (
        <div className="toast-in rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs text-sky-100">
          {batchMessage}
        </div>
      )}
      {batchProgress && (
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="progress-indeterminate flex-1 h-1.5 rounded-md bg-slate-800 overflow-hidden">
            <div
              className="h-1.5 bg-sky-500 transition-all duration-300"
              style={{
                width: `${(batchProgress.done / batchProgress.total) * 100}%`,
              }}
            />
          </div>
          <span>
            {batchProgress.done} / {batchProgress.total} procesados
          </span>
        </div>
      )}

      {/* Filtros + búsqueda + orden */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Filtros por estado */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 mr-1">Estado:</span>
          <div className="segmented">
          {(['all', 'open', 'pending', 'closed'] as StatusFilter[]).map((status) => {
            const label =
              status === 'all'
                ? 'Todos'
                : status === 'open'
                ? 'Abiertos'
                : status === 'pending'
                ? 'Pendientes'
                : 'Cerrados'
            const active = statusFilter === status
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={active ? "active" : ""}
              >
                {label}
              </button>
            )
          })}
          </div>
        </div>

        {/* Search + orden */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por asunto..."
              className="input w-48 md:w-64 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="select text-[11px]"
          >
            <option value="desc">Más recientes primero</option>
            <option value="asc">Más antiguos primero</option>
          </select>
        </div>
      </div>

      {/* Toolbar batch + selección rápida */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Selección + selección rápida */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-sky-500" />
            Seleccionados:{' '}
            <span className="font-semibold text-slate-100">
              {selectedIds.length}
            </span>
          </span>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Selección rápida:</span>
            <input
              type="number"
              min={1}
              className="input w-16 px-2 py-1 text-[11px]"
              value={bulkSelectCount}
              onChange={(e) => setBulkSelectCount(e.target.value)}
              placeholder="N"
            />
            <button
              type="button"
              onClick={handleApplyBulkSelect}
              className="btn btn-secondary py-1 text-[11px]"
            >
              Primeros N filtrados
            </button>
          </div>
        </div>

        {/* Botones batch */}
        <div className="flex flex-wrap gap-2 justify-end">
          {/* IA */}
          <button
            type="button"
            disabled={!canRunBatch || selectedIds.length === 0}
            onClick={handleBatchSummary}
            className="btn border border-sky-500/60 bg-sky-500/10 text-[11px] font-medium text-sky-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-500/20 transition"
          >
            {batchRunning ? (
              <>
                <span className="h-3 w-3 rounded-md border-2 border-sky-200 border-t-transparent animate-spin" />
                Ejecutando batch...
              </>
            ) : (
              <>Resumir seleccionados</>
            )}
          </button>

          <button
            type="button"
            disabled={!canRunBatch || selectedIds.length === 0}
            onClick={handleBatchClassify}
            className="btn border border-violet-500/60 bg-violet-500/10 text-[11px] font-medium text-violet-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-500/20 transition"
          >
            {batchRunning ? (
              <>
                <span className="h-3 w-3 rounded-md border-2 border-violet-200 border-t-transparent animate-spin" />
                Ejecutando batch...
              </>
            ) : (
              <>Clasificar seleccionados</>
            )}
          </button>

          <button
            type="button"
            disabled={!canRunBatch || selectedIds.length === 0}
            onClick={handleBatchReply}
            className="btn border border-emerald-500/60 bg-emerald-500/10 text-[11px] font-medium text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500/20 transition"
          >
            {batchRunning ? (
              <>
                <span className="h-3 w-3 rounded-md border-2 border-emerald-200 border-t-transparent animate-spin" />
                Ejecutando batch...
              </>
            ) : (
              <>Sugerir respuesta seleccionados</>
            )}
          </button>

          {/* Estado */}
          <button
            type="button"
            disabled={!canRunBatch || selectedIds.length === 0}
            onClick={handleBatchStatusOpen}
            className="btn border border-emerald-500/60 bg-emerald-500/10 text-[11px] font-medium text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500/20 transition"
          >
            Marcar abiertos
          </button>
          <button
            type="button"
            disabled={!canRunBatch || selectedIds.length === 0}
            onClick={handleBatchStatusPending}
            className="btn border border-amber-500/60 bg-amber-500/10 text-[11px] font-medium text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-500/20 transition"
          >
            Marcar pendientes
          </button>
          <button
            type="button"
            disabled={!canRunBatch || selectedIds.length === 0}
            onClick={handleBatchStatusClosed}
            className="btn border border-slate-500/60 bg-slate-600/20 text-[11px] font-medium text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600/40 transition"
          >
            Marcar cerrados
          </button>

          {/* Eliminar */}
          <button
            type="button"
            disabled={!canRunBatch || selectedIds.length === 0}
            onClick={runBatchDelete}
            className="btn border border-rose-500/60 bg-rose-500/10 text-[11px] font-medium text-rose-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-500/20 transition"
          >
            Eliminar seleccionados
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-slate-400">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-sky-500"
                  checked={
                    filteredTickets.length > 0 &&
                    filteredTickets.every((t) => selectedIds.includes(t.id))
                  }
                  onChange={toggleSelectAll}
                />
              </th>
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
                IA
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-slate-400">
                Creado
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-medium text-slate-400">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No hay tickets que coincidan con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = selectedIds.includes(ticket.id)
                return (
                  <tr
                    key={ticket.id}
                    className={`border-b border-slate-800/70 hover:bg-slate-900/60 transition ${
                      isSelected ? 'bg-slate-900/60' : ''
                    }`}
                  >
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-sky-500"
                        checked={isSelected}
                        onChange={() => toggleSelect(ticket.id)}
                      />
                    </td>
                    <td
                      className="px-3 py-2 align-middle text-slate-100 cursor-pointer hover:underline"
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                    >
                      {ticket.subject || '(Sin asunto)'}
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-300">
                      {ticket.customer_name ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-slate-300">
                      {ticket.status === 'open' && (
                        <span className="status-tag border-emerald-400/50 bg-emerald-500/10 text-emerald-200">
                          Abierto
                        </span>
                      )}
                      {ticket.status === 'pending' && (
                        <span className="status-tag border-amber-400/50 bg-amber-500/10 text-amber-200">
                          Pendiente
                        </span>
                      )}
                      {ticket.status === 'closed' && (
                        <span className="status-tag border-slate-500/60 bg-slate-600/20 text-slate-200">
                          Cerrado
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {renderIaDots(ticket)}
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-400 text-xs">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className="px-3 py-2 align-middle text-right text-xs">
                      <button
                        type="button"
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                        className="btn btn-secondary text-[11px]"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
