
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseKey = SUPABASE_CONFIG.apiKey;

// Diagnóstico detallado en consola para el desarrollador
if (!supabaseUrl) {
    console.error("CRITICAL: SUPABASE_URL is missing.");
}
if (!supabaseKey) {
    console.error("CRITICAL: SUPABASE_ANON_KEY is missing. Requests will fail with 'Invalid API key'.");
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseKey || 'placeholder-key'
);
