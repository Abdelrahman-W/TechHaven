import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State & forms
          'vendor-state': ['zustand', 'react-hook-form', '@hookform/resolvers', 'zod'],
          // UI utils
          'vendor-ui': ['sonner'],
          // Admin pages — only loaded when admin visits /admin
          'chunk-admin': [
            './src/pages/Admin/Dashboard.jsx',
            './src/pages/Admin/Products.jsx',
            './src/pages/Admin/Orders.jsx',
            './src/pages/Admin/Users.jsx',
            './src/pages/Admin/Categories.jsx',
            './src/pages/Admin/Analytics.jsx',
            './src/pages/Admin/Settings.jsx',
          ],
        },
      },
    },
  },
});