'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/SupabaseClient'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    setLoading(false)
    if (error) return setError(error.message)
    setSuccess('Cuenta creada. Revisa tu correo para confirmar el acceso.')
  }

  return (
    <div className="fade-in space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mt-2 text-sm text-slate-400">Empieza a gestionar tu operación de soporte con TicketAgil.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm text-slate-300">Nombre</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-slate-300">Email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-slate-300">Contraseña</label>
          <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>

        {error && <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {success && <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</button>
      </form>

      <button onClick={() => router.push('/login')} className="text-xs text-sky-300 transition hover:text-sky-200">Ya tengo cuenta</button>
    </div>
  )
}
