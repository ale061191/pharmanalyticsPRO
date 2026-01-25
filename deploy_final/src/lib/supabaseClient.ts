
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ CRITICAL: Supabase Env Vars Missing in supabaseClient.ts!");
    console.error("URL:", supabaseUrl ? "Present" : "MISSING");
    console.error("KEY:", supabaseKey ? "Present" : "MISSING");
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');
