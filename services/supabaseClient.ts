
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseKey = SUPABASE_CONFIG.apiKey;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL and API Key must be provided in config.ts");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
