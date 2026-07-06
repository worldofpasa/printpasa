# Disclaimer

PrintPasa is a tool for generating t-shirt designs with AI and publishing them to
print-on-demand services. Read this before using it commercially.

## No warranty

This software is provided "AS IS", without warranty of any kind. See [LICENSE](LICENSE).
The authors and contributors are not liable for any outcome of using it.

## AI-generated content and intellectual property

- **You are responsible for what you generate and sell.** AI image models can
  reproduce trademarks, copyrighted characters, logos, celebrity likenesses, and
  other protected material. Publishing or selling such designs may infringe third-party
  rights.
- Review every design before publishing. Do not assume a generated image is
  free of IP encumbrances.
- Ownership and licensing of AI-generated images vary by provider and jurisdiction.
  Check the terms of each AI/image provider you configure.

## Content moderation

- AI generation can produce offensive, unsafe, or policy-violating imagery.
- PrintPasa does not include automated content moderation. You are responsible for
  ensuring output complies with the content policies of your AI providers, your
  fulfillment provider (Printify/Printful), and applicable law.

## Third-party services, accounts, and costs

- PrintPasa integrates external providers (AI, image, storage, fulfillment, search).
  Each requires **your own account and API key**, subject to that provider's terms.
- **AI and image generation cost money per request.** A single pipeline run can make
  many API calls. Monitor your provider usage and set spending limits. The authors are
  not responsible for charges you incur.
- Print-on-demand fulfillment (Printify, Printful) has its own seller terms,
  content policies, and payout rules. Comply with them. Use a test/sandbox shop for
  your first runs — a fulfillment API key has full control of your shop, and providers
  can ban accounts for publishing IP-infringing AI merchandise.
- **Provider safety filters vary.** Some image providers apply strict content
  filtering (e.g. Gemini), others are permissive or configurable (e.g. fal, Krea).
  PrintPasa adds no moderation of its own — the effective safety floor is whatever
  your chosen provider enforces.

## Your responsibilities as a self-hoster

- Keep API keys and `NUXT_SESSION_PASSWORD` secret and rotate them.
- Restrict network access to your instance and admin routes.
- Comply with the terms of every third-party service you connect.

Using this software means you accept these terms.
