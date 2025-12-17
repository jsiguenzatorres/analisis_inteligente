
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseKey = SUPABASE_CONFIG.apiKey;

// Diagnóstico detallado para el desarrollador
if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    console.warn("⚠️ Advertencia: SUPABASE_URL no detectada o es un placeholder.");
}

if (!supabaseKey) {
    console.error("❌ ERROR CRÍTICO: SUPABASE_ANON_KEY está vacía. Las peticiones a la base de datos fallarán.");
} else {
    console.log("✅ Supabase configurado (llave detectada)");
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseKey || 'placeholder-key'
);
