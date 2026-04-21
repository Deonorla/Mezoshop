import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      nodePolyfills({ protocolImports: true }),
      react(),
      tailwindcss(),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'buffer': path.resolve(__dirname, './node_modules/buffer/index.js'),
        // Force hash-base to use the top-level readable-stream instead of its
        // own vendored copy, which tries to call Buffer.slice before any
        // polyfill has run.
        'hash-base/node_modules/readable-stream': path.resolve(
          __dirname,
          './node_modules/readable-stream',
        ),
      },
    },
    optimizeDeps: {
      entries: ['./src/main.tsx'],
      include: [
        'buffer',
        '@mezo-org/passport',
        '@safe-global/protocol-kit',
        'ethereumjs-util',
        'hash-base',
        'md5.js',
        'create-hash',
      ],
      esbuildOptions: {
        define: {
          global: 'globalThis',
          'process.version': '"v18.0.0"',
          'process.browser': 'true',
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
