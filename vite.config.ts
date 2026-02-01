
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Fallback to './' for local development or if VITE_BASE_PATH is missing.
  // Using a relative base ensures assets load correctly in subfolders like /dev/
  base: process.env.VITE_BASE_PATH || './',
  define: {
    // This makes process.env.API_KEY available in your frontend code
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    outDir: 'dist',
  }
});
