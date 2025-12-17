
export const SUPABASE_CONFIG = {
    // Buscamos en todas las fuentes posibles para evitar el error de 'Invalid API Key'
    url: (import.meta as any).env?.VITE_SUPABASE_URL || 
         (import.meta as any).env?.SUPABASE_URL || 
         process.env.SUPABASE_URL || 
         'https://lodeqleukaoshzarebxu.supabase.co',
    
    apiKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
            (import.meta as any).env?.SUPABASE_ANON_KEY || 
            process.env.SUPABASE_ANON_KEY || 
            '',
            
    user: 'auditor_principal',
};
