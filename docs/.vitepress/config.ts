import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'PrintPasa',
  description: 'Self-hosted AI t-shirt design pipeline',
  base: '/',
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'User guide', link: '/users/getting-started' },
      { text: 'Developers', link: '/developers/getting-started' },
      { text: 'Demo', link: 'https://printpasa-demo.pages.dev', target: '_blank' },
      { text: 'GitHub', link: 'https://github.com/worldofpasa/printpasa', target: '_blank' },
    ],
    sidebar: {
      '/developers/': [
        {
          text: 'Developers',
          items: [
            { text: 'Getting started', link: '/developers/getting-started' },
            { text: 'Architecture', link: '/developers/architecture' },
            { text: 'Configuration', link: '/developers/configuration' },
            { text: 'Authentication', link: '/developers/authentication' },
            { text: 'Providers', link: '/developers/providers' },
            { text: 'Database', link: '/developers/database' },
            { text: 'Storage', link: '/developers/storage' },
            { text: 'Deployment', link: '/developers/deployment' },
            { text: 'API reference', link: '/developers/api-reference' },
            { text: 'Telegram', link: '/developers/telegram' },
          ],
        },
      ],
      '/users/': [
        {
          text: 'Users',
          items: [
            { text: 'Getting started', link: '/users/getting-started' },
            { text: 'Settings', link: '/users/settings' },
            { text: 'Stage 1: Gather idea', link: '/users/stage-1-gather-idea' },
            { text: 'Stage 2: Validate', link: '/users/stage-2-idea-validator' },
            { text: 'Stage 3: Prompts', link: '/users/stage-3-image-prompts' },
            { text: 'Stage 4: Generate', link: '/users/stage-4-image-generate' },
            { text: 'Stage 5: Optimize', link: '/users/stage-5-image-optimization' },
            { text: 'Stage 6: Placement', link: '/users/stage-6-product-placement' },
            { text: 'Stage 7: Review', link: '/users/stage-7-review' },
            { text: 'Workflows', link: '/users/workflows' },
            { text: 'Superuser', link: '/users/superuser' },
            { text: 'Telegram bot', link: '/users/telegram-bot' },
            { text: 'FAQ', link: '/users/faq' },
            { text: 'Troubleshooting', link: '/users/troubleshooting' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/worldofpasa/printpasa' },
    ],
    footer: {
      message: 'Part of World of Pasa',
      copyright: 'MIT License',
    },
  },
})
