import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.2fr_1fr]">
        <section className="surface fade-in p-8 md:p-10">
          <p className="inline-flex items-center gap-2 rounded-md border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs text-sky-100">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-emerald-400/20 text-[10px] text-emerald-200">✓</span>
            TicketAgil · Customer Support Intelligence
          </p>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            Resuelve tickets con una UI de producto real y IA accionable.
          </h1>

          <p className="mt-4 max-w-xl text-sm text-slate-300 md:text-base">
            Una plataforma de soporte diseñada para equipos que exigen claridad, velocidad y consistencia visual. Importa, clasifica y responde con calidad enterprise.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-primary">Entrar al panel</Link>
            <Link href="/register" className="btn btn-secondary">Crear cuenta</Link>
          </div>
        </section>

        <section className="surface card-hover p-6 md:p-7">
          <h2 className="text-sm font-semibold text-slate-100">Vista previa del panel</h2>
          <div className="mt-4 space-y-3">
            {['Tickets activos', 'SLA en riesgo', 'Respuestas IA listas'].map((item, idx) => (
              <div key={item} className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                <p className="text-xs text-slate-400">{item}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{idx === 0 ? '37' : idx === 1 ? '8' : '24'}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-slate-400">Microinteracciones, filtros avanzados y diseño consistente en todas las pantallas.</p>
        </section>
      </div>
    </main>
  )
}
