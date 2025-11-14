'use client'

import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/SupabaseClient'

type UserSettings = {
  company_name: string
  default_tone: string
  language: string
  reply_guidelines: string
}

const MAX_GUIDELINES_CHARS = 1000

const TONE_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: 'neutral',
    label: 'Neutral',
    description: 'Profesional, sin ser demasiado frío ni demasiado cercano.',
  },
  {
    value: 'formal',
    label: 'Formal',
    description: 'Tratamiento de usted, lenguaje cuidado y serio.',
  },
  {
    value: 'friendly',
    label: 'Cercano / friendly',
    description: 'Tono cálido, cercano y empático, pero profesional.',
  },
  {
    value: 'technical',
    label: 'Técnico',
    description: 'Explicaciones más técnicas, ideal para equipos de IT / devs.',
  },
  {
    value: 'brief',
    label: 'Breve',
    description: 'Respuestas cortas y directas, sin mucho contexto extra.',
  },
  {
    value: 'detailed',
    label: 'Detallado',
    description: 'Respuestas más largas, con contexto y pasos explicados.',
  },
]

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<UserSettings>({
    company_name: '',
    default_tone: 'neutral',
    language: 'es',
    reply_guidelines: '',
  })

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 🔹 Cargar settings actuales
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('Error obteniendo usuario en /settings:', userError)
        setErrorMessage('No se pudo obtener el usuario actual.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('company_name, default_tone, language, reply_guidelines')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        // Si no hay fila aún, no pasa nada, usamos defaults
        if (error.code !== 'PGRST116') {
          console.error('Error cargando user_settings:', error)
          setErrorMessage('No se pudieron cargar tus settings.')
        }
        setLoading(false)
        return
      }

      if (data) {
        setForm({
          company_name: data.company_name ?? '',
          default_tone: data.default_tone ?? 'neutral',
          language: data.language ?? 'es',
          // 🔸 Normalizamos por si vienen solo espacios/enters
          reply_guidelines: (data.reply_guidelines ?? '').trim().length
            ? (data.reply_guidelines ?? '')
            : '',
        })
      }

      setLoading(false)
    }

    void fetchSettings()
  }, [])

  const handleChange = (field: keyof UserSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleGuidelinesChange = (value: string) => {
    // Respetamos el límite de caracteres
    const limited = value.slice(0, MAX_GUIDELINES_CHARS)

    // Si el contenido "real" (sin espacios/enters) está vacío,
    // lo tratamos como string vacío para que:
    // - El placeholder se muestre
    // - El contador marque 0
    const normalized =
      limited.trim().length === 0
        ? ''
        : limited

    handleChange('reply_guidelines', normalized)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Error obteniendo usuario al guardar settings:', userError)
      setErrorMessage('No se pudo obtener el usuario actual.')
      setSaving(false)
      return
    }

    // También normalizamos aquí por si acaso
    const normalizedGuidelines =
      form.reply_guidelines.trim().length === 0
        ? null
        : form.reply_guidelines.slice(0, MAX_GUIDELINES_CHARS)

    const payload = {
      user_id: user.id,
      company_name: form.company_name || null,
      default_tone: form.default_tone || null,
      language: form.language || null,
      reply_guidelines: normalizedGuidelines,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('user_settings').upsert(payload, {
      onConflict: 'user_id',
    })

    if (error) {
      console.error('Error guardando settings:', error)
      setErrorMessage('No se pudieron guardar tus settings.')
      setSaving(false)
      return
    }

    setSuccessMessage('Configuración guardada correctamente.')
    setSaving(false)
  }

  // Contador de caracteres basado en el valor normalizado
  const guidelinesLength = form.reply_guidelines
    ? form.reply_guidelines.length
    : 0

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-50">
          Customización · Tono & políticas
        </h1>
        <p className="text-sm md:text-base text-slate-300 max-w-2xl">
          Define cómo debe responder la IA de TicketAgil: tono, idioma y
          políticas de soporte. Estas reglas se usarán al generar{' '}
          <span className="text-sky-300 font-semibold">
            respuestas sugeridas
          </span>{' '}
          para tus tickets.
        </p>
      </header>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center text-slate-300">
          <span className="mr-2 h-5 w-5 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
          <span className="text-sm">Cargando configuración...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl text-sm">
          {/* MENSAJES */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/50 bg-rose-500/15 px-4 py-2 text-sm text-rose-50">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-50">
              {successMessage}
            </div>
          )}

          {/* BLOQUE: IDENTIDAD */}
          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Identidad de la empresa
                </h2>
                <p className="text-sm text-slate-400">
                  Cómo se llama tu producto/empresa. La IA lo usará al redactar
                  respuestas.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="company_name"
                className="block text-sm font-medium text-slate-200"
              >
                Nombre de la empresa / producto
              </label>
              <input
                id="company_name"
                type="text"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500"
                placeholder="Ej: TicketSense, Acme Support, Mi SaaS, etc."
                value={form.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
              />
            </div>
          </section>

          {/* BLOQUE: TONO & IDIOMA */}
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-100">
                  Tono & idioma
                </h2>
                <p className="text-sm text-slate-400 max-w-md">
                  Define cómo debe sonar tu equipo de soporte. El tono se
                  reflejará en las respuestas sugeridas; el idioma define en qué
                  idioma responder por defecto.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-64">
                <div className="space-y-2">
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Idioma principal
                  </label>
                  <select
                    id="language"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500"
                    value={form.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="default_tone"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Tono por defecto
                  </label>
                  <select
                    id="default_tone"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500"
                    value={form.default_tone}
                    onChange={(e) =>
                      handleChange('default_tone', e.target.value)
                    }
                  >
                    {TONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de tonos con descripción */}
            <div className="grid gap-3 md:grid-cols-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChange('default_tone', opt.value)}
                  className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    form.default_tone === opt.value
                      ? 'border-sky-500/80 bg-sky-500/15 text-sky-100'
                      : 'border-slate-800 bg-slate-950/80 text-slate-200 hover:border-slate-600 hover:bg-slate-900/80'
                  }`}
                >
                  <span className="font-semibold text-[12px] uppercase tracking-[0.18em] mb-1">
                    {opt.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* BLOQUE: POLÍTICAS */}
          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Políticas de respuesta
                </h2>
                <p className="text-sm text-slate-400 max-w-xl">
                  Reglas que la IA debe respetar siempre al responder. Úsalas
                  para cosas como: reembolsos, tono, escalaciones, tiempos de
                  respuesta, etc. Máximo {MAX_GUIDELINES_CHARS} caracteres.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reply_guidelines"
                className="block text-sm font-medium text-slate-200"
              >
                Guías de estilo & políticas internas
              </label>
              <textarea
                id="reply_guidelines"
                rows={6}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500 resize-y"
                placeholder={
                  'Ejemplos:\n' +
                  '- Nunca prometas reembolsos; ofrece revisar el caso.\n' +
                  '- Si el cliente está frustrado, empieza reconociendo el problema.\n' +
                  '- No compartas detalles internos ni enlaces de administración.\n' +
                  '- Firma siempre como “Equipo de soporte”.'
                }
                value={form.reply_guidelines}
                onChange={(e) => handleGuidelinesChange(e.target.value)}
              />
              <div className="flex items-center justify-end text-xs text-slate-500">
                <span>
                  {guidelinesLength}/{MAX_GUIDELINES_CHARS} caracteres
                </span>
              </div>
            </div>
          </section>

          {/* FOOTER BOTÓN GUARDAR */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 pt-2">
            <p className="text-xs md:text-sm text-slate-400 max-w-sm">
              Estas preferencias se aplican cuando uses la acción de{' '}
              <span className="font-medium text-sky-300">
                “Sugerir respuesta”
              </span>{' '}
              en los tickets.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2.5 text-xs md:text-sm font-medium text-white shadow-sm hover:bg-sky-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-sky-100 border-t-transparent animate-spin" />
              )}
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
