// app/api/ia/quota/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DAILY_LIMIT = 50

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const userId = body.userId as string | undefined

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido.' },
        { status: 400 },
      )
    }

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const { data, error } = await supabase
      .from('ia_usage')
      .select('used_credits')
      .eq('user_id', userId)
      .eq('window_start', today)
      .maybeSingle()

    if (error) {
      console.error('Supabase error (quota):', error)
      return NextResponse.json(
        { error: 'No se pudo obtener el uso de IA.' },
        { status: 500 },
      )
    }

    const used_credits = data?.used_credits ?? 0
    const remaining_credits = Math.max(0, DAILY_LIMIT - used_credits)

    return NextResponse.json({
      daily_limit: DAILY_LIMIT,
      used_credits,
      remaining_credits,
    })
  } catch (err) {
    console.error('Unhandled error (quota):', err)
    return NextResponse.json(
      { error: 'Error interno al obtener la cuota de IA.' },
      { status: 500 },
    )
  }
}
