export default defineNuxtConfig({
  compatibilityDate: '2025-04-15',

  srcDir: '.',

  dir: {
    app: 'app',
  },

  devtools: { enabled: process.env.NODE_ENV === 'development' },

  experimental: {
    // Avoid Nitro registering two server-side useAppConfig auto-imports.
    serverAppConfig: false,
  },

  app: {
    head: {
      title: 'ZakoBot Panel',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  sourcemap: {
    client: false,
    server: false,
  },

  vite: {
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          const message = typeof warning === 'string' ? warning : warning.message
          if (message?.includes('Sourcemap is likely to be incorrect')) {
            return
          }
          warn(warning)
        },
      },
    },
  },

  runtimeConfig: {
    coreApiUrl: process.env.CORE_API_URL ?? 'http://127.0.0.1:6325',
    public: {},
  },

  devServer: {
    port: Number(process.env.PANEL_PORT ?? process.env.NUXT_PORT ?? 6324),
  },

  modules: ['@nuxt/ui'],

  nitro: {
    compressPublicAssets: true,
  },

  build: {
    transpile: ['@zakobot/shared'],
  },
})
