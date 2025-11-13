// app/(app)/import/page.tsx
'use client'

import { useState, type FormEvent, type ChangeEvent } from 'react'
import { supabase } from '@/lib/SupabaseClient'

type ParsedRow = Record<string, string>
type ImportState = 'idle' | 'importing' | 'success' | 'error'

function parseCsv(text: string): { rows: ParsedRow[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) {
    return { rows: [], error: 'El archivo CSV no tiene datos.' }
  }

  const headers = lines[0].split(',').map((h) => h.trim())

  const required = [
    'id',
    'subject',
    'description',
    'status',
    'created_at',
    'updated_at',
  ]
  const missing = required.filter((h) => !headers.includes(h))

  if (missing.length > 0) {
    return {
      rows: [],
      error: `Faltan columnas requeridas: ${missing.join(', ')}`,
    }
  }

  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const values = line.split(',')
    const row: ParsedRow = {}

    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() ?? ''
    })

    rows.push(row)
  }

  return { rows }
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importState, setImportState] = useState<ImportState>('idle')
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setImportState('idle')
    setImportMessage(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!file) {
      setImportState('error')
      setImportMessage('Selecciona un archivo CSV primero.')
      return
    }

    setImportState('importing')
    setImportMessage(null)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('No se pudo obtener el usuario actual.')
      }

      const text = await file.text()
      const { rows, error } = parseCsv(text)

      if (error) {
        setImportState('error')
        setImportMessage(error)
        return
      }

      if (rows.length === 0) {
        setImportState('error')
        setImportMessage('El archivo CSV no contiene filas de datos.')
        return
      }

      const nowIso = new Date().toISOString()

      const ticketsToInsert = rows.map((row) => ({
        external_id: row.id,
        user_id: user.id,
        subject: row.subject,
        description: row.description,
        status: row.status as 'open' | 'pending' | 'closed',
        customer_name: row.customer_name || null,
        created_at: row.created_at || nowIso,
        updated_at: row.updated_at || nowIso,
        closed_at: row.status === 'closed' ? row.updated_at || nowIso : null,
      }))

      const { error: insertError } = await supabase
        .from('tickets')
        .insert(ticketsToInsert)

      if (insertError) {
        console.error(insertError)
        setImportState('error')
        setImportMessage(
          `Error al importar tickets: ${insertError.message}`,
        )
        return
      }

      setImportState('success')
      setImportMessage(
        `Se importaron ${ticketsToInsert.length} tickets correctamente.`,
      )
      setFile(null)
    } catch (err: any) {
      console.error(err)
      setImportState('error')
      setImportMessage(
        err?.message ?? 'Ocurrió un error inesperado al importar el CSV.',
      )
    }
  }

  const isImporting = importState === 'importing'

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Importar tickets
        </h1>
        <p className="text-sm text-slate-400">
          Sube un archivo{' '}
          <span className="font-mono text-slate-200 text-xs">.csv</span> con
          tus tickets desde tu sistema actual.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 md:p-6 space-y-4"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-100">
              Archivo CSV
            </label>
            <p className="text-xs text-slate-400">
              Columnas requeridas:{' '}
              <span className="font-mono text-[11px]">
                id, subject, description, status, created_at, updated_at
              </span>
              . Opcional:{' '}
              <span className="font-mono text-[11px]">customer_name</span>.
            </p>
          </div>

          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/40 px-4 py-10 text-center cursor-pointer hover:border-sky-500/60 hover:bg-slate-900/70 transition">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-2">
              <span className="h-10 w-10 rounded-full border border-slate-700 flex items-center justify-center text-lg">
                📄
              </span>
              <span className="text-sm font-medium text-slate-100">
                {file ? file.name : 'Haz clic para seleccionar un archivo CSV'}
              </span>
              <span className="text-xs text-slate-400">
                Para el MVP, soporta unos cuantos miles de filas.
              </span>
            </div>
          </label>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={!file || isImporting}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-sky-600/40 hover:bg-sky-500 transition"
            >
              {isImporting && (
                <span className="mr-2 h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
              )}
              {isImporting ? 'Importando...' : 'Importar tickets'}
            </button>

            <p className="text-xs text-slate-500">
              Después de importar, revisa{' '}
              <span className="font-medium text-slate-200">Dashboard</span> o{' '}
              <span className="font-medium text-slate-200">Tickets</span>.
            </p>
          </div>

          {importMessage && (
            <div
              className={[
                'mt-2 rounded-xl border px-3 py-2 text-xs',
                importState === 'success'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/50 bg-rose-500/10 text-rose-200',
              ].join(' ')}
            >
              {importMessage}
            </div>
          )}
        </form>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-4 text-sm text-slate-300">
          <h2 className="text-sm font-semibold text-slate-100">
            Ejemplo de CSV
          </h2>
          <pre className="rounded-xl bg-slate-950/80 p-3 text-[11px] font-mono text-slate-200 overflow-x-auto">
{`id,subject,description,status,created_at,updated_at,customer_name
1234,Error al pagar,"El cliente no puede completar el pago con tarjeta",open,2025-01-10T10:00:00Z,2025-01-10T10:00:00Z,Ana Pérez
1235,No llega email de verificación,"El usuario no recibe el correo para verificar su cuenta",pending,2025-01-11T12:30:00Z,2025-01-11T13:00:00Z,Carlos Gómez`}
          </pre>

          <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
            <li>
              <span className="font-mono text-[11px]">status</span> debe ser{' '}
              <span className="font-mono text-[11px]">
                open, pending o closed
              </span>
              .
            </li>
            <li>
              Las fechas deben estar en formato ISO (ej.
              <span className="font-mono text-[11px]">
                {' '}
                2025-01-10T10:00:00Z
              </span>
              ).
            </li>
            <li>
              Si el CSV es muy grande, en v2 puedes mover esto a un endpoint
              backend y procesar en background 🔄.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
