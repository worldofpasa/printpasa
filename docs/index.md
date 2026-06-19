---
layout: home

hero:
  name: PrintPasa
  text: Self-hosted AI design pipeline
  tagline: Seven stages from trend research to Printify publish — provider-agnostic, MIT licensed.
  actions:
    - theme: brand
      text: Get started
      link: /developers/getting-started
    - theme: alt
      text: User guide
      link: /users/getting-started
    - theme: alt
      text: Try the demo
      link: https://printpasa-demo.pages.dev

features:
  - title: Seven-stage workflow
    details: Gather ideas, validate IP, generate prompts and images, optimize, place on products, and publish.
  - title: Bring your own keys
    details: Run with one AI key plus local background removal, or wire in Printify, S3, and more.
  - title: Self-hosted
    details: Docker, Fly.io, Vercel + Turso, or Cloudflare Pages for docs and demo.
---

## Quick start

```bash
git clone https://github.com/worldofpasa/printpasa.git
cd printpasa && pnpm install
cp .env.example .env
pnpm db:push && pnpm dev
```

Documentation: [developers](/developers/getting-started) · [users](/users/getting-started)

Part of [World of Pasa](https://worldofpasa-web.pages.dev).
