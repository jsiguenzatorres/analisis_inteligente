
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Carga todas las variables de entorno (incluyendo las de Vercel sin prefijo VITE_)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Inyectamos explícitamente las variables que configuraste en tu captura de pantalla
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      // Mantenemos la definición global por si acaso
      'process.env': JSON.stringify(env)
    }
  };
});
