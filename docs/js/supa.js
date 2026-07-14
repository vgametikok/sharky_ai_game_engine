import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON } from './config.js';

export const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

export async function uid() {
  const { data } = await supa.auth.getSession();
  return data?.session?.user?.id || null;
}
