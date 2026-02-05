import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 3000,
            host: true,
        },
        build: {
            outDir: 'dist',
            sourcemap: mode === 'development',
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom', 'react-router-dom'],
                        supabase: ['@supabase/supabase-js'],
                        ai: ['@google/generative-ai'],
                    },
                },
            },
        },
        define: {
            // Vercel will inject these from environment variables
            __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
        },
    };
});
