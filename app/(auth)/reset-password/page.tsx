'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/SupabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) return setError('Las contraseñas no coinciden.')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) return setError(error.message)

    setSuccess('Contraseña actualizada correctamente. Ahora puedes iniciar sesión.')
    setTimeout(() => router.push('/login'), 1200)
  }

  return (
    <div className="fade-in space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-slate-400">Establece una contraseña segura para continuar.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" className="input" placeholder="Nueva contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <input type="password" className="input" placeholder="Confirmar contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
        {error && <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {success && <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Guardando...' : 'Guardar contraseña'}</button>
      </form>
    </div>
  )
}
