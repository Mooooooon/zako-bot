export default defineNuxtConfig({
  compatibilityDate: '2025-04-15',

  devtools: { enabled: true },

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

  runtimeConfig: {
    coreApiUrl: process.env.CORE_API_URL ?? 'http://127.0.0.1:3001',
    public: {},
  },

  devServer: {
    port: 3000,
  },

  modules: [],

  nitro: {
    compressPublicAssets: true,
  },

  build: {
    transpile: ['@zakobot/shared'],
  },
})