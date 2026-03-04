'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/SupabaseClient'

type AppLayoutProps = {
  children: ReactNode
}

type NavItem = {
  label: string
  href: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Tickets', href: '/tickets' },
  { label: 'Importar', href: '/import' },
  { label: 'Customización', href: '/settings' },
]

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Error obteniendo sesión:', error.message)
      }

      if (!session) {
        router.replace('/login')
        return
      }

      setUserEmail(session.user.email ?? null)
      setLoading(false)
    }

    void checkSession()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="app-shell min-h-screen text-slate-50 md:grid md:grid-cols-[250px_1fr]">
      <aside className="surface m-3 hidden md:flex md:flex-col">
        <div className="border-b border-slate-700/60 px-5 py-5">
          <p className="text-lg font-semibold tracking-tight">TicketAgil</p>
          <p className="text-xs text-slate-400">Support Intelligence Suite</p>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-300 ${
                isActive(item.href)
                  ? 'bg-sky-500/20 text-sky-100 shadow-lg shadow-sky-900/20'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-700/60 px-5 py-4 text-xs text-slate-500">
          <p>v0.1.0 · product preview</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="mx-3 mt-3 flex h-16 items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-900/60 px-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-emerald-400/20 text-[11px] text-emerald-200">OK</span>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Soporte en vivo</span>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <p className="hidden max-w-[220px] truncate text-sm text-slate-300 sm:block">{userEmail}</p>
            )}
            <button onClick={handleLogout} className="btn btn-secondary" aria-label="Cerrar sesión">
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="flex-1 px-3 pb-3 pt-4">
          <div className="surface fade-in min-h-[calc(100vh-6.25rem)] p-4 md:p-7">
            {loading ? (
              <div className="flex h-[60vh] items-center justify-center text-slate-400">
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                <span>Comprobando sesión...</span>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
