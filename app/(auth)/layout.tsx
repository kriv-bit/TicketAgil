import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-slate-700/60 bg-slate-950/70 shadow-2xl shadow-slate-950/40 md:grid-cols-[1.1fr_1fr]">
        <div className="hidden flex-col justify-between bg-[linear-gradient(160deg,rgba(56,189,248,.22),rgba(15,23,42,.95))] p-10 md:flex">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs text-sky-100">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-emerald-400/20 text-[10px] text-emerald-200">✓</span>
              TicketAgil Platform
            </p>
            <h1 className="mt-8 text-4xl font-semibold tracking-tight text-white">
              Soporte al cliente con estética premium y foco en velocidad.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-200">
              Importa tickets, usa IA para priorizar, responder y cerrar más rápido con una experiencia cuidada en cada interacción.
            </p>
          </div>
          <p className="text-xs text-slate-300/80">Diseñado para equipos de soporte modernos.</p>
        </div>

        <div className="bg-slate-950/40 p-7 md:p-10">{children}</div>
      </section>
    </main>
  )
}
