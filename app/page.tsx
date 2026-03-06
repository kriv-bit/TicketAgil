import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 md:px-6">
      <div className="grid w-full gap-6 md:grid-cols-[1.15fr_0.85fr]">
        <section className="surface p-7 md:p-10">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">TicketAgil Platform</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            Gestión de soporte más clara, rápida y consistente.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
            TicketAgil organiza el trabajo diario de equipos de atención con una experiencia enfocada
            en productividad, contexto y calidad de respuesta.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary text-sm">
              Entrar al panel
            </Link>
            <Link href="/register" className="btn-secondary text-sm">
              Crear cuenta
            </Link>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {[
              ['Flujo unificado', 'Importación, análisis y resolución en el mismo espacio de trabajo.'],
              ['Métricas operativas', 'Seguimiento de volumen, tiempos y estado de tickets en tiempo real.'],
              ['Respuestas consistentes', 'Soporte para guías de comunicación y calidad del equipo.'],
            ].map(([title, text]) => (
              <article key={title} className="surface-muted p-4">
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="surface p-6 md:p-7">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Vista de producto</h2>
          <div className="mt-4 space-y-4">
            <div className="surface-muted p-4">
              <p className="text-xs text-muted">Tickets activos</p>
              <p className="mt-2 text-3xl font-semibold">37</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="surface-muted p-4">
                <p className="text-xs text-muted">Tiempo medio</p>
                <p className="mt-1 text-xl font-semibold">4.2 h</p>
              </div>
              <div className="surface-muted p-4">
                <p className="text-xs text-muted">Cerrados hoy</p>
                <p className="mt-1 text-xl font-semibold">18</p>
              </div>
            </div>
            <div className="surface-muted p-4">
              <p className="text-xs text-muted">Actividad reciente</p>
              <ul className="mt-2 space-y-2 text-sm">
                <li className="flex items-center justify-between"><span>Fallo en cobros recurrentes</span><span className="text-muted">Abierto</span></li>
                <li className="flex items-center justify-between"><span>Consulta de facturación</span><span className="text-muted">Pendiente</span></li>
                <li className="flex items-center justify-between"><span>Error de acceso SSO</span><span className="text-muted">Cerrado</span></li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
