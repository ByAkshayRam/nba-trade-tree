import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lodivrxjbdblrhlvbmdh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_BpTqwjtuz4Q0cImBeklUQw_u0qyy2J0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
