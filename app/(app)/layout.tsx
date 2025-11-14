// app/(app)/layout.tsx
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-800">
          <div className="h-8 w-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sm font-bold text-sky-200">
            TS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">
              TicketAgil
            </span>
            <span className="text-xs text-slate-400">
              Copilot de soporte
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={[
                'w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
                isActive(item.href)
                  ? 'bg-sky-500/15 text-sky-100 border border-sky-500/50'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-50',
              ].join(' ')}
            >
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800 text-xs text-slate-500">
          <p className="font-mono text-[11px]">v0.1.0 · MVP</p>
          <p className="mt-1">
            hecho con <span className="text-sky-400">Next + Supabase + IA</span>
          </p>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        {/* TOPBAR */}
        <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/60 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Soporte · Panel
            </span>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="flex flex-col items-end">
                <span className="text-xs text-slate-400">
                  Conectado como
                </span>
                <span className="text-sm font-medium truncate max-w-[180px]">
                  {userEmail}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-xs rounded-full border border-slate-700 px-3 py-1 hover:bg-slate-800 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 bg-slate-950/90">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
            {loading ? (
              <div className="flex h-[60vh] items-center justify-center text-slate-400">
                <span className="h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin mr-2" />
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
