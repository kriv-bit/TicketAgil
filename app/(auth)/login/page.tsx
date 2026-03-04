'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/SupabaseClient'

type Mode = 'login' | 'reset'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setIsSubmitting(false)
    if (error) return setError(error.message)
    router.push('/dashboard')
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!email) return setError('Introduce tu email para recuperar la contraseña.')

    setIsSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setIsSubmitting(false)
    if (error) return setError(error.message)
    setSuccess('Te enviamos un correo con instrucciones para restablecer tu contraseña.')
  }

  const isLogin = mode === 'login'

  return (
    <div className="fade-in space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{isLogin ? 'Bienvenido de nuevo' : 'Recuperar contraseña'}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {isLogin ? 'Accede al panel de soporte en segundos.' : 'Recibirás un enlace de recuperación.'}
        </p>
      </div>

      <form onSubmit={isLogin ? handleLogin : handleResetPassword} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-slate-300">Email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        {isLogin && (
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-slate-300">Contraseña</label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        )}

        {error && <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {success && <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Procesando...' : isLogin ? 'Entrar' : 'Enviar enlace'}
        </button>
      </form>

      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={() => setMode(isLogin ? 'reset' : 'login')} className="text-sky-300 transition hover:text-sky-200">
          {isLogin ? '¿Olvidaste tu contraseña?' : 'Volver a iniciar sesión'}
        </button>
        <button type="button" onClick={() => router.push('/register')} className="text-slate-400 transition hover:text-white">
          Crear cuenta
        </button>
      </div>
    </div>
  )
}
