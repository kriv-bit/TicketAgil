// app/(auth)/layout.tsx
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)] px-4">
      <section className="w-full max-w-4xl grid md:grid-cols-2 bg-slate-900/70 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur">
        {/* Columna izquierda: brand / marketing */}
        <div className="hidden md:flex flex-col justify-between p-10 text-slate-100 bg-gradient-to-b from-sky-500/20 via-slate-900 to-slate-950">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 border border-sky-500/40 px-4 py-1.5 text-sm font-medium mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live 
              <span className="text-sky-300">· TicketAgil</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Copilot de soporte al cliente,
              <span className="text-sky-400"> listo para producción.</span>
            </h1>
            <p className="text-base text-slate-200 leading-relaxed">
              Importa tus tickets, deja que la IA resuma, clasifique y sugiera
              respuestas. Diseñado para agentes de soporte y team leads que
              quieren ver más allá de la bandeja de entrada.
            </p>
          </div>

          <div className="mt-10 space-y-3 text-base">
            <div className="flex items-start gap-2">
              <span className="mt-1 text-sky-400">●</span>
              <p className="text-slate-100">
                Resúmenes en segundos de tickets largos y complejos.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 text-sky-400">●</span>
              <p className="text-slate-100">
                Clasificación automática por categoría y severidad.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 text-sky-400">●</span>
              <p className="text-slate-100">
                Respuestas sugeridas con tono profesional y consistente.
              </p>
            </div>

            <p className="pt-3 text-xs text-slate-400">
              Construido con Next.js, Supabase y LLMs — @kriv-bit
            </p>
          </div>
        </div>

        {/* Columna derecha: formulario (login/register) */}
        <div className="bg-white text-slate-900 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6 text-center md:text-left">
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-sm font-semibold">
                TS
              </div>
              <div className="text-left">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  TicketAgil
                </p>
                <p className="text-xs text-slate-500">
                  Copilot de soporte al cliente
                </p>
              </div>
            </div>
          </div>

          {children}
        </div>
      </section>
    </main>
  )
}
