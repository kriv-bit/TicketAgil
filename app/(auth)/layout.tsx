import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-8 md:px-6">
      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-background-elevated shadow-[0_30px_60px_-45px_rgba(15,23,42,0.95)] md:grid-cols-[1.1fr_1fr]">
        <div className="hidden border-r bg-background-subtle p-10 md:flex md:flex-col md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">TicketAgil</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-foreground">
              Plataforma de soporte orientada a operaciones reales.
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              Centraliza tickets, define criterios de priorización y acelera la respuesta de tu equipo
              con una interfaz clara y consistente.
            </p>
          </div>

          <ul className="space-y-3 text-sm text-muted">
            <li>Visión ejecutiva de métricas y carga operativa.</li>
            <li>Flujos de trabajo para análisis, clasificación y resolución.</li>
            <li>Controles de tono y políticas para respuestas consistentes.</li>
          </ul>
        </div>

        <div className="p-6 md:p-10">
          <div className="mb-7">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Acceso seguro</p>
            <p className="mt-2 text-xl font-semibold">TicketAgil Console</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
