// app/(auth)/login/page.tsx
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email) {
      setError('Introduce tu email para recuperar la contraseña.')
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setIsSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(
      'Te hemos enviado un correo con instrucciones para restablecer tu contraseña.'
    )
  }


  const isLogin = mode === 'login'

  return (
    <div className="space-y-6">
      <div className="text-center md:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isLogin ? 'Bienvenido de nuevo' : 'Recuperar contraseña'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isLogin
            ? 'Accede a tu panel de tickets y métricas de soporte.'
            : 'Te enviaremos un enlace para que puedas crear una nueva contraseña.'}
        </p>
      </div>

      {/* LOGIN */}
      {isLogin && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu-correo@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium" htmlFor="password">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => {
                  setMode('reset')
                  setError(null)
                  setSuccess(null)
                }}
                className="text-xs text-slate-700 hover:text-slate-900 hover:underline font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input
              id="password"
              type="password"
              required
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 text-white py-2.5 text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Ingresando…' : 'Entrar'}
          </button>
        </form>
      )}

      {/* RESET PASSWORD */}
      {!isLogin && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="reset-email">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              required
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu-correo@empresa.com"
            />
          </div>

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 text-white py-2.5 text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Enviando enlace…' : 'Enviar enlace de recuperación'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError(null)
              setSuccess(null)
            }}
            className="w-full rounded-md border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Volver a iniciar sesión
          </button>
        </form>
      )}

      {/* FOOTER */}
      <p className="pt-2 text-center md:text-left text-sm text-slate-600">
        ¿No tienes cuenta?{' '}
        <button
          type="button"
          onClick={() => router.push('/register')}
          className="text-slate-700 hover:text-slate-900 hover:underline font-medium"
        >
          Regístrate
        </button>
      </p>
    </div>
  )
}
