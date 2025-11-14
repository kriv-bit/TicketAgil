'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type SimilarTicket = {
  id: string
  subject: string
  status: string
  created_at: string
  similarity: number
}

type Props = {
  ticketId: string
}

export function SimilarTickets({ ticketId }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<SimilarTicket[]>([])

  useEffect(() => {
    const fetchSimilar = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(
          `/api/tickets/${ticketId}/similar`,
        )

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(
            data?.error ??
              'No se pudieron cargar los tickets similares.',
          )
          setLoading(false)
          return
        }

        const data = await res.json()
        setTickets(data.similar ?? [])
      } catch (err) {
        console.error('Error fetching similar tickets:', err)
        setError('Error al cargar tickets similares.')
      } finally {
        setLoading(false)
      }
    }

    void fetchSimilar()
  }, [ticketId])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300 flex items-center gap-2">
        <span className="h-4 w-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
        <span>Buscando tickets similares...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-rose-300">
        {error}
      </div>
    )
  }

  if (!tickets.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
        No encontramos tickets similares por ahora.
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Tickets similares
          </h2>
          <p className="text-xs text-slate-400">
            Otros casos parecidos que podrían ayudarte a responder
            más rápido.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/tickets/${t.id}`}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm hover:border-sky-600/60 hover:bg-sky-500/5 transition"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-100 truncate">
                {t.subject}
              </p>
              <p className="text-xs text-slate-400">
                Creado el{' '}
                {new Date(t.created_at).toLocaleString('es-ES', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={[
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                  t.status === 'closed'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                    : t.status === 'pending'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                    : 'bg-sky-500/15 text-sky-300 border border-sky-500/40',
                ].join(' ')}
              >
                {t.status}
              </span>
              <span className="text-[11px] text-slate-500">
                {(t.similarity * 100).toFixed(0)}% parecido
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
