import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import path from 'path';
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      // Image optimization plugin
      viteImagemin({
        gifsicle: { optimizationLevel: 7 },
        mozjpeg: { quality: 80 },
        pngquant: { quality: [0.65, 0.8] },
        webp: { quality: 80 }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': env
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'ui-vendor': ['lucide-react', 'sonner', 'framer-motion'],
            'supabase-vendor': ['@supabase/supabase-js'],
            
            // Feature chunks
            'admin-features': [
              './src/components/features/AdminDashboard',
              './src/components/features/AdminEvents',
              './src/components/features/AdminClients',
              './src/components/features/AdminTestimonials',
              './src/components/features/AdminSettings',
              './src/components/features/AdminSolicitations'
            ],
            'public-features': [
              './src/components/features/Hero',
              './src/components/features/Services',
              './src/components/features/About',
              './src/components/features/Testimonials',
              './src/components/features/PublicEvents'
            ]
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-hook-form',
        '@hookform/resolvers',
        'zod',
        'lucide-react',
        'sonner',
        'framer-motion',
        '@supabase/supabase-js'
      ]
    }
  };
});
