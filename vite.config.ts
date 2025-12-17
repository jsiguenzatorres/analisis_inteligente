
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// Fix: Import process from node:process to ensure .cwd() is recognized correctly by TypeScript in a Node environment
export default defineConfig(({ mode }) => {
  // Carga todas las variables de entorno, no solo las que empiezan con VITE_
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env': env
    }
  };
});
