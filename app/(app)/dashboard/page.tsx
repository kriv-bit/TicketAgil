// app/(app)/dashboard/page.tsx

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Dashboard de soporte
        </h1>
        <p className="text-sm text-slate-400">
          Importa tus tickets y ve métricas clave de tu equipo de soporte.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
          <p className="text-xs text-slate-400 uppercase tracking-[0.18em]">
            Tickets totales
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">—</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
          <p className="text-xs text-slate-400 uppercase tracking-[0.18em]">
            Abiertos
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">—</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
          <p className="text-xs text-slate-400 uppercase tracking-[0.18em]">
            Cerrados
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">—</p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-4 py-8 text-center text-sm text-slate-400">
        Aquí irán tus gráficos de tickets por estado y por día cuando tengamos
        datos. Empieza importando un CSV en la sección{' '}
        <span className="font-medium text-slate-200">Importar</span>.
      </div>
    </div>
  )
}
