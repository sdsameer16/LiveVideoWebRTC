import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.nextTick': function(fn, ...args) {
      Promise.resolve().then(() => fn(...args));
    }
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      events: 'events',
      util: 'util',
      process: 'process/browser',
    },
  },
  optimizeDeps: {
    include: ['simple-peer', 'socket.io-client', 'buffer', 'events', 'util', 'process'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  server: {
    port: 5174,  // Different port from caretaker
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});
