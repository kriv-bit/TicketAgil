// app/(auth)/register/page.tsx
'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/SupabaseClient'

type PasswordChecks = {
  meetsLength: boolean
  hasLower: boolean
  hasUpper: boolean
  hasNumber: boolean
  hasSymbol: boolean
  passedChecks: number
}

const getPasswordChecks = (password: string): PasswordChecks => {
  const meetsLength = password.length >= 8
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  const passedChecks = [meetsLength, hasLower, hasUpper, hasNumber, hasSymbol].filter(
    Boolean
  ).length

  return {
    meetsLength,
    hasLower,
    hasUpper,
    hasNumber,
    hasSymbol,
    passedChecks,
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const passwordChecks = getPasswordChecks(password)
  const passwordsMatch = !confirmPassword || password === confirmPassword

  let strengthLabel = 'Introduce una contraseña'
  let strengthBarClass = 'w-0 bg-slate-200'
  let strengthTextClass = 'text-slate-500'

  if (password) {
    if (passwordChecks.passedChecks <= 2) {
      strengthLabel = 'Contraseña débil'
      strengthBarClass = 'w-1/4 bg-red-500'
      strengthTextClass = 'text-red-600'
    } else if (passwordChecks.passedChecks === 3) {
      strengthLabel = 'Contraseña aceptable'
      strengthBarClass = 'w-2/4 bg-amber-500'
      strengthTextClass = 'text-amber-600'
    } else if (passwordChecks.passedChecks === 4) {
      strengthLabel = 'Contraseña fuerte'
      strengthBarClass = 'w-3/4 bg-emerald-500'
      strengthTextClass = 'text-emerald-600'
    } else if (passwordChecks.passedChecks === 5) {
      strengthLabel = 'Contraseña muy fuerte'
      strengthBarClass = 'w-full bg-emerald-600'
      strengthTextClass = 'text-emerald-700'
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    // Validaciones de front antes de llamar a Supabase
    const { passedChecks } = getPasswordChecks(password)

    if (password !== confirmPassword) {
      setIsSubmitting(false)
      setError('Las contraseñas no coinciden.')
      return
    }

    if (passedChecks < 3) {
      setIsSubmitting(false)
      setError(
        'La contraseña es demasiado débil. Usa al menos 8 caracteres y combina mayúsculas, minúsculas, números y símbolos.'
      )
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    setIsSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Registro exitoso. Revisa tu correo para confirmar la cuenta.')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1 text-center">Crear cuenta</h1>
      <p className="text-sm text-gray-500 mb-6 text-center">
        TicketAgil – Plataforma de soporte al cliente
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* EMAIL */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu-correo@ejemplo.com"
          />
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />

          {/* Barra de fuerza */}
          <div className="mt-2">
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${strengthBarClass}`} />
            </div>
            <p className={`mt-1 text-xs font-medium ${strengthTextClass}`}>{strengthLabel}</p>
          </div>

          {/* Checklist de requisitos */}
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            <li
              className={
                'flex items-center gap-1 ' +
                (passwordChecks.meetsLength ? 'text-emerald-600' : 'text-slate-500')
              }
            >
              <span>•</span>
              <span>Mínimo 8 caracteres</span>
            </li>
            <li
              className={
                'flex items-center gap-1 ' +
                (passwordChecks.hasLower ? 'text-emerald-600' : 'text-slate-500')
              }
            >
              <span>•</span>
              <span>Al menos una letra minúscula</span>
            </li>
            <li
              className={
                'flex items-center gap-1 ' +
                (passwordChecks.hasUpper ? 'text-emerald-600' : 'text-slate-500')
              }
            >
              <span>•</span>
              <span>Al menos una letra mayúscula</span>
            </li>
            <li
              className={
                'flex items-center gap-1 ' +
                (passwordChecks.hasNumber ? 'text-emerald-600' : 'text-slate-500')
              }
            >
              <span>•</span>
              <span>Al menos un número</span>
            </li>
            <li
              className={
                'flex items-center gap-1 ' +
                (passwordChecks.hasSymbol ? 'text-emerald-600' : 'text-slate-500')
              }
            >
              <span>•</span>
              <span>Al menos un símbolo (!@#$%^&amp;*)</span>
            </li>
          </ul>
        </div>

        {/* CONFIRM PASSWORD */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="confirm-password">
            Confirmar contraseña
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            className={`w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:border-slate-400 ${
              confirmPassword && !passwordsMatch
                ? 'border-red-500 focus:ring-red-500'
                : 'focus:ring-slate-400'
            }`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
          />
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-600">Las contraseñas no coinciden.</p>
          )}
        </div>

        {/* MENSAJES DE ERROR / ÉXITO */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
            {success}
          </p>
        )}

        {/* BOTÓN */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-slate-900 text-white py-2 text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creando cuenta...' : 'Registrarse'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="text-sky-600 hover:underline font-medium"
        >
          Inicia sesión
        </button>
      </p>
    </div>
  )
}
