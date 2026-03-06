'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/SupabaseClient'
import MotionShell from '@/components/MotionShell'

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
  { label: 'Importaciones', href: '/import' },
  { label: 'Configuración', href: '/settings' },
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
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="surface m-3 hidden md:flex md:flex-col md:overflow-hidden">
        <div className="border-b px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">TicketAgil</p>
          <p className="mt-1 text-lg font-semibold">Operations Console</p>
        </div>

        <nav className="flex-1 space-y-1.5 p-3">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={[
                'w-full rounded-xl px-3 py-2.5 text-left text-sm transition',
                isActive(item.href)
                  ? 'bg-foreground text-background-elevated'
                  : 'text-muted hover:bg-background-subtle hover:text-foreground',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t px-6 py-4 text-xs text-muted">
          <p>Version 0.1.0</p>
          <p className="mt-1">Panel de gestión de soporte</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="mx-3 mt-3 rounded-2xl border bg-background-elevated/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Centro de soporte</p>
              <div className="mt-2 flex flex-wrap gap-2 md:hidden">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={[
                      'rounded-lg border px-2.5 py-1 text-xs',
                      isActive(item.href) ? 'bg-foreground text-background-elevated' : 'text-muted',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {userEmail && (
                <div className="text-right">
                  <p className="text-xs text-muted">Sesión activa</p>
                  <p className="max-w-[220px] truncate text-sm font-medium">{userEmail}</p>
                </div>
              )}
              <button onClick={handleLogout} className="btn-secondary text-sm">
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-4">
          <div className="mx-auto w-full max-w-7xl">
            {loading ? (
              <div className="surface flex h-[60vh] items-center justify-center gap-2 text-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Comprobando sesión...
              </div>
            ) : (
              <MotionShell className="motion-scope">{children}</MotionShell>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
