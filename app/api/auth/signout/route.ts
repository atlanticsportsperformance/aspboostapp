import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}

export async function GET() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.redirect(new URL('/sign-in?error=signout-failed', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
  }

  return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
