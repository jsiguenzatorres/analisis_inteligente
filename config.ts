
export const SUPABASE_CONFIG = {
    // Intenta leer de process.env (inyectado por Vite/Vercel)
    url: process.env.SUPABASE_URL || 'https://lodeqleukaoshzarebxu.supabase.co',
    apiKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    user: 'auditor_principal',
};
