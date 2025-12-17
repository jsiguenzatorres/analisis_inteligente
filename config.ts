
/**
 * Configuración centralizada de la aplicación.
 * Las variables son inyectadas por Vite durante el proceso de build/dev.
 */

// Usamos detección redundante para asegurar compatibilidad total
const getSupabaseUrl = (): string => {
    try {
        return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://lodeqleukaoshzarebxu.supabase.co";
    } catch (e) {
        return "https://lodeqleukaoshzarebxu.supabase.co";
    }
};

const getSupabaseKey = (): string => {
    try {
        return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    } catch (e) {
        return "";
    }
};

const getGeminiKey = (): string => {
    try {
        return process.env.API_KEY || process.env.VITE_API_KEY || "";
    } catch (e) {
        return "";
    }
};

export const SUPABASE_CONFIG = {
    url: getSupabaseUrl(),
    apiKey: getSupabaseKey(),
    user: 'auditor_principal',
};

export const GEMINI_API_KEY = getGeminiKey();
