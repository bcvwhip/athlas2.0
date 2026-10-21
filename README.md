<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f1429acd-86e6-43e5-99e7-d5b912049917

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Image generation on Render

Image generation works without an end-user provider login. The server uses Gemini when `GEMINI_API_KEY` is configured, then Replicate when `REPLICATE_API_TOKEN` is configured, and finally the public Pollinations fallback.

For reliable production generation, create a Replicate account and API token at https://replicate.com/account/api-tokens, then add `REPLICATE_API_TOKEN` as a secret environment variable in Render. Do not put the token in frontend code or commit it to the repository.

## Login email alerts

To receive an email at `valendinobenoit@gmail.com` after each successful account login, configure these server variables in `.env`:

`RESEND_API_KEY=re_your_api_key`

`EMAIL_FROM=3 athlas <onboarding@resend.dev>`

For production, verify your own sending domain in Resend and use an address from that domain for `EMAIL_FROM`.

The Mozilla Data Collective key is server-only and must be configured as `MOZILLA_DATA_API_KEY`. The dataset download contains audio recordings; it is not itself a TTS model and cannot be selected as a browser voice without a separate voice-cloning/TTS runtime.
