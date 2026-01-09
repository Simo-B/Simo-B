import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateEnvVars } from '@/lib/env';

export async function POST() {
  try {
    validateEnvVars();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
