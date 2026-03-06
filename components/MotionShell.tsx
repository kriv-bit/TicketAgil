'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

type MotionShellProps = {
  children: ReactNode
  className?: string
}

export default function MotionShell({ children, className }: MotionShellProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const revealTargets = document.querySelectorAll<HTMLElement>(
      '[data-reveal], section, article, .surface, .surface-muted, table tbody tr, ul li'
    )

    revealTargets.forEach((el, index) => {
      if (!el.dataset.revealReady) {
        el.dataset.revealReady = 'true'
        el.style.setProperty('--reveal-delay', `${Math.min(index * 28, 280)}ms`)
      }
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    )

    revealTargets.forEach((el) => {
      if (!el.classList.contains('is-visible')) {
        el.classList.add('reveal-on-scroll')
        observer.observe(el)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [pathname])

  return (
    <div key={pathname} className={["route-transition", className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
