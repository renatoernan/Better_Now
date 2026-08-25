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
      {
        name: 'mercadopago-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/mercadopago-payment', (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.end();
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(body || '{}');
                  const accessToken =
                    env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
                    env.MERCADOPAGO_ACCESS_TOKEN ||
                    'APP_USR-1264360358076296-081717-ffb3d55789b1665111c7d2c6e33a856f-68352240';

                  const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${accessToken}`,
                      'X-Idempotency-Key': parsed.idempotencyKey || `mp-${Date.now()}`,
                    },
                    body: JSON.stringify(parsed.paymentBody),
                  });

                  const mpData = await mpRes.json();
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = mpRes.status;
                  res.end(JSON.stringify(mpData));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
              return;
            }

            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          });
        }
      },
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
    /* define: {
      'process.env': env
    }, */
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
