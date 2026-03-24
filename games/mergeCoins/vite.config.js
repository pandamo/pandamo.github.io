import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function getManualChunk(id) {
  if (id.includes('/node_modules/vue/') || id.includes('/node_modules/@vue/')) {
    return 'vue-core'
  }

  if (id.includes('/node_modules/vue-router/')) {
    return 'vue-core'
  }

  if (id.includes('/node_modules/@supabase/')) {
    return 'supabase-vendor'
  }

  return undefined
}

function getChunkFileName(chunkInfo) {
  if (chunkInfo.name === 'vue-core') {
    return 'assets/vue-core.js'
  }

  if (chunkInfo.name === 'supabase-vendor') {
    return 'assets/supabase-vendor-[hash].js'
  }

  return 'assets/[name]-[hash].js'
}

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: getManualChunk,
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: getChunkFileName,
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    host: '0.0.0.0',
  },
})
