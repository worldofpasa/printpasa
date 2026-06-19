const disableAuth = process.env.NUXT_DISABLE_AUTH === 'true'
const demoMode = process.env.NUXT_DEMO_MODE === 'true'
const googleOAuthEnabled = Boolean(
  process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID?.trim()
  && process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET?.trim(),
)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  future: { compatibilityVersion: 4 },
  nitro: {
    preset: process.env.NITRO_PRESET || 'node-server',
    externals: {
      include: [
        '@imgly/background-removal-node',
        '@libsql/linux-x64-musl',
        '@libsql/linux-arm64-musl',
        '@libsql/linux-x64-gnu',
        '@libsql/linux-arm64-gnu',
        'onnxruntime-node',
      ],
    },
  },

  components: [
    {
      path: '~/components',
      extensions: ['vue'],
    },
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    resolve: {
      dedupe: ['vue', '@vue/runtime-core', 'reka-ui'],
    },
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    disableAuth,
    demoMode,
    disableSignUp: process.env.NUXT_DISABLE_SIGNUP === 'true',
    skuPrefix: process.env.NUXT_SKU_PREFIX || 'PP',
    public: {
      disableAuth,
      demoMode,
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      googleOAuthEnabled,
      docsUrl: process.env.NUXT_PUBLIC_DOCS_URL || 'https://printpasa-docs.pages.dev',
      demoUrl: process.env.NUXT_PUBLIC_DEMO_URL || 'https://printpasa-demo.pages.dev',
    },
    // AI Providers
    geminiApiKey: '',
    openaiApiKey: '',
    anthropicApiKey: '',
    xaiApiKey: '',
    groqApiKey: '',
    togetherApiKey: '',
    deepinfraApiKey: '',
    // Image Generation Providers
    kreaApiKey: '',
    falApiKey: '',
    leonardoApiKey: '',
    photoroomApiKey: '',
    replicateApiToken: '',
    briaApiKey: '',
    topazApiKey: '',
    // Fulfillment Providers
    printifyApiKey: '',
    printfulApiKey: '',
    // IP Validation (Stage 2)
    rapidapiKey: '',
    serpapiKey: '',
    searchapiKey: '',
    serperApiKey: '',
    defaultSearchProvider: '',
    // Reddit API (optional — public .json is blocked from most server IPs)
    redditClientId: '',
    redditClientSecret: '',
    redditUserAgent: '',
    // S3 Storage
    s3AccessKeyId: '',
    s3SecretAccessKey: '',
    s3Bucket: '',
    s3Region: 'us-east-2',
    s3Endpoint: '',
    // Defaults
    defaultAiProvider: 'gemini',
    defaultImageProvider: 'fal',
    defaultUpscaleProvider: 'local',
    defaultBackgroundRemovalProvider: 'local-bg',
    defaultFulfillmentProvider: 'printify',
    // Session / auth
    sessionPassword: '',
    superuserUsername: '',
    superuserPassword: '',
    // Service-to-service auth
    serviceToken: '',
    serviceProtectedPrefixes: '',
    // Telegram pipeline operator
    telegramBotToken: '',
    telegramWebhookSecret: '',
    telegramAllowedChatIds: '',
    telegramTopicIdeaGeneration: '',
    telegramTopicDesignReview: '',
    pipelineOwnerUserId: '',
    pipelineParseIdeaWithAi: false,
    cronTimezone: process.env.CRON_TIMEZONE || 'UTC',
  },
})
