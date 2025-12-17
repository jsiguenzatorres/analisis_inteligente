
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseKey = SUPABASE_CONFIG.apiKey;

// Si faltan las credenciales, creamos un cliente "dummy" o lanzamos advertencia en consola
// en lugar de bloquear todo el hilo de ejecución de React.
if (!supabaseUrl || !supabaseKey) {
    console.warn("Advertencia: Las credenciales de Supabase no están configuradas correctamente. Algunas funciones de datos podrían no estar disponibles.");
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseKey || 'placeholder-key'
);
