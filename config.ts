
export const SUPABASE_CONFIG = {
    // Utiliza las variables de entorno inyectadas por Vercel
    url: process.env.SUPABASE_URL || 'https://lodeqleukaoshzarebxu.supabase.co',
    apiKey: process.env.SUPABASE_ANON_KEY || '',
    user: 'auditor_principal',
};

export const GEMINI_CONFIG = {
    apiKey: process.env.API_KEY || '',
    model: 'gemini-3-flash-preview'
};
