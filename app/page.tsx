// app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl mx-auto grid gap-10 md:grid-cols-[1.4fr,1fr] items-center">
        {/* Columna izquierda - Hero */}
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            TicketAgil · Copilot de soporte con IA
          </div>

          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
            Entiende y responde tickets
            <span className="text-sky-400"> más rápido</span>.
          </h1>

          <p className="text-sm md:text-base text-slate-300 mb-6 max-w-xl">
            Importa tus tickets desde CSV, deja que la IA los resuma, los
            clasifique y te sugiera respuestas con el tono de tu empresa.
            Diseñado para agentes de soporte y team leads que quieren ir
            más allá del simple “CRM de tickets”.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-sky-500 transition"
            >
              Entrar al panel
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-900 transition"
            >
              Crear cuenta
            </Link>
            <span className="text-xs text-slate-500">
              Sube tu CSV.
            </span>
          </div>

          <div className="grid gap-3 text-xs md:text-sm text-slate-300">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
              <p>
                <span className="font-semibold text-slate-100">
                  Resúmenes instantáneos
                </span>{' '}
                de tickets largos, en 1–3 frases.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <p>
                <span className="font-semibold text-slate-100">
                  Clasificación automática
                </span>{' '}
                por categoría y severidad.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
              <p>
                <span className="font-semibold text-slate-100">
                  Respuestas sugeridas
                </span>{' '}
                con tono configurable y políticas de tu equipo.
              </p>
            </div>
          </div>
        </section>

        {/* Columna derecha - Tarjeta preview */}
        <section className="relative">
          <div className="absolute -top-10 -right-10 h-40 w-40 bg-sky-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative rounded-3xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-xs font-semibold text-sky-200">
                  TS
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-100">
                    TicketAgil
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Panel de soporte
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Demo
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.16em]">
                    Tickets totales
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-50">
                    248
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.16em]">
                    Abiertos
                  </p>
                  <p className="mt-1 text-lg font-semibold text-amber-300">
                    37
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.16em]">
                    Cerrados (24h)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-300">
                    62
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
                <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Ticket destacado
                </p>
                <p className="font-medium text-slate-100 truncate">
                  Error al procesar pago con tarjeta
                </p>
                <p className="mt-1 line-clamp-2 text-slate-400">
                  “Intenté comprar el plan anual y mi tarjeta fue rechazada,
                  pero el cargo aparece pendiente en mi banco...”
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                      payment · high
                    </span>
                    <span className="text-slate-500">
                      Resumen · Respuesta IA lista
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Construido con <span className="text-sky-300">Next.js</span>,{' '}
              <span className="text-sky-300">Supabase</span> y{' '}
              <span className="text-sky-300">Groq (LLMs)</span>.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
