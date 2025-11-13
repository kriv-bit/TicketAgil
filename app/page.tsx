// app/page.tsx
import { supabase } from '@/lib/SupabaseClient'

export default async function Home() {
  // Ejemplo: hacer una query tonta para ver si rompe o no.
  // Aún no tenemos tablas, así que puedes simplemente renderizar algo.
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">TicketSense</h1>
        <p className="text-gray-600">MVP en construcción 🚧</p>
      </div>
    </main>
  )
}
