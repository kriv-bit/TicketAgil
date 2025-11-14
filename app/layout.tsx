// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

const APP_NAME = 'TicketAgil'
const APP_DESCRIPTION =
  'Copilot de soporte al cliente con IA para resumir tickets, clasificarlos y sugerir respuestas en segundos.'

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} · Copilot de soporte al cliente`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    'soporte al cliente',
    'help desk',
    'ticketing',
    'IA',
    'LLM',
    'resumen de tickets',
    'customer support',
    'TicketAgil',
  ],
  metadataBase: new URL('https://ticket-agil.vercel.app'), // ⚠️  dominio real en produccion
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: `${APP_NAME} · Copilot de soporte al cliente`,
    description: APP_DESCRIPTION,
    url: 'https://ticket-agil.vercel.app', // ⚠️ 
    siteName: APP_NAME,
    images: [
      {
        url: '/og.png', // pon aquí tu captura bonita del dashboard
        width: 1200,
        height: 630,
        alt: 'Dashboard de TicketAgil mostrando tickets y métricas de soporte',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} · Copilot de soporte al cliente`,
    description: APP_DESCRIPTION,
    images: ['/og.png'],
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  )
}
